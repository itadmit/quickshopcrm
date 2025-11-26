import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { cookies } from "next/headers"
import { calculateCart } from "@/lib/cart-calculations"
import { findCart, isCartEmpty } from "@/lib/cart-server"
import { sendEmail, getEmailTemplate } from "@/lib/email"
import { createOrUpdateContact, initContactCategories } from "@/lib/contacts"
import { runPluginHook } from "@/lib/plugins/loader"

const checkoutSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, "שם הלקוח הוא חובה"),
  customerEmail: z.string().email("אימייל לא תקין"),
  customerPhone: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  orderNotes: z.string().nullable().optional(),
  newsletter: z.boolean().optional(),
  createAccount: z.boolean().optional(), // האם הלקוח בחר להרשם לחשבון
  saveDetails: z.boolean().optional(), // האם הלקוח בחר לשמור פרטים לפעם הבאה
  shippingAddress: z.any().nullable().optional(),
  billingAddress: z.any().nullable().optional(),
  paymentMethod: z.string().optional(),
  deliveryMethod: z.enum(["shipping", "pickup"]).optional(),
  shippingCost: z.number().optional(),
  couponCode: z.string().nullable().optional(),
  giftCardCode: z.string().nullable().optional(),
  storeCreditAmount: z.number().min(0).optional(), // סכום קרדיט בחנות לשימוש
  notes: z.string().nullable().optional(),
  customFields: z.record(z.any()).optional(),
  // UTM Tracking Parameters
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
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

    // בדיקה אם נבחר "כרטיס אשראי" אבל אין ספק תשלום פעיל - לפני יצירת ההזמנה!
    if (data.paymentMethod === "credit_card") {
      // בדיקה אם יש אינטגרציה עם PayPlus
      const payplusIntegration = await prisma.integration.findFirst({
        where: {
          companyId: shop.companyId,
          type: "PAYPLUS",
          isActive: true,
        },
        select: {
          id: true,
          apiKey: true,
          apiSecret: true,
        },
      })

      // בדיקה אם יש אינטגרציה עם PayPal
      const paypalIntegration = await prisma.integration.findFirst({
        where: {
          companyId: shop.companyId,
          type: "PAYPAL",
          isActive: true,
        },
        select: {
          id: true,
          apiKey: true,
          apiSecret: true,
        },
      })

      // בדיקה אם יש ספק תשלום פעיל
      const hasPaymentProvider = !!(
        (payplusIntegration && payplusIntegration.apiKey && payplusIntegration.apiSecret) ||
        (paypalIntegration && paypalIntegration.apiKey && paypalIntegration.apiSecret)
      )

      if (!hasPaymentProvider) {
        return NextResponse.json(
          { error: "אין ספק תשלום מוגדר. אנא בחר שיטת תשלום אחרת" },
          { status: 400 }
        )
      }
    }

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
      // מציאת gift card data מהעגלה המקורית
      const cartItem = items.find((ci: any) => 
        ci.productId === item.productId && 
        (ci.variantId === item.variantId || (!ci.variantId && !item.variantId))
      )
      
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
      
      // הוסף gift card data אם קיים
      if (cartItem?.giftCardData) {
        orderItem.giftCardData = cartItem.giftCardData
        console.log('✅ Added gift card data to order item')
      }
      
      // הוסף addons אם יש
      if (item.addons && item.addons.length > 0) {
        orderItem.addons = item.addons
        console.log('✅ Added addons to order item:', item.addons)
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

    // חישוב המחיר הסופי
    const totalDiscount = calculation.automaticDiscount + calculation.couponDiscount
    const finalPrice = calculation.subtotal - totalDiscount - (data.storeCreditAmount || 0)
    
    // יצירת או מציאת לקוח רק אם הלקוח בחר להרשם או לשמור פרטים
    let finalCustomerId = data.customerId || customerId || null
    
    // אם הלקוח לא מחובר ולא בחר להרשם/לשמור פרטים, לא יוצרים לקוח
    if (!finalCustomerId && (data.createAccount || data.saveDetails)) {
      // חיפוש לקוח קיים לפי אימייל
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          shopId: shop.id,
          email: data.customerEmail.toLowerCase(),
        },
      })

      if (existingCustomer) {
        finalCustomerId = existingCustomer.id
        // עדכון פרטי הלקוח אם יש מידע חדש
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            firstName: data.customerName.split(" ")[0] || existingCustomer.firstName,
            lastName: data.customerName.split(" ").slice(1).join(" ") || existingCustomer.lastName,
            phone: data.customerPhone || existingCustomer.phone,
          },
        })
      } else {
        // יצירת לקוח חדש
        const newCustomer = await prisma.customer.create({
          data: {
            shopId: shop.id,
            email: data.customerEmail.toLowerCase(),
            firstName: data.customerName.split(" ")[0] || null,
            lastName: data.customerName.split(" ").slice(1).join(" ") || null,
            phone: data.customerPhone || null,
          },
        })
        finalCustomerId = newCustomer.id
      }
    }
    
    // חישוב סכום קרדיט בחנות לשימוש (נחשב אחרי יצירת הלקוח)
    const storeCreditAmount = data.storeCreditAmount || 0
    let storeCreditUsed = 0
    
    // חישוב הנחת יום הולדת (אם יש) - לפני חישוב מע"מ
    let birthdayDiscount = 0
    if (finalCustomerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: finalCustomerId },
        select: { dateOfBirth: true, premiumClubTier: true },
      })
      
      if (customer?.dateOfBirth && customer.premiumClubTier) {
        const today = new Date()
        const birthDate = new Date(customer.dateOfBirth)
        const isBirthday = birthDate.getDate() === today.getDate() && 
                          birthDate.getMonth() === today.getMonth()
        
        if (isBirthday) {
          const premiumClubPlugin = await prisma.plugin.findFirst({
            where: {
              slug: 'premium-club',
              shopId: shop.id,
              isActive: true,
              isInstalled: true,
            },
            select: { config: true },
          })
          
          if (premiumClubPlugin?.config) {
            const config = premiumClubPlugin.config as any
            const birthdayDiscountConfig = config.benefits?.birthdayDiscount
            
            if (birthdayDiscountConfig?.enabled) {
              if (birthdayDiscountConfig.type === 'PERCENTAGE') {
                birthdayDiscount = (calculation.subtotal * birthdayDiscountConfig.value) / 100
              } else {
                birthdayDiscount = birthdayDiscountConfig.value
              }
            }
          }
        }
      }
    }

    // חישוב משלוח - שימוש בערך שנשלח או חישוב לפי הגדרות
    let shipping = data.shippingCost || 0
    
    // בדיקת משלוח חינם לפי רמת מועדון פרימיום (אחרי יצירת הלקוח)
    let hasFreeShipping = false
    if (finalCustomerId) {
      const customerForShipping = await prisma.customer.findUnique({
        where: { id: finalCustomerId },
        select: { premiumClubTier: true },
      })
      
      if (customerForShipping?.premiumClubTier) {
        const premiumClubPlugin = await prisma.plugin.findFirst({
          where: {
            slug: 'premium-club',
            shopId: shop.id,
            isActive: true,
            isInstalled: true,
          },
          select: { config: true },
        })
        
        if (premiumClubPlugin?.config) {
          const config = premiumClubPlugin.config as any
          if (config.enabled && config.tiers) {
            const tier = config.tiers.find((t: any) => t.slug === customerForShipping.premiumClubTier)
            hasFreeShipping = tier?.benefits?.freeShipping || false
          }
        }
      }
    }
    
    if (!data.shippingCost && !hasFreeShipping) {
      // אם לא נשלח shippingCost ולא יש משלוח חינם לפי רמה, נחשב לפי הגדרות החנות
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
    } else if (hasFreeShipping) {
      // אם יש משלוח חינם לפי רמה, המשלוח הוא 0
      shipping = 0
    }

    // חישוב מחיר סופי כולל הנחת יום הולדת
    const finalPriceWithBirthday = finalPrice - birthdayDiscount

    // חישוב מע"מ בהתאם להגדרת החנות
    const taxRate = shop.taxEnabled && shop.taxRate ? shop.taxRate : 0
    const pricesIncludeTax = shop.pricesIncludeTax ?? true // ברירת מחדל: המחירים כוללים מע"מ
    
    let tax = 0
    let total = 0
    
    if (taxRate > 0) {
      if (pricesIncludeTax) {
        // המחירים כוללים מע"מ - המע"מ כבר נכלל במחיר, לא צריך להציג אותו בנפרד
        tax = 0
        total = finalPriceWithBirthday + shipping
      } else {
        // המחירים לא כוללים מע"מ - צריך להוסיף מע"מ
        tax = finalPriceWithBirthday * (taxRate / 100)
        total = finalPriceWithBirthday + tax + shipping
      }
    } else {
      // אין מע"מ
      total = finalPriceWithBirthday + shipping
    }

    // יצירת או מציאת לקוח רק אם הלקוח בחר להרשם או לשמור פרטים
    // finalCustomerId כבר הוגדר למעלה בשורה 229
    
    // אם הלקוח לא מחובר ולא בחר להרשם/לשמור פרטים, לא יוצרים לקוח
    if (!finalCustomerId && (data.createAccount || data.saveDetails)) {
      // חיפוש לקוח קיים לפי אימייל
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          shopId: shop.id,
          email: data.customerEmail.toLowerCase(),
        },
      })

      if (existingCustomer) {
        finalCustomerId = existingCustomer.id
        // עדכון פרטי הלקוח אם יש מידע חדש
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            firstName: data.customerName.split(" ")[0] || existingCustomer.firstName,
            lastName: data.customerName.split(" ").slice(1).join(" ") || existingCustomer.lastName,
            phone: data.customerPhone || existingCustomer.phone,
          },
        })
      } else if (data.createAccount) {
        // יצירת לקוח חדש רק אם הלקוח בחר להרשם
        const newCustomer = await prisma.customer.create({
          data: {
            shopId: shop.id,
            email: data.customerEmail.toLowerCase(),
            firstName: data.customerName.split(" ")[0] || null,
            lastName: data.customerName.split(" ").slice(1).join(" ") || null,
            phone: data.customerPhone || null,
            emailVerified: false, // לא מאומת כי לא עבר דרך magic link או הרשמה
            password: null, // אין סיסמה - נוצר מהזמנה (יכול להגדיר סיסמה אחר כך)
            isSubscribed: data.newsletter || false,
          },
        })
        finalCustomerId = newCustomer.id

        // יצירת אירוע
        await prisma.shopEvent.create({
          data: {
            shopId: shop.id,
            type: "customer.registered",
            entityType: "customer",
            entityId: newCustomer.id,
            payload: {
              customerId: newCustomer.id,
              email: newCustomer.email,
              method: "checkout",
            },
          },
        })
      }
      // אם רק saveDetails (בלי createAccount), לא יוצרים לקוח חדש - רק משתמשים בקיים אם יש
    }

    // מציאת מקור תנועה לפי UTM Source
    let trafficSourceId: string | null = null
    if (data.utmSource) {
      const trafficSource = await prisma.trafficSource.findUnique({
        where: {
          shopId_uniqueId: {
            shopId: shop.id,
            uniqueId: data.utmSource,
          },
        },
        select: { id: true },
      })
      if (trafficSource) {
        trafficSourceId = trafficSource.id
      }
    }

    // יצירת מספר הזמנה (מתחיל מ-1000 לכל חנות)
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
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress || data.shippingAddress,
        subtotal: Math.round(calculation.subtotal * 100) / 100,
        shipping: Math.round(shipping * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        discount: Math.round((totalDiscount + giftCardDiscount + calculation.customerDiscount + storeCreditUsed + birthdayDiscount) * 100) / 100,
        total: Math.round(Math.max(0, finalPriceWithBirthday + tax + shipping) * 100) / 100, // עיגול ל-2 ספרות אחרי הנקודה
        paymentMethod: data.paymentMethod,
        couponCode: data.couponCode,
        notes: data.notes,
        customFields: data.customFields || {},
        trafficSourceId: trafficSourceId, // שמירת מקור התנועה
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

    // עדכון יתרת קרדיט בחנות אם נעשה שימוש
    if (storeCreditUsed > 0 && finalCustomerId) {
      const storeCredit = await prisma.storeCredit.findFirst({
        where: {
          shopId: shop.id,
          customerId: finalCustomerId,
        },
      })

      if (storeCredit) {
        await prisma.storeCredit.update({
          where: { id: storeCredit.id },
          data: {
            balance: storeCredit.balance - storeCreditUsed,
          },
        })

        await prisma.storeCreditTransaction.create({
          data: {
            storeCreditId: storeCredit.id,
            orderId: order.id,
            amount: -storeCreditUsed,
            type: "CHARGE", // CHARGE = שימוש בקרדיט (חיוב)
          },
        })

        console.log(`✅ Store credit used: ${storeCreditUsed}, remaining balance: ${storeCredit.balance - storeCreditUsed}`)
      }
    }

    // יצירת/עדכון Contact עם קטגוריות מתאימות
    try {
      // אתחול קטגוריות אם צריך
      await initContactCategories(shop.id)

      const categoryTypes: string[] = ["CUSTOMER"] // כל הזמנה = לקוח

      if (data.newsletter) {
        categoryTypes.push("NEWSLETTER")
      }

      if (data.createAccount) {
        categoryTypes.push("CLUB_MEMBER")
      }

      const nameParts = data.customerName.split(" ")
      await createOrUpdateContact({
        shopId: shop.id,
        email: data.customerEmail.toLowerCase(),
        firstName: nameParts[0] || null,
        lastName: nameParts.slice(1).join(" ") || null,
        phone: data.customerPhone || null,
        company: data.companyName || null,
        notes: data.orderNotes || null,
        categoryTypes,
        emailMarketingConsent: data.newsletter || false,
        emailMarketingConsentSource: data.newsletter ? "checkout" : undefined,
        customerId: finalCustomerId || null,
      })

      // עדכון Contact עם customerId אם נוצר Customer חדש (אם עדיין לא עודכן)
      if (finalCustomerId) {
        const contact = await prisma.contact.findUnique({
          where: {
            shopId_email: {
              shopId: shop.id,
              email: data.customerEmail.toLowerCase(),
            },
          },
        })
        
        if (contact && !contact.customerId) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { customerId: finalCustomerId },
          })
        }
      }
    } catch (contactError) {
      // לא נכשל את ההזמנה אם יש בעיה ב-Contact
      console.error("Error creating/updating contact:", contactError)
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

    // עדכון totalSpent ו-orderCount של הלקוח (אם יש לקוח)
    if (finalCustomerId) {
      try {
        await prisma.customer.update({
          where: { id: finalCustomerId },
          data: {
            totalSpent: {
              increment: order.total,
            },
            orderCount: {
              increment: 1,
            },
          },
        })
      } catch (updateError) {
        // לא נכשל את ההזמנה אם יש בעיה בעדכון הלקוח
        console.error('Error updating customer stats:', updateError)
      }
    }

    // עדכון רמת מועדון פרימיום (אם יש לקוח)
    if (finalCustomerId) {
      try {
        await runPluginHook('onOrderComplete', shop.id, order)
      } catch (pluginError) {
        // לא נכשל את ההזמנה אם יש בעיה בתוסף
        console.error('Error running premium club plugin hook:', pluginError)
      }
    }

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
    
    // בדיקה אם צריך לשלוח אוטומטית לחברת משלוחים
    const { ShippingManager } = await import('@/lib/shipping/manager')
    ShippingManager.checkAutoSend(order.id, 'order.created').catch((error) => {
      console.error('Error checking auto-send shipping:', error)
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

    // הערה: מייל אישור ההזמנה נשלח אחרי תשלום מוצלח ב-callback של PayPlus/PayPal
    // כדי לא לשלוח מייל לפני שהלקוח באמת שילם

    // אם זה תשלום בכרטיס אשראי, יצירת payment URL דרך PayPlus או PayPal
    let paymentUrl = null
    if (data.paymentMethod === "credit_card") {
      const baseUrl = process.env.APP_URL || "http://localhost:3000"

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

