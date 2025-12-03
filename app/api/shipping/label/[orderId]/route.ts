import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getShippingProvider } from "@/lib/shipping/registry"

// GET - קבלת תווית משלוח (PDF)
// תמיד מבקשים מהשרת שלהם - לא שומרים ב-S3
export async function GET(
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

    // אם יש URL ישיר מהחברה (אם הם מחזירים URL)
    const shippingLabelUrl = (order.customFields as any)?.shippingLabelUrl
    if (shippingLabelUrl) {
      return NextResponse.redirect(shippingLabelUrl)
    }

    // בדיקה שההזמנה נשלחה
    if (!order.shippingMethod || !order.shippedAt) {
      return NextResponse.json(
        { error: "ההזמנה לא נשלחה לחברת משלוחים" },
        { status: 400 }
      )
    }

    // טעינת אינטגרציה
    const integration = await prisma.integration.findFirst({
      where: {
        companyId: session.user.companyId,
        type: `${order.shippingMethod?.toUpperCase() || 'UNKNOWN'}_SHIPPING` as any,
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
    const provider = getShippingProvider(order.shippingMethod || '')
    if (!provider) {
      return NextResponse.json(
        { error: "חברת משלוחים לא נתמכת" },
        { status: 400 }
      )
    }

    // קבלת תווית מהשרת שלהם - כל פעם מחדש
    const shipmentId = (order.customFields as any)?.shippingData?.shipmentId || order.trackingNumber
    if (!shipmentId) {
      return NextResponse.json(
        { error: "מספר משלוח לא נמצא" },
        { status: 400 }
      )
    }

    const labelResult = await provider.getLabel(shipmentId, {
      apiKey: integration.apiKey,
      apiSecret: integration.apiSecret,
      ...(integration.config as any),
    })

    if (!labelResult.success || !labelResult.pdfBuffer) {
      return NextResponse.json(
        {
          error: labelResult.error || "לא ניתן לקבל את התווית",
          errorCode: labelResult.errorCode,
        },
        { status: 400 }
      )
    }

    // החזרת PDF ישירות מהשרת שלהם
    return new NextResponse(Buffer.from(labelResult.pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="label-${order.orderNumber}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("Error getting shipping label:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה בקבלת התווית",
      },
      { status: 500 }
    )
  }
}

