import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { calculateCart } from "@/lib/cart-calculations"
import { findCart, hasValidCart } from "@/lib/cart-server"
import { CheckoutForm } from "./CheckoutForm"
import { CheckoutRedirect } from "./CheckoutRedirect"

// מבטל caching - תמיד טוען נתונים טריים
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getCart(slug: string, customerId: string | null) {
  try {
    const shop = await prisma.shop.findUnique({
      where: {
        slug,
        isPublished: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        taxEnabled: true,
        taxRate: true,
        customerDiscountSettings: true,
        settings: true,
        companyId: true,
      },
    })

    if (!shop) {
      return null
    }

    // קריאת session ID תמיד (גם אם יש customerId) כדי למזג עגלות אם צריך
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("cart_session")?.value || null

    console.log(`[Checkout getCart] shopId: ${shop.id}, customerId: ${customerId || 'none'}, sessionId: ${sessionId || 'none'}`)

    // שימוש בפונקציה המרכזית למציאת עגלה
    // findCart ימזג אוטומטית session cart עם customer cart אם צריך
    const cart = await findCart(shop.id, sessionId, customerId)
    
    console.log(`[Checkout getCart] Cart found:`, cart ? { id: cart.id, itemsCount: (cart.items as any[]).length } : 'NOT FOUND')

    if (!hasValidCart(cart)) {
      return { shop, cart: null }
    }

    // TypeScript: cart לא יכול להיות null כאן בגלל הבדיקה למעלה
    const cartItems = cart!.items as any[]

    // שימוש בפונקציה המרכזית לחישוב עגלה
    const calculation = await calculateCart(
      shop.id,
      cartItems,
      cart!.couponCode,
      customerId,
      shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
      null // shipping - לא מחושב כאן, יוחלף בצ'ק אאוט
    )

    // חישוב משלוח לפי הגדרות החנות (ברירת מחדל - יוחלף בצ'ק אאוט)
    const settings = shop.settings as any
    const shippingSettings = settings?.shipping || {}
    const pickupSettings = settings?.pickup || {}
    
    // ברירת מחדל - משלוח (אם מופעל)
    let shipping = 0
    if (shippingSettings.enabled) {
      const shippingOptions = shippingSettings.options || {}
      
      if (shippingOptions.fixed && shippingOptions.fixedCost) {
        shipping = shippingOptions.fixedCost
      } else if (shippingOptions.freeOver && shippingOptions.freeOverAmount && calculation.subtotal >= shippingOptions.freeOverAmount) {
        shipping = 0
      } else if (!shippingOptions.free) {
        shipping = shippingOptions.fixedCost || 0
      }
    }

    // חישוב מחדש של total עם shipping
    const totalWithShipping = calculation.total - calculation.shipping + shipping

    const checkoutSettings = settings?.checkoutPage || {}
    
    // קריאת הגדרות שיטות תשלום
    const paymentMethods = settings?.paymentMethods || {}
    const bankTransferEnabled = paymentMethods.bankTransfer?.enabled === true
    const bankTransferInstructions = paymentMethods.bankTransfer?.instructions || ""
    const cashEnabled = paymentMethods.cash?.enabled === true
    const cashMinOrderEnabled = paymentMethods.cash?.minOrderEnabled === true
    const cashMinOrderAmount = paymentMethods.cash?.minOrderAmount || null
    
    // בדיקה אם יש אינטגרציה פעילה עם ספק תשלום
    let hasPaymentProvider = false
    if (shop.companyId) {
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

      hasPaymentProvider = !!(
        (payplusIntegration && payplusIntegration.apiKey && payplusIntegration.apiSecret) ||
        (paypalIntegration && paypalIntegration.apiKey && paypalIntegration.apiSecret)
      )
    }

    // לוג לבדיקה - רק ב-development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Checkout getCart] Payment methods:`, {
        hasPaymentProvider,
        bankTransferEnabled,
        cashEnabled,
        companyId: shop.companyId,
      })
    }

    return {
      shop: {
        ...shop,
        shippingSettings: shippingSettings,
        pickupSettings: pickupSettings,
        checkoutSettings: {
          primaryColor: checkoutSettings.primaryColor || "#9333ea",
          backgroundColor: checkoutSettings.backgroundColor || "#ffffff",
          textColor: checkoutSettings.textColor || "#111827",
          sectionBgColor: checkoutSettings.sectionBgColor || "#f9fafb",
          borderColor: checkoutSettings.borderColor || "#e5e7eb",
          showNewsletterCheckbox: checkoutSettings.showNewsletterCheckbox !== undefined ? checkoutSettings.showNewsletterCheckbox : true,
          newsletterDefaultChecked: checkoutSettings.newsletterDefaultChecked !== undefined ? checkoutSettings.newsletterDefaultChecked : true,
          footerLinks: checkoutSettings.footerLinks || [],
          customFields: checkoutSettings.customFields || [],
        },
        hasPaymentProvider, // האם יש ספק תשלום פעיל
        paymentMethods: {
          bankTransfer: {
            enabled: bankTransferEnabled,
            instructions: bankTransferInstructions,
          },
          cash: {
            enabled: cashEnabled,
            minOrderEnabled: cashMinOrderEnabled,
            minOrderAmount: cashMinOrderAmount,
          },
        },
      },
      cart: {
        id: cart!.id,
        items: calculation.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          addons: (item as any).addons || undefined,
          bundleId: (item as any).bundleId || undefined,
          bundleName: (item as any).bundleName || undefined,
          product: {
            id: item.product.id,
            name: item.product.name,
            images: Array.isArray(item.product.images) 
              ? item.product.images 
              : (item.product.images ? [item.product.images] : []),
          },
          variant: item.variant ? {
            id: item.variant.id,
            name: item.variant.name,
          } : null,
        })),
        subtotal: calculation.subtotal,
        tax: calculation.tax,
        shipping,
        discount: calculation.automaticDiscount + calculation.couponDiscount + calculation.customerDiscount,
        customerDiscount: calculation.customerDiscount > 0 ? calculation.customerDiscount : undefined,
        couponDiscount: calculation.couponDiscount > 0 ? calculation.couponDiscount : undefined,
        automaticDiscount: calculation.automaticDiscount > 0 ? calculation.automaticDiscount : undefined,
        total: Math.max(0, totalWithShipping),
        couponCode: cart!.couponCode,
        expiresAt: cart!.expiresAt,
      },
      }
    } catch (error) {
      console.error("Error fetching cart:", error)
    return null
  }
}


export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: Promise<{ cartId?: string; customerId?: string }> | { cartId?: string; customerId?: string }
}) {
  const { slug } = params
  const resolvedSearchParams = await Promise.resolve(searchParams || {})
  const cartId = resolvedSearchParams.cartId
  const customerIdFromQuery = resolvedSearchParams.customerId

  // קבלת customerId מ-cookies או query params
  const cookieStore = await cookies()
  const customerCookie = cookieStore.get(`storefront_customer_${slug}`)
  let customerId: string | null = null
  let customerData: any = null

  console.log(`[Checkout] Looking for cookie: storefront_customer_${slug}`)
  console.log(`[Checkout] All cookies:`, cookieStore.getAll().map(c => c.name))
  console.log(`[Checkout] customerId from query:`, customerIdFromQuery)

  if (customerCookie) {
    try {
      customerData = JSON.parse(customerCookie.value)
      customerId = customerData.id
      console.log(`[Checkout] Customer found in cookie: ${customerId}`)
    } catch (error) {
      console.error("Error parsing customer cookie:", error)
    }
  } else if (customerIdFromQuery) {
    // אם יש customerId ב-query params, נטען את פרטי הלקוח מהדאטאבייס
    try {
      const shop = await prisma.shop.findUnique({
        where: { slug, isPublished: true },
        select: { id: true },
      })
      
      if (shop) {
        const customer = await prisma.customer.findFirst({
          where: {
            id: customerIdFromQuery,
            shopId: shop.id,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        })
        
        if (customer) {
          customerId = customer.id
          customerData = customer
          console.log(`[Checkout] Customer found from query: ${customerId}`)
        }
      }
    } catch (error) {
      console.error("Error fetching customer from query:", error)
    }
  } else {
    console.log(`[Checkout] No customer cookie or query param found for ${slug}`)
  }

  // אם יש cartId ב-query params, נטען את העגלה הזו ישירות
  // אחרת נטען את העגלה הרגילה לפי session/customer
  let data: Awaited<ReturnType<typeof getCart>> | null = null
  
  if (cartId) {
    // טעינת עגלה לפי cartId - נשתמש ב-getCart הרגיל אבל נבדוק שהעגלה תואמת
    data = await getCart(slug, customerId)
    
    // אם העגלה שנמצאה לא תואמת ל-cartId, נחפש את העגלה לפי cartId
    if (!data || !data.cart || data.cart.id !== cartId) {
      try {
        const shop = await prisma.shop.findUnique({
          where: { slug, isPublished: true },
          select: {
            id: true,
            name: true,
            description: true,
            logo: true,
            taxEnabled: true,
            taxRate: true,
            customerDiscountSettings: true,
            settings: true,
            companyId: true,
          },
        })

        if (shop) {
          const cart = await prisma.cart.findFirst({
            where: {
              id: cartId,
              shopId: shop.id,
              expiresAt: { gt: new Date() },
              // אם יש customerId, נבדוק שהוא תואם (או null)
              ...(customerId ? { customerId } : { customerId: null }),
            },
          })

          if (cart && (cart.items as any[]).length > 0) {
            // טעינת נתוני העגלה לפי cartId
            const cartItems = cart.items as any[]
            const calculation = await calculateCart(
              shop.id,
              cartItems,
              cart.couponCode,
              customerId,
              shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
              null
            )

            const settings = shop.settings as any
            const shippingSettings = settings?.shipping || {}
            const pickupSettings = settings?.pickup || {}
            const checkoutSettings = settings?.checkoutPage || {}
            
            // קריאת הגדרות שיטות תשלום
            const paymentMethods = settings?.paymentMethods || {}
            const bankTransferEnabled = paymentMethods.bankTransfer?.enabled === true
            const bankTransferInstructions = paymentMethods.bankTransfer?.instructions || ""
            const cashEnabled = paymentMethods.cash?.enabled === true
            const cashMinOrderEnabled = paymentMethods.cash?.minOrderEnabled === true
            const cashMinOrderAmount = paymentMethods.cash?.minOrderAmount || null
            
            let shipping = 0
            if (shippingSettings.enabled) {
              const shippingOptions = shippingSettings.options || {}
              if (shippingOptions.fixed && shippingOptions.fixedCost) {
                shipping = shippingOptions.fixedCost
              } else if (shippingOptions.freeOver && shippingOptions.freeOverAmount && calculation.subtotal >= shippingOptions.freeOverAmount) {
                shipping = 0
              } else if (!shippingOptions.free) {
                shipping = shippingOptions.fixedCost || 0
              }
            }

            const totalWithShipping = calculation.total - calculation.shipping + shipping

            // בדיקה אם יש אינטגרציה פעילה עם ספק תשלום
            let hasPaymentProvider = false
            if (shop.companyId) {
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

              hasPaymentProvider = !!(
                (payplusIntegration && payplusIntegration.apiKey && payplusIntegration.apiSecret) ||
                (paypalIntegration && paypalIntegration.apiKey && paypalIntegration.apiSecret)
              )
            }

            // לוג לבדיקה - רק ב-development
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Checkout cartId path] Payment methods:`, {
                hasPaymentProvider,
                bankTransferEnabled,
                cashEnabled,
                companyId: shop.companyId,
              })
            }

            data = {
              shop: {
                ...shop,
                shippingSettings,
                pickupSettings,
                checkoutSettings: {
                  primaryColor: checkoutSettings.primaryColor || "#9333ea",
                  backgroundColor: checkoutSettings.backgroundColor || "#ffffff",
                  textColor: checkoutSettings.textColor || "#111827",
                  sectionBgColor: checkoutSettings.sectionBgColor || "#f9fafb",
                  borderColor: checkoutSettings.borderColor || "#e5e7eb",
                  showNewsletterCheckbox: checkoutSettings.showNewsletterCheckbox !== undefined ? checkoutSettings.showNewsletterCheckbox : true,
                  newsletterDefaultChecked: checkoutSettings.newsletterDefaultChecked !== undefined ? checkoutSettings.newsletterDefaultChecked : true,
                  footerLinks: checkoutSettings.footerLinks || [],
                  customFields: checkoutSettings.customFields || [],
                },
                hasPaymentProvider, // האם יש ספק תשלום פעיל
                paymentMethods: {
                  bankTransfer: {
                    enabled: bankTransferEnabled,
                    instructions: bankTransferInstructions,
                  },
                  cash: {
                    enabled: cashEnabled,
                    minOrderEnabled: cashMinOrderEnabled,
                    minOrderAmount: cashMinOrderAmount,
                  },
                },
              },
              cart: {
                id: cart.id,
                items: calculation.items.map(item => ({
                  productId: item.productId,
                  variantId: item.variantId ?? null,
                  quantity: item.quantity,
                  price: item.price,
                  total: item.total,
                  addons: (item as any).addons || undefined,
                  bundleId: (item as any).bundleId || undefined,
                  bundleName: (item as any).bundleName || undefined,
                  product: {
                    id: item.product.id,
                    name: item.product.name,
                    images: Array.isArray(item.product.images) 
                      ? item.product.images 
                      : (item.product.images ? [item.product.images] : []),
                  },
                  variant: item.variant ? {
                    id: item.variant.id,
                    name: item.variant.name,
                  } : null,
                })),
                subtotal: calculation.subtotal,
                tax: calculation.tax,
                shipping,
                discount: calculation.automaticDiscount + calculation.couponDiscount + calculation.customerDiscount,
                customerDiscount: calculation.customerDiscount > 0 ? calculation.customerDiscount : undefined,
                couponDiscount: calculation.couponDiscount > 0 ? calculation.couponDiscount : undefined,
                automaticDiscount: calculation.automaticDiscount > 0 ? calculation.automaticDiscount : undefined,
                total: Math.max(0, totalWithShipping),
                couponCode: cart.couponCode,
                expiresAt: cart.expiresAt,
              },
            }
          }
        }
      } catch (error) {
        console.error("Error loading cart by ID:", error)
      }
    }
  } else {
    // טעינה רגילה ללא cartId
    data = await getCart(slug, customerId)
  }

  console.log(`[Checkout] Cart data:`, {
    hasData: !!data,
    hasCart: !!data?.cart,
    itemsCount: data?.cart?.items?.length || 0,
    customerId,
  })

  if (!data || !data.cart || data.cart.items.length === 0) {
    console.log(`[Checkout] Redirecting to shop - no cart or empty cart`)
    // אם אין customerId ב-cookie אבל יש ב-query, ננסה שוב עם query
    if (!customerId && customerIdFromQuery) {
      // נשאיר את זה - כבר טענו את הלקוח מ-query
    } else if (!customerId) {
      // אם אין customerId בכלל, נבדוק אם יש ב-localStorage דרך Client Component
      return <CheckoutRedirect slug={slug} />
    }
    redirect(`/shop/${slug}`)
  }

  return <CheckoutForm shop={data.shop} cart={data.cart} customerData={customerData} slug={slug} />
}
