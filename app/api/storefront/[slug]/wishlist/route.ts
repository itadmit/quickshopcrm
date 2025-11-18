import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - קבלת רשימת משאלות
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
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

    // קבלת customerId מה-header או cookie
    const customerId = req.headers.get("x-customer-id")

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 401 })
    }

    const wishlistItems = await prisma.wishlistItem.findMany({
      where: {
        shopId: shop.id,
        customerId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            images: true,
            availability: true,
            status: true,
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
        },
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(wishlistItems)
  } catch (error) {
    console.error("Error fetching wishlist:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - הוספה לרשימת משאלות
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await req.json()
    const { productId, variantId, customerId } = body

    if (!productId || !customerId) {
      return NextResponse.json(
        { error: "Product ID and Customer ID are required" },
        { status: 400 }
      )
    }

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

    // בדיקה שהמוצר קיים
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        shopId: shop.id,
        status: "PUBLISHED",
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // בדיקה אם כבר קיים
    const existing = await prisma.wishlistItem.findUnique({
      where: {
        customerId_productId_variantId: {
          customerId,
          productId,
          variantId: variantId || null,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ message: "Already in wishlist", item: existing })
    }

    // יצירת פריט ברשימת משאלות
    const wishlistItem = await prisma.wishlistItem.create({
      data: {
        shopId: shop.id,
        customerId,
        productId,
        variantId: variantId || null,
      },
      include: {
        product: {
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
        },
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(wishlistItem, { status: 201 })
  } catch (error: any) {
    console.error("Error adding to wishlist:", error)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Item already in wishlist" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - הסרה מרשימת משאלות
export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId")
    const variantId = searchParams.get("variantId")
    const customerId = searchParams.get("customerId")
    const itemId = searchParams.get("itemId")

    if (!customerId || (!productId && !itemId)) {
      return NextResponse.json(
        { error: "Customer ID and Product ID or Item ID are required" },
        { status: 400 }
      )
    }

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

    if (itemId) {
      // מחיקה לפי ID
      await prisma.wishlistItem.delete({
        where: {
          id: itemId,
          shopId: shop.id,
          customerId,
        },
      })
    } else {
      // מחיקה לפי productId + variantId
      // הערה: Prisma דורש null במקום undefined עבור שדות אופציונליים ב-unique constraint
      const deleteWhere: any = {
        customerId_productId_variantId: {
          customerId,
          productId: productId!,
        },
      }
      if (variantId) {
        deleteWhere.customerId_productId_variantId.variantId = variantId
      } else {
        deleteWhere.customerId_productId_variantId.variantId = null
      }
      await prisma.wishlistItem.delete({
        where: deleteWhere,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing from wishlist:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

