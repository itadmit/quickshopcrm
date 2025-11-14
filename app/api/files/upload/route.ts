import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { uploadToS3, generateS3Key } from "@/lib/s3"
import sharp from "sharp"

interface ExtendedSession {
  user: {
    id: string
    companyId: string
  }
}

// פונקציה להמרת תמונות ל-WebP
async function convertToWebP(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; extension: string }> {
  // בדיקה אם זה קובץ תמונה
  const isImage = mimeType?.startsWith('image/')
  
  if (!isImage) {
    // אם זה לא תמונה, נחזיר את הקובץ כמו שהוא
    const ext = mimeType === 'application/pdf' ? 'pdf' : 'file'
    return { buffer, extension: ext }
  }
  
  try {
    // המרה ל-WebP עם אופטימיזציה
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 85, effort: 4 }) // איכות טובה + אופטימיזציה
      .toBuffer()
    
    return { buffer: webpBuffer, extension: 'webp' }
  } catch (error) {
    console.error('Error converting image to WebP:', error)
    // אם ההמרה נכשלה, נחזיר את המקור
    const ext = mimeType?.split('/')[1] || 'jpg'
    return { buffer, extension: ext }
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as ExtendedSession | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const entityType = formData.get("entityType") as string
    const entityId = formData.get("entityId") as string
    const shopId = formData.get("shopId") as string | null // עבור entity חדש
    const fileType = formData.get("fileType") as string | null // logo, favicon, builders וכו'

    console.log("Upload request received:", {
      hasFile: !!file,
      fileName: file?.name,
      entityType,
      entityId,
      shopId,
      fileType,
    })

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!entityType || !entityId) {
      return NextResponse.json({ 
        error: "Missing entityType or entityId",
        received: { entityType, entityId }
      }, { status: 400 })
    }

    // עבור entity חדש, shopId הוא חובה
    if (entityId === "new" && !shopId) {
      return NextResponse.json({ 
        error: "shopId is required for new entities",
        received: { entityType, entityId, shopId }
      }, { status: 400 })
    }

    // המרת הקובץ ל-buffer
    const bytes = await file.arrayBuffer()
    let buffer = Buffer.from(bytes)
    
    // המרה ל-WebP אם זו תמונה
    const { buffer: optimizedBuffer, extension } = await convertToWebP(buffer, file.type || '')
    buffer = Buffer.from(optimizedBuffer)
    
    // החלפת סיומת הקובץ ל-WebP אם הומר
    const originalName = file.name.replace(/\.[^/.]+$/, '') // הסרת הסיומת המקורית
    const newFileName = `${originalName}.${extension}`
    const sanitizedFileName = newFileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    
    // בדיקה אם S3 מוגדר
    const useS3 = process.env.AWS_S3_BUCKET_NAME && 
                  process.env.AWS_ACCESS_KEY_ID && 
                  process.env.AWS_SECRET_ACCESS_KEY

    let filePath: string

    if (useS3) {
      // מציאת shopSlug עבור כל ה-entities
      let shopSlug: string | null = null
      let finalEntityType = entityType
      let finalIdentifier: string | null = entityId !== 'new' ? entityId : null
      
      if (entityType === 'shops') {
        // עבור shops - logo, favicon, builders וכו'
        let targetShopId = entityId !== 'new' ? entityId : shopId
        
        if (!targetShopId) {
          return NextResponse.json(
            { error: "Shop ID is required for shop files" },
            { status: 400 }
          )
        }
        
        const shop = await prisma.shop.findUnique({
          where: { id: targetShopId },
          select: { slug: true },
        })
        
        if (shop?.slug) {
          shopSlug = shop.slug
          // עבור shops, נשתמש ב-fileType (logo, favicon, builders) או entityType
          finalEntityType = fileType || 'logo' // ברירת מחדל logo
          finalIdentifier = null
        }
      } else {
        // עבור products, collections, pages וכו' - צריך למצוא את ה-shopId
        let targetShopId: string | null = null
        
        if (entityId !== 'new') {
          // מוצר/קולקציה/דף קיים - נמצא את ה-shopId
          if (entityType === 'products') {
            const product = await prisma.product.findFirst({
              where: {
                OR: [
                  { id: entityId },
                  { slug: entityId }
                ]
              },
              select: { shopId: true },
            })
            targetShopId = product?.shopId || null
          } else if (entityType === 'collections') {
            const collection = await prisma.collection.findFirst({
              where: {
                OR: [
                  { id: entityId },
                  { slug: entityId }
                ]
              },
              select: { shopId: true },
            })
            targetShopId = collection?.shopId || null
          } else if (entityType === 'pages') {
            // חיפוש דף לפי slug או ID
            const page = await prisma.page.findFirst({
              where: {
                OR: [
                  { id: entityId },
                  { slug: entityId }
                ]
              },
              select: { shopId: true },
            })
            targetShopId = page?.shopId || null
          }
        } else {
          // entity חדש - נשתמש ב-shopId שנשלח
          targetShopId = shopId
        }
        
        if (targetShopId) {
          const shop = await prisma.shop.findUnique({
            where: { id: targetShopId },
            select: { slug: true },
          })
          shopSlug = shop?.slug || null
        }
      }
      
      if (!shopSlug) {
        return NextResponse.json(
          { error: "Shop slug not found" },
          { status: 400 }
        )
      }
      
      // העלאה ל-S3
      const s3Key = generateS3Key(shopSlug, finalEntityType, finalIdentifier, sanitizedFileName)
      const finalMimeType = extension === 'webp' ? 'image/webp' : (file.type || 'application/octet-stream')
      filePath = await uploadToS3(buffer, s3Key, finalMimeType)
    } else {
      // שמירה מקומית (fallback)
      const uploadsDir = join(process.cwd(), "uploads", entityType)
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }
      
      const fileName = `${Date.now()}-${sanitizedFileName}`
      filePath = join(uploadsDir, fileName)
      await writeFile(filePath, buffer)
      
      // המרה ל-path יחסי
      filePath = `/uploads/${entityType}/${fileName}`
    }

    // שמירת הקובץ במסד הנתונים
    const finalMimeType = extension === 'webp' ? 'image/webp' : (file.type || null)
    const fileRecord = await prisma.file.create({
      data: {
        companyId: session.user.companyId,
        entityType,
        entityId,
        path: filePath,
        name: newFileName, // שם הקובץ עם הסיומת החדשה
        size: buffer.length,
        mimeType: finalMimeType,
        uploadedBy: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.name,
        path: fileRecord.path,
        size: fileRecord.size,
        mimeType: fileRecord.mimeType,
        createdAt: fileRecord.createdAt,
      },
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}

