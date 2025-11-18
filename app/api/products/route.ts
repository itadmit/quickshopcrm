import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createProductSchema = z.object({
  shopId: z.string(),
  name: z.string().min(2, "שם המוצר חייב להכיל לפחות 2 תווים"),
  slug: z.string().min(2).regex(/^[\u0590-\u05FFa-z0-9\-]+$/, "סלאג יכול להכיל רק אותיות עבריות/אנגליות, מספרים ומקפים").optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().min(0, "מחיר חייב להיות חיובי"),
  comparePrice: z.number().optional(),
  cost: z.number().optional(),
  taxEnabled: z.boolean().default(true),
  inventoryEnabled: z.boolean().default(true),
  inventoryQty: z.number().int().default(0),
  lowStockAlert: z.number().int().optional(),
  trackInventory: z.boolean().default(true),
  sellWhenSoldOut: z.boolean().default(false),
  priceByWeight: z.boolean().default(false),
  showPricePer100ml: z.boolean().default(false),
  pricePer100ml: z.union([z.number(), z.null()]).optional(),
  weight: z.union([z.number(), z.null()]).optional(),
  dimensions: z.any().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  scheduledPublishDate: z.union([z.string().datetime(), z.null(), z.literal("")]).optional(),
  notifyOnPublish: z.boolean().default(false),
  images: z.array(z.string()).default([]),
  video: z.string().optional(),
  minQuantity: z.number().int().optional(),
  maxQuantity: z.number().int().optional(),
  availability: z.enum(["IN_STOCK", "OUT_OF_STOCK", "PRE_ORDER", "BACKORDER", "DISCONTINUED"]).default("IN_STOCK"),
  availableDate: z.string().datetime().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  customFields: z.any().optional(),
  badges: z.any().optional(),
  categories: z.array(z.string()).optional(),
  addonIds: z.array(z.string()).optional(),
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
    const ids = searchParams.get("ids")
    const collectionId = searchParams.get("collectionId")
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

    if (ids) {
      const idsArray = ids.split(",").filter(Boolean)
      where.id = { in: idsArray }
    }

    if (collectionId) {
      where.collections = {
        some: {
          collectionId: collectionId
        }
      }
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
          variants: {
            select: {
              id: true,
              name: true,
              price: true,
              comparePrice: true,
            },
          },
          options: {
            select: {
              id: true,
              name: true,
              values: true,
            },
            orderBy: {
              position: 'asc',
            },
          },
          categories: {
            select: {
              categoryId: true,
              category: {
                select: {
                  name: true,
                },
              },
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

    // יצירת slug אם לא סופק (supports Hebrew and English)
    let slug = data.slug
    if (!slug) {
      slug = data.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/[^\u0590-\u05FFa-z0-9\-]+/g, "") // Keep Hebrew, English, numbers, and hyphens
        .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
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

    // הסר addonIds ו-categories מה-productData (הם לא חלק מהמודל של Product)
    const addonIds = productData.addonIds
    const categories = productData.categories
    delete productData.addonIds
    delete productData.categories

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

    // שמירת קטגוריות (collections)
    if (categories && Array.isArray(categories) && categories.length > 0) {
      try {
        await Promise.all(
          categories.map(async (collectionId: string) => {
            await prisma.productCollection.create({
              data: {
                productId: product.id,
                collectionId: collectionId,
                position: 0,
              },
            })
          })
        )
      } catch (error) {
        console.error("Error creating product collections:", error)
        // לא נכשיל את כל הבקשה בגלל שגיאה בקטגוריות
      }
    }

    // עדכון ProductAddons - הוסף את productId ל-productIds של כל addon
    if (addonIds && Array.isArray(addonIds) && addonIds.length > 0) {
      try {
        await Promise.all(
          addonIds.map(async (addonId: string) => {
            const addon = await prisma.productAddon.findUnique({
              where: { id: addonId },
              select: { productIds: true },
            })

            if (addon) {
              // הוסף את productId אם הוא עדיין לא קיים
              const updatedProductIds = addon.productIds.includes(product.id)
                ? addon.productIds
                : [...addon.productIds, product.id]

              await prisma.productAddon.update({
                where: { id: addonId },
                data: { productIds: updatedProductIds },
              })
            }
          })
        )
      } catch (error) {
        console.error("Error updating product addons:", error)
        // לא נכשיל את כל הבקשה בגלל שגיאה ב-addons
      }
    }

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

