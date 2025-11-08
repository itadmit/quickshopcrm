import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - שכפול מוצר
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהמוצר שייך לחברה
    const originalProduct = await prisma.product.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        tags: true,
        variants: true,
        options: true,
      },
    })

    if (!originalProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // יצירת slug חדש
    const newSlug = `${originalProduct.slug}-copy-${Date.now()}`

    // יצירת המוצר המשוכפל
    const duplicatedProduct = await prisma.product.create({
      data: {
        shopId: originalProduct.shopId,
        name: `${originalProduct.name} (עותק)`,
        slug: newSlug,
        description: originalProduct.description,
        sku: originalProduct.sku ? `${originalProduct.sku}-copy` : null,
        price: originalProduct.price,
        comparePrice: originalProduct.comparePrice,
        cost: originalProduct.cost,
        taxEnabled: originalProduct.taxEnabled,
        inventoryEnabled: originalProduct.inventoryEnabled,
        inventoryQty: 0, // מלאי 0 במוצר משוכפל
        lowStockAlert: originalProduct.lowStockAlert,
        weight: originalProduct.weight,
        dimensions: originalProduct.dimensions as any,
        status: "DRAFT", // מוצר משוכפל מתחיל כ-DRAFT
        images: originalProduct.images,
        video: originalProduct.video,
        minQuantity: originalProduct.minQuantity,
        maxQuantity: originalProduct.maxQuantity,
        availability: "OUT_OF_STOCK", // מוצר משוכפל מתחיל ללא מלאי
        availableDate: originalProduct.availableDate,
        seoTitle: originalProduct.seoTitle,
        seoDescription: originalProduct.seoDescription,
        customFields: originalProduct.customFields as any,
      },
    })

    // העתקת קטגוריות
    if (originalProduct.categories.length > 0) {
      await prisma.productCategory.createMany({
        data: originalProduct.categories.map((pc) => ({
          productId: duplicatedProduct.id,
          categoryId: pc.categoryId,
        })),
      })
    }

    // העתקת תגיות
    if (originalProduct.tags.length > 0) {
      await prisma.productTag.createMany({
        data: originalProduct.tags.map((tag) => ({
          productId: duplicatedProduct.id,
          name: tag.name,
        })),
      })
    }

    // העתקת options
    if (originalProduct.options.length > 0) {
      for (const option of originalProduct.options) {
        await prisma.productOption.create({
          data: {
            productId: duplicatedProduct.id,
            name: option.name,
            type: option.type || "button",
            values: option.values as any, // הערכים נשמרים ב-JSON
            position: option.position,
          },
        })
      }
    }

    // העתקת variants
    if (originalProduct.variants.length > 0) {
      for (const variant of originalProduct.variants) {
        await prisma.productVariant.create({
          data: {
            productId: duplicatedProduct.id,
            name: variant.name,
            sku: variant.sku ? `${variant.sku}-copy` : null,
            barcode: variant.barcode,
            price: variant.price,
            comparePrice: variant.comparePrice,
            cost: variant.cost,
            weight: variant.weight,
            inventoryQty: 0, // מלאי 0 ב-variant משוכפל
            image: variant.image,
            option1: variant.option1,
            option1Value: variant.option1Value,
            option2: variant.option2,
            option2Value: variant.option2Value,
            option3: variant.option3,
            option3Value: variant.option3Value,
          },
        })
      }
    }

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: duplicatedProduct.shopId,
        type: "product.duplicated",
        entityType: "product",
        entityId: duplicatedProduct.id,
        payload: {
          productId: duplicatedProduct.id,
          originalProductId: originalProduct.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(duplicatedProduct, { status: 201 })
  } catch (error) {
    console.error("Error duplicating product:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

