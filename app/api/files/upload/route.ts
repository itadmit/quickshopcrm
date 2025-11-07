import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { uploadToS3, generateS3Key } from "@/lib/s3"

interface ExtendedSession {
  user: {
    id: string
    companyId: string
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

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "Missing entityType or entityId" }, { status: 400 })
    }

    // המרת הקובץ ל-buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    
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
        // עבור products, collections וכו' - צריך למצוא את ה-shopId
        let targetShopId: string | null = null
        
        if (entityId !== 'new') {
          // מוצר/קולקציה קיים - נמצא את ה-shopId
          if (entityType === 'products') {
            const product = await prisma.product.findUnique({
              where: { id: entityId },
              select: { shopId: true },
            })
            targetShopId = product?.shopId || null
          } else if (entityType === 'collections') {
            const collection = await prisma.collection.findUnique({
              where: { id: entityId },
              select: { shopId: true },
            })
            targetShopId = collection?.shopId || null
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
      filePath = await uploadToS3(buffer, s3Key, file.type || 'application/octet-stream')
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
    const fileRecord = await prisma.file.create({
      data: {
        companyId: session.user.companyId,
        entityType,
        entityId,
        path: filePath,
        name: file.name,
        size: buffer.length,
        mimeType: file.type || null,
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

