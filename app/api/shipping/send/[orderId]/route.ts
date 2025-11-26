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

    const body = await req.json().catch(() => ({}))
    const { provider, forceResend } = body

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
      include: {
        shop: {
          select: {
            id: true,
            companyId: true,
          },
        },
      },
    })

    if (!order) {
      console.error(`Order not found: ${params.orderId}, companyId: ${session.user.companyId}`)
      return NextResponse.json(
        { error: `הזמנה לא נמצאה: ${params.orderId}` },
        { status: 404 }
      )
    }

    // אם לא צוין provider, נחפש את חברת המשלוחים המוטמעת לחברה
    let providerToUse = provider
    if (!providerToUse) {
      // חיפוש אינטגרציות משלוחים - צריך להשתמש ב-in כי type הוא enum
      const integrations = await prisma.integration.findMany({
        where: {
          companyId: order.shop.companyId,
          type: { in: ['FOCUS_SHIPPING'] }, // ניתן להוסיף כאן עוד סוגי משלוחים בעתיד
          isActive: true,
        },
      })

      if (integrations.length === 0) {
        return NextResponse.json(
          { error: "לא נמצאה אינטגרציית משלוחים פעילה לחברה" },
          { status: 400 }
        )
      }

      // נשתמש באינטגרציה הראשונה שנמצאה (או default)
      const integration = integrations.find(i => i.type === 'FOCUS_SHIPPING') || integrations[0]
      providerToUse = integration.type.toLowerCase().replace('_shipping', '')
    }

    // שליחה דרך ShippingManager
    const response = await ShippingManager.sendOrder(order.id, providerToUse, {
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

