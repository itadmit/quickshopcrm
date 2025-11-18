import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { jwtVerify } from "jose"

// GET - קבלת פרטי הזמנה בסטורפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    // נסה למצוא את החנות לפי slug או ID
    let shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    // אם לא נמצא לפי slug, ננסה לחפש לפי ID
    if (!shop) {
      shop = await prisma.shop.findFirst({
        where: {
          id: params.slug,
          isPublished: true,
        },
      })
    }

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const token = req.headers.get("x-customer-id")
    
    if (!token) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 401 })
    }

    // ניסיון לפענח JWT token
    let customerId: string | null = null
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
      const { payload } = await jwtVerify(token, secret)
      
      if (payload.shopId !== shop.id) {
        return NextResponse.json(
          { error: "אימות נכשל" },
          { status: 401 }
        )
      }
      
      customerId = payload.customerId as string
    } catch (jwtError) {
      // אם זה לא JWT, נניח שזה customerId ישיר (למקרה של backward compatibility)
      customerId = token
    }

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 401 })
    }

    // מציאת ההזמנה
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        shopId: shop.id,
        customerId: customerId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                slug: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error fetching storefront order:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

