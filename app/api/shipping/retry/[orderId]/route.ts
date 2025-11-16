import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ShippingManager } from "@/lib/shipping/manager"

// POST - ניסיון חוזר לשליחה שנכשלה
export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
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

    if (!order.shippingProvider) {
      return NextResponse.json(
        { error: "לא נבחרה חברת משלוחים" },
        { status: 400 }
      )
    }

    // שליחה מחדש עם forceResend
    const response = await ShippingManager.sendOrder(
      params.orderId,
      order.shippingProvider,
      {
        forceResend: true,
        userId: session.user.id,
      }
    )

    if (!response.success) {
      return NextResponse.json(
        {
          error: response.error || "שגיאה בשליחה מחדש",
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
    console.error("Error retrying shipment:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה בשליחה מחדש",
      },
      { status: 500 }
    )
  }
}

