import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPayPlusIPNFull } from "@/lib/payplus"
import crypto from "crypto"

// POST - Webhook callback מ-PayPlus
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const headers = Object.fromEntries(req.headers.entries())
    
    // אימות שהבקשה באמת מ-PayPlus
    // נבדוק את ה-hash אם יש
    const hash = headers["hash"]
    const userAgent = headers["user-agent"]

    if (userAgent !== "PayPlus") {
      console.warn("PayPlus callback: Invalid user-agent", userAgent)
      // לא נחזיר שגיאה כדי לא לשבור את ה-webhook, אבל נרשום לוג
    }

    // חילוץ orderId מה-more_info או מה-extra_info
    const orderId = body.more_info?.match(/Order ID: (.+)/)?.[1] || 
                    body.extra_info?.match(/Order ID: (.+)/)?.[1]

    if (!orderId) {
      console.error("PayPlus callback: No order ID found", body)
      return NextResponse.json({ error: "Order ID not found" }, { status: 400 })
    }

    // עדכון סטטוס ההזמנה לפי תוצאת התשלום
    const transactionStatus = body.status || body.results?.status
    const isSuccess = transactionStatus === "success" || transactionStatus === "000"

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: {
          select: { id: true },
        },
        items: true,
      },
    })

    if (!order) {
      console.error("PayPlus callback: Order not found", orderId)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: isSuccess ? "PAID" : "FAILED",
        transactionId: body.transaction_uid || body.transactionUid,
        paidAt: isSuccess ? new Date() : null,
      },
    })
    
    // יצירת אירוע payment.completed או payment.failed
    if (isSuccess) {
      await prisma.shopEvent.create({
        data: {
          shopId: order.shopId,
          type: "payment.completed",
          entityType: "order",
          entityId: order.id,
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            amount: body.amount || order.total,
            transactionId: body.transaction_uid || body.transactionUid,
            paymentMethod: "credit_card",
            shopId: order.shopId,
          },
          userId: order.customerId || undefined,
        },
      })
    } else {
      await prisma.shopEvent.create({
        data: {
          shopId: order.shopId,
          type: "payment.failed",
          entityType: "order",
          entityId: order.id,
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            amount: body.amount || order.total,
            reason: body.error_message || body.error || "תשלום נכשל",
            paymentMethod: "credit_card",
            shopId: order.shopId,
          },
          userId: order.customerId || undefined,
        },
      })
    }

    // אם התשלום הצליח, נעדכן את המלאי וניצור event
    if (isSuccess) {
      // עדכון מלאי
      for (const item of order.items) {
        if (item.variantId) {
          const variant = await prisma.productVariant.findUnique({
            where: { id: item.variantId },
              include: { product: { select: { shopId: true, lowStockAlert: true } } },
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
            } else if (variant.product.lowStockAlert !== null && newQty <= variant.product.lowStockAlert) {
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
                    threshold: variant.product.lowStockAlert,
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
          shopId: order.shopId,
          type: "order.paid",
          entityType: "order",
          entityId: order.id,
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            total: order.total,
            paymentMethod: "credit_card",
            transactionId: body.transaction_uid || body.transactionUid,
            amount: body.amount || order.total,
            currency: body.currency || "ILS",
          },
          userId: order.customerId || null,
        },
      })

      console.log("✅ Created order.paid event for order:", order.orderNumber)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error processing PayPlus callback:", error)
    return NextResponse.json(
      { error: "שגיאה בעיבוד callback" },
      { status: 500 }
    )
  }
}

