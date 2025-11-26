import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateOrderSchema = z.object({
  status: z.string().optional(),
  fulfillmentStatus: z.enum(["UNFULFILLED", "PARTIAL", "FULFILLED"]).optional(),
  shippingMethod: z.string().optional(),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().nullable().optional(),
  shippingAddress: z.any().optional(),
  billingAddress: z.any().nullable().optional(),
  subtotal: z.number().optional(),
  shipping: z.number().optional(),
  tax: z.number().optional(),
  discount: z.number().optional(),
  total: z.number().optional(),
  paymentMethod: z.string().nullable().optional(),
  transactionId: z.string().nullable().optional(),
  couponCode: z.string().nullable().optional(),
  items: z.array(z.object({
    id: z.string(),
    quantity: z.number().optional(),
    price: z.number().optional(),
  })).optional(),
})

// GET - קבלת פרטי הזמנה
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה אם זה ID או מספר הזמנה
    const whereClause: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    // אם זה נראה כמו UUID או CUID (מתחיל באות קטנה ואורך 25 תווים), חפש לפי ID, אחרת לפי מספר הזמנה
    const isUUID = params.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    const isCUID = params.id.match(/^[a-z][a-z0-9]{24}$/i) // CUID מתחיל באות קטנה ואורך 25 תווים
    
    if (isUUID || isCUID) {
      whereClause.id = params.id
    } else {
      whereClause.orderNumber = params.id
    }

    const order = await prisma.order.findFirst({
      where: whereClause,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            settings: true,
            taxEnabled: true,
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - עדכון הזמנה
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה אם זה ID או מספר הזמנה
    const whereClause: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    // אם זה נראה כמו UUID או CUID (מתחיל באות קטנה ואורך 25 תווים), חפש לפי ID, אחרת לפי מספר הזמנה
    const isUUID = params.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    const isCUID = params.id.match(/^[a-z][a-z0-9]{24}$/i) // CUID מתחיל באות קטנה ואורך 25 תווים
    
    if (isUUID || isCUID) {
      whereClause.id = params.id
    } else {
      whereClause.orderNumber = params.id
    }

    // בדיקה שההזמנה שייכת לחברה
    const existingOrder = await prisma.order.findFirst({
      where: whereClause,
    })

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateOrderSchema.parse(body)

    // פונקציה לבדיקה אם סטטוס הוא סטטוס רכישה
    // סטטוסים של רכישה: PAID, CONFIRMED, PROCESSING, SHIPPED, DELIVERED
    // סטטוסים של לא-רכישה: PENDING, CANCELLED, REFUNDED, FAILED
    const isPurchaseStatus = (status: string): boolean => {
      const purchaseStatuses = ['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED']
      const statusUpper = status.toUpperCase()
      // בדיקה אם זה סטטוס מותאם אישית - נבדוק לפי key
      return purchaseStatuses.includes(statusUpper)
    }

    const oldStatus = existingOrder.status
    const newStatus = data.status || oldStatus
    const oldIsPurchase = isPurchaseStatus(oldStatus)
    const newIsPurchase = isPurchaseStatus(newStatus)

    // עדכון המלאי בהתאם לשינוי הסטטוס
    if (data.status && data.status !== oldStatus) {
      // טעינת פריטי ההזמנה
      const orderWithItems = await prisma.order.findUnique({
        where: { id: existingOrder.id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  shopId: true,
                  trackInventory: true,
                  inventoryQty: true,
                },
              },
              variant: {
                select: {
                  id: true,
                  inventoryQty: true,
                },
              },
            },
          },
        },
      })

      if (orderWithItems) {
        // אם עוברים מסטטוס לא-רכישה לרכישה - הורדת מלאי
        if (!oldIsPurchase && newIsPurchase) {
          for (const item of orderWithItems.items) {
            if (item.variantId && item.variant) {
              const variant = await prisma.productVariant.findUnique({
                where: { id: item.variantId },
                include: {
                  product: {
                    select: {
                      shopId: true,
                      trackInventory: true,
                    },
                  },
                },
              })

              if (variant && variant.product.trackInventory && variant.inventoryQty !== null) {
                const oldQty = variant.inventoryQty
                const newQty = Math.max(0, oldQty - item.quantity)

                await prisma.productVariant.update({
                  where: { id: variant.id },
                  data: { inventoryQty: newQty },
                })

                await prisma.shopEvent.create({
                  data: {
                    shopId: variant.product.shopId,
                    type: "inventory.reduced",
                    entityType: "product_variant",
                    entityId: variant.id,
                    payload: {
                      productId: variant.productId,
                      variantId: variant.id,
                      quantity: item.quantity,
                      oldInventory: oldQty,
                      newInventory: newQty,
                      reason: "order_status_changed",
                      orderId: orderWithItems.id,
                      orderNumber: orderWithItems.orderNumber,
                    },
                    userId: session.user.id,
                  },
                })
              }
            } else if (item.productId && item.product) {
              if (item.product.trackInventory && item.product.inventoryQty !== null) {
                const oldQty = item.product.inventoryQty
                const newQty = Math.max(0, oldQty - item.quantity)

                await prisma.product.update({
                  where: { id: item.productId },
                  data: { inventoryQty: newQty },
                })

                await prisma.shopEvent.create({
                  data: {
                    shopId: item.product.shopId,
                    type: "inventory.reduced",
                    entityType: "product",
                    entityId: item.productId,
                    payload: {
                      productId: item.productId,
                      quantity: item.quantity,
                      oldInventory: oldQty,
                      newInventory: newQty,
                      reason: "order_status_changed",
                      orderId: orderWithItems.id,
                      orderNumber: orderWithItems.orderNumber,
                    },
                    userId: session.user.id,
                  },
                })
              }
            }
          }
        }
        // אם עוברים מסטטוס רכישה ללא-רכישה - החזרת מלאי
        else if (oldIsPurchase && !newIsPurchase) {
          for (const item of orderWithItems.items) {
            if (item.variantId && item.variant) {
              const variant = await prisma.productVariant.findUnique({
                where: { id: item.variantId },
                include: {
                  product: {
                    select: {
                      shopId: true,
                      trackInventory: true,
                    },
                  },
                },
              })

              if (variant && variant.product.trackInventory && variant.inventoryQty !== null) {
                const oldQty = variant.inventoryQty
                const newQty = oldQty + item.quantity

                await prisma.productVariant.update({
                  where: { id: variant.id },
                  data: { inventoryQty: newQty },
                })

                await prisma.shopEvent.create({
                  data: {
                    shopId: variant.product.shopId,
                    type: "inventory.restored",
                    entityType: "product_variant",
                    entityId: variant.id,
                    payload: {
                      productId: variant.productId,
                      variantId: variant.id,
                      quantity: item.quantity,
                      oldInventory: oldQty,
                      newInventory: newQty,
                      reason: "order_status_changed",
                      orderId: orderWithItems.id,
                      orderNumber: orderWithItems.orderNumber,
                    },
                    userId: session.user.id,
                  },
                })
              }
            } else if (item.productId && item.product) {
              if (item.product.trackInventory && item.product.inventoryQty !== null) {
                const oldQty = item.product.inventoryQty
                const newQty = oldQty + item.quantity

                await prisma.product.update({
                  where: { id: item.productId },
                  data: { inventoryQty: newQty },
                })

                await prisma.shopEvent.create({
                  data: {
                    shopId: item.product.shopId,
                    type: "inventory.restored",
                    entityType: "product",
                    entityId: item.productId,
                    payload: {
                      productId: item.productId,
                      quantity: item.quantity,
                      oldInventory: oldQty,
                      newInventory: newQty,
                      reason: "order_status_changed",
                      orderId: orderWithItems.id,
                      orderNumber: orderWithItems.orderNumber,
                    },
                    userId: session.user.id,
                  },
                })
              }
            }
          }
        }
      }
    }

    // הכנת נתוני עדכון - הסרת items מהנתונים כי הם מטופלים בנפרד
    const { items: itemsToUpdate, ...updateData } = data

    // עדכון ההזמנה - תמיד לפי ID
    const order = await prisma.order.update({
      where: { id: existingOrder.id },
      data: updateData,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
        items: true,
      },
    })

    // עדכון פריטים אם ניתנו
    if (itemsToUpdate && Array.isArray(itemsToUpdate)) {
      // טעינת הפריטים הנוכחיים
      const currentItems = await prisma.orderItem.findMany({
        where: { orderId: existingOrder.id },
      })

      for (const itemUpdate of itemsToUpdate) {
        const currentItem = currentItems.find(i => i.id === itemUpdate.id)
        if (!currentItem) continue

        const newQuantity = itemUpdate.quantity !== undefined ? itemUpdate.quantity : currentItem.quantity
        const newPrice = itemUpdate.price !== undefined ? itemUpdate.price : currentItem.price
        const newTotal = newPrice * newQuantity

        await prisma.orderItem.update({
          where: { id: itemUpdate.id },
          data: {
            quantity: newQuantity,
            price: newPrice,
            total: newTotal,
          },
        })
      }

      // חישוב מחדש של סה"כ
      const updatedItems = await prisma.orderItem.findMany({
        where: { orderId: existingOrder.id },
      })
      
      const newSubtotal = updatedItems.reduce((sum, item) => sum + item.total, 0)
      const finalShipping = updateData.shipping !== undefined ? updateData.shipping : order.shipping
      const finalTax = updateData.tax !== undefined ? updateData.tax : order.tax
      const finalDiscount = updateData.discount !== undefined ? updateData.discount : order.discount
      const newTotal = newSubtotal + (finalShipping || 0) + (finalTax || 0) - (finalDiscount || 0)
      
      await prisma.order.update({
        where: { id: existingOrder.id },
        data: {
          subtotal: newSubtotal,
          total: newTotal,
        },
      })
    }

    // יצירת אירוע
    const eventType = data.status && data.status !== existingOrder.status
      ? "order.status_changed"
      : "order.updated"

    await prisma.shopEvent.create({
      data: {
        shopId: order.shopId,
        type: eventType,
        entityType: "order",
        entityId: order.id,
        payload: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          ...(data.status && data.status !== existingOrder.status
            ? { oldStatus: existingOrder.status, newStatus: data.status }
            : { changes: data }),
        },
        userId: session.user.id,
      },
    })

    // אם הסטטוס שונה ל-PAID, יצירת אירוע payment
    if (data.status === "PAID" && existingOrder.status !== "PAID") {
      await prisma.shopEvent.create({
        data: {
          shopId: order.shopId,
          type: "order.paid",
          entityType: "order",
          entityId: order.id,
          payload: {
            orderId: order.id,
            amount: order.total,
            paymentMethod: order.paymentMethod,
          },
          userId: session.user.id,
        },
      })
    }

    // אם הסטטוס שונה ל-SHIPPED, יצירת אירוע shipping
    if (data.status === "SHIPPED" && existingOrder.status !== "SHIPPED") {
      await prisma.shopEvent.create({
        data: {
          shopId: order.shopId,
          type: "order.shipped",
          entityType: "order",
          entityId: order.id,
          payload: {
            orderId: order.id,
            trackingNumber: data.trackingNumber || order.trackingNumber,
          },
          userId: session.user.id,
        },
      })
    }

    return NextResponse.json(order)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating order:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת הזמנה
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה אם זה ID או מספר הזמנה
    const whereClause: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    // אם זה נראה כמו UUID או CUID (מתחיל באות קטנה ואורך 25 תווים), חפש לפי ID, אחרת לפי מספר הזמנה
    const isUUID = params.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    const isCUID = params.id.match(/^[a-z][a-z0-9]{24}$/i) // CUID מתחיל באות קטנה ואורך 25 תווים
    
    if (isUUID || isCUID) {
      whereClause.id = params.id
    } else {
      whereClause.orderNumber = params.id
    }

    // בדיקה שההזמנה שייכת לחברה
    const existingOrder = await prisma.order.findFirst({
      where: whereClause,
    })

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // מחיקת ההזמנה
    await prisma.order.delete({
      where: { id: existingOrder.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting order:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

