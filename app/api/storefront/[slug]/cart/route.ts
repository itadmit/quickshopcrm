import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { cookies } from "next/headers"
import { calculateCart } from "@/lib/cart-calculations"

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

    // בניית פריטי עגלה
    const cartItems = cart.items as any[]
    
    // אם העגלה ריקה, החזר מיד
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
        automaticDiscount: undefined,
        total: 0,
        couponCode: cart.couponCode,
        expiresAt: cart.expiresAt,
      })
    }

    // שימוש בפונקציה המרכזית לחישוב עגלה
    const calculation = await calculateCart(
      shop.id,
      cartItems,
      cart.couponCode,
      customerId,
      shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
      null // shipping - לא מחושב כאן
    )

    return NextResponse.json({
      id: cart.id,
      items: calculation.items,
      subtotal: calculation.subtotal,
      tax: calculation.tax,
      shipping: calculation.shipping,
      discount: calculation.automaticDiscount + calculation.couponDiscount + calculation.customerDiscount,
      customerDiscount: calculation.customerDiscount > 0 ? calculation.customerDiscount : undefined,
      couponDiscount: calculation.couponDiscount > 0 ? calculation.couponDiscount : undefined,
      automaticDiscount: calculation.automaticDiscount > 0 ? calculation.automaticDiscount : undefined,
      total: calculation.total,
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

        // בדיקת maxUses
        if (coupon.maxUses && coupon.usedCount !== null && coupon.usedCount >= coupon.maxUses) {
          return NextResponse.json(
            { error: "Coupon usage limit reached" },
            { status: 400 }
          )
        }

        // בדיקת minOrder - צריך לחשב את ה-subtotal של העגלה
        if (coupon.minOrder) {
          // חישוב subtotal מהיר
          const cartItems = items as any[]
          const productIds = [...new Set(cartItems.map((item: any) => item.productId))]
          const variantIds = cartItems
            .map((item: any) => item.variantId)
            .filter((id: string | null) => id !== null && id !== undefined)

          const [products, variants] = await Promise.all([
            prisma.product.findMany({
              where: { id: { in: productIds }, shopId: shop.id },
              select: { id: true, price: true },
            }),
            variantIds.length > 0
              ? prisma.productVariant.findMany({
                  where: { id: { in: variantIds } },
                  select: { id: true, price: true },
                })
              : [],
          ])

          const productsMap = new Map(products.map((p: any) => [p.id, p]))
          const variantsMap = new Map(variants.map((v: any) => [v.id, v]))

          let subtotal = 0
          for (const item of cartItems) {
            const product = productsMap.get(item.productId)
            if (!product) continue
            const variant = item.variantId ? variantsMap.get(item.variantId) : null
            const basePrice = variant?.price || product.price
            subtotal += basePrice * item.quantity
          }

          if (subtotal < coupon.minOrder) {
            return NextResponse.json(
              { error: `Minimum order amount of ${coupon.minOrder} required` },
              { status: 400 }
            )
          }
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

