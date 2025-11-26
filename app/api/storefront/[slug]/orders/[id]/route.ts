import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyStorefrontCustomer } from "@/lib/storefront-auth"

// GET - קבלת פרטי הזמנה בסטורפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    // אימות לקוח (כולל בדיקה שהלקוח קיים)
    const auth = await verifyStorefrontCustomer(req, params.slug)
    if (!auth.success || !auth.customerId || !auth.shop) {
      return auth.error!
    }

    // מציאת ההזמנה
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        shopId: auth.shop.id,
        customerId: auth.customerId,
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

