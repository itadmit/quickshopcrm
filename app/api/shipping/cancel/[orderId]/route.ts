import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getShippingProvider } from "@/lib/shipping/registry"
import { createEvent } from "@/lib/events"

// POST - ביטול משלוח
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
    const { reason } = body

    // בדיקה שההזמנה שייכת לחברה
    const order = await prisma.order.findFirst({
      where: {
        id: params.orderId,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: { shop: true },
    })

    if (!order) {
      return NextResponse.json(
        { error: "הזמנה לא נמצאה" },
        { status: 404 }
      )
    }

    if (!order.shippingProvider || !order.shippingSentAt) {
      return NextResponse.json(
        { error: "ההזמנה לא נשלחה לחברת משלוחים" },
        { status: 400 }
      )
    }

    // טעינת אינטגרציה
    const integration = await prisma.integration.findFirst({
      where: {
        companyId: session.user.companyId,
        type: `${order.shippingProvider.toUpperCase()}_SHIPPING` as any,
        isActive: true,
      },
    })

    if (!integration) {
      return NextResponse.json(
        { error: "אינטגרציה לא נמצאה" },
        { status: 404 }
      )
    }

    // טעינת provider
    const provider = getShippingProvider(order.shippingProvider)
    if (!provider) {
      return NextResponse.json(
        { error: "חברת משלוחים לא נתמכת" },
        { status: 400 }
      )
    }

    // ביטול משלוח
    const shipmentId = (order.shippingData as any)?.shipmentId || order.shippingTrackingNumber
    if (!shipmentId) {
      return NextResponse.json(
        { error: "מספר משלוח לא נמצא" },
        { status: 400 }
      )
    }

    const cancelResult = await provider.cancelShipment(
      shipmentId,
      {
        apiKey: integration.apiKey,
        apiSecret: integration.apiSecret,
        ...(integration.config as any),
      },
      reason
    )

    if (!cancelResult.success) {
      return NextResponse.json(
        {
          error: cancelResult.error || "לא ניתן לבטל את המשלוח",
          errorCode: cancelResult.errorCode,
          canRetry: cancelResult.canRetry,
        },
        { status: 400 }
      )
    }

    // עדכון הזמנה
    await prisma.order.update({
      where: { id: params.orderId },
      data: {
        shippingStatus: "cancelled",
        shippingStatusUpdatedAt: new Date(),
        shippingData: {
          ...((order.shippingData as any) || {}),
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      },
    })

    // יצירת אירוע
    await createEvent(
      order.shopId,
      "order.shipping.cancelled",
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        provider: order.shippingProvider,
        reason,
      },
      "order",
      order.id,
      session.user.id
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error cancelling shipment:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה בביטול המשלוח",
      },
      { status: 500 }
    )
  }
}

