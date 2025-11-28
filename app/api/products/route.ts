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
  isGiftCard: z.boolean().default(false),
  weight: z.union([z.number(), z.null()]).optional(),
  dimensions: z.any().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
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
  defaultVariantId: z.union([z.string(), z.null()]).optional(),
  exclusiveToTier: z.array(z.string()).optional(),
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
    const categoryId = searchParams.get("categoryId") || searchParams.get("collectionId")
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

    if (categoryId) {
      where.categories = {
        some: {
          categoryId: categoryId
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
          isHidden: true,
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
              inventoryQty: true,
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

    // יצירת slug אוטומטית מהשם (supports Hebrew and English)
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

    // בדיקה אם slug כבר קיים בחנות זו ויצירת slug ייחודי עם מספרים עוקבים
    let baseSlug = slug
    let counter = 1
    let uniqueSlug = slug
    
    while (true) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          shopId: data.shopId,
          slug: uniqueSlug,
        },
      })

      if (!existingProduct) {
        break // מצאנו slug ייחודי
      }

      // נסה עם מספר עוקב
      uniqueSlug = `${baseSlug}-${counter}`
      counter++
    }

    slug = uniqueSlug

    // המרת availableDate אם קיים
    const addonIds = data.addonIds
    const categories = data.categories
    const defaultVariantId = data.defaultVariantId
    const tags = data.tags || []
    const badges = data.badges || []
    const exclusiveToTier = data.exclusiveToTier || []
    
    // בניית customFields עם badges, exclusiveToTier ושדות נוספים שלא קיימים במודל Product
    const customFieldsData: any = data.customFields || {}
    // שמור badges גם אם המערך ריק
    if (badges !== undefined) {
      customFieldsData.badges = badges
    }
    // שמור exclusiveToTier גם אם המערך ריק
    if (exclusiveToTier !== undefined) {
      customFieldsData.exclusiveToTier = exclusiveToTier
    }
    // שמירת שדות שלא קיימים במודל Product
    if (data.trackInventory !== undefined) {
      customFieldsData.trackInventory = data.trackInventory
    }
    if (data.sellWhenSoldOut !== undefined) {
      customFieldsData.sellWhenSoldOut = data.sellWhenSoldOut
    }
    if (data.priceByWeight !== undefined) {
      customFieldsData.priceByWeight = data.priceByWeight
    }
    if (data.showPricePer100ml !== undefined) {
      customFieldsData.showPricePer100ml = data.showPricePer100ml
    }
    if (data.pricePer100ml !== undefined && data.pricePer100ml !== null) {
      customFieldsData.pricePer100ml = data.pricePer100ml
    }
    if (data.isGiftCard !== undefined) {
      customFieldsData.isGiftCard = data.isGiftCard
    }
    if (data.notifyOnPublish !== undefined) {
      customFieldsData.notifyOnPublish = data.notifyOnPublish
    }
    if (data.scheduledPublishDate) {
      customFieldsData.scheduledPublishDate = data.scheduledPublishDate
    }
    
    // בניית productData רק עם השדות הקיימים במודל Product
    const productData: any = {
      shopId: data.shopId,
      name: data.name,
      slug,
      description: data.description || null,
      sku: data.sku || null,
      price: data.price,
      comparePrice: data.comparePrice || null,
      cost: data.cost || null,
      taxEnabled: data.taxEnabled,
      inventoryEnabled: data.inventoryEnabled,
      inventoryQty: data.inventoryQty,
      lowStockAlert: data.lowStockAlert || null,
      weight: data.weight || null,
      dimensions: data.dimensions || null,
      status: data.status,
      isHidden: data.isHidden || false,
      images: data.images || [],
      video: data.video || null,
      minQuantity: data.minQuantity || null,
      maxQuantity: data.maxQuantity || null,
      availability: data.availability,
      availableDate: data.availableDate ? new Date(data.availableDate) : null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      customFields: Object.keys(customFieldsData).length > 0 ? customFieldsData : null,
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

    // שמירת קטגוריות
    if (categories && Array.isArray(categories) && categories.length > 0) {
      try {
        await Promise.all(
          categories.map(async (categoryId: string) => {
            await prisma.productCategory.create({
              data: {
                productId: product.id,
                categoryId: categoryId,
              },
            })
          })
        )
      } catch (error) {
        console.error("Error creating product categories:", error)
        // לא נכשיל את כל הבקשה בגלל שגיאה בקטגוריות
      }
    }

    // שמירת תגיות (tags)
    if (tags && Array.isArray(tags) && tags.length > 0) {
      try {
        // מחיקת כל התגיות הקיימות
        await prisma.productTag.deleteMany({
          where: { productId: product.id },
        })

        // הוספת תגיות חדשות
        await Promise.all(
          tags.map(async (tagName: string) => {
            if (tagName && tagName.trim()) {
              await prisma.productTag.create({
                data: {
                  productId: product.id,
                  name: tagName.trim(),
                },
              })
            }
          })
        )
      } catch (error) {
        console.error("Error creating product tags:", error)
        // לא נכשיל את כל הבקשה בגלל שגיאה בתגיות
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

