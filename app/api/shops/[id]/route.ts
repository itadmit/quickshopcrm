import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { moveFilesInS3, extractS3KeyFromUrl } from "@/lib/s3"

const updateShopSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  favicon: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  workingHours: z.any().nullable().optional(),
  currency: z.string().optional(),
  taxEnabled: z.boolean().optional(),
  taxRate: z.number().optional(),
  pricesIncludeTax: z.boolean().optional(),
  theme: z.string().optional(),
  themeSettings: z.any().nullable().optional(),
  domain: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
  settings: z.any().nullable().optional(),
  customerDiscountSettings: z.any().nullable().optional(),
})

// GET - קבלת פרטי חנות
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const shop = await prisma.shop.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
            customers: true,
            collections: true,
          },
        },
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    return NextResponse.json(shop)
  } catch (error) {
    console.error("Error fetching shop:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון חנות
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהחנות שייכת לחברה
    const existingShop = await prisma.shop.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    })

    if (!existingShop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateShopSchema.parse(body)

    // אם משנים slug, בדיקה שהוא לא תפוס והעברת קבצים
    if (data.slug && data.slug !== existingShop.slug) {
      const slugExists = await prisma.shop.findUnique({
        where: { slug: data.slug },
      })

      if (slugExists) {
        return NextResponse.json(
          { error: "חנות עם slug זה כבר קיימת" },
          { status: 400 }
        )
      }

      // העברת קבצים מ-S3 מהתיקייה הישנה לחדשה
      const useS3 = process.env.AWS_S3_BUCKET_NAME && 
                    process.env.AWS_ACCESS_KEY_ID && 
                    process.env.AWS_SECRET_ACCESS_KEY

      if (useS3) {
        try {
          const oldPrefix = `shops/${existingShop.slug}/`
          const newPrefix = `shops/${data.slug}/`
          
          const result = await moveFilesInS3(oldPrefix, newPrefix)
          console.log(`Moved ${result.moved} files, ${result.failed} failed`)
          
          // עדכון כל ה-URLs במסד הנתונים
          // 1. עדכון File records
          const files = await prisma.file.findMany({
            where: {
              entityType: 'shops',
              entityId: params.id,
              path: { contains: existingShop.slug },
            },
          })

          for (const file of files) {
            const oldKey = extractS3KeyFromUrl(file.path)
            if (oldKey && oldKey.startsWith(oldPrefix)) {
              const newKey = oldKey.replace(oldPrefix, newPrefix)
              const newUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${newKey}`
              
              await prisma.file.update({
                where: { id: file.id },
                data: { path: newUrl },
              })
            }
          }

          // 2. עדכון logo ו-favicon ב-Shop
          const updateData: { logo?: string | null; favicon?: string | null } = {}
          
          if (existingShop.logo) {
            const logoKey = extractS3KeyFromUrl(existingShop.logo)
            if (logoKey && logoKey.startsWith(oldPrefix)) {
              const newLogoKey = logoKey.replace(oldPrefix, newPrefix)
              updateData.logo = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${newLogoKey}`
            }
          }
          
          if (existingShop.favicon) {
            const faviconKey = extractS3KeyFromUrl(existingShop.favicon)
            if (faviconKey && faviconKey.startsWith(oldPrefix)) {
              const newFaviconKey = faviconKey.replace(oldPrefix, newPrefix)
              updateData.favicon = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${newFaviconKey}`
            }
          }

          // הוספת העדכונים ל-data
          if (Object.keys(updateData).length > 0) {
            Object.assign(data, updateData)
          }
        } catch (error) {
          console.error("Error moving files in S3:", error)
          // ממשיכים גם אם יש שגיאה בהעברת קבצים
        }
      }
    }

    // עדכון החנות
    const shop = await prisma.shop.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        favicon: true,
        category: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: shop.id,
        type: "shop.updated",
        entityType: "shop",
        entityId: shop.id,
        payload: {
          shopId: shop.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(shop)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating shop:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת חנות
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // מחיקת החנות (עם כל הקשרים - cascade)
    await prisma.shop.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Shop deleted successfully" })
  } catch (error) {
    console.error("Error deleting shop:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

