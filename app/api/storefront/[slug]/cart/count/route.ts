import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

// GET - קבלת מספר פריטים בעגלה
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // נסה למצוא את החנות לפי slug או ID
    let shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    // אם לא נמצא לפי slug, ננסה לחפש לפי ID (למקרה שה-slug השתנה)
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

    const cookieStore = await cookies()
    const sessionId = cookieStore.get("cart_session")?.value
    const customerId = req.headers.get("x-customer-id") || null

    if (!sessionId && !customerId) {
      return NextResponse.json({ count: 0 })
    }

    let cart = await prisma.cart.findFirst({
      where: {
        shopId: shop.id,
        ...(customerId ? { customerId } : { sessionId }),
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!cart) {
      return NextResponse.json({ count: 0 })
    }

    // ספירת פריטים בעגלה
    const cartItems = (cart.items as any[]) || []
    const totalQuantity = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0)

    return NextResponse.json({
      count: totalQuantity,
      itemCount: cartItems.length, // מספר סוגי פריטים שונים
    })
  } catch (error) {
    console.error("Error fetching cart count:", error)
    return NextResponse.json(
      { error: "Internal server error", count: 0 },
      { status: 500 }
    )
  }
}

