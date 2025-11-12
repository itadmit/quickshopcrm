import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { cookies } from "next/headers"
import { calculateCart } from "@/lib/cart-calculations"
import { findCart, isCartEmpty } from "@/lib/cart-server"
import { sendEmail, getEmailTemplate } from "@/lib/email"

const checkoutSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, "שם הלקוח הוא חובה"),
  customerEmail: z.string().email("אימייל לא תקין"),
  customerPhone: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  orderNotes: z.string().nullable().optional(),
  newsletter: z.boolean().optional(),
  shippingAddress: z.any().nullable().optional(),
  billingAddress: z.any().nullable().optional(),
  paymentMethod: z.string().optional(),
  deliveryMethod: z.enum(["shipping", "pickup"]).optional(),
  shippingCost: z.number().optional(),
  couponCode: z.string().nullable().optional(),
  giftCardCode: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  customFields: z.record(z.any()).optional(),
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
    const customerId = data.customerId || req.headers.get("x-customer-id") || null

    // שימוש בפונקציה המרכזית למציאת עגלה
    const cart = await findCart(shop.id, sessionId, customerId)

    if (isCartEmpty(cart)) {
      return NextResponse.json(
        { error: "עגלת קניות ריקה" },
        { status: 400 }
      )
    }

    const items = cart.items as any[]

    // ⚠️ SERVER-SIDE VALIDATION - כמו בשופיפיי
    // אנחנו לא סומכים על מה שהלקוח שלח - מחשבים מחדש מהשרת!
    // שימוש בקופון מהעגלה או מהבקשה (אם נשלח)
    const couponCodeToUse = data.couponCode || cart.couponCode

    // חישוב מחדש של כל הסכומים מהשרת - זה ה-server-side validation!
    const calculation = await calculateCart(
      shop.id,
      items,
      couponCodeToUse,
      data.customerId || null,
      shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
      null // shipping - נחשב למטה
    )

    // בניית orderItems מהחישוב המרכזי
    // אנחנו חייבים לאמת שה-variantId קיים בדאטאבייס לפני שאנחנו מוסיפים אותו
    const variantIds = calculation.items
      .map(item => item.variantId)
      .filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim() !== ''))
    
    console.log('🔍 Looking for variants:', variantIds)
    console.log('📋 Calculation items:', calculation.items.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product.name
    })))
    
    // בדיקה מהירה - אילו variants קיימים בדאטאבייס
    const existingVariants = variantIds.length > 0 
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, name: true, productId: true }
        })
      : []
    
    console.log('✅ Found variants in DB:', existingVariants.map((v: any) => ({ id: v.id, name: v.name, productId: v.productId })))
    console.log('❌ Missing variants:', variantIds.filter(id => !existingVariants.find((v: any) => v.id === id)))
    
    const existingVariantIds = new Set(existingVariants.map((v: { id: string }) => v.id))
    
    const orderItems = calculation.items.map(item => {
      const orderItem: any = {
        productId: item.productId,
        name: item.product.name,
        sku: item.product.sku || null,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      }
      
      // הוסף variantId רק אם הוא קיים בדאטאבייס
      if (item.variantId && existingVariantIds.has(item.variantId)) {
        orderItem.variantId = item.variantId
        console.log('✅ Added variantId to order item:', item.variantId)
      } else if (item.variantId) {
        // Variant לא נמצא בדאטאבייס - זה בסדר, נמשיך בלי variantId
        console.warn('⚠️ Variant not found in DB, skipping:', {
          variantId: item.variantId,
          productId: item.productId,
          productName: item.product.name
        })
        
        // נבדוק אם יש וריאציות אחרות למוצר הזה
        console.log('🔍 Checking if product has other variants...')
      }
      
      console.log('📦 Order item:', JSON.stringify(orderItem, null, 2))
      return orderItem
    })

    // חישוב הנחה מכרטיס מתנה
    let giftCardDiscount = 0
    if (data.giftCardCode) {
      const giftCard = await prisma.giftCard.findUnique({
        where: { code: data.giftCardCode.toUpperCase() },
      })

      if (giftCard && giftCard.isActive && giftCard.shopId === shop.id && giftCard.balance > 0) {
        const totalDiscount = calculation.automaticDiscount + calculation.couponDiscount
        giftCardDiscount = Math.min(giftCard.balance, calculation.subtotal - totalDiscount)
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
        } else if (shippingOptions.freeOver && shippingOptions.freeOverAmount && calculation.subtotal >= shippingOptions.freeOverAmount) {
          shipping = 0
        } else if (!shippingOptions.free) {
          shipping = shippingOptions.fixedCost || 0
        }
      }
    }

    // חישוב מע"מ מחדש עם shipping ו-giftCard
    const totalDiscount = calculation.automaticDiscount + calculation.couponDiscount
    const tax = shop.taxEnabled && shop.taxRate
      ? ((calculation.subtotal - totalDiscount - giftCardDiscount) * shop.taxRate) / 100
      : 0

    // סכום כולל (הנחת לקוח כבר מחושבת ב-subtotal)
    const total = calculation.subtotal - totalDiscount - giftCardDiscount - calculation.customerDiscount + shipping + tax

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
        subtotal: Math.round(calculation.subtotal * 100) / 100,
        shipping: Math.round(shipping * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        discount: Math.round((totalDiscount + giftCardDiscount + calculation.customerDiscount) * 100) / 100,
        total: Math.round(Math.max(0, total) * 100) / 100, // עיגול ל-2 ספרות אחרי הנקודה
        paymentMethod: data.paymentMethod,
        couponCode: data.couponCode,
        notes: data.notes,
        customFields: data.customFields || {},
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
    if (couponCodeToUse && calculation.couponDiscount > 0) {
      const coupon = await prisma.coupon.update({
        where: { code: couponCodeToUse },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      })
      
      // יצירת אירוע coupon.used
      await prisma.shopEvent.create({
        data: {
          shopId: shop.id,
          type: "coupon.used",
          entityType: "coupon",
          entityId: coupon.id,
          payload: {
            couponId: coupon.id,
            couponCode: coupon.code,
            orderId: order.id,
            orderNumber: order.orderNumber,
            discount: calculation.couponDiscount,
            shopId: shop.id,
          },
        },
      })
    }

    // מחיקת עגלת קניות
    await prisma.cart.delete({
      where: { id: cart.id },
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
          customerId: data.customerId || null,
          shopId: shop.id,
          paymentMethod: data.paymentMethod,
          status: "PENDING",
        },
        userId: data.customerId || undefined,
      },
    })
    
    // יצירת אירוע payment.initiated
    await prisma.shopEvent.create({
      data: {
        shopId: shop.id,
        type: "payment.initiated",
        entityType: "order",
        entityId: order.id,
        payload: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: order.total,
          method: data.paymentMethod,
          shopId: shop.id,
        },
        userId: data.customerId || undefined,
      },
    })

    // שליחת מייל אישור הזמנה ללקוח
    try {
      const shopSettings = shop.settings as any
      const checkoutSettings = shopSettings?.checkoutPage || {}
      const customFieldsConfig = checkoutSettings.customFields || []
      
      // בניית רשימת פריטים
      const itemsList = orderItems.map(item => 
        `<tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">₪${item.total.toFixed(2)}</td>
        </tr>`
      ).join('')

      // בניית רשימת קסטום פילדס
      let customFieldsHtml = ''
      if (order.customFields && typeof order.customFields === 'object') {
        const customFieldsList = Object.entries(order.customFields)
          .map(([key, value]) => {
            const fieldConfig = customFieldsConfig.find((f: any) => f.id === key)
            const fieldLabel = fieldConfig?.label || key
            const displayValue = value === true ? "כן" : value === false ? "לא" : String(value || "")
            
            if (!displayValue || displayValue === "false" || displayValue === "") {
              return null
            }
            
            return `<p><strong>${fieldLabel}:</strong> ${displayValue}</p>`
          })
          .filter(Boolean)
          .join('')
        
        if (customFieldsList) {
          customFieldsHtml = `
            <div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 8px;">
              <h3 style="margin-top: 0; margin-bottom: 10px;">פרטים נוספים</h3>
              ${customFieldsList}
            </div>
          `
        }
      }

      const emailContent = `
        <h2>תודה על ההזמנה שלך! 🎉</h2>
        <p>שלום ${data.customerName},</p>
        <p>הזמנתך התקבלה בהצלחה. מספר ההזמנה שלך הוא: <strong>${order.orderNumber}</strong></p>
        
        <h3>פרטי ההזמנה:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">מוצר</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">כמות</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">מחיר</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <div style="margin-top: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>סכום ביניים:</span>
            <strong>₪${order.subtotal.toFixed(2)}</strong>
          </div>
          ${order.discount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #059669;">
            <span>הנחה:</span>
            <strong>-₪${order.discount.toFixed(2)}</strong>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>משלוח:</span>
            <strong>₪${order.shipping.toFixed(2)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>מע"מ:</span>
            <strong>₪${order.tax.toFixed(2)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #ddd; font-size: 18px;">
            <strong>סה"כ:</strong>
            <strong>₪${order.total.toFixed(2)}</strong>
          </div>
        </div>

        ${customFieldsHtml}

        ${order.notes ? `
        <div style="margin-top: 20px; padding: 15px; background-color: #fff7ed; border-radius: 8px;">
          <h3 style="margin-top: 0; margin-bottom: 10px;">הערות:</h3>
          <p>${order.notes}</p>
        </div>
        ` : ''}

        <p style="margin-top: 30px;">נשלח אליך עדכון נוסף כשההזמנה תישלח.</p>
        <p>תודה שקנית אצלנו!</p>
      `

      // ניסיון לשלוח אימייל אישור הזמנה
      try {
        await sendEmail({
          to: data.customerEmail,
          subject: `אישור הזמנה #${order.orderNumber} - ${shop.name}`,
          html: getEmailTemplate({
            title: `אישור הזמנה #${order.orderNumber}`,
            content: emailContent,
            footer: `הודעה זו נשלחה מ-${shop.name}`,
          }),
        })
        console.log(`✅ Order confirmation email sent to ${data.customerEmail}`)
      } catch (emailError: any) {
        // אם יש בעיה עם הגדרות אימייל, רק נרשום לוג ולא נזרוק שגיאה
        const errorMessage = emailError?.message || 'Unknown error'
        if (errorMessage.includes('not configured') || errorMessage.includes('לא מוגדר')) {
          console.warn(`⚠️ SendGrid not configured. Order created but email not sent to ${data.customerEmail}. Please configure SendGrid in Super Admin settings.`)
        } else {
          console.warn(`⚠️ Failed to send order confirmation email to ${data.customerEmail}:`, errorMessage)
        }
        // לא נזרוק שגיאה - לא רוצים שהזמנה תיכשל בגלל בעיית מייל
      }
    } catch (emailError) {
      // שגיאה כללית ביצירת תוכן האימייל - לא קריטי
      console.warn("⚠️ Error preparing order confirmation email:", emailError)
    }

    // אם זה תשלום בכרטיס אשראי, יצירת payment URL דרך PayPlus או PayPal
    let paymentUrl = null
    if (data.paymentMethod === "credit_card") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

      // בדיקה אם יש אינטגרציה עם PayPlus
      const payplusIntegration = await prisma.integration.findFirst({
        where: {
          companyId: shop.companyId,
          type: "PAYPLUS",
          isActive: true,
        },
      })

      // בדיקה אם יש אינטגרציה עם PayPal
      const paypalIntegration = await prisma.integration.findFirst({
        where: {
          companyId: shop.companyId,
          type: "PAYPAL",
          isActive: true,
        },
      })

      // עדיפות ל-PayPlus אם קיים, אחרת PayPal
      if (payplusIntegration && payplusIntegration.apiKey && payplusIntegration.apiSecret) {
        // יצירת payment link דרך PayPlus
        try {
          const { generatePaymentLink } = await import("@/lib/payplus")
          const config = payplusIntegration.config as any

          const paymentResult = await generatePaymentLink(
            {
              apiKey: payplusIntegration.apiKey,
              secretKey: payplusIntegration.apiSecret,
              paymentPageUid: config.paymentPageUid,
              useProduction: config.useProduction || false,
              terminalUid: "",
            },
            {
              amount: Math.round(order.total * 100) / 100, // עיגול ל-2 ספרות אחרי הנקודה
              currencyCode: "ILS",
              chargeMethod: 1, // Charge (J4)
              refUrlSuccess: `${baseUrl}/payment/success?orderId=${order.id}`,
              refUrlFailure: `${baseUrl}/payment/failure?orderId=${order.id}`,
              refUrlCallback: `${baseUrl}/api/integrations/payplus/callback`,
              sendFailureCallback: true,
              customerName: data.customerName,
              customerEmail: data.customerEmail,
              customerPhone: data.customerPhone || undefined,
              moreInfo: `Order ID: ${order.id}`,
            }
          )

          if (paymentResult.success && paymentResult.data?.payment_page_link) {
            paymentUrl = paymentResult.data.payment_page_link
            
            // עדכון ההזמנה עם payment link
            await prisma.order.update({
              where: { id: order.id },
              data: {
                paymentLink: paymentUrl,
              },
            })
          } else {
            console.error("Failed to generate PayPlus payment link:", paymentResult.error)
            // אם נכשל, ננסה PayPal
            throw new Error("PayPlus failed")
          }
        } catch (error) {
          console.error("Error generating PayPlus payment link:", error)
          // אם PayPlus נכשל, ננסה PayPal
          if (paypalIntegration && paypalIntegration.apiKey && paypalIntegration.apiSecret) {
            try {
              const { createPayPalOrder } = await import("@/lib/paypal")
              const config = paypalIntegration.config as any

              const paypalResult = await createPayPalOrder(
                {
                  clientId: paypalIntegration.apiKey,
                  clientSecret: paypalIntegration.apiSecret,
                  useProduction: config.useProduction || false,
                },
                {
                  amount: Math.round(order.total * 100) / 100, // עיגול ל-2 ספרות אחרי הנקודה
                  currencyCode: "ILS",
                  orderId: order.id,
                  customerName: data.customerName,
                  customerEmail: data.customerEmail,
                  returnUrl: `${baseUrl}/api/integrations/paypal/callback?orderId=${order.id}`,
                  cancelUrl: `${baseUrl}/payment/failure?orderId=${order.id}`,
                }
              )

              if (paypalResult.success && paypalResult.data?.approvalUrl) {
                paymentUrl = paypalResult.data.approvalUrl
                
                // עדכון ההזמנה עם PayPal order ID ו-approval URL
                await prisma.order.update({
                  where: { id: order.id },
                  data: {
                    paymentLink: paymentUrl,
                    transactionId: paypalResult.data.orderId,
                  },
                })
              } else {
                console.error("Failed to create PayPal order:", paypalResult.error)
                paymentUrl = `/shop/${params.slug}/payment/${order.id}`
              }
            } catch (paypalError) {
              console.error("Error creating PayPal order:", paypalError)
              paymentUrl = `/shop/${params.slug}/payment/${order.id}`
            }
          } else {
            paymentUrl = `/shop/${params.slug}/payment/${order.id}`
          }
        }
      } else if (paypalIntegration && paypalIntegration.apiKey && paypalIntegration.apiSecret) {
        // יצירת הזמנה דרך PayPal
        try {
          const { createPayPalOrder } = await import("@/lib/paypal")
          const config = paypalIntegration.config as any

          const paypalResult = await createPayPalOrder(
            {
              clientId: paypalIntegration.apiKey,
              clientSecret: paypalIntegration.apiSecret,
              useProduction: config.useProduction || false,
            },
            {
              amount: Math.round(order.total * 100) / 100, // עיגול ל-2 ספרות אחרי הנקודה
              currencyCode: "ILS",
              orderId: order.id,
              customerName: data.customerName,
              customerEmail: data.customerEmail,
              returnUrl: `${baseUrl}/api/integrations/paypal/callback?orderId=${order.id}&token=`,
              cancelUrl: `${baseUrl}/payment/failure?orderId=${order.id}`,
            }
          )

          if (paypalResult.success && paypalResult.data?.approvalUrl) {
            paymentUrl = paypalResult.data.approvalUrl
            
            // עדכון ההזמנה עם PayPal order ID ו-approval URL
            await prisma.order.update({
              where: { id: order.id },
              data: {
                paymentLink: paymentUrl,
                transactionId: paypalResult.data.orderId,
              },
            })
          } else {
            console.error("Failed to create PayPal order:", paypalResult.error)
            paymentUrl = `/shop/${params.slug}/payment/${order.id}`
          }
        } catch (error) {
          console.error("Error creating PayPal order:", error)
          paymentUrl = `/shop/${params.slug}/payment/${order.id}`
        }
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
    // הדפסת שגיאה מפורטת לפיתוח
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

