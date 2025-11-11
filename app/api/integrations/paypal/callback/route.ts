import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { capturePayPalOrder, getPayPalOrder } from "@/lib/paypal"

// POST - Webhook callback מ-PayPal
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // PayPal שולח webhook events
    // נבדוק את סוג האירוע
    const eventType = body.event_type
    const resource = body.resource

    if (eventType === "PAYMENT.CAPTURE.COMPLETED" || eventType === "CHECKOUT.ORDER.APPROVED") {
      // תשלום הושלם או הזמנה אושרה
      const orderId = resource?.supplementary_data?.related_ids?.order_id || resource?.id

      if (orderId) {
        // חיפוש ההזמנה לפי PayPal order ID
        const order = await prisma.order.findFirst({
          where: {
            paymentTransactionId: orderId,
          },
        })

        if (order) {
          // עדכון סטטוס ההזמנה
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: "PAID",
              paidAt: new Date(),
            },
          })

          // עדכון מלאי
          const orderWithItems = await prisma.order.findUnique({
            where: { id: order.id },
            include: {
              items: true,
            },
          })

          if (orderWithItems) {
            for (const item of orderWithItems.items) {
              if (item.variantId) {
                await prisma.productVariant.update({
                  where: { id: item.variantId },
                  data: {
                    inventory: {
                      decrement: item.quantity,
                    },
                  },
                })
              } else if (item.productId) {
                await prisma.product.update({
                  where: { id: item.productId },
                  data: {
                    inventory: {
                      decrement: item.quantity,
                    },
                  },
                })
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error processing PayPal callback:", error)
    return NextResponse.json(
      { error: "שגיאה בעיבוד callback" },
      { status: 500 }
    )
  }
}

// GET - Capture order after customer approval
// PayPal מחזיר את ה-order ID ב-query string אחרי שהלקוח מאשר את התשלום
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get("orderId")
    // PayPal מחזיר את ה-order ID ב-query string אחרי שהלקוח מאשר
    // PayPal מחזיר את ה-order ID ב-token parameter
    const paypalOrderId = searchParams.get("token")

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing orderId parameter" },
        { status: 400 }
      )
    }

    // חיפוש ההזמנה
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    // קבלת פרטי אינטגרציה
    const shop = await prisma.shop.findUnique({
      where: { id: order.shopId },
    })

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      )
    }

    const integration = await prisma.integration.findFirst({
      where: {
        companyId: shop.companyId,
        type: "PAYPAL",
        isActive: true,
      },
    })

    if (!integration || !integration.apiKey || !integration.apiSecret) {
      return NextResponse.json(
        { error: "PayPal integration not found" },
        { status: 400 }
      )
    }

    const config = integration.config as any

    // שימוש ב-PayPal Order ID מה-URL או מההזמנה
    const orderIdToCapture = paypalOrderId || order.paymentTransactionId

    if (!orderIdToCapture) {
      return NextResponse.json(
        { error: "PayPal order ID not found" },
        { status: 400 }
      )
    }

    // Capture את ההזמנה
    const captureResult = await capturePayPalOrder(
      {
        clientId: integration.apiKey,
        clientSecret: integration.apiSecret,
        useProduction: config.useProduction || false,
      },
      orderIdToCapture
    )

    if (!captureResult.success) {
      return NextResponse.json(
        { error: "Failed to capture payment", details: captureResult.error },
        { status: 500 }
      )
    }

    // עדכון סטטוס ההזמנה
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
      },
    })

    // עדכון מלאי
    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        shop: {
          select: { id: true },
        },
        items: true,
      },
    })

    if (orderWithItems) {
      for (const item of orderWithItems.items) {
        if (item.variantId) {
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: {
              inventoryQty: {
                decrement: item.quantity,
              },
            },
          })
        } else if (item.productId) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              inventoryQty: {
                decrement: item.quantity,
              },
            },
          })
        }
      }

      // יצירת event של רכישה מוצלחת
      await prisma.shopEvent.create({
        data: {
          shopId: orderWithItems.shopId,
          type: "order.paid",
          entityType: "order",
          entityId: order.id,
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            total: order.total,
            paymentMethod: "paypal",
            paymentTransactionId: orderIdToCapture,
            amount: captureResult.data?.amount?.value || order.total,
            currency: captureResult.data?.amount?.currency_code || "ILS",
          },
          userId: order.customerId || null,
        },
      })

      console.log("✅ Created order.paid event for order:", order.orderNumber)
    }

    // Redirect לדף תודה
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    return NextResponse.redirect(`${baseUrl}/payment/success?orderId=${orderId}`)
  } catch (error: any) {
    console.error("Error capturing PayPal order:", error)
    return NextResponse.json(
      { error: "שגיאה באישור התשלום" },
      { status: 500 }
    )
  }
}

