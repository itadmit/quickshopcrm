import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getShippingProvider } from "@/lib/shipping/registry"

export const dynamic = 'force-dynamic'

/**
 * GET /api/storefront/[slug]/track
 * מעקב אחר משלוח לפי מספר הזמנה
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const orderNumber = searchParams.get('orderNumber')
    const phone = searchParams.get('phone')

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'נדרש מספר הזמנה' },
        { status: 400 }
      )
    }

    // מצא את החנות
    const shop = await prisma.shop.findFirst({
      where: { 
        OR: [
          { slug: params.slug },
          { domain: params.slug }
        ]
      },
      include: {},
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'החנות לא נמצאה' },
        { status: 404 }
      )
    }

    // מצא את ההזמנה
    const order = await prisma.order.findFirst({
      where: {
        shopId: shop.id,
        orderNumber: orderNumber,
        ...(phone && {
          OR: [
            { customerPhone: { contains: phone.replace(/[^0-9]/g, '') } },
            { customFields: { path: ['shippingAddress', 'phone'], string_contains: phone.replace(/[^0-9]/g, '') } }
          ]
        })
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        trackingNumber: true,
        shippingMethod: true,
        customFields: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'ההזמנה לא נמצאה. אנא ודא שמספר ההזמנה נכון' },
        { status: 404 }
      )
    }

    // אם אין tracking number - החזר סטטוס בסיסי
    if (!order.trackingNumber || !order.shippingMethod) {
      return NextResponse.json({
        orderNumber: order.orderNumber,
        status: mapOrderStatusToTrackingStatus(order.status),
        statusText: getStatusText(order.status),
        lastUpdate: order.updatedAt,
        events: [
          {
            date: order.createdAt,
            status: 'נוצרה',
            description: 'ההזמנה נקלטה במערכת',
          }
        ],
      })
    }

    // TODO: shippingMethods not implemented in Shop model
    const shippingMethod = null
    
    if (!shippingMethod) {
      // אין ספק משלוחים מוגדר - החזר מידע בסיסי
      return NextResponse.json({
        orderNumber: order.orderNumber,
        trackingNumber: order.trackingNumber,
        status: (order.customFields as any)?.shippingStatus || mapOrderStatusToTrackingStatus(order.status),
        statusText: getStatusText(order.status),
        lastUpdate: order.updatedAt,
        providerName: order.shippingMethod || 'לא ידוע',
      })
    }

    // קבל את הספק מה-registry
    const provider = getShippingProvider(order.shippingMethod || '')
    
    if (!provider) {
      // הספק לא רשום - החזר מידע בסיסי
      return NextResponse.json({
        orderNumber: order.orderNumber,
        trackingNumber: order.trackingNumber,
        status: (order.customFields as any)?.shippingStatus || mapOrderStatusToTrackingStatus(order.status),
        statusText: getStatusText(order.status),
        lastUpdate: order.updatedAt,
        providerName: order.shippingMethod || 'לא ידוע',
      })
    }

    try {
      // שלוף את ההגדרות של הספק
      const config = {} // TODO: get from integration

      // קבל מעקב מהספק
      const trackingStatus = await provider.getTrackingStatus(
        order.trackingNumber,
        config
      )

      // עדכן את הסטטוס בבסיס הנתונים (אם השתנה)
      if (trackingStatus.status !== (order.customFields as any)?.shippingStatus) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            customFields: {
              ...((order.customFields as any) || {}),
              shippingStatus: trackingStatus.status,
              lastTrackingUpdate: new Date().toISOString(),
              lastTrackingStatus: trackingStatus,
            },
          },
        })
      }

      return NextResponse.json({
        orderNumber: order.orderNumber,
        trackingNumber: trackingStatus.trackingNumber || order.trackingNumber,
        status: trackingStatus.status,
        statusText: getTrackingStatusText(trackingStatus.status),
        lastUpdate: trackingStatus.lastUpdate,
        location: trackingStatus.location,
        estimatedDelivery: trackingStatus.estimatedDelivery,
        driverName: trackingStatus.driverName,
        driverPhone: trackingStatus.driverPhone,
        events: trackingStatus.events || [],
        providerName: provider.displayName,
      })

    } catch (providerError: any) {
      console.error('Error getting tracking from provider:', providerError)
      
      // אם יש שגיאה בספק - החזר מידע בסיסי
      return NextResponse.json({
        orderNumber: order.orderNumber,
        trackingNumber: order.trackingNumber,
        status: (order.customFields as any)?.shippingStatus || mapOrderStatusToTrackingStatus(order.status),
        statusText: getStatusText(order.status),
        lastUpdate: order.updatedAt,
        providerName: order.shippingMethod || 'לא ידוע',
        error: 'לא ניתן לקבל עדכון מחברת המשלוחים כרגע',
      })
    }

  } catch (error) {
    console.error('Track order error:', error)
    return NextResponse.json(
      { error: 'שגיאה בבדיקת סטטוס המשלוח' },
      { status: 500 }
    )
  }
}

// המרת סטטוס הזמנה לסטטוס מעקב
function mapOrderStatusToTrackingStatus(orderStatus: string): 'pending' | 'sent' | 'in_transit' | 'delivered' | 'cancelled' | 'failed' | 'returned' {
  const statusMap: Record<string, any> = {
    'PENDING': 'pending',
    'PENDING_PAYMENT': 'pending',
    'PROCESSING': 'sent',
    'SHIPPED': 'in_transit',
    'DELIVERED': 'delivered',
    'COMPLETED': 'delivered',
    'CANCELLED': 'cancelled',
    'REFUNDED': 'returned',
    'FAILED': 'failed',
  }

  return statusMap[orderStatus] || 'pending'
}

// טקסט סטטוס להזמנה
function getStatusText(status: string): string {
  const statusTexts: Record<string, string> = {
    'PENDING': 'ההזמנה ממתינה לטיפול',
    'PENDING_PAYMENT': 'ממתין לתשלום',
    'PROCESSING': 'ההזמנה בטיפול',
    'SHIPPED': 'המשלוח בדרך אליך',
    'DELIVERED': 'המשלוח נמסר בהצלחה',
    'COMPLETED': 'ההזמנה הושלמה',
    'CANCELLED': 'ההזמנה בוטלה',
    'REFUNDED': 'בוצע החזר כספי',
    'FAILED': 'ההזמנה נכשלה',
  }

  return statusTexts[status] || 'סטטוס לא ידוע'
}

// טקסט סטטוס למעקב
function getTrackingStatusText(status: string): string {
  const statusTexts: Record<string, string> = {
    'pending': 'המשלוח ממתין לאיסוף',
    'sent': 'המשלוח נשלח',
    'in_transit': 'המשלוח בדרך',
    'delivered': 'המשלוח נמסר ליעד',
    'cancelled': 'המשלוח בוטל',
    'failed': 'המשלוח נכשל',
    'returned': 'המשלוח הוחזר',
  }

  return statusTexts[status] || 'סטטוס לא ידוע'
}




