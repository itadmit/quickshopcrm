import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendEmail, getEmailTemplate } from "@/lib/email"

interface ExtendedSession {
  user: {
    id: string
    companyId: string
    email: string
    name: string
  }
}

const manualOrderSchema = z.object({
  shopId: z.string(),
  customerId: z.string().optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().nullable().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      variantId: z.string().nullable().optional(),
      variantName: z.string().nullable().optional(),
      quantity: z.number().min(1),
      price: z.number().min(0),
    })
  ),
  deliveryMethod: z.string().optional(),
  shippingAddress: z.object({
    city: z.string(),
    address: z.string(),
    houseNumber: z.string(),
    apartment: z.string().optional(),
    floor: z.string().optional(),
    zip: z.string().optional(),
  }).optional(),
  paymentMethod: z.string(),
  couponCode: z.string().optional(),
  discount: z.number().min(0).default(0),
  orderNotes: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as ExtendedSession | null
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = manualOrderSchema.parse(body)

    // בדיקה שהחנות שייכת לחברה של המשתמש
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        taxEnabled: true,
        taxRate: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // יצירת/עדכון לקוח
    let finalCustomerId = data.customerId

    if (!finalCustomerId) {
      // בדיקה אם לקוח עם האימייל הזה כבר קיים בחנות הזו
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          email: data.customerEmail,
          shopId: shop.id,
        },
      })

      if (existingCustomer) {
        finalCustomerId = existingCustomer.id
      } else {
        // יצירת לקוח חדש
        const nameParts = data.customerName.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        const newCustomer = await prisma.customer.create({
          data: {
            shopId: shop.id,
            firstName: firstName,
            lastName: lastName,
            email: data.customerEmail,
            phone: data.customerPhone,
          },
        })
        finalCustomerId = newCustomer.id

        // אירוע customer.created
        await prisma.shopEvent.create({
          data: {
            shopId: shop.id,
            type: "customer.created",
            entityType: "customer",
            entityId: newCustomer.id,
            payload: {
              customerId: newCustomer.id,
              customerEmail: newCustomer.email,
              shopId: shop.id,
            },
          },
        })
      }
    }

    // בדיקת מלאי והורדה
    const orderItems: any[] = []
    for (const item of data.items) {
      if (item.variantId) {
        // בדיקת מלאי variant
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          select: {
            id: true,
            inventoryQty: true,
            product: {
              select: {
                id: true,
                name: true,
                trackInventory: true,
              },
            },
          },
        })

        if (!variant) {
          return NextResponse.json(
            { error: `Variant not found: ${item.variantName}` },
            { status: 400 }
          )
        }

        // בדיקת מלאי אם tracking מופעל
        if (variant.product.trackInventory && variant.inventoryQty !== null) {
          if (variant.inventoryQty < item.quantity) {
            return NextResponse.json(
              {
                error: `Not enough inventory for ${item.productName} - ${item.variantName}`,
                available: variant.inventoryQty,
                requested: item.quantity,
              },
              { status: 400 }
            )
          }

          // הורדת מלאי
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: {
              inventoryQty: {
                decrement: item.quantity,
              },
            },
          })

          // אירוע inventory.reduced
          await prisma.shopEvent.create({
            data: {
              shopId: shop.id,
              type: "inventory.reduced",
              entityType: "product_variant",
              entityId: item.variantId,
              payload: {
                productId: variant.product.id,
                variantId: item.variantId,
                quantity: item.quantity,
                oldInventory: variant.inventoryQty,
                newInventory: variant.inventoryQty - item.quantity,
                reason: "manual_order",
                shopId: shop.id,
              },
            },
          })
        }

        orderItems.push({
          productId: item.productId,
          name: item.variantName ? `${item.productName} - ${item.variantName}` : item.productName,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })
      } else {
        // מוצר ללא variants
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            trackInventory: true,
            inventoryQty: true,
          },
        })

        if (!product) {
          return NextResponse.json(
            { error: `Product not found: ${item.productName}` },
            { status: 400 }
          )
        }

        // בדיקת מלאי אם tracking מופעל
        if (product.trackInventory && product.inventoryQty !== null) {
          if (product.inventoryQty < item.quantity) {
            return NextResponse.json(
              {
                error: `Not enough inventory for ${item.productName}`,
                available: product.inventoryQty,
                requested: item.quantity,
              },
              { status: 400 }
            )
          }

          // הורדת מלאי
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              inventoryQty: {
                decrement: item.quantity,
              },
            },
          })

          // אירוע inventory.reduced
          await prisma.shopEvent.create({
            data: {
              shopId: shop.id,
              type: "inventory.reduced",
              entityType: "product",
              entityId: item.productId,
              payload: {
                productId: item.productId,
                quantity: item.quantity,
                oldInventory: product.inventoryQty,
                newInventory: product.inventoryQty - item.quantity,
                reason: "manual_order",
                shopId: shop.id,
              },
            },
          })
        }

        orderItems.push({
          productId: item.productId,
          name: item.productName,
          variantId: null,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })
      }
    }

    // חישוב סכומים
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0)
    const discount = data.discount || 0
    let tax = 0
    if (shop.taxEnabled && shop.taxRate) {
      tax = ((subtotal - discount) * shop.taxRate) / 100
    }
    const total = subtotal - discount + tax

    // יצירת מספר הזמנה
    const orderCount = await prisma.order.count({
      where: { shopId: shop.id },
    })
    const orderNumber = `ORD-${String(orderCount + 1000).padStart(6, "0")}`

    // יצירת הזמנה
    const order = await prisma.order.create({
      data: {
        shopId: shop.id,
        orderNumber,
        customerId: finalCustomerId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        shippingAddress: data.shippingAddress || {},
        billingAddress: data.shippingAddress || {},
        subtotal: Math.round(subtotal * 100) / 100,
        shipping: 0,
        tax: Math.round(tax * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        total: Math.round(total * 100) / 100,
        paymentMethod: data.paymentMethod,
        couponCode: data.couponCode || null,
        notes: data.notes,
        customFields: {},
        status: data.status,
        fulfillmentStatus: "UNFULFILLED",
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
      },
    })

    // יצירת אירוע order.created
    await prisma.shopEvent.create({
      data: {
        shopId: shop.id,
        type: "order.created",
        entityType: "order",
        entityId: order.id,
        payload: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          customerEmail: data.customerEmail,
          customerId: finalCustomerId,
          shopId: shop.id,
          paymentMethod: data.paymentMethod,
          status: data.status,
          createdBy: session.user.id,
        },
        userId: session.user.id,
      },
    })

    // אירוע payment.completed אם התשלום שולם
    if (data.status === "PAID") {
      await prisma.shopEvent.create({
        data: {
          shopId: shop.id,
          type: "payment.completed",
          entityType: "order",
          entityId: order.id,
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            amount: order.total,
            method: data.paymentMethod,
            shopId: shop.id,
          },
          userId: session.user.id,
        },
      })
    }

    // שליחת מייל ללקוח
    try {
      const shopFull = await prisma.shop.findUnique({
        where: { id: shop.id },
        select: {
          name: true,
          logo: true,
          company: {
            select: {
              name: true,
            },
          },
        },
      })

      if (shopFull) {
        const emailHtml = getEmailTemplate({
          title: `אישור הזמנה #${order.orderNumber}`,
          content: `
            <div dir="rtl">
              <h1>תודה על הזמנתך!</h1>
              <p>שלום ${data.customerName},</p>
              <p>קיבלנו את הזמנתך מספר ${order.orderNumber}.</p>
              <h3>פרטי ההזמנה:</h3>
              <ul>
                ${order.items.map((item: any) => `
                  <li>${item.productName}${item.variantName ? ` - ${item.variantName}` : ""} x ${item.quantity} - ₪${item.price}</li>
                `).join("")}
              </ul>
              <p><strong>סה"כ: ₪${order.total}</strong></p>
              <p>תודה שבחרת ב${shopFull.name}!</p>
            </div>
          `,
          senderName: shopFull.name,
        })

        await sendEmail({
          to: data.customerEmail,
          subject: `אישור הזמנה #${order.orderNumber}`,
          html: emailHtml,
          shopId: shop.id,
        })
      }
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError)
      // ממשיכים גם אם המייל נכשל
    }

    // בדיקה אם צריך לשלוח אוטומטית לחברת משלוחים
    try {
      const { ShippingManager } = await import("@/lib/shipping/manager")
      ShippingManager.checkAutoSend(order.id, "order.created").catch((error) => {
        console.error("Error checking auto-send shipping:", error)
      })
    } catch (error) {
      console.error("Error importing ShippingManager:", error)
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
      },
    })
  } catch (error) {
    console.error("Error creating manual order:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}

