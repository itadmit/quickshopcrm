import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createProductSchema = z.object({
  shopId: z.string(),
  name: z.string().min(2, "שם המוצר חייב להכיל לפחות 2 תווים"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().min(0, "מחיר חייב להיות חיובי"),
  comparePrice: z.number().optional(),
  cost: z.number().optional(),
  taxEnabled: z.boolean().default(true),
  inventoryEnabled: z.boolean().default(true),
  inventoryQty: z.number().int().default(0),
  lowStockAlert: z.number().int().optional(),
  weight: z.number().optional(),
  dimensions: z.any().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  images: z.array(z.string()).default([]),
  video: z.string().optional(),
  minQuantity: z.number().int().optional(),
  maxQuantity: z.number().int().optional(),
  availability: z.enum(["IN_STOCK", "OUT_OF_STOCK", "PRE_ORDER", "BACKORDER", "DISCONTINUED"]).default("IN_STOCK"),
  availableDate: z.string().datetime().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  customFields: z.any().optional(),
})

// GET - קבלת כל המוצרים
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    // בניית where clause
    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          price: true,
          comparePrice: true,
          status: true,
          images: true,
          inventoryQty: true,
          availability: true,
          createdAt: true,
          updatedAt: true,
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              domain: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת מוצר חדש
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקת גישה לתכונות מסחר
    const { checkSubscriptionAccess } = await import("@/lib/subscription-middleware")
    const accessCheck = await checkSubscriptionAccess(true, false)
    if (accessCheck) {
      return accessCheck
    }

    const body = await req.json()
    const data = createProductSchema.parse(body)

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

    // יצירת slug אם לא סופק
    let slug = data.slug
    if (!slug) {
      slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    }

    // בדיקה אם slug כבר קיים בחנות זו
    const existingProduct = await prisma.product.findFirst({
      where: {
        shopId: data.shopId,
        slug,
      },
    })

    if (existingProduct) {
      slug = `${slug}-${Date.now()}`
    }

    // המרת availableDate אם קיים
    const productData: any = {
      ...data,
      slug,
    }

    if (productData.availableDate) {
      productData.availableDate = new Date(productData.availableDate)
    }

    // יצירת מוצר
    const product = await prisma.product.create({
      data: productData,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: product.shopId,
        type: "product.created",
        entityType: "product",
        entityId: product.id,
        payload: {
          productId: product.id,
          name: product.name,
          price: product.price,
          shopId: product.shopId,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating product:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

