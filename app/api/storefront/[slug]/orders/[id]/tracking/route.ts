import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { jwtVerify } from "jose"
import { getShippingProvider, getAllProviders } from "@/lib/shipping/registry"

// GET - מעקב אחר משלוח בפרונט
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
      include: {
        company: true,
      },
    })

    // אם לא נמצא לפי slug, ננסה לחפש לפי ID
    if (!shop) {
      shop = await prisma.shop.findFirst({
        where: {
          id: params.slug,
          isPublished: true,
        },
        include: {
          company: true,
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
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // בדיקה שההזמנה נשלחה לחברת משלוחים
    // המערכת מחפשת את חברת המשלוחים הפעילה מההזמנה (לא קשיח ל-Focus)
    if (!order.shippingProvider || !order.shippingTrackingNumber) {
      return NextResponse.json(
        { error: "ההזמנה לא נשלחה לחברת משלוחים" },
        { status: 400 }
      )
    }

    // טעינת אינטגרציה לפי חברת המשלוחים מההזמנה
    // הפורמט: {PROVIDER_SLUG}_SHIPPING (לדוגמה: FOCUS_SHIPPING, DHL_SHIPPING)
    const integrationType = `${order.shippingProvider.toUpperCase()}_SHIPPING` as any
    const integration = await prisma.integration.findFirst({
      where: {
        companyId: shop.companyId,
        type: integrationType,
        isActive: true,
      },
    })

    if (!integration) {
      return NextResponse.json(
        { 
          error: `אינטגרציה לא נמצאה לחברת המשלוחים ${order.shippingProvider}`,
          provider: order.shippingProvider 
        },
        { status: 404 }
      )
    }

    // טעינת provider מהרישום הגנרי (registry)
    // זה עובד עם כל חברת משלוחים שנרשמה ב-registry (focus, dhl, וכו')
    const providerSlug = order.shippingProvider.toLowerCase()
    const provider = getShippingProvider(providerSlug)
    if (!provider) {
      // קבלת רשימת providers נתמכים לדיבוג
      const supportedProviders = getAllProviders().map(p => p.slug)
      return NextResponse.json(
        { 
          error: `חברת משלוחים ${order.shippingProvider} לא נתמכת במערכת`,
          provider: order.shippingProvider,
          supportedProviders
        },
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

    // עדכון הזמנה עם הסטטוס החדש (אם יש הרשאה)
    try {
      await prisma.order.update({
        where: { id: params.id },
        data: {
          shippingStatus: status.status,
          shippingStatusUpdatedAt: status.lastUpdate || new Date(),
          shippingTrackingNumber: status.trackingNumber || order.shippingTrackingNumber,
        },
      })
    } catch (updateError) {
      // לא נכשל אם העדכון נכשל - רק נחזיר את הסטטוס
      console.error("Error updating order tracking status:", updateError)
    }

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

