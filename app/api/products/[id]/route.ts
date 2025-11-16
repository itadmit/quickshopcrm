import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[\u0590-\u05FFa-z0-9\-]+$/, "סלאג יכול להכיל רק אותיות עבריות/אנגליות, מספרים ומקפים").optional(),
  description: z.union([z.string(), z.null()]).optional(),
  sku: z.union([z.string(), z.null()]).optional(),
  price: z.number().min(0).optional(),
  comparePrice: z.union([z.number(), z.null()]).optional(),
  cost: z.union([z.number(), z.null()]).optional(),
  taxEnabled: z.boolean().optional(),
  inventoryEnabled: z.boolean().optional(),
  inventoryQty: z.number().int().optional(),
  lowStockAlert: z.union([z.number().int(), z.null()]).optional(),
  trackInventory: z.boolean().optional(),
  sellWhenSoldOut: z.boolean().optional(),
  priceByWeight: z.boolean().optional(),
  showPricePer100ml: z.boolean().optional(),
  pricePer100ml: z.union([z.number(), z.null()]).optional(),
  weight: z.union([z.number(), z.null()]).optional(),
  dimensions: z.any().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  scheduledPublishDate: z.union([z.string().datetime(), z.null(), z.literal("")]).optional(),
  notifyOnPublish: z.boolean().optional(),
  images: z.array(z.string()).optional(),
  video: z.union([z.string(), z.null()]).optional(),
  minQuantity: z.union([z.number().int(), z.null()]).optional(),
  maxQuantity: z.union([z.number().int(), z.null()]).optional(),
  availability: z.enum(["IN_STOCK", "OUT_OF_STOCK", "PRE_ORDER", "BACKORDER", "DISCONTINUED"]).optional(),
  availableDate: z.union([z.string().datetime(), z.null()]).optional(),
  seoTitle: z.union([z.string(), z.null()]).optional(),
  seoDescription: z.union([z.string(), z.null()]).optional(),
  customFields: z.any().optional(),
  badges: z.any().optional(),
  addonIds: z.array(z.string()).optional(),
  pageTemplateId: z.union([z.string(), z.null()]).optional(),
})

// GET - קבלת פרטי מוצר
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            domain: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        tags: true,
        variants: true,
        options: true,
        reviews: {
          where: {
            isApproved: true,
          },
          take: 10,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT & PATCH - עדכון מוצר
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateProduct(req, params)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateProduct(req, params)
}

async function updateProduct(
  req: NextRequest,
  params: { id: string }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהמוצר שייך לחברה
    const existingProduct = await prisma.product.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateProductSchema.parse(body)

    // אם משנים slug, בדיקה שהוא לא תפוס
    if (data.slug && data.slug !== existingProduct.slug) {
      const slugExists = await prisma.product.findFirst({
        where: {
          shopId: existingProduct.shopId,
          slug: data.slug,
          NOT: {
            id: existingProduct.id
          }
        },
      })

      if (slugExists) {
        return NextResponse.json(
          { error: "מוצר עם slug זה כבר קיים בחנות זו" },
          { status: 400 }
        )
      }
    }

    // המרת תאריכים אם קיימים
    const updateData: any = { ...data }
    if (updateData.availableDate) {
      updateData.availableDate = new Date(updateData.availableDate)
    }
    if (updateData.scheduledPublishDate && updateData.scheduledPublishDate !== "") {
      updateData.scheduledPublishDate = new Date(updateData.scheduledPublishDate)
    } else if (updateData.scheduledPublishDate === null || updateData.scheduledPublishDate === "") {
      updateData.scheduledPublishDate = null
    }

    // הסר addonIds מה-updateData (הוא לא חלק מהמודל של Product)
    const addonIds = updateData.addonIds
    delete updateData.addonIds

    // עדכון המוצר
    const product = await prisma.product.update({
      where: { id: existingProduct.id },
      data: updateData,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            domain: true,
          },
        },
      },
    })

    // עדכון ProductAddons
    if (addonIds !== undefined) {
      try {
        // מצא את כל ה-addons שהמוצר משויך אליהם כרגע
        const existingAddons = await prisma.productAddon.findMany({
          where: {
            shopId: product.shopId,
            productIds: {
              has: product.id,
            },
          },
          select: { id: true, productIds: true },
        })

        const existingAddonIds = existingAddons.map(a => a.id)
        const newAddonIds = Array.isArray(addonIds) ? addonIds : []

        // הסר את המוצר מ-addons שכבר לא נבחרו
        const addonsToRemoveFrom = existingAddonIds.filter(id => !newAddonIds.includes(id))
        await Promise.all(
          addonsToRemoveFrom.map(async (addonId) => {
            const addon = existingAddons.find(a => a.id === addonId)
            if (addon) {
              const updatedProductIds = addon.productIds.filter(pid => pid !== product.id)
              await prisma.productAddon.update({
                where: { id: addonId },
                data: { productIds: updatedProductIds },
              })
            }
          })
        )

        // הוסף את המוצר ל-addons חדשים
        const addonsToAddTo = newAddonIds.filter((id: string) => !existingAddonIds.includes(id))
        await Promise.all(
          addonsToAddTo.map(async (addonId: string) => {
            const addon = await prisma.productAddon.findUnique({
              where: { id: addonId },
              select: { productIds: true },
            })

            if (addon && !addon.productIds.includes(product.id)) {
              await prisma.productAddon.update({
                where: { id: addonId },
                data: { productIds: [...addon.productIds, product.id] },
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
        type: "product.updated",
        entityType: "product",
        entityId: product.id,
        payload: {
          productId: product.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating product:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת מוצר
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהמוצר שייך לחברה
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // הסר את המוצר מכל ה-ProductAddons לפני המחיקה
    try {
      const addonsWithProduct = await prisma.productAddon.findMany({
        where: {
          shopId: product.shopId,
          productIds: {
            has: product.id,
          },
        },
        select: { id: true, productIds: true },
      })

      await Promise.all(
        addonsWithProduct.map(async (addon) => {
          const updatedProductIds = addon.productIds.filter(pid => pid !== product.id)
          await prisma.productAddon.update({
            where: { id: addon.id },
            data: { productIds: updatedProductIds },
          })
        })
      )
    } catch (error) {
      console.error("Error removing product from addons:", error)
      // ממשיכים למחיקה גם אם זה נכשל
    }

    // מחיקת המוצר (עם כל הקשרים - cascade)
    await prisma.product.delete({
      where: { id: product.id },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: product.shopId,
        type: "product.deleted",
        entityType: "product",
        entityId: product.id,
        payload: {
          productId: product.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "Product deleted successfully" })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

