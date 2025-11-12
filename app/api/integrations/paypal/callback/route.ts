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
          
          // יצירת אירוע payment.completed
          await prisma.shopEvent.create({
            data: {
              shopId: order.shopId,
              type: "payment.completed",
              entityType: "order",
              entityId: order.id,
              payload: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                amount: order.total,
                transactionId: orderId,
                paymentMethod: "paypal",
                shopId: order.shopId,
              },
              userId: order.customerId || undefined,
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
                const variant = await prisma.productVariant.findUnique({
                  where: { id: item.variantId },
                  include: { product: { select: { shopId: true } } },
                })
                
                if (variant) {
                  const oldQty = variant.inventoryQty
                  const newQty = Math.max(0, oldQty - item.quantity)
                  
                  await prisma.productVariant.update({
                    where: { id: item.variantId },
                    data: {
                      inventoryQty: newQty,
                    },
                  })
                  
                  // יצירת אירוע inventory.updated
                  await prisma.shopEvent.create({
                    data: {
                      shopId: variant.product.shopId,
                      type: "inventory.updated",
                      entityType: "product_variant",
                      entityId: variant.id,
                      payload: {
                        productId: variant.productId,
                        variantId: variant.id,
                        oldQty,
                        newQty,
                        orderId: order.id,
                      },
                    },
                  })
                  
                  // בדיקת מלאי נמוך או אזל
                  if (newQty === 0) {
                    await prisma.shopEvent.create({
                      data: {
                        shopId: variant.product.shopId,
                        type: "inventory.out_of_stock",
                        entityType: "product_variant",
                        entityId: variant.id,
                        payload: {
                          productId: variant.productId,
                          variantId: variant.id,
                          orderId: order.id,
                        },
                      },
                    })
                  } else if (variant.lowStockAlert !== null && newQty <= variant.lowStockAlert) {
                    await prisma.shopEvent.create({
                      data: {
                        shopId: variant.product.shopId,
                        type: "inventory.low_stock",
                        entityType: "product_variant",
                        entityId: variant.id,
                        payload: {
                          productId: variant.productId,
                          variantId: variant.id,
                          currentQty: newQty,
                          threshold: variant.lowStockAlert,
                          orderId: order.id,
                        },
                      },
                    })
                  }
                }
              } else if (item.productId) {
                const product = await prisma.product.findUnique({
                  where: { id: item.productId },
                })
                
                if (product) {
                  const oldQty = product.inventoryQty
                  const newQty = Math.max(0, oldQty - item.quantity)
                  
                  await prisma.product.update({
                    where: { id: item.productId },
                    data: {
                      inventoryQty: newQty,
                    },
                  })
                  
                  // יצירת אירוע inventory.updated
                  await prisma.shopEvent.create({
                    data: {
                      shopId: product.shopId,
                      type: "inventory.updated",
                      entityType: "product",
                      entityId: product.id,
                      payload: {
                        productId: product.id,
                        oldQty,
                        newQty,
                        orderId: order.id,
                      },
                    },
                  })
                  
                  // בדיקת מלאי נמוך או אזל
                  if (newQty === 0) {
                    await prisma.shopEvent.create({
                      data: {
                        shopId: product.shopId,
                        type: "inventory.out_of_stock",
                        entityType: "product",
                        entityId: product.id,
                        payload: {
                          productId: product.id,
                          orderId: order.id,
                        },
                      },
                    })
                  } else if (product.lowStockAlert !== null && newQty <= product.lowStockAlert) {
                    await prisma.shopEvent.create({
                      data: {
                        shopId: product.shopId,
                        type: "inventory.low_stock",
                        entityType: "product",
                        entityId: product.id,
                        payload: {
                          productId: product.id,
                          currentQty: newQty,
                          threshold: product.lowStockAlert,
                          orderId: order.id,
                        },
                      },
                    })
                  }
                }
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
          const variant = await prisma.productVariant.findUnique({
            where: { id: item.variantId },
            include: { product: { select: { shopId: true } } },
          })
          
          if (variant) {
            const oldQty = variant.inventoryQty
            const newQty = Math.max(0, oldQty - item.quantity)
            
            await prisma.productVariant.update({
              where: { id: item.variantId },
              data: {
                inventoryQty: newQty,
              },
            })
            
            // יצירת אירוע inventory.updated
            await prisma.shopEvent.create({
              data: {
                shopId: variant.product.shopId,
                type: "inventory.updated",
                entityType: "product_variant",
                entityId: variant.id,
                payload: {
                  productId: variant.productId,
                  variantId: variant.id,
                  oldQty,
                  newQty,
                  orderId: order.id,
                },
              },
            })
            
            // בדיקת מלאי נמוך או אזל
            if (newQty === 0) {
              await prisma.shopEvent.create({
                data: {
                  shopId: variant.product.shopId,
                  type: "inventory.out_of_stock",
                  entityType: "product_variant",
                  entityId: variant.id,
                  payload: {
                    productId: variant.productId,
                    variantId: variant.id,
                    orderId: order.id,
                  },
                },
              })
            } else if (variant.lowStockAlert !== null && newQty <= variant.lowStockAlert) {
              await prisma.shopEvent.create({
                data: {
                  shopId: variant.product.shopId,
                  type: "inventory.low_stock",
                  entityType: "product_variant",
                  entityId: variant.id,
                  payload: {
                    productId: variant.productId,
                    variantId: variant.id,
                    currentQty: newQty,
                    threshold: variant.lowStockAlert,
                    orderId: order.id,
                  },
                },
              })
            }
          }
        } else if (item.productId) {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
          })
          
          if (product) {
            const oldQty = product.inventoryQty
            const newQty = Math.max(0, oldQty - item.quantity)
            
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                inventoryQty: newQty,
              },
            })
            
            // יצירת אירוע inventory.updated
            await prisma.shopEvent.create({
              data: {
                shopId: product.shopId,
                type: "inventory.updated",
                entityType: "product",
                entityId: product.id,
                payload: {
                  productId: product.id,
                  oldQty,
                  newQty,
                  orderId: order.id,
                },
              },
            })
            
            // בדיקת מלאי נמוך או אזל
            if (newQty === 0) {
              await prisma.shopEvent.create({
                data: {
                  shopId: product.shopId,
                  type: "inventory.out_of_stock",
                  entityType: "product",
                  entityId: product.id,
                  payload: {
                    productId: product.id,
                    orderId: order.id,
                  },
                },
              })
            } else if (product.lowStockAlert !== null && newQty <= product.lowStockAlert) {
              await prisma.shopEvent.create({
                data: {
                  shopId: product.shopId,
                  type: "inventory.low_stock",
                  entityType: "product",
                  entityId: product.id,
                  payload: {
                    productId: product.id,
                    currentQty: newQty,
                    threshold: product.lowStockAlert,
                    orderId: order.id,
                  },
                },
              })
            }
          }
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

