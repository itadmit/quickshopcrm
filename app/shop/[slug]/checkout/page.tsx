import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
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
    const productIdsSet = new Set<string>(cartItems.map((item: any) => item.productId))
    const productIds = Array.from(productIdsSet)
    const variantIds = cartItems
      .map((item: any) => item.variantId)
      .filter((id: string | null) => id !== null && id !== undefined)

    const [products, variants] = await Promise.all([
      prisma.product.findMany({
        where: {
          id: { in: productIds },
          shopId: shop.id,
        },
        select: {
          id: true,
          name: true,
          price: true,
          comparePrice: true,
          images: true,
          sku: true,
        },
      }),
      variantIds.length > 0
        ? prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: {
              id: true,
              name: true,
              price: true,
              sku: true,
              inventoryQty: true,
            },
          })
        : [],
    ])

    const productsMap = new Map(products.map((p: any) => [p.id, p]))
    const variantsMap = new Map(variants.map((v: any) => [v.id, v]))

    let customerDiscountSettings = null
    let customer = null
    if (customerId) {
      const [shopWithSettings, customerData] = await Promise.all([
        prisma.shop.findUnique({
          where: { id: shop.id },
          select: { customerDiscountSettings: true },
        }),
        prisma.customer.findUnique({
          where: { id: customerId },
          select: {
            totalSpent: true,
            orderCount: true,
            tier: true,
          },
        }),
      ])
      customerDiscountSettings = shopWithSettings?.customerDiscountSettings
      customer = customerData
    }

    const enrichedItems = []
    let subtotal = 0
    let customerDiscountTotal = 0

    for (const item of cartItems) {
      const product = productsMap.get(item.productId)
      if (!product) continue

      const variant = item.variantId ? variantsMap.get(item.variantId) : null
      const basePrice = variant?.price || product.price
      let itemPrice = basePrice

      if (customerId && customer && customerDiscountSettings) {
        const discount = calculateCustomerDiscountSync(
          customerDiscountSettings as any,
          customer,
          basePrice
        )
        itemPrice = basePrice - discount
        customerDiscountTotal += discount * item.quantity
      }

      const itemTotal = itemPrice * item.quantity
      subtotal += itemTotal

      enrichedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          comparePrice: product.comparePrice,
          images: product.images || [],
          sku: product.sku,
        },
        variant: variant
          ? {
              id: variant.id,
              name: variant.name,
              price: variant.price,
              sku: variant.sku,
              inventoryQty: variant.inventoryQty,
            }
          : null,
        price: itemPrice,
        total: itemTotal,
      })
    }

    let discount = 0
    if (cart.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: cart.couponCode },
      })

      if (coupon && coupon.isActive && coupon.shopId === shop.id) {
        if (coupon.type === "PERCENTAGE") {
          discount = (subtotal * coupon.value) / 100
        } else if (coupon.type === "FIXED") {
          discount = coupon.value
        }

        if (coupon.maxDiscount) {
          discount = Math.min(discount, coupon.maxDiscount)
        }
      }
    }

    const tax = shop.taxEnabled && shop.taxRate
      ? (subtotal - discount) * (shop.taxRate / 100)
      : 0

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
      } else if (shippingOptions.freeOver && shippingOptions.freeOverAmount && subtotal >= shippingOptions.freeOverAmount) {
        shipping = 0
      } else if (!shippingOptions.free) {
        shipping = shippingOptions.fixedCost || 0
      }
    }

    const total = subtotal - discount - customerDiscountTotal + tax + shipping

    return {
      shop: {
        ...shop,
        shippingSettings: shippingSettings,
        pickupSettings: pickupSettings,
      },
      cart: {
        id: cart.id,
        items: enrichedItems,
        subtotal,
        tax,
        shipping,
        discount: discount + customerDiscountTotal,
        customerDiscount: customerDiscountTotal > 0 ? customerDiscountTotal : undefined,
        couponDiscount: discount > 0 ? discount : undefined,
        total: Math.max(0, total),
        couponCode: cart.couponCode,
        expiresAt: cart.expiresAt,
      },
      }
    } catch (error) {
      console.error("Error fetching cart:", error)
    return null
  }
}

function calculateCustomerDiscountSync(
  settings: any,
  customer: { totalSpent: number; orderCount: number; tier: string | null },
  basePrice: number
): number {
  if (!settings || !settings.enabled) {
    return 0
  }

  let discount = 0

  if (settings.tiers && settings.tiers.length > 0) {
    for (const tier of settings.tiers) {
      if (
        customer.totalSpent >= tier.minSpent &&
        customer.orderCount >= tier.minOrders
      ) {
        if (tier.discount.type === "PERCENTAGE") {
          discount = (basePrice * tier.discount.value) / 100
        } else {
          discount = tier.discount.value
        }
        break
      }
    }
  }

  if (discount === 0 && settings.baseDiscount) {
    let applicable = false

    if (settings.baseDiscount.applicableTo === "ALL_PRODUCTS") {
      applicable = true
    } else if (settings.baseDiscount.applicableTo === "PRODUCTS") {
      applicable = true
    } else if (settings.baseDiscount.applicableTo === "CATEGORIES") {
      applicable = true
    }

    if (applicable) {
      if (settings.baseDiscount.type === "PERCENTAGE") {
        discount = (basePrice * settings.baseDiscount.value) / 100
      } else {
        discount = settings.baseDiscount.value
      }
    }
  }

  return Math.min(discount, basePrice)
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
