import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { cookies } from "next/headers"
import { calculateCustomerDiscount } from "@/lib/discounts"

// פונקציה סינכרונית לחישוב הנחה (ללא queries)
function calculateCustomerDiscountSync(
  settings: any,
  customer: { totalSpent: number; orderCount: number; tier: string | null },
  basePrice: number
): number {
  if (!settings || !settings.enabled) {
    return 0
  }

  let discount = 0

  // בדיקת tier
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

  // אם אין tier מתאים, בדיקת baseDiscount
  if (discount === 0 && settings.baseDiscount) {
    let applicable = false

    if (settings.baseDiscount.applicableTo === "ALL_PRODUCTS") {
      applicable = true
    } else if (settings.baseDiscount.applicableTo === "PRODUCTS") {
      applicable = true // פשוט
    } else if (settings.baseDiscount.applicableTo === "CATEGORIES") {
      applicable = true // פשוט
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

const addToCartSchema = z.object({
  productId: z.string(),
  variantId: z.string().nullable().optional(),
  quantity: z.number().int().min(1),
})

// GET - קבלת עגלת קניות
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // נסה למצוא את החנות לפי slug או ID
    let shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    // אם לא נמצא לפי slug, ננסה לחפש לפי ID (למקרה שה-slug השתנה)
    if (!shop) {
      shop = await prisma.shop.findFirst({
        where: {
          id: params.slug,
          isPublished: true,
        },
      })
    }

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const cookieStore = await cookies()
    const sessionId = cookieStore.get("cart_session")?.value
    const customerId = req.headers.get("x-customer-id") || null

    if (!sessionId) {
      return NextResponse.json({
        id: null,
        items: [],
        subtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        couponCode: null,
      })
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

    // אם יש customerId, ננסה למצוא עגלה של הלקוח
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

    if (!cart) {
      return NextResponse.json({
        id: null,
        items: [],
        subtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        couponCode: null,
      })
    }

    // בניית פריטי עגלה עם פרטי מוצרים - אופטימיזציה עם batch queries
    const cartItems = cart.items as any[]
    
    // אם העגלה ריקה, החזר מיד (אופטימיזציה)
    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({
        id: cart.id,
        items: [],
        subtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        customerDiscount: undefined,
        couponDiscount: undefined,
        total: 0,
        couponCode: cart.couponCode,
        expiresAt: cart.expiresAt,
      })
    }
    
    // איסוף כל ה-IDs
    const productIdsSet = new Set(cartItems.map((item: any) => item.productId))
    const productIds = Array.from(productIdsSet)
    const variantIds = cartItems
      .map((item: any) => item.variantId)
      .filter((id: string | null) => id !== null && id !== undefined)

    // Batch queries - כל המוצרים ב-query אחד
    const products = await prisma.product.findMany({
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
    })

    // Batch queries - כל ה-variants ב-query אחד
    const variants = variantIds.length > 0
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            name: true,
            price: true,
            sku: true,
            inventoryQty: true,
          },
        })
      : []

    // יצירת maps לזיהוי מהיר
    const productsMap = new Map(products.map((p: any) => [p.id, p]))
    const variantsMap = new Map(variants.map((v: any) => [v.id, v]))

    // טעינת הגדרות הנחות פעם אחת (אם יש customerId)
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

      // חישוב הנחת לקוח רשום (ללא queries נוספים)
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

    // חישוב הנחה מקופון
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

    // חישוב מע"מ
    const tax = shop.taxEnabled && shop.taxRate
      ? (subtotal - discount) * (shop.taxRate / 100)
      : 0

    // חישוב משלוח (פשוט - ניתן לשפר)
    const shipping = 0

    // סה"כ
    const total = subtotal - discount - customerDiscountTotal + tax + shipping

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error("Error fetching cart:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - הוספה לעגלה
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // נסה למצוא את החנות לפי slug או ID
    let shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    // אם לא נמצא לפי slug, ננסה לחפש לפי ID (למקרה שה-slug השתנה)
    if (!shop) {
      shop = await prisma.shop.findFirst({
        where: {
          id: params.slug,
          isPublished: true,
        },
      })
    }

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = addToCartSchema.parse(body)
    const customerId = req.headers.get("x-customer-id") || null

    // בדיקת מוצר
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        shopId: shop.id,
        status: "PUBLISHED",
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // בדיקת מלאי
    if (data.variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: data.variantId },
      })
      if (variant && variant.inventoryQty < data.quantity) {
        return NextResponse.json(
          { error: "Insufficient inventory" },
          { status: 400 }
        )
      }
    } else if (product.inventoryQty < data.quantity) {
      return NextResponse.json(
        { error: "Insufficient inventory" },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    let sessionId = cookieStore.get("cart_session")?.value

    if (!sessionId) {
      sessionId = `cart_${Date.now()}_${Math.random().toString(36).substring(7)}`
      cookieStore.set("cart_session", sessionId, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        sameSite: "lax",
      })
    }

    // מציאת או יצירת עגלה
    let cart = await prisma.cart.findFirst({
      where: {
        shopId: shop.id,
        ...(customerId ? { customerId } : { sessionId }),
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    const items = cart ? (cart.items as any[]) : []
    const existingItemIndex = items.findIndex(
      (item) =>
        item.productId === data.productId &&
        (item.variantId === data.variantId || (!item.variantId && !data.variantId))
    )

    if (existingItemIndex >= 0) {
      items[existingItemIndex].quantity += data.quantity
    } else {
      items.push({
        productId: data.productId,
        variantId: data.variantId || null,
        quantity: data.quantity,
      })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

    if (cart) {
      cart = await prisma.cart.update({
        where: { id: cart.id },
        data: {
          items,
          expiresAt,
          ...(customerId && !cart.customerId ? { customerId } : {}),
        },
      })
    } else {
      cart = await prisma.cart.create({
        data: {
          shopId: shop.id,
          sessionId: customerId ? null : sessionId,
          customerId: customerId || null,
          items,
          expiresAt,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Product added to cart",
      cartId: cart.id,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error adding to cart:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון עגלה (כמות או קופון)
export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // נסה למצוא את החנות לפי slug או ID
    let shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    // אם לא נמצא לפי slug, ננסה לחפש לפי ID (למקרה שה-slug השתנה)
    if (!shop) {
      shop = await prisma.shop.findFirst({
        where: {
          id: params.slug,
          isPublished: true,
        },
      })
    }

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const body = await req.json()
    const customerId = req.headers.get("x-customer-id") || null

    const cookieStore = await cookies()
    const sessionId = cookieStore.get("cart_session")?.value

    if (!sessionId && !customerId) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 })
    }

    let cart = await prisma.cart.findFirst({
      where: {
        shopId: shop.id,
        ...(customerId ? { customerId } : { sessionId }),
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 })
    }

    const items = (cart.items as any[]) || []

    // עדכון כמות פריט
    if (body.productId && body.quantity !== undefined) {
      const itemIndex = items.findIndex(
        (item) =>
          item.productId === body.productId &&
          (item.variantId === body.variantId || (!item.variantId && !body.variantId))
      )

      if (itemIndex >= 0) {
        if (body.quantity <= 0) {
          // הסרת פריט
          items.splice(itemIndex, 1)
        } else {
          // עדכון כמות
          items[itemIndex].quantity = body.quantity
        }
      }
    }

    // יישום קופון
    if (body.couponCode !== undefined) {
      if (body.couponCode) {
        // בדיקת קופון
        const coupon = await prisma.coupon.findUnique({
          where: { code: body.couponCode },
        })

        if (!coupon || !coupon.isActive || coupon.shopId !== shop.id) {
          return NextResponse.json(
            { error: "Invalid coupon code" },
            { status: 400 }
          )
        }

        // בדיקת תאריכים
        if (coupon.startDate && coupon.startDate > new Date()) {
          return NextResponse.json(
            { error: "Coupon not yet valid" },
            { status: 400 }
          )
        }

        if (coupon.endDate && coupon.endDate < new Date()) {
          return NextResponse.json(
            { error: "Coupon expired" },
            { status: 400 }
          )
        }

        // עדכון קופון
        cart.couponCode = body.couponCode
      } else {
        // הסרת קופון
        cart.couponCode = null
      }
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

    cart = await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items,
        couponCode: cart.couponCode,
        expiresAt,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Cart updated",
      cartId: cart.id,
    })
  } catch (error) {
    console.error("Error updating cart:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת פריט מהעגלה
export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // נסה למצוא את החנות לפי slug או ID
    let shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    // אם לא נמצא לפי slug, ננסה לחפש לפי ID (למקרה שה-slug השתנה)
    if (!shop) {
      shop = await prisma.shop.findFirst({
        where: {
          id: params.slug,
          isPublished: true,
        },
      })
    }

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId")
    const variantId = searchParams.get("variantId")

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const sessionId = cookieStore.get("cart_session")?.value
    const customerId = req.headers.get("x-customer-id") || null

    if (!sessionId && !customerId) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 })
    }

    const cart = await prisma.cart.findFirst({
      where: {
        shopId: shop.id,
        ...(customerId ? { customerId } : { sessionId }),
      },
    })

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 })
    }

    const items = (cart.items as any[]).filter(
      (item) =>
        !(item.productId === productId && item.variantId === variantId)
    )

    await prisma.cart.update({
      where: { id: cart.id },
      data: { items },
    })

    return NextResponse.json({ message: "Item removed from cart" })
  } catch (error) {
    console.error("Error removing from cart:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

