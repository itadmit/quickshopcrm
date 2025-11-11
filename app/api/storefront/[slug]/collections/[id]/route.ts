import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - קבלת קולקציה ספציפית לפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    // מציאת החנות
    const shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const collection = await prisma.collection.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shopId: shop.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        type: true,
        rules: true,
        seoTitle: true,
        seoDescription: true,
        _count: {
          select: {
            products: true,
          },
        },
        products: {
          select: {
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
              }
            },
            position: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    })

    if (!collection) {
      return NextResponse.json({ error: "קולקציה לא נמצאה" }, { status: 404 })
    }

    return NextResponse.json(collection)
  } catch (error) {
    console.error("Error fetching collection:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

