import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createCategorySchema = z.object({
  shopId: z.string(),
  name: z.string().min(2, "שם הקטגוריה חייב להכיל לפחות 2 תווים"),
  slug: z.string().min(2).regex(/^[\u0590-\u05FFa-zA-Z0-9\-]+$/).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional(),
  type: z.enum(["MANUAL", "AUTOMATIC"]).default("MANUAL"),
  rules: z.any().optional(),
  productIds: z.array(z.string()).optional(),
  isPublished: z.boolean().default(true),
})

// GET - קבלת כל הקטגוריות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const search = searchParams.get("search")

    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const categories = await prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        parentId: true,
        type: true,
        isPublished: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת קטגוריה חדשה
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createCategorySchema.parse(body)

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // יצירת slug אם לא סופק (תומך בעברית)
    let slug = data.slug
    if (!slug) {
      slug = data.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\u0590-\u05FFa-zA-Z0-9\-]+/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
    }

    // בדיקה אם slug כבר קיים בחנות זו
    const existingCategory = await prisma.category.findFirst({
      where: {
        shopId: data.shopId,
        slug,
      },
    })

    if (existingCategory) {
      slug = `${slug}-${Date.now()}`
    }

    // בדיקת parentId אם קיים
    if (data.parentId) {
      const parent = await prisma.category.findFirst({
        where: {
          id: data.parentId,
          shopId: data.shopId,
        },
      })

      if (!parent) {
        return NextResponse.json({ error: "Parent category not found" }, { status: 404 })
      }
    }

    const category = await prisma.category.create({
      data: {
        shopId: data.shopId,
        name: data.name,
        slug,
        description: data.description,
        image: data.image,
        parentId: data.parentId,
        type: data.type || "MANUAL",
        rules: data.rules,
        isPublished: data.isPublished ?? true,
      },
    })

    // הוספת מוצרים אם זה MANUAL
    if (data.type === "MANUAL" && data.productIds && data.productIds.length > 0) {
      await Promise.all(
        data.productIds.map((productId) =>
          prisma.productCategory.create({
            data: {
              productId,
              categoryId: category.id,
            },
          })
        )
      )
    }

    // אם זה AUTOMATIC, נשתמש ב-collection-engine לעדכון
    if (data.type === "AUTOMATIC" && data.rules) {
      const { applyCollectionRules } = await import("@/lib/collection-engine")
      const matchingProductIds = await applyCollectionRules(data.shopId, data.rules)
      
      // הוספת מוצרים לקטגוריה
      if (matchingProductIds.length > 0) {
        // יצירה ב-batch עם upsert כדי למנוע כפילויות
        await prisma.$transaction(
          matchingProductIds.map((productId) =>
            prisma.productCategory.upsert({
              where: {
                productId_categoryId: {
                  productId,
                  categoryId: category.id,
                },
              },
              update: {},
              create: {
                productId,
                categoryId: category.id,
              },
            })
          )
        )
      }
    }

    return NextResponse.json(category)
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating category:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

