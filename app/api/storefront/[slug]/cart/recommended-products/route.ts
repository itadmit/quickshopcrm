import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - קבלת מוצרים מומלצים לפי המוצרים בעגלה
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const productIds = searchParams.get("productIds")?.split(",") || []
    const limit = parseInt(searchParams.get("limit") || "8")

    // מציאת החנות
    const shop = await prisma.shop.findUnique({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    let recommendedProducts: any[] = []

    if (productIds.length > 0) {
      // טעינת המוצרים מהעגלה כדי למצוא קטגוריות ותגיות משותפות
      const cartProducts = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          shopId: shop.id,
        },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          tags: true,
        },
      })

      // איסוף כל הקטגוריות והתגיות מהמוצרים בעגלה
      const categoryIds = new Set<string>()
      const tagNames = new Set<string>()

      cartProducts.forEach((product) => {
        product.categories.forEach((pc) => {
          categoryIds.add(pc.categoryId)
        })
        product.tags.forEach((tag) => {
          tagNames.add(tag.name)
        })
      })

      // מציאת מוצרים מאותן קטגוריות
      if (categoryIds.size > 0) {
        const categoryProducts = await prisma.product.findMany({
          where: {
            shopId: shop.id,
            status: "PUBLISHED",
            availability: {
              not: "OUT_OF_STOCK",
            },
            id: {
              notIn: productIds,
            },
            categories: {
              some: {
                categoryId: {
                  in: Array.from(categoryIds),
                },
              },
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            images: true,
            availability: true,
            variants: {
              select: {
                id: true,
                name: true,
                price: true,
                comparePrice: true,
                inventoryQty: true,
                sku: true,
              },
            },
          },
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
        })
        recommendedProducts = [...recommendedProducts, ...categoryProducts]
      }

      // אם אין מספיק, הוסף לפי תגיות
      if (recommendedProducts.length < limit && tagNames.size > 0) {
        const tagProducts = await prisma.product.findMany({
          where: {
            shopId: shop.id,
            status: "PUBLISHED",
            availability: {
              not: "OUT_OF_STOCK",
            },
            id: {
              notIn: [...productIds, ...recommendedProducts.map((p) => p.id)],
            },
            tags: {
              some: {
                name: {
                  in: Array.from(tagNames),
                },
              },
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            images: true,
            availability: true,
            variants: {
              select: {
                id: true,
                name: true,
                price: true,
                comparePrice: true,
                inventoryQty: true,
                sku: true,
              },
            },
          },
          take: limit - recommendedProducts.length,
          orderBy: {
            createdAt: "desc",
          },
        })
        recommendedProducts = [...recommendedProducts, ...tagProducts]
      }
    }

    // אם אין מספיק מוצרים, הוסף מוצרים פופולריים או חדשים
    if (recommendedProducts.length < limit) {
      const additionalProducts = await prisma.product.findMany({
        where: {
          shopId: shop.id,
          status: "PUBLISHED",
          availability: {
            not: "OUT_OF_STOCK",
          },
          id: {
            notIn: [...productIds, ...recommendedProducts.map((p) => p.id)],
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          images: true,
          availability: true,
        },
        take: limit - recommendedProducts.length,
        orderBy: {
          createdAt: "desc",
        },
      })
      recommendedProducts = [...recommendedProducts, ...additionalProducts]
    }

    // עיבוד המחירים - אם למוצר יש וריאציות ומחיר בסיסי של 0, נשתמש במחיר המינימלי מהוריאציות
    const processedProducts = recommendedProducts.map((product) => {
      let displayPrice = product.price
      let displayComparePrice = product.comparePrice

      // אם המוצר עם וריאציות והמחיר הבסיסי הוא 0
      if (product.variants && product.variants.length > 0 && product.price === 0) {
        // מצא את המחיר המינימלי מהוריאציות
        const variantPrices = product.variants
          .map((v: any) => v.price)
          .filter((p: number) => p > 0)
        
        if (variantPrices.length > 0) {
          displayPrice = Math.min(...variantPrices)
          
          // אם יש comparePrice בוריאציות, קח את המינימלי
          const variantComparePrices = product.variants
            .map((v: any) => v.comparePrice)
            .filter((p: number | null) => p && p > 0)
          
          if (variantComparePrices.length > 0) {
            displayComparePrice = Math.min(...variantComparePrices)
          }
        }
      }

      // החזר את המוצר ללא הוריאציות (לא צריכים אותן בצד הלקוח)
      const { variants, ...productWithoutVariants } = product
      return {
        ...productWithoutVariants,
        price: displayPrice,
        comparePrice: displayComparePrice,
      }
    })

    return NextResponse.json({
      products: processedProducts.slice(0, limit),
    })
  } catch (error) {
    console.error("Error fetching recommended products:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

