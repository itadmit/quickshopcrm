import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getShippingProvider } from "@/lib/shipping/registry"

// GET - מעקב אחר משלוח
export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    // בדיקה אם זה ID או מספר הזמנה
    const whereClause: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    // אם זה נראה כמו UUID או CUID (מתחיל באות קטנה ואורך 25 תווים), חפש לפי ID, אחרת לפי מספר הזמנה
    const isUUID = params.orderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    const isCUID = params.orderId.match(/^[a-z][a-z0-9]{24}$/i) // CUID מתחיל באות קטנה ואורך 25 תווים
    
    if (isUUID || isCUID) {
      whereClause.id = params.orderId
    } else {
      whereClause.orderNumber = params.orderId
    }

    // בדיקה שההזמנה שייכת לחברה
    const order = await prisma.order.findFirst({
      where: whereClause,
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

    // קבלת סטטוס
    const shipmentId = (order.shippingData as any)?.shipmentId || order.shippingTrackingNumber
    if (!shipmentId) {
      return NextResponse.json(
        { error: "מספר משלוח לא נמצא" },
        { status: 400 }
      )
    }

    const status = await provider.getTrackingStatus(shipmentId, {
      apiKey: integration.apiKey,
      apiSecret: integration.apiSecret,
      ...(integration.config as any),
    })

    // עדכון הזמנה עם הסטטוס החדש
    await prisma.order.update({
      where: { id: order.id },
      data: {
        shippingStatus: status.status,
        shippingStatusUpdatedAt: status.lastUpdate || new Date(),
        shippingTrackingNumber: status.trackingNumber || order.shippingTrackingNumber,
      },
    })

    return NextResponse.json(status)
  } catch (error: any) {
    console.error("Error getting tracking status:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה בקבלת סטטוס המשלוח",
      },
      { status: 500 }
    )
  }
}

