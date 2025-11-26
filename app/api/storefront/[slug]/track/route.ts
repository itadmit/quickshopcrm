import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { shippingRegistry } from "@/lib/shipping/registry"

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
      include: {
        shippingProviders: {
          where: { 
            isActive: true,
            isDefault: true 
          },
          take: 1,
        },
      },
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
            { phone: { contains: phone.replace(/[^0-9]/g, '') } },
            { shippingAddress: { path: ['phone'], string_contains: phone.replace(/[^0-9]/g, '') } }
          ]
        })
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        shippingTrackingNumber: true,
        shippingProvider: true,
        shippingStatus: true,
        metadata: true,
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
    if (!order.shippingTrackingNumber || !order.shippingProvider) {
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

    // קבל את ספק המשלוחים
    const shippingProvider = shop.shippingProviders[0]
    
    if (!shippingProvider) {
      // אין ספק משלוחים מוגדר - החזר מידע בסיסי
      return NextResponse.json({
        orderNumber: order.orderNumber,
        trackingNumber: order.shippingTrackingNumber,
        status: order.shippingStatus || mapOrderStatusToTrackingStatus(order.status),
        statusText: getStatusText(order.status),
        lastUpdate: order.updatedAt,
        providerName: order.shippingProvider || 'לא ידוע',
      })
    }

    // קבל את הספק מה-registry
    const provider = shippingRegistry.getProvider(shippingProvider.provider)
    
    if (!provider) {
      // הספק לא רשום - החזר מידע בסיסי
      return NextResponse.json({
        orderNumber: order.orderNumber,
        trackingNumber: order.shippingTrackingNumber,
        status: order.shippingStatus || mapOrderStatusToTrackingStatus(order.status),
        statusText: getStatusText(order.status),
        lastUpdate: order.updatedAt,
        providerName: shippingProvider.displayName || order.shippingProvider,
      })
    }

    try {
      // שלוף את ההגדרות של הספק
      const config = shippingProvider.config as any || {}

      // קבל מעקב מהספק
      const trackingStatus = await provider.getTrackingStatus(
        order.shippingTrackingNumber,
        config
      )

      // עדכן את הסטטוס בבסיס הנתונים (אם השתנה)
      if (trackingStatus.status !== order.shippingStatus) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            shippingStatus: trackingStatus.status,
            metadata: {
              ...(order.metadata as any || {}),
              lastTrackingUpdate: new Date().toISOString(),
              lastTrackingStatus: trackingStatus,
            },
          },
        })
      }

      return NextResponse.json({
        orderNumber: order.orderNumber,
        trackingNumber: trackingStatus.trackingNumber || order.shippingTrackingNumber,
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
        trackingNumber: order.shippingTrackingNumber,
        status: order.shippingStatus || mapOrderStatusToTrackingStatus(order.status),
        statusText: getStatusText(order.status),
        lastUpdate: order.updatedAt,
        providerName: shippingProvider.displayName || order.shippingProvider,
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


