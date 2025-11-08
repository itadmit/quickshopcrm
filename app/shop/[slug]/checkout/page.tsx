import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { calculateCart } from "@/lib/cart-calculations"
import { CheckoutForm } from "./CheckoutForm"

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

    if (!sessionId) {
      return { shop, cart: null }
    }

    let cart = await prisma.cart.findFirst({
      where: {
        shopId: shop.id,
        sessionId,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (customerId && !cart) {
      cart = await prisma.cart.findFirst({
        where: {
          shopId: shop.id,
          customerId,
          expiresAt: {
            gt: new Date(),
          },
        },
      })
    }

    if (!cart || !cart.items || (cart.items as any[]).length === 0) {
      return { shop, cart: null }
    }

    const cartItems = cart.items as any[]

    // שימוש בפונקציה המרכזית לחישוב עגלה
    const calculation = await calculateCart(
      shop.id,
      cartItems,
      cart.couponCode,
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

    return {
      shop: {
        ...shop,
        shippingSettings: shippingSettings,
        pickupSettings: pickupSettings,
      },
      cart: {
        id: cart.id,
        items: calculation.items,
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
    } catch (error) {
      console.error("Error fetching cart:", error)
    return null
  }
}


export default async function CheckoutPage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = params

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

  // טעינת עגלה וחנות ב-server
  const data = await getCart(slug, customerId)

  if (!data || !data.cart || data.cart.items.length === 0) {
    redirect(`/shop/${slug}`)
  }

  return <CheckoutForm shop={data.shop} cart={data.cart} customerData={customerData} slug={slug} />
}
