import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { cookies } from "next/headers"
import { calculateCart } from "@/lib/cart-calculations"
import { findCart, isCartEmpty } from "@/lib/cart-server"

const addToCartSchema = z.object({
  productId: z.string(),
  variantId: z.string().nullable().optional(),
  quantity: z.number().int().min(1),
})

// הפונקציה findCart הוסרה - משתמשים ב-findCart מ-lib/cart-server.ts

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

    // שימוש בפונקציה המרכזית למציאת עגלה
    const cart = await findCart(shop.id, sessionId, customerId)

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
      // גם עגלה ריקה יכולה להכיל קופון - צריך להחזיר את הסטטוס שלו
      let couponStatus = undefined
      if (cart.couponCode) {
        const coupon = await prisma.coupon.findUnique({
          where: { code: cart.couponCode },
        })
        
        if (coupon && coupon.isActive && coupon.shopId === shop.id) {
          const now = new Date()
          if (coupon.startDate && coupon.startDate > now) {
            couponStatus = { code: cart.couponCode, isValid: false, reason: 'הקופון עדיין לא תקף' }
          } else if (coupon.endDate && coupon.endDate < now) {
            couponStatus = { code: cart.couponCode, isValid: false, reason: 'הקופון פג תוקף' }
          } else if (coupon.minOrder && coupon.minOrder > 0) {
            couponStatus = { 
              code: cart.couponCode, 
              isValid: false, 
              reason: `נדרש מינימום הזמנה של ₪${coupon.minOrder}`,
              minOrderRequired: coupon.minOrder 
            }
          } else {
            couponStatus = { code: cart.couponCode, isValid: false, reason: 'הוסיפו מוצרים לעגלה' }
          }
        } else {
          couponStatus = { code: cart.couponCode, isValid: false, reason: 'קוד קופון לא תקין' }
        }
      }
      
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
        couponStatus,
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
      couponStatus: calculation.couponStatus,
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
    console.log('🛒 POST - Add to cart started:', { slug: params.slug })
    
    // נסה למצוא את החנות לפי slug או ID
    let shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })
    
    console.log('🏪 Shop found:', shop ? shop.id : 'NOT FOUND')

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
    console.log('📦 Request body:', body)
    
    const data = addToCartSchema.parse(body)
    const customerId = req.headers.get("x-customer-id") || null
    
    console.log('👤 Customer ID:', customerId)

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
      if (variant && variant.inventoryQty !== null && variant.inventoryQty < data.quantity) {
        return NextResponse.json(
          { error: "Insufficient inventory" },
          { status: 400 }
        )
      }
    } else if (product.inventoryQty !== null && product.inventoryQty < data.quantity) {
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

    // מציאת או יצירת עגלה - שימוש בפונקציה שמבטיחה עגלה אחת
    let cart = await findCart(shop.id, sessionId, customerId)
    
    console.log('🛒 Cart found:', cart ? cart.id : 'NOT FOUND')

    const items = cart ? (cart.items as any[]) : []
    console.log('📋 Current items in cart:', items.length)
    console.log('🔍 Current items details:', JSON.stringify(items, null, 2))
    
    const existingItemIndex = items.findIndex(
      (item) =>
        item.productId === data.productId &&
        (item.variantId === data.variantId || (!item.variantId && !data.variantId))
    )

    console.log('🔎 Looking for existing item:', {
      productId: data.productId,
      variantId: data.variantId,
      existingItemIndex,
      found: existingItemIndex >= 0
    })

    if (existingItemIndex >= 0) {
      console.log('✏️ Updating existing item quantity:', {
        oldQuantity: items[existingItemIndex].quantity,
        addQuantity: data.quantity,
        newQuantity: items[existingItemIndex].quantity + data.quantity
      })
      items[existingItemIndex].quantity += data.quantity
    } else {
      console.log('➕ Adding new item to cart:', {
        productId: data.productId,
        variantId: data.variantId || null,
        quantity: data.quantity,
      })
      items.push({
        productId: data.productId,
        variantId: data.variantId || null,
        quantity: data.quantity,
      })
    }
    
    console.log('📋 Items after update:', items.length)
    console.log('📦 Updated items details:', JSON.stringify(items, null, 2))

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

    if (cart) {
      console.log('🔄 Updating existing cart:', {
        cartId: cart.id,
        itemsCount: items.length,
        hasCustomerId: !!customerId
      })
      cart = await prisma.cart.update({
        where: { id: cart.id },
        data: {
          items,
          expiresAt,
          ...(customerId && !cart.customerId ? { customerId } : {}),
        },
      })
      console.log('✅ Cart updated successfully:', {
        cartId: cart.id,
        savedItemsCount: (cart.items as any[]).length
      })
      console.log('💾 Saved cart items:', JSON.stringify(cart.items, null, 2))
    } else {
      console.log('🆕 Creating new cart:', {
        shopId: shop.id,
        sessionId: customerId ? null : sessionId,
        customerId: customerId || null,
        itemsCount: items.length
      })
      cart = await prisma.cart.create({
        data: {
          shopId: shop.id,
          sessionId: customerId ? null : sessionId,
          customerId: customerId || null,
          items,
          expiresAt,
        },
      })
      console.log('✅ New cart created:', {
        cartId: cart.id,
        savedItemsCount: (cart.items as any[]).length
      })
      console.log('💾 Saved cart items:', JSON.stringify(cart.items, null, 2))
    }

    // חישוב העגלה המעודכנת
    console.log('🧮 Calculating cart totals with items:', JSON.stringify(items, null, 2))
    const calculation = await calculateCart(
      shop.id,
      items as any[],
      cart.couponCode,
      customerId,
      shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
      null
    )
    
    console.log('✅ Cart calculation complete:', {
      items: calculation.items.length,
      subtotal: calculation.subtotal,
      total: calculation.total
    })
    console.log('📊 Calculated items:', JSON.stringify(calculation.items, null, 2))

    const responseData = {
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
      couponStatus: calculation.couponStatus,
      expiresAt: cart.expiresAt,
    }
    
    console.log('📤 Sending response with items:', responseData.items.length)
    return NextResponse.json(responseData)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Validation error:", error.errors)
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("❌ Error adding to cart:", error)
    console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
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

    // שימוש בפונקציה שמבטיחה עגלה אחת בלבד
    let cart = await findCart(shop.id, sessionId, customerId)

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
        // בדיקת קופון בסיסית
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

        // עדכון קופון - לא בודקים minOrder כאן!
        // ההנחה תחול רק אם עומדים במינימום, אבל הקוד נשמר בעגלה תמיד
        cart.couponCode = body.couponCode
      } else {
        // הסרת קופון
        cart.couponCode = null
      }
    }
    // הקופון נשמר בעגלה תמיד, גם אם לא עומדים בתנאים
    // ההנחה תחושב ב-calculateCart לפי התנאים בפועל

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

    // חישוב העגלה עם כל הפרטים
    const calculation = await calculateCart(
      shop.id,
      items as any[],
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
      couponStatus: calculation.couponStatus,
      expiresAt: cart.expiresAt,
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

    // שימוש בפונקציה שמבטיחה עגלה אחת בלבד
    let cart = await findCart(shop.id, sessionId, customerId)

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 })
    }

    const cartItems = (cart.items as any[]) || []
    console.log('🗑️ DELETE - Before filter:', {
      cartItems: cartItems.length,
      productIdToDelete: productId,
      variantIdToDelete: variantId,
      items: JSON.stringify(cartItems)
    })

    const items = cartItems.filter((item) => {
      // השוואה מדויקת - גם null וגם undefined וגם "null" נחשבים כאותו דבר
      const itemVariantId = item.variantId === "null" ? null : item.variantId
      const queryVariantId = variantId === "null" ? null : variantId
      
      const shouldRemove = (
        item.productId === productId && 
        (itemVariantId === queryVariantId || (!itemVariantId && !queryVariantId))
      )
      
      console.log('🔍 Item check:', {
        productId: item.productId,
        variantId: item.variantId,
        itemVariantId,
        queryVariantId,
        shouldRemove,
        willKeep: !shouldRemove
      })
      
      return !shouldRemove
    })

    console.log('🗑️ DELETE - After filter:', {
      itemsRemaining: items.length,
      itemsRemoved: cartItems.length - items.length
    })

    const updatedCart = await prisma.cart.update({
      where: { id: cart.id },
      data: { items },
    })

    // אם אין פריטים, החזר עגלה ריקה עם couponStatus
    if (!items || items.length === 0) {
      let couponStatus = undefined
      if (updatedCart.couponCode) {
        const coupon = await prisma.coupon.findUnique({
          where: { code: updatedCart.couponCode },
        })
        
        if (coupon && coupon.isActive && coupon.shopId === shop.id) {
          const now = new Date()
          if (coupon.startDate && coupon.startDate > now) {
            couponStatus = { code: updatedCart.couponCode, isValid: false, reason: 'הקופון עדיין לא תקף' }
          } else if (coupon.endDate && coupon.endDate < now) {
            couponStatus = { code: updatedCart.couponCode, isValid: false, reason: 'הקופון פג תוקף' }
          } else if (coupon.minOrder && coupon.minOrder > 0) {
            couponStatus = { 
              code: updatedCart.couponCode, 
              isValid: false, 
              reason: `נדרש מינימום הזמנה של ₪${coupon.minOrder}`,
              minOrderRequired: coupon.minOrder 
            }
          } else {
            couponStatus = { code: updatedCart.couponCode, isValid: false, reason: 'הוסיפו מוצרים לעגלה' }
          }
        } else {
          couponStatus = { code: updatedCart.couponCode, isValid: false, reason: 'קוד קופון לא תקין' }
        }
      }
      
      return NextResponse.json({
        id: updatedCart.id,
        items: [],
        subtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        customerDiscount: undefined,
        couponDiscount: undefined,
        automaticDiscount: undefined,
        total: 0,
        couponCode: updatedCart.couponCode,
        couponStatus,
        expiresAt: updatedCart.expiresAt,
      })
    }

    // חישוב העגלה המעודכנת
    const calculation = await calculateCart(
      shop.id,
      items as any[],
      updatedCart.couponCode,
      customerId,
      shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
      null
    )

    return NextResponse.json({
      id: updatedCart.id,
      items: calculation.items,
      subtotal: calculation.subtotal,
      tax: calculation.tax,
      shipping: calculation.shipping,
      discount: calculation.automaticDiscount + calculation.couponDiscount + calculation.customerDiscount,
      customerDiscount: calculation.customerDiscount > 0 ? calculation.customerDiscount : undefined,
      couponDiscount: calculation.couponDiscount > 0 ? calculation.couponDiscount : undefined,
      automaticDiscount: calculation.automaticDiscount > 0 ? calculation.automaticDiscount : undefined,
      total: calculation.total,
      couponCode: updatedCart.couponCode,
      couponStatus: calculation.couponStatus,
      expiresAt: updatedCart.expiresAt,
    })
  } catch (error) {
    console.error("Error removing from cart:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

