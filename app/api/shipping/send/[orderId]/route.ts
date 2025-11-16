import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ShippingManager } from "@/lib/shipping/manager"

// POST - שליחת הזמנה לחברת משלוחים
export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const body = await req.json()
    const { provider, forceResend } = body

    if (!provider) {
      return NextResponse.json(
        { error: "נא לציין חברת משלוחים" },
        { status: 400 }
      )
    }

    // בדיקה שההזמנה שייכת לחברה
    const order = await prisma.order.findFirst({
      where: {
        id: params.orderId,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "הזמנה לא נמצאה" },
        { status: 404 }
      )
    }

    // שליחה דרך ShippingManager
    const response = await ShippingManager.sendOrder(params.orderId, provider, {
      forceResend: forceResend || false,
      userId: session.user.id,
    })

    if (!response.success) {
      return NextResponse.json(
        {
          error: response.error || "שגיאה בשליחת ההזמנה",
          errorCode: response.errorCode,
          retryable: response.retryable,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      shipmentId: response.shipmentId,
      trackingNumber: response.trackingNumber,
      labelUrl: response.labelUrl,
    })
  } catch (error: any) {
    console.error("Error sending order to shipping provider:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה בשליחת ההזמנה",
      },
      { status: 500 }
    )
  }
}

