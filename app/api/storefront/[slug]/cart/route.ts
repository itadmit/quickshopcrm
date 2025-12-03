import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { cookies } from "next/headers"
import { calculateCart } from "@/lib/cart-calculations"
import { findCart, isCartEmpty } from "@/lib/cart-server"

// מבטל caching של API זה
export const dynamic = 'force-dynamic'
export const revalidate = 0

const addToCartSchema = z.object({
  productId: z.string().optional(),
  variantId: z.string().nullable().optional(),
  quantity: z.number().int().min(1),
  isGift: z.boolean().optional(),
  giftDiscountId: z.string().optional(),
  addons: z.array(z.object({
    addonId: z.string(),
    valueId: z.string().nullable().optional(),
    label: z.string(),
    price: z.number(),
    quantity: z.number().int().min(1).default(1),
  })).optional(),
  bundleId: z.string().optional(), // תמיכה בחבילות
  giftCardData: z.object({
    recipientName: z.string(),
    recipientEmail: z.string().email(),
    recipientPhone: z.string().optional(),
    senderName: z.string().optional(),
    message: z.string().optional(),
  }).optional(),
}).refine((data) => data.productId || data.bundleId, {
  message: "חייב לספק productId או bundleId",
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
    let cartItems = cart.items as any[]
    
    // הוספת מוצרי מתנה אוטומטית לעגלה
    if (cartItems && cartItems.length > 0) {
      // חישוב זמני כדי לזהות מוצרי מתנה
      const tempCalculation = await calculateCart(
        shop.id,
        cartItems,
        cart.couponCode,
        customerId,
        shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
        null
      )
      
      // מציאת מוצרי מתנה שלא קיימים בעגלה
      const giftItems = tempCalculation.items.filter(item => item.isGift)
      const existingGiftIds = new Set(
        cartItems.map((item: any) => `${item.productId}-${item.variantId || 'null'}-${item.isGift ? 'gift' : 'normal'}`)
      )
      
      // הוספת מוצרי מתנה לעגלה אם הם לא קיימים
      for (const giftItem of giftItems) {
        const giftKey = `${giftItem.productId}-${giftItem.variantId || 'null'}-gift`
        if (!existingGiftIds.has(giftKey)) {
          cartItems.push({
            productId: giftItem.productId,
            variantId: giftItem.variantId || null,
            quantity: giftItem.quantity,
            isGift: true,
            giftDiscountId: giftItem.giftDiscountId,
          })
        }
      }
      
      // עדכון העגלה עם מוצרי המתנה
      if (cartItems.length > (cart.items as any[]).length) {
        await prisma.cart.update({
          where: { id: cart.id },
          data: { items: cartItems },
        })
      }
    }
    
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
        endDate: cart.expiresAt,
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
      automaticDiscountTitle: calculation.automaticDiscountTitle || undefined,
      total: calculation.total,
      couponCode: cart.couponCode,
      couponStatus: calculation.couponStatus,
      endDate: cart.expiresAt,
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

    // טיפול בחבילה (bundle)
    if (data.bundleId) {
      const bundle = await prisma.bundle.findFirst({
        where: {
          id: data.bundleId,
          shopId: shop.id,
          isActive: true,
        },
        include: {
          products: {
            include: {
              product: {
                include: {
                  variants: true,
                },
              },
            },
          },
        },
      })

      if (!bundle) {
        return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
      }

      // בדיקת מלאי לכל המוצרים בחבילה
      for (const bundleProduct of bundle.products) {
        const product = bundleProduct.product
        const requiredQuantity = bundleProduct.quantity * data.quantity

        if (product.inventoryQty !== null && product.inventoryQty < requiredQuantity) {
          return NextResponse.json(
            { error: `Insufficient inventory for ${product.name}` },
            { status: 400 }
          )
        }
      }

      // הוספת כל המוצרים מהחבילה לעגלה
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

      let cart = await findCart(shop.id, sessionId, customerId)
      const items = cart ? (cart.items as any[]) : []

      // הוספת כל המוצרים מהחבילה
      for (const bundleProduct of bundle.products) {
        const itemKey = `bundle-${bundle.id}-${bundleProduct.productId}`
        const existingItemIndex = items.findIndex(
          (item: any) => item.bundleId === bundle.id && item.productId === bundleProduct.productId
        )

        if (existingItemIndex >= 0) {
          items[existingItemIndex].quantity += bundleProduct.quantity * data.quantity
        } else {
          items.push({
            productId: bundleProduct.productId,
            variantId: null,
            quantity: bundleProduct.quantity * data.quantity,
            bundleId: bundle.id,
            bundleName: bundle.name,
          })
        }
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

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
            sessionId,
            customerId,
            items,
            expiresAt,
          },
        })
      }

      // חישוב העגלה המעודכנת
      const calculation = await calculateCart(
        shop.id,
        items as any[],
        cart.couponCode,
        customerId,
        shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
        null
      )

      // הוספת מוצרי מתנה לעגלה בפועל
      const giftItems = calculation.items.filter(item => item.isGift)
      const existingGiftIds = new Set(
        items.map((item: any) => `${item.productId}-${item.variantId || 'null'}-${item.isGift ? 'gift' : 'normal'}`)
      )
      
      let updatedItems = [...items]
      let hasNewGifts = false
      
      for (const giftItem of giftItems) {
        const giftKey = `${giftItem.productId}-${giftItem.variantId || 'null'}-gift`
        if (!existingGiftIds.has(giftKey)) {
          updatedItems.push({
            productId: giftItem.productId,
            variantId: giftItem.variantId || null,
            quantity: giftItem.quantity,
            isGift: true,
            giftDiscountId: giftItem.giftDiscountId,
          })
          hasNewGifts = true
        }
      }
      
      // עדכון העגלה עם מוצרי המתנה אם יש חדשים
      if (hasNewGifts) {
        cart = await prisma.cart.update({
          where: { id: cart.id },
          data: { items: updatedItems },
        })
        
        // חישוב מחדש עם הפריטים המעודכנים
        const updatedCalculation = await calculateCart(
          shop.id,
          updatedItems as any[],
          cart.couponCode,
          customerId,
          shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
          null
        )
        
        return NextResponse.json({
          id: cart.id,
          items: updatedCalculation.items,
          subtotal: updatedCalculation.subtotal,
          tax: updatedCalculation.tax,
          shipping: updatedCalculation.shipping,
          discount: updatedCalculation.automaticDiscount + updatedCalculation.couponDiscount + updatedCalculation.customerDiscount,
          customerDiscount: updatedCalculation.customerDiscount > 0 ? updatedCalculation.customerDiscount : undefined,
          couponDiscount: updatedCalculation.couponDiscount > 0 ? updatedCalculation.couponDiscount : undefined,
          automaticDiscount: updatedCalculation.automaticDiscount > 0 ? updatedCalculation.automaticDiscount : undefined,
          automaticDiscountTitle: updatedCalculation.automaticDiscountTitle || undefined,
          total: updatedCalculation.total,
          couponCode: cart.couponCode,
          couponStatus: updatedCalculation.couponStatus,
          endDate: cart.expiresAt,
          giftsRequiringVariantSelection: updatedCalculation.giftsRequiringVariantSelection,
        })
      }

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
        automaticDiscountTitle: calculation.automaticDiscountTitle || undefined,
        total: calculation.total,
        couponCode: cart.couponCode,
        couponStatus: calculation.couponStatus,
        endDate: cart.expiresAt,
        giftsRequiringVariantSelection: calculation.giftsRequiringVariantSelection,
      })
    }

    // טיפול במוצר רגיל (קוד קיים)
    if (!data.productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

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

    // בדיקת variant - אם צוין, צריך לוודא שהוא שייך למוצר
    if (data.variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: data.variantId },
        select: {
          id: true,
          productId: true,
          inventoryQty: true,
        },
      })
      
      if (!variant) {
        return NextResponse.json(
          { error: "Variant not found" },
          { status: 404 }
        )
      }
      
      if (variant.productId !== product.id) {
        return NextResponse.json(
          { error: "Variant does not belong to this product" },
          { status: 400 }
        )
      }
      
      // בדיקת מלאי - רק אם המוצר לא מאפשר מכירה בלי מלאי
      const sellWhenSoldOut = (product.customFields as any)?.sellWhenSoldOut ?? false
      if (!sellWhenSoldOut) {
        if (variant.inventoryQty !== null && variant.inventoryQty < data.quantity) {
          return NextResponse.json(
            { error: "אין מספיק מלאי למוצר זה" },
            { status: 400 }
          )
        }
      }
    } else {
      // בדיקת מלאי - רק אם המוצר לא מאפשר מכירה בלי מלאי
      const sellWhenSoldOut = (product.customFields as any)?.sellWhenSoldOut ?? false
      if (!sellWhenSoldOut) {
        // בדיקה אם יש מספיק מלאי במוצר עצמו
        if (product.inventoryQty !== null && product.inventoryQty < data.quantity) {
          return NextResponse.json(
            { error: "אין מספיק מלאי למוצר זה" },
            { status: 400 }
          )
        }
      }
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
    

    const items = cart ? (cart.items as any[]) : []
    
    // מציאת פריט קיים - עכשיו גם לוקחים בחשבון addons
    const existingItemIndex = items.findIndex(
      (item) => {
        const sameProduct = item.productId === data.productId &&
          (item.variantId === data.variantId || (!item.variantId && !data.variantId))
        
        // אם אין addons בשני המקרים - זה אותו פריט
        if (!item.addons && !data.addons) return sameProduct
        
        // אם יש addons רק באחד - זה לא אותו פריט
        if (!item.addons || !data.addons) return false
        
        // השווה addons - אם הם זהים, זה אותו פריט
        // משתמשים באותה פונקציית השוואה כמו ב-DELETE
        const itemAddonsStr = JSON.stringify(item.addons.sort((a: any, b: any) => 
          `${a.addonId}-${a.valueId || ''}`.localeCompare(`${b.addonId}-${b.valueId || ''}`)
        ))
        const dataAddonsStr = JSON.stringify(data.addons?.sort((a: any, b: any) => 
          `${a.addonId}-${a.valueId || ''}`.localeCompare(`${b.addonId}-${b.valueId || ''}`)
        ))
        
        return sameProduct && itemAddonsStr === dataAddonsStr
      }
    )

    if (existingItemIndex >= 0) {
      items[existingItemIndex].quantity += data.quantity
      // עדכון isGift ו-giftDiscountId אם זה מתנה
      if (data.isGift) {
        items[existingItemIndex].isGift = true
        if (data.giftDiscountId) {
          items[existingItemIndex].giftDiscountId = data.giftDiscountId
        }
      }
      // עדכון gift card data אם קיים
      if (data.giftCardData) {
        items[existingItemIndex].giftCardData = data.giftCardData
      }
    } else {
      items.push({
        productId: data.productId,
        variantId: data.variantId || null,
        quantity: data.quantity,
        ...(data.isGift ? { isGift: true, giftDiscountId: data.giftDiscountId } : {}),
        ...(data.addons && data.addons.length > 0 ? { addons: data.addons } : {}),
        ...(data.giftCardData ? { giftCardData: data.giftCardData } : {}),
      })
    }
    

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

    // בדיקה אם זה מוצר חדש שנוסף לעגלה
    const previousItems = cart ? (cart.items as any[]) || [] : []
    const previousItemIds = new Set(previousItems.map((item: any) => 
      `${item.productId}-${item.variantId || 'null'}`
    ))
    const newItems = items.filter((item: any) => 
      !previousItemIds.has(`${item.productId}-${item.variantId || 'null'}`)
    )

    if (cart) {
      cart = await prisma.cart.update({
        where: { id: cart.id },
        data: {
          items,
          expiresAt,
          ...(customerId && !cart.customerId ? { customerId } : {}),
        },
      })
      
      // יצירת אירוע cart.item_added לכל מוצר חדש שנוסף
      for (const newItem of newItems) {
        await prisma.shopEvent.create({
          data: {
            shopId: shop.id,
            type: "cart.item_added",
            entityType: "cart",
            entityId: cart.id,
            payload: {
              cartId: cart.id,
              productId: newItem.productId,
              variantId: newItem.variantId || null,
              quantity: newItem.quantity,
              shopId: shop.id,
              customerId: customerId || null,
            },
          },
        })
      }
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
      
      // יצירת אירוע cart.created
      await prisma.shopEvent.create({
        data: {
          shopId: shop.id,
          type: "cart.created",
          entityType: "cart",
          entityId: cart.id,
          payload: {
            cartId: cart.id,
            shopId: shop.id,
            customerId: customerId || null,
            itemsCount: items.length,
          },
        },
      })
    }

    // חישוב העגלה המעודכנת
    const calculation = await calculateCart(
      shop.id,
      items as any[],
      cart.couponCode,
      customerId,
      shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
      null
    )
    // הוספת מוצרי מתנה לעגלה בפועל
    const giftItems = calculation.items.filter(item => item.isGift)
    const existingGiftIds = new Set(
      items.map((item: any) => `${item.productId}-${item.variantId || 'null'}-${item.isGift ? 'gift' : 'normal'}`)
    )
    
    let updatedItems = [...items]
    let hasNewGifts = false
    
    for (const giftItem of giftItems) {
      const giftKey = `${giftItem.productId}-${giftItem.variantId || 'null'}-gift`
      if (!existingGiftIds.has(giftKey)) {
        updatedItems.push({
          productId: giftItem.productId,
          variantId: giftItem.variantId || null,
          quantity: giftItem.quantity,
          isGift: true,
          giftDiscountId: giftItem.giftDiscountId,
        })
        hasNewGifts = true
      }
    }
    
    // עדכון העגלה עם מוצרי המתנה אם יש חדשים
    if (hasNewGifts) {
      cart = await prisma.cart.update({
        where: { id: cart.id },
        data: { items: updatedItems },
      })
      
      // חישוב מחדש עם הפריטים המעודכנים
      const updatedCalculation = await calculateCart(
        shop.id,
        updatedItems as any[],
        cart.couponCode,
        customerId,
        shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
        null
      )
      
      return NextResponse.json({
        id: cart.id,
        items: updatedCalculation.items,
        subtotal: updatedCalculation.subtotal,
        tax: updatedCalculation.tax,
        shipping: updatedCalculation.shipping,
        discount: updatedCalculation.automaticDiscount + updatedCalculation.couponDiscount + updatedCalculation.customerDiscount,
        customerDiscount: updatedCalculation.customerDiscount > 0 ? updatedCalculation.customerDiscount : undefined,
        couponDiscount: updatedCalculation.couponDiscount > 0 ? updatedCalculation.couponDiscount : undefined,
        automaticDiscount: updatedCalculation.automaticDiscount > 0 ? updatedCalculation.automaticDiscount : undefined,
        automaticDiscountTitle: updatedCalculation.automaticDiscountTitle || undefined,
        total: updatedCalculation.total,
        couponCode: cart.couponCode,
        couponStatus: updatedCalculation.couponStatus,
        endDate: cart.expiresAt,
        giftsRequiringVariantSelection: updatedCalculation.giftsRequiringVariantSelection,
      })
    }

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
      automaticDiscountTitle: calculation.automaticDiscountTitle || undefined,
      total: calculation.total,
      couponCode: cart.couponCode,
      couponStatus: calculation.couponStatus,
      endDate: cart.expiresAt,
      giftsRequiringVariantSelection: calculation.giftsRequiringVariantSelection,
    })
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

    let items = (cart.items as any[]) || []
    const previousItems = [...items] // שמירת עותק לפני שינויים

    // עדכון כמות פריט
    if (body.productId && body.quantity !== undefined) {
      // Parse addons if provided
      let addonsToMatch: any[] | null = null
      if (body.addons) {
        addonsToMatch = Array.isArray(body.addons) ? body.addons : null
      }
      
      const itemIndex = items.findIndex((item) => {
        const sameProduct = item.productId === body.productId &&
          (item.variantId === body.variantId || (!item.variantId && !body.variantId))
        
        if (!sameProduct) return false
        
        // השוואת addons
        const itemAddons = item.addons || []
        const hasItemAddons = itemAddons.length > 0
        const hasQueryAddons = addonsToMatch && addonsToMatch.length > 0
        
        // אם לא צוינו addons בפרמטרים, נעדכן רק פריטים בלי addons
        if (!hasQueryAddons) {
          return !hasItemAddons
        }
        
        // אם צוינו addons בפרמטרים, נעדכן רק פריטים עם אותם addons
        if (!hasItemAddons) {
          return false
        }
        
        // השוואת addons - אם הם זהים, זה אותו פריט
        if (!addonsToMatch || itemAddons.length !== addonsToMatch.length) {
          return false
        }
        
        // נורמליזציה והשוואה
        const normalizeAddon = (addon: any) => ({
          addonId: addon.addonId,
          valueId: addon.valueId || null,
        })
        
        const normalizedItemAddons = itemAddons.map(normalizeAddon).sort((a: any, b: any) => 
          `${a.addonId}-${a.valueId || ''}`.localeCompare(`${b.addonId}-${b.valueId || ''}`)
        )
        const normalizedQueryAddons = addonsToMatch.map(normalizeAddon).sort((a: any, b: any) => 
          `${a.addonId}-${a.valueId || ''}`.localeCompare(`${b.addonId}-${b.valueId || ''}`)
        )
        
        return JSON.stringify(normalizedItemAddons) === JSON.stringify(normalizedQueryAddons)
      })

      if (itemIndex >= 0) {
        // מונע עדכון או מחיקה של מוצרי מתנה
        if (items[itemIndex].isGift) {
          // מוצר מתנה לא ניתן לעדכון או מחיקה
          return NextResponse.json(
            { error: "לא ניתן לעדכן או למחוק מוצר מתנה" },
            { status: 400 }
          )
        }
        
        const oldQuantity = items[itemIndex].quantity
        
        if (body.quantity <= 0) {
          // הסרת פריט
          const removedItem = items[itemIndex]
          items.splice(itemIndex, 1)
          
          // בדיקה אם צריך להסיר גם מתנות שלא רלוונטיות
          const giftCalc = await calculateCart(
            shop.id,
            items as any[],
            cart.couponCode,
            customerId,
            shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
            null
          )
          
          // הסרת מתנות שלא רלוונטיות יותר
          const relevantGiftIds = new Set(
            giftCalc.items
              .filter(item => item.isGift)
              .map(item => `${item.productId}-${item.variantId || 'null'}`)
          )
          
          items = items.filter((item: any) => {
            if (!item.isGift) return true
            const itemKey = `${item.productId}-${item.variantId || 'null'}`
            return relevantGiftIds.has(itemKey)
          })
          
          // יצירת אירוע cart.item_removed
          await prisma.shopEvent.create({
            data: {
              shopId: shop.id,
              type: "cart.item_removed",
              entityType: "cart",
              entityId: cart.id,
              payload: {
                cartId: cart.id,
                productId: removedItem.productId,
                variantId: removedItem.variantId || null,
                shopId: shop.id,
                customerId: customerId || null,
              },
            },
          })
        } else if (body.quantity !== oldQuantity) {
          // עדכון כמות
          items[itemIndex].quantity = body.quantity
          
          // בדיקה אם צריך להסיר מתנות שלא רלוונטיות יותר אחרי העדכון
          const giftCalc = await calculateCart(
            shop.id,
            items as any[],
            cart.couponCode,
            customerId,
            shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
            null
          )
          
          // הסרת מתנות שלא רלוונטיות יותר
          const relevantGiftIds = new Set(
            giftCalc.items
              .filter(item => item.isGift)
              .map(item => `${item.productId}-${item.variantId || 'null'}`)
          )
          
          items = items.filter((item: any) => {
            if (!item.isGift) return true
            const itemKey = `${item.productId}-${item.variantId || 'null'}`
            return relevantGiftIds.has(itemKey)
          })
          
          // יצירת אירוע cart.item_updated
          await prisma.shopEvent.create({
            data: {
              shopId: shop.id,
              type: "cart.item_updated",
              entityType: "cart",
              entityId: cart.id,
              payload: {
                cartId: cart.id,
                productId: body.productId,
                variantId: body.variantId || null,
                oldQuantity,
                newQuantity: body.quantity,
                shopId: shop.id,
                customerId: customerId || null,
              },
            },
          })
        }
      }
    }

    // יישום קופון
    if (body.couponCode !== undefined) {
      if (body.couponCode) {
        // בדיקת קופון בסיסית
        const coupon = await prisma.coupon.findUnique({
          where: { code: body.couponCode },
          select: {
            id: true,
            code: true,
            isActive: true,
            shopId: true,
            type: true,
            buyQuantity: true,
            payQuantity: true,
            payAmount: true,
            startDate: true,
            endDate: true,
            maxUses: true,
            usedCount: true,
          },
        })

        if (!coupon) {
          return NextResponse.json(
            { error: "Invalid coupon code" },
            { status: 400 }
          )
        }

        if (!coupon.isActive) {
          return NextResponse.json(
            { error: "Coupon is not active" },
            { status: 400 }
          )
        }

        if (coupon.shopId !== shop.id) {
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

    // הוספת מוצרי מתנה לעגלה בפועל
    const giftItems = calculation.items.filter(item => item.isGift)
    const existingGiftIds = new Set(
      items.map((item: any) => `${item.productId}-${item.variantId || 'null'}-${item.isGift ? 'gift' : 'normal'}`)
    )
    
    let updatedItems = [...items]
    let hasNewGifts = false
    
    for (const giftItem of giftItems) {
      const giftKey = `${giftItem.productId}-${giftItem.variantId || 'null'}-gift`
      if (!existingGiftIds.has(giftKey)) {
        updatedItems.push({
          productId: giftItem.productId,
          variantId: giftItem.variantId || null,
          quantity: giftItem.quantity,
          isGift: true,
          giftDiscountId: giftItem.giftDiscountId,
        })
        hasNewGifts = true
      }
    }
    
    // עדכון העגלה עם מוצרי המתנה אם יש חדשים
    if (hasNewGifts) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { items: updatedItems },
      })
      
      // חישוב מחדש עם הפריטים המעודכנים
      const updatedCalculation = await calculateCart(
        shop.id,
        updatedItems as any[],
        cart.couponCode,
        customerId,
        shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
        null
      )
      
      return NextResponse.json({
        id: cart.id,
        items: updatedCalculation.items,
        subtotal: updatedCalculation.subtotal,
        tax: updatedCalculation.tax,
        shipping: updatedCalculation.shipping,
        discount: updatedCalculation.automaticDiscount + updatedCalculation.couponDiscount + updatedCalculation.customerDiscount,
        customerDiscount: updatedCalculation.customerDiscount > 0 ? updatedCalculation.customerDiscount : undefined,
        couponDiscount: updatedCalculation.couponDiscount > 0 ? updatedCalculation.couponDiscount : undefined,
        automaticDiscount: updatedCalculation.automaticDiscount > 0 ? updatedCalculation.automaticDiscount : undefined,
        total: updatedCalculation.total,
        couponCode: cart.couponCode,
        couponStatus: updatedCalculation.couponStatus,
        endDate: cart.expiresAt,
      })
    }

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
      automaticDiscountTitle: calculation.automaticDiscountTitle || undefined,
      total: calculation.total,
      couponCode: cart.couponCode,
      couponStatus: calculation.couponStatus,
      endDate: cart.expiresAt,
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
    const addonsParam = searchParams.get("addons") // JSON string of addons

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      )
    }

    // Parse addons if provided
    let addonsToMatch: any[] | null = null
    if (addonsParam) {
      try {
        addonsToMatch = JSON.parse(addonsParam)
      } catch (e) {
        console.error("Error parsing addons:", e)
      }
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

    const items = cartItems.filter((item: any) => {
      // מונע מחיקת מוצרי מתנה
      if (item.isGift) {
        return true // נשאיר את מוצר המתנה בעגלה
      }
      
      // השוואה מדויקת - גם null וגם undefined וגם "null" נחשבים כאותו דבר
      const itemVariantId = item.variantId === "null" ? null : item.variantId
      const queryVariantId = variantId === "null" ? null : variantId
      
      // בדיקת productId ו-variantId
      const sameProductAndVariant = (
        item.productId === productId && 
        (itemVariantId === queryVariantId || (!itemVariantId && !queryVariantId))
      )
      
      if (!sameProductAndVariant) {
        return true // לא אותו מוצר/וריאציה - נשאיר
      }
      
      // השוואת addons
      const itemAddons = item.addons || []
      const hasItemAddons = itemAddons.length > 0
      const hasQueryAddons = addonsToMatch && addonsToMatch.length > 0
      
      // אם לא צוינו addons בפרמטרים, נמחק רק פריטים בלי addons
      if (!hasQueryAddons) {
        // אם הפריט יש לו addons, נשאיר אותו
        if (hasItemAddons) {
          return true // נשאיר - יש addons בפריט אבל לא בפרמטרים
        }
        // אם הפריט אין לו addons, נמחק אותו
        return false // נמחק
      }
      
      // אם צוינו addons בפרמטרים, נמחק רק אם הפריט יש לו את אותם addons
      if (!hasItemAddons || !addonsToMatch) {
        return true // נשאיר - אין addons בפריט אבל יש בפרמטרים, או addonsToMatch הוא null
      }
      
      // השוואת addons - אם הם זהים, נמחק
      if (itemAddons.length !== addonsToMatch.length) {
        return true // מספר שונה של addons - נשאיר
      }
      
      // השווה addons - אם הם זהים, נמחק
      // נורמליזציה של addons להשוואה - מוודאים שכל ה-properties קיימים
      const normalizeAddon = (addon: any) => ({
        addonId: addon.addonId,
        valueId: addon.valueId || null,
        label: addon.label || '',
        price: addon.price || 0,
        quantity: addon.quantity || 1
      })
      
      const normalizedItemAddons = itemAddons.map(normalizeAddon).sort((a: any, b: any) => 
        `${a.addonId}-${a.valueId || ''}`.localeCompare(`${b.addonId}-${b.valueId || ''}`)
      )
      const normalizedQueryAddons = addonsToMatch.map(normalizeAddon).sort((a: any, b: any) => 
        `${a.addonId}-${a.valueId || ''}`.localeCompare(`${b.addonId}-${b.valueId || ''}`)
      )
      
      const itemAddonsStr = JSON.stringify(normalizedItemAddons)
      const queryAddonsStr = JSON.stringify(normalizedQueryAddons)
      
      return itemAddonsStr !== queryAddonsStr
    })

    // חישוב מחדש של העגלה כדי לבדוק אם המתנות עדיין רלוונטיות
    const giftCalculation = await calculateCart(
      shop.id,
      items as any[],
      cart.couponCode,
      customerId,
      shop.taxEnabled && shop.taxRate ? shop.taxRate : null,
      null
    )

    // הסרת מתנות שלא רלוונטיות יותר
    const relevantGiftIds = new Set(
      giftCalculation.items
        .filter(item => item.isGift)
        .map(item => `${item.productId}-${item.variantId || 'null'}`)
    )
    
    const filteredItems = items.filter((item: any) => {
      if (!item.isGift) return true
      const itemKey = `${item.productId}-${item.variantId || 'null'}`
      return relevantGiftIds.has(itemKey)
    })

    const updatedCart = await prisma.cart.update({
      where: { id: cart.id },
      data: { items: filteredItems },
    })

    // אם אין פריטים, החזר עגלה ריקה עם couponStatus
    if (!filteredItems || filteredItems.length === 0) {
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
        endDate: updatedCart.expiresAt,
      })
    }

    // חישוב העגלה המעודכנת
    const calculation = await calculateCart(
      shop.id,
      filteredItems as any[],
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
      automaticDiscountTitle: calculation.automaticDiscountTitle || undefined,
      total: calculation.total,
      couponCode: updatedCart.couponCode,
      couponStatus: calculation.couponStatus,
      endDate: updatedCart.expiresAt,
    })
  } catch (error) {
    console.error("Error removing from cart:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

