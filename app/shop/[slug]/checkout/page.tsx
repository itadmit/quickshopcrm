import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { calculateCart } from "@/lib/cart-calculations"
import { findCart, hasValidCart } from "@/lib/cart-server"
import { CheckoutForm } from "./CheckoutForm"

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
      },
    })

    if (!shop) {
      return null
    }

    const cookieStore = await cookies()
    const sessionId = cookieStore.get("cart_session")?.value

    // שימוש בפונקציה המרכזית למציאת עגלה
    const cart = await findCart(shop.id, sessionId, customerId)

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
      },
      cart: {
        id: cart!.id,
        items: calculation.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
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
  searchParams?: Promise<{ cartId?: string }> | { cartId?: string }
}) {
  const { slug } = params
  const resolvedSearchParams = await Promise.resolve(searchParams || {})
  const cartId = resolvedSearchParams.cartId

  // קבלת customerId מ-cookies או headers
  const cookieStore = await cookies()
  const customerCookie = cookieStore.get(`storefront_customer_${slug}`)
  let customerId: string | null = null
  let customerData: any = null

  if (customerCookie) {
    try {
      customerData = JSON.parse(customerCookie.value)
      customerId = customerData.id
    } catch (error) {
      console.error("Error parsing customer cookie:", error)
    }
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
              },
              cart: {
                id: cart.id,
                items: calculation.items.map(item => ({
                  productId: item.productId,
                  variantId: item.variantId ?? null,
                  quantity: item.quantity,
                  price: item.price,
                  total: item.total,
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

  if (!data || !data.cart || data.cart.items.length === 0) {
    redirect(`/shop/${slug}`)
  }

  return <CheckoutForm shop={data.shop} cart={data.cart} customerData={customerData} slug={slug} />
}
