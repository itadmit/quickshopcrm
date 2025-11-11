import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - קבלת דף סטטי ספציפי לפרונט
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

    // נחפש לפי slug או ID - נשתמש ב-OR כדי לתמוך בשניהם
    const page = await prisma.page.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shopId: shop.id,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        template: true,
        displayType: true,
        selectedProducts: true,
        featuredImage: true,
        couponCode: true,
        seoTitle: true,
        seoDescription: true,
      },
    })

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // אם זה טמפלט "הבחירות של", נטען את המוצרים
    let products = null
    if (page.template === "CHOICES_OF" && page.selectedProducts && Array.isArray(page.selectedProducts) && page.selectedProducts.length > 0) {
      products = await prisma.product.findMany({
        where: {
          id: { in: page.selectedProducts as string[] },
          shopId: shop.id,
          status: "PUBLISHED",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          images: true,
          description: true,
          inventoryQty: true,
          availability: true,
          variants: {
            select: {
              id: true,
              name: true,
              price: true,
              comparePrice: true,
              inventoryQty: true,
              sku: true,
              option1: true,
              option1Value: true,
              option2: true,
              option2Value: true,
              option3: true,
              option3Value: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    }

    return NextResponse.json({
      ...page,
      products: products || undefined,
    })
  } catch (error) {
    console.error("Error fetching page:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

