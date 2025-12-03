import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - קבלת מוצרים קשורים והמלצות
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "8")
    const type = searchParams.get("type") || "related" // "related" | "recommended"

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

    // מציאת המוצר הנוכחי - נסה לפי ID או slug
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shopId: shop.id,
        status: "PUBLISHED",
        isHidden: false,
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

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    let relatedProducts: any[] = []

    if (type === "related") {
      // מוצרים מאותה קטגוריה
      const categoryIds = (product as any).categories.map((pc: any) => pc.categoryId)
      
      if (categoryIds.length > 0) {
        relatedProducts = await prisma.product.findMany({
          where: {
            shopId: shop.id,
            status: "PUBLISHED",
            isHidden: false,
            availability: {
              not: "OUT_OF_STOCK",
            },
            id: {
              not: product.id,
            },
            categories: {
              some: {
                categoryId: {
                  in: categoryIds,
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
          },
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
        })
      }

      // אם אין מספיק מוצרים, הוסף מוצרים עם תגיות דומות
      if (relatedProducts.length < limit) {
        const tagNames = product.tags.map((t: any) => t.name)
        if (tagNames.length > 0) {
          const additionalProducts = await prisma.product.findMany({
            where: {
              shopId: shop.id,
              status: "PUBLISHED",
              isHidden: false,
              availability: {
                not: "OUT_OF_STOCK",
              },
              id: {
                not: {
                  in: [product.id, ...relatedProducts.map((p: any) => p.id)],
                },
              },
              tags: {
                some: {
                  name: {
                    in: tagNames,
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
            },
            take: limit - relatedProducts.length,
            orderBy: {
              createdAt: "desc",
            },
          })
          relatedProducts = [...relatedProducts, ...additionalProducts]
        }
      }
    } else {
      // מוצרים מומלצים - פופולריים או חדשים
      relatedProducts = await prisma.product.findMany({
        where: {
          shopId: shop.id,
          status: "PUBLISHED",
          isHidden: false,
          availability: {
            not: "OUT_OF_STOCK",
          },
          id: {
            not: product.id,
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
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      })
    }

    return NextResponse.json({
      products: relatedProducts,
      type,
    })
  } catch (error) {
    console.error("Error fetching related products:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

