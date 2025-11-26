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
  
  // אם זה וידאו או קובץ אחר, נחזיר את הקובץ כמו שהוא
  if (!isImage) {
    if (mimeType?.startsWith('video/')) {
      // עבור וידאו, נשמור את הסיומת המקורית
      const videoExt = mimeType.split('/')[1] || 'mp4'
      return { buffer, extension: videoExt }
    }
    // אם זה לא תמונה ולא וידאו, נחזיר את הקובץ כמו שהוא
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

    // בדיקת גודל קובץ - מקסימום 25 מגה בייט
    const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 מגה בייט
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: "File size exceeds maximum allowed size of 25MB",
          received: { 
            fileName: file.name,
            fileSize: file.size,
            maxSize: MAX_FILE_SIZE
          }
        },
        { status: 400 }
      )
    }

    // בדיקת הגבלת שטח אחסון כולל (אם יש)
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { storageLimitMB: true } as any,
    })

    const storageLimitMB = (company as any)?.storageLimitMB as number | null | undefined

    if (storageLimitMB) {
      // חישוב שטח אחסון נוכחי
      const storageStats = await prisma.file.aggregate({
        where: { companyId: session.user.companyId },
        _sum: { size: true },
      })

      const currentStorageBytes = storageStats._sum.size || 0
      const currentStorageMB = currentStorageBytes / (1024 * 1024)
      const newFileSizeMB = file.size / (1024 * 1024)
      const totalAfterUpload = currentStorageMB + newFileSizeMB

      if (totalAfterUpload > storageLimitMB) {
        return NextResponse.json(
          { 
            error: "Storage limit exceeded",
            message: `הגעת למגבלת שטח האחסון (${storageLimitMB} MB). נא למחוק קבצים קיימים או לשדרג את התוכנית.`,
            storage: {
              used: currentStorageMB,
              limit: storageLimitMB,
              newFileSize: newFileSizeMB,
              totalAfterUpload: totalAfterUpload
            }
          },
          { status: 400 }
        )
      }
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
      
      // טיפול מיוחד עבור מדיה כללית (לא קשורה לחנות ספציפית)
      if (entityType === 'media') {
        // עבור מדיה כללית, נשתמש ב-companyId ישירות
        // יצירת נתיב ב-S3 עבור מדיה כללית: media/{companyId}/{timestamp}-{fileName}
        const timestamp = Date.now()
        const s3Key = `media/${session.user.companyId}/${timestamp}-${sanitizedFileName}`
        const finalMimeType = extension === 'webp' 
          ? 'image/webp' 
          : (file.type || 'application/octet-stream')
        filePath = await uploadToS3(buffer, s3Key, finalMimeType)
        
        // שמירת הקובץ במסד הנתונים
        const finalMimeTypeForDB = extension === 'webp' 
          ? 'image/webp' 
          : (file.type || null)
        const fileRecord = await prisma.file.create({
          data: {
            companyId: session.user.companyId,
            entityType: 'media',
            entityId: 'general',
            path: filePath,
            name: sanitizedFileName,
            size: buffer.length,
            mimeType: finalMimeTypeForDB,
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
      }
      
      if (entityType === 'shops') {
        // עבור shops - logo, favicon, builders וכו'
        let targetShopId = entityId !== 'new' ? entityId : shopId
        
        console.log('🔍 Shops upload - checking shop:', { entityId, shopId, targetShopId, fileType })
        
        if (!targetShopId) {
          return NextResponse.json(
            { error: "Shop ID is required for shop files" },
            { status: 400 }
          )
        }
        
        const shop = await prisma.shop.findUnique({
          where: { id: targetShopId },
          select: { slug: true, id: true },
        })
        
        console.log('🔍 Shop found:', { shop, hasSlug: !!shop?.slug })
        
        if (shop?.slug) {
          shopSlug = shop.slug
          // עבור shops, נשתמש ב-fileType (logo, favicon, builders) או entityType
          finalEntityType = fileType || 'logo' // ברירת מחדל logo
          finalIdentifier = null
          console.log('✅ Shop slug set:', shopSlug, 'finalEntityType:', finalEntityType)
        } else {
          console.error('❌ Shop not found or missing slug:', { targetShopId, shop, entityId, shopId })
          return NextResponse.json(
            { error: "Shop not found or missing slug", details: { targetShopId, shopExists: !!shop } },
            { status: 400 }
          )
        }
      } else {
        // עבור products, collections, pages וכו' - צריך למצוא את ה-shopId
        let targetShopId: string | null = null
        
        if (entityId !== 'new') {
          // מוצר/קטגוריה/דף קיים - נמצא את ה-shopId
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
          } else if (entityType === 'navigations') {
            // עבור navigations - entityId הוא item.id, אבל אנחנו צריכים את ה-shopId
            // נשתמש ב-shopId שנשלח ישירות
            targetShopId = shopId
          } else if (entityType === 'reviews') {
            // עבור reviews - entityId הוא productId, נמצא את ה-shopId דרך המוצר
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
      // שמירת mimeType המקורי עבור וידאו, או WebP עבור תמונות
      const finalMimeType = extension === 'webp' 
        ? 'image/webp' 
        : (file.type || 'application/octet-stream')
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
    // שמירת mimeType המקורי עבור וידאו, או WebP עבור תמונות
    const finalMimeType = extension === 'webp' 
      ? 'image/webp' 
      : (file.type || null)
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

