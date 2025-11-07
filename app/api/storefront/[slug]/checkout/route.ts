import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { cookies } from "next/headers"
import { calculateCustomerDiscount } from "@/lib/discounts"

const checkoutSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, "שם הלקוח הוא חובה"),
  customerEmail: z.string().email("אימייל לא תקין"),
  customerPhone: z.string().optional(),
  shippingAddress: z.any().optional(),
  billingAddress: z.any().optional(),
  paymentMethod: z.string().optional(),
  deliveryMethod: z.enum(["shipping", "pickup"]).optional(),
  shippingCost: z.number().optional(),
  couponCode: z.string().optional(),
  giftCardCode: z.string().optional(),
  notes: z.string().optional(),
})

// POST - יצירת הזמנה
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const shop = await prisma.shop.findUnique({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = checkoutSchema.parse(body)

    const cookieStore = await cookies()
    const sessionId = cookieStore.get("cart_session")?.value

    if (!sessionId) {
      return NextResponse.json(
        { error: "עגלת קניות לא נמצאה" },
        { status: 400 }
      )
    }

    // קבלת עגלת קניות
    const cart = await prisma.cart.findFirst({
      where: {
        shopId: shop.id,
        sessionId,
      },
    })

    if (!cart || !cart.items || (cart.items as any[]).length === 0) {
      return NextResponse.json(
        { error: "עגלת קניות ריקה" },
        { status: 400 }
      )
    }

    const items = cart.items as any[]

    // חישוב סכומים
    let subtotal = 0
    let customerDiscountTotal = 0
    const orderItems = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          price: true,
          sku: true,
        },
      })

      if (!product) continue

      let itemPrice = product.price
      
      // חישוב הנחת לקוח רשום
      if (data.customerId) {
        const customerDiscount = await calculateCustomerDiscount(
          shop.id,
          data.customerId,
          product.id,
          product.price
        )
        itemPrice = product.price - customerDiscount
        customerDiscountTotal += customerDiscount * item.quantity
      }

      const itemTotal = itemPrice * item.quantity
      subtotal += itemTotal

      orderItems.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        price: itemPrice,
        total: itemTotal,
      })
    }

    // חישוב הנחה מקופון
    let discount = 0
    if (data.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: data.couponCode },
      })

      if (coupon && coupon.isActive && coupon.shopId === shop.id) {
        if (coupon.type === "PERCENTAGE") {
          discount = (subtotal * coupon.value) / 100
        } else {
          discount = coupon.value
        }

        if (coupon.maxDiscount) {
          discount = Math.min(discount, coupon.maxDiscount)
        }
      }
    }

    // חישוב הנחה מכרטיס מתנה
    let giftCardDiscount = 0
    if (data.giftCardCode) {
      const giftCard = await prisma.giftCard.findUnique({
        where: { code: data.giftCardCode.toUpperCase() },
      })

      if (giftCard && giftCard.isActive && giftCard.shopId === shop.id && giftCard.balance > 0) {
        giftCardDiscount = Math.min(giftCard.balance, subtotal - discount)
      }
    }

    // חישוב משלוח - שימוש בערך שנשלח או חישוב לפי הגדרות
    let shipping = data.shippingCost || 0
    
    if (!data.shippingCost) {
      // אם לא נשלח shippingCost, נחשב לפי הגדרות החנות
      const settings = shop.settings as any
      const shippingSettings = settings?.shipping || {}
      
      if (data.deliveryMethod === "pickup") {
        const pickupSettings = settings?.pickup || {}
        shipping = pickupSettings.cost || 0
      } else if (shippingSettings.enabled) {
        const shippingOptions = shippingSettings.options || {}
        
        if (shippingOptions.fixed && shippingOptions.fixedCost) {
          shipping = shippingOptions.fixedCost
        } else if (shippingOptions.freeOver && shippingOptions.freeOverAmount && subtotal >= shippingOptions.freeOverAmount) {
          shipping = 0
        } else if (!shippingOptions.free) {
          shipping = shippingOptions.fixedCost || 0
        }
      }
    }

    // חישוב מע"מ
    const tax = shop.taxEnabled
      ? ((subtotal - discount - giftCardDiscount) * shop.taxRate) / 100
      : 0

    // סכום כולל (הנחת לקוח כבר מחושבת ב-subtotal)
    const total = subtotal - discount - giftCardDiscount + shipping + tax

    // יצירת מספר הזמנה
    const orderCount = await prisma.order.count({
      where: { shopId: shop.id },
    })
    const orderNumber = `ORD-${String(orderCount + 1).padStart(6, "0")}`

    // יצירת הזמנה
    const order = await prisma.order.create({
      data: {
        shopId: shop.id,
        orderNumber,
        customerId: data.customerId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress || data.shippingAddress,
        subtotal,
        shipping,
        tax,
        discount: discount + giftCardDiscount + customerDiscountTotal,
        total,
        paymentMethod: data.paymentMethod,
        couponCode: data.couponCode,
        notes: data.notes,
        status: "PENDING",
        paymentStatus: "PENDING",
        fulfillmentStatus: "UNFULFILLED",
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
      },
    })

    // עדכון יתרת כרטיס מתנה אם נעשה שימוש
    if (data.giftCardCode && giftCardDiscount > 0) {
      const giftCard = await prisma.giftCard.findUnique({
        where: { code: data.giftCardCode.toUpperCase() },
      })

      if (giftCard) {
        await prisma.giftCard.update({
          where: { id: giftCard.id },
          data: {
            balance: giftCard.balance - giftCardDiscount,
          },
        })

        await prisma.giftCardTransaction.create({
          data: {
            giftCardId: giftCard.id,
            orderId: order.id,
            amount: -giftCardDiscount,
            type: "CHARGE",
          },
        })
      }
    }

    // עדכון ספירת שימושים בקופון
    if (data.couponCode && discount > 0) {
      await prisma.coupon.update({
        where: { code: data.couponCode },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      })
    }

    // מחיקת עגלת קניות
    await prisma.cart.delete({
      where: { id: cart.id },
    })

    // יצירת אירוע
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
        },
        userId: data.customerId,
      },
    })

    // אם זה תשלום בכרטיס אשראי, יצירת payment URL
    let paymentUrl = null
    if (data.paymentMethod === "credit_card") {
      // בדיקה אם יש אינטגרציה עם PayPlus או payment gateway אחר
      const integration = await prisma.integration.findFirst({
        where: {
          companyId: shop.companyId,
          type: "PAYPLUS",
          isActive: true,
        },
      })

      if (integration) {
        // TODO: יצירת תשלום דרך PayPlus API
        // paymentUrl = await createPayPlusPayment(order.id, order.total)
        // לעת עתה, נשתמש ב-placeholder
        paymentUrl = `/api/storefront/${params.slug}/payment/${order.id}`
      } else {
        // אם אין אינטגרציה, נחזיר URL לדף תשלום פנימי
        paymentUrl = `/shop/${params.slug}/payment/${order.id}`
      }
    }

    return NextResponse.json({
      ...order,
      paymentUrl,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating order:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

