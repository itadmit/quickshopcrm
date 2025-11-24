import { prisma } from "./prisma"
import { calculateCustomerDiscount } from "./discounts"

/**
 * פריט עגלה מועשר
 */
export interface EnrichedCartItem {
  productId: string
  variantId?: string | null
  quantity: number
  product: {
    id: string
    slug: string
    name: string
    price: number
    comparePrice?: number | null
    images?: any
    sku?: string | null
  }
  variant?: {
    id: string
    name: string
    price: number
    sku?: string | null
    inventoryQty?: number | null
  } | null
  price: number // מחיר אחרי הנחת לקוח
  total: number // מחיר כולל כמות + addons
  isGift?: boolean // האם זה מוצר מתנה
  giftDiscountId?: string // ID של ההנחה שגרמה למתנה זו
  addons?: Array<{
    addonId: string
    valueId: string | null
    label: string
    price: number
    quantity: number
  }> // תוספות שנבחרו
  addonsTotal?: number // סכום התוספות
  bundleId?: string // ID של החבילה (אם זה חלק מ-bundle)
  bundleName?: string // שם החבילה
  bundlePrice?: number // מחיר החבילה (לחישוב נכון)
}

/**
 * מתנה שדורשת בחירת וריאציה
 */
export interface GiftRequiringVariantSelection {
  discountId: string
  productId: string
  productName: string
  hasVariants: boolean
  isOutOfStock?: boolean // האם המוצר אזל מהמלאי
}

/**
 * תוצאות חישוב עגלה
 */
export interface CartCalculationResult {
  items: EnrichedCartItem[]
  subtotal: number
  customerDiscount: number
  automaticDiscount: number
  automaticDiscountTitle?: string | null
  couponDiscount: number
  tax: number
  shipping: number
  total: number
  couponStatus?: {
    code: string
    isValid: boolean
    reason?: string
    minOrderRequired?: number
  }
  giftsRequiringVariantSelection?: GiftRequiringVariantSelection[]
}

/**
 * פונקציה סינכרונית לחישוב הנחת לקוח (ללא queries)
 */
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

/**
 * הוספת מוצרי מתנה לעגלה
 */
async function addGiftItemsToCart(
  shopId: string,
  enrichedItems: EnrichedCartItem[],
  subtotal: number,
  customerId: string | null,
  customer: { totalSpent: number; orderCount: number; tier: string | null } | null
): Promise<{
  giftItems: EnrichedCartItem[]
  giftsRequiringVariantSelection: GiftRequiringVariantSelection[]
}> {
  const now = new Date()
  
  const freeGiftDiscounts = await prisma.discount.findMany({
    where: {
      shopId,
      isActive: true,
      isAutomatic: true,
      type: "FREE_GIFT",
      giftProductId: { not: null },
      AND: [
        {
          OR: [
            { startDate: null },
            { startDate: { lte: now } },
          ],
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
      ],
    },
    orderBy: { priority: 'desc' },
  })

  const giftItems: EnrichedCartItem[] = []
  const giftsRequiringVariantSelection: GiftRequiringVariantSelection[] = []

  for (const giftDiscount of freeGiftDiscounts) {
    if (!giftDiscount.giftProductId) continue

    // בדיקת תנאי המתנה
    let conditionMet = false

    if (giftDiscount.giftCondition === "MIN_ORDER_AMOUNT") {
      const minAmount = giftDiscount.giftConditionAmount ?? giftDiscount.minOrderAmount ?? 0
      conditionMet = subtotal >= minAmount
    } else if (giftDiscount.giftCondition === "SPECIFIC_PRODUCT") {
      if (giftDiscount.giftConditionProductId) {
        conditionMet = enrichedItems.some(
          item => item.productId === giftDiscount.giftConditionProductId && !item.isGift
        )
      }
    } else {
      const minAmount = giftDiscount.minOrderAmount || 0
      conditionMet = subtotal >= minAmount
    }

    // בדיקת customerTarget
    let customerMatch = false
    if (giftDiscount.customerTarget === "ALL_CUSTOMERS") {
      customerMatch = true
    } else if (giftDiscount.customerTarget === "REGISTERED_CUSTOMERS" && customerId) {
      customerMatch = true
    } else if (giftDiscount.customerTarget === "SPECIFIC_CUSTOMERS" && customerId && giftDiscount.specificCustomers && Array.isArray(giftDiscount.specificCustomers) && giftDiscount.specificCustomers.includes(customerId)) {
      customerMatch = true
    } else if (giftDiscount.customerTarget === "CUSTOMER_TIERS" && customerId && customer && customer.tier && giftDiscount.customerTiers && Array.isArray(giftDiscount.customerTiers) && giftDiscount.customerTiers.includes(customer.tier)) {
      customerMatch = true
    }

    if (!conditionMet || !customerMatch) {
      continue
    }

    // בדיקה אם מוצר המתנה כבר קיים בעגלה (לא כמוצר מתנה)
    const giftAlreadyInCart = enrichedItems.some(
      item => item.productId === giftDiscount.giftProductId && !item.isGift
    )

    if (giftAlreadyInCart) {
      continue
    }

    // טעינת מוצר המתנה כולל וריאציות
    const giftProduct = await prisma.product.findUnique({
      where: { id: giftDiscount.giftProductId },
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        comparePrice: true,
        images: true,
        sku: true,
        inventoryQty: true,
        variants: {
          select: {
            id: true,
            name: true,
            price: true,
            sku: true,
            inventoryQty: true,
            productId: true,
          },
        },
      },
    })

    if (!giftProduct) {
      continue
    }

    // בדיקה אם יש וריאציות למוצר המתנה
    const hasVariants = giftProduct.variants && giftProduct.variants.length > 0

    // טעינת variant אם יש
    let giftVariant = null
    if (giftDiscount.giftVariantId) {
      giftVariant = await prisma.productVariant.findUnique({
        where: { id: giftDiscount.giftVariantId },
        select: {
          id: true,
          name: true,
          price: true,
          sku: true,
          inventoryQty: true,
          productId: true,
        },
      })

      // בדיקה שהגרסה שייכת למוצר הנכון
      if (giftVariant && giftVariant.productId !== giftProduct.id) {
        giftVariant = null
      }
    } else if (hasVariants) {
      // אם יש וריאציות אבל לא נבחר variant - נסמן שהמתנה דורשת בחירת וריאציה
      const availableVariants = giftProduct.variants.filter(
        (v) => v.inventoryQty === null || v.inventoryQty === undefined || v.inventoryQty >= 0
      )
      
      if (availableVariants.length === 0) {
        // אם אין variant זמין, נסמן שהמתנה אזלה מהמלאי
        giftsRequiringVariantSelection.push({
          discountId: giftDiscount.id,
          productId: giftProduct.id,
          productName: giftProduct.name,
          hasVariants: true,
          isOutOfStock: true,
        })
        continue
      }
      
      // אם יש variant זמין אחד בלבד, נשתמש בו
      if (availableVariants.length === 1) {
        giftVariant = availableVariants[0]
      } else {
        // אם יש כמה variants זמינים, נסמן שהמתנה דורשת בחירת וריאציה
        giftsRequiringVariantSelection.push({
          discountId: giftDiscount.id,
          productId: giftProduct.id,
          productName: giftProduct.name,
          hasVariants: true,
        })
        continue
      }
    }

    // בדיקת מלאי - למוצרי מתנה נדלג רק אם המלאי שלילי (פחות מ-0)
    if (giftVariant) {
      if (giftVariant.inventoryQty !== null && giftVariant.inventoryQty < 0) {
        continue
      }
    } else if (giftProduct) {
      const productWithInventory = await prisma.product.findUnique({
        where: { id: giftProduct.id },
        select: { inventoryQty: true },
      })
      if (productWithInventory?.inventoryQty !== null && productWithInventory.inventoryQty < 0) {
        continue
      }
    }

    // הוספת מוצר המתנה
    giftItems.push({
      productId: giftProduct.id,
      variantId: giftVariant?.id || null,
      quantity: 1,
      product: {
        id: giftProduct.id,
        slug: giftProduct.slug,
        name: giftProduct.name,
        price: giftProduct.price,
        comparePrice: giftProduct.comparePrice,
        images: giftProduct.images || [],
        sku: giftProduct.sku,
      },
      variant: giftVariant
        ? {
            id: giftVariant.id,
            name: giftVariant.name,
            price: giftVariant.price ?? 0,
            sku: giftVariant.sku,
            inventoryQty: giftVariant.inventoryQty,
          }
        : null,
      price: 0, // מחיר 0 למוצר מתנה
      total: 0, // סה"כ 0
      isGift: true,
      giftDiscountId: giftDiscount.id,
    })

    // אם לא ניתן לשלב, נעצור אחרי הראשונה
    if (!giftDiscount.canCombine) {
      break
    }
  }

  return {
    giftItems,
    giftsRequiringVariantSelection,
  }
}

/**
 * חישוב הנחות אוטומטיות
 */
async function calculateAutomaticDiscounts(
  shopId: string,
  enrichedItems: EnrichedCartItem[],
  subtotal: number,
  customerId: string | null,
  customer: { totalSpent: number; orderCount: number; tier: string | null } | null
): Promise<{ amount: number; title: string | null }> {
  let automaticDiscount = 0
  let automaticDiscountTitle: string | null = null
  const now = new Date()
  
  const activeAutomaticDiscounts = await prisma.discount.findMany({
    where: {
      shopId,
      isActive: true,
      isAutomatic: true,
      AND: [
        {
          OR: [
            { startDate: null },
            { startDate: { lte: now } },
          ],
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
      ],
    },
    orderBy: { priority: 'desc' },
  })

  for (const autoDiscount of activeAutomaticDiscounts) {
    // בדיקת minOrderAmount
    if (autoDiscount.minOrderAmount && subtotal < autoDiscount.minOrderAmount) {
      continue
    }

    // בדיקת customerTarget
    let customerMatch = false
    if (autoDiscount.customerTarget === "ALL_CUSTOMERS") {
      customerMatch = true
    } else if (autoDiscount.customerTarget === "REGISTERED_CUSTOMERS" && customerId) {
      customerMatch = true
    } else if (autoDiscount.customerTarget === "SPECIFIC_CUSTOMERS" && customerId && autoDiscount.specificCustomers && Array.isArray(autoDiscount.specificCustomers) && autoDiscount.specificCustomers.includes(customerId)) {
      customerMatch = true
    } else if (autoDiscount.customerTarget === "CUSTOMER_TIERS" && customerId && customer && customer.tier && autoDiscount.customerTiers && Array.isArray(autoDiscount.customerTiers) && autoDiscount.customerTiers.includes(customer.tier)) {
      customerMatch = true
    }

    if (!customerMatch) {
      continue
    }

    // בדיקת target (מוצרים/קטגוריות/קולקציות)
    let productMatch = false
    if (autoDiscount.target === "ALL_PRODUCTS") {
      productMatch = true
    } else if (autoDiscount.target === "SPECIFIC_PRODUCTS") {
      const productIds = enrichedItems.map(item => item.productId)
      if (autoDiscount.applicableProducts && Array.isArray(autoDiscount.applicableProducts)) {
        productMatch = productIds.some(id => autoDiscount.applicableProducts.includes(id))
      }
    } else if (autoDiscount.target === "SPECIFIC_CATEGORIES") {
      // צריך לבדוק אם יש מוצרים בקטגוריות הספציפיות
      if (autoDiscount.applicableCategories && Array.isArray(autoDiscount.applicableCategories) && autoDiscount.applicableCategories.length > 0) {
        // נבדוק אם יש מוצרים בקטגוריות - נשתמש ב-productIds ונבדוק את הקטגוריות שלהם
        const productIds = enrichedItems.map(item => item.productId)
        const productsWithCategories = await prisma.product.findMany({
          where: {
            id: { in: productIds },
            categories: {
              some: {
                categoryId: { in: autoDiscount.applicableCategories }
              }
            }
          },
          select: { id: true }
        })
        productMatch = productsWithCategories.length > 0
      } else {
        productMatch = false
      }
    } else if (autoDiscount.target === "SPECIFIC_COLLECTIONS") {
      // צריך לבדוק אם יש מוצרים בקולקציות הספציפיות
      if (autoDiscount.applicableCollections && Array.isArray(autoDiscount.applicableCollections) && autoDiscount.applicableCollections.length > 0) {
        const productIds = enrichedItems.map(item => item.productId)
        const productsWithCollections = await prisma.product.findMany({
          where: {
            id: { in: productIds },
            collections: {
              some: {
                collectionId: { in: autoDiscount.applicableCollections }
              }
            }
          },
          select: { id: true }
        })
        productMatch = productsWithCollections.length > 0
      } else {
        productMatch = false
      }
    } else if (autoDiscount.target === "EXCLUDE_PRODUCTS") {
      const productIds = enrichedItems.map(item => item.productId)
      if (autoDiscount.excludedProducts && Array.isArray(autoDiscount.excludedProducts)) {
        productMatch = !productIds.some(id => autoDiscount.excludedProducts.includes(id))
      } else {
        productMatch = true
      }
    } else if (autoDiscount.target === "EXCLUDE_CATEGORIES") {
      // צריך לבדוק שאין מוצרים בקטגוריות המבודדות
      if (autoDiscount.excludedCategories && Array.isArray(autoDiscount.excludedCategories) && autoDiscount.excludedCategories.length > 0) {
        const productIds = enrichedItems.map(item => item.productId)
        const productsInExcludedCategories = await prisma.product.findMany({
          where: {
            id: { in: productIds },
            categories: {
              some: {
                categoryId: { in: autoDiscount.excludedCategories }
              }
            }
          },
          select: { id: true }
        })
        productMatch = productsInExcludedCategories.length === 0
      } else {
        productMatch = true
      }
    } else if (autoDiscount.target === "EXCLUDE_COLLECTIONS") {
      // צריך לבדוק שאין מוצרים בקולקציות המבודדות
      if (autoDiscount.excludedCollections && Array.isArray(autoDiscount.excludedCollections) && autoDiscount.excludedCollections.length > 0) {
        const productIds = enrichedItems.map(item => item.productId)
        const productsInExcludedCollections = await prisma.product.findMany({
          where: {
            id: { in: productIds },
            collections: {
              some: {
                collectionId: { in: autoDiscount.excludedCollections }
              }
            }
          },
          select: { id: true }
        })
        productMatch = productsInExcludedCollections.length === 0
      } else {
        productMatch = true
      }
    }

    if (!productMatch) {
      continue
    }

    // חישוב הנחה לפי סוג
    let discountAmount = 0
    if (autoDiscount.type === "PERCENTAGE") {
      discountAmount = (subtotal * autoDiscount.value) / 100
    } else if (autoDiscount.type === "FIXED") {
      discountAmount = autoDiscount.value
    } else if (autoDiscount.type === "BUY_X_GET_Y") {
      if (autoDiscount.buyQuantity && autoDiscount.getQuantity && autoDiscount.getDiscount !== null) {
        let totalDiscount = 0
        for (const item of enrichedItems) {
          const applicableTimes = Math.floor(item.quantity / autoDiscount.buyQuantity)
          if (applicableTimes > 0) {
            const freeItems = Math.min(applicableTimes * autoDiscount.getQuantity, item.quantity)
            const itemPrice = item.variant?.price || item.product.price
            const discountPerItem = (itemPrice * autoDiscount.getDiscount) / 100
            totalDiscount += discountPerItem * freeItems
          }
        }
        discountAmount = totalDiscount
      }
    } else if (autoDiscount.type === "NTH_ITEM_DISCOUNT") {
      if (autoDiscount.nthItem && autoDiscount.value) {
        let totalDiscount = 0
        let itemCounter = 0
        for (const item of enrichedItems) {
          for (let i = 0; i < item.quantity; i++) {
            itemCounter++
            if (itemCounter % autoDiscount.nthItem === 0) {
              const itemPrice = item.variant?.price || item.product.price
              totalDiscount += (itemPrice * autoDiscount.value) / 100
            }
          }
        }
        discountAmount = totalDiscount
      }
    } else if (autoDiscount.type === "VOLUME_DISCOUNT") {
      if (autoDiscount.volumeRules) {
        const volumeRules = autoDiscount.volumeRules as Array<{ quantity: number; discount: number }>
        const totalQuantity = enrichedItems.reduce((sum, item) => sum + item.quantity, 0)
        const sortedRules = [...volumeRules].sort((a, b) => b.quantity - a.quantity)
        
        for (const rule of sortedRules) {
          if (totalQuantity >= rule.quantity) {
            discountAmount = (subtotal * rule.discount) / 100
            break
          }
        }
      }
    }

    // הגבלת מקסימום הנחה
    if (autoDiscount.maxDiscount) {
      discountAmount = Math.min(discountAmount, autoDiscount.maxDiscount)
    }

    automaticDiscount += discountAmount
    
    // שמירת שם ההנחה הראשונה (עם עדיפות גבוהה)
    if (!automaticDiscountTitle && discountAmount > 0) {
      automaticDiscountTitle = autoDiscount.title
    }

    // אם לא ניתן לשלב, נעצור אחרי הראשונה
    if (!autoDiscount.canCombine) {
      break
    }
  }


  return { amount: automaticDiscount, title: automaticDiscountTitle }
}

/**
 * חישוב הנחה מקופון
 */
async function calculateCouponDiscount(
  shopId: string,
  couponCode: string | null,
  enrichedItems: EnrichedCartItem[],
  subtotal: number,
  customerId?: string | null
): Promise<{ discount: number; customerDiscountFromCoupon?: number; status?: { isValid: boolean; reason?: string; minOrderRequired?: number } }> {
  if (!couponCode) {
    return { discount: 0 }
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode },
  })

  if (!coupon || !coupon.isActive || coupon.shopId !== shopId) {
    return { 
      discount: 0,
      status: { isValid: false, reason: 'קוד קופון לא תקין' }
    }
  }

  // בדיקת תאריכים
  const now = new Date()
  if (coupon.startDate && coupon.startDate > now) {
    return { 
      discount: 0,
      status: { isValid: false, reason: 'הקופון עדיין לא תקף' }
    }
  }
  if (coupon.endDate && coupon.endDate < now) {
    return { 
      discount: 0,
      status: { isValid: false, reason: 'הקופון פג תוקף' }
    }
  }

  // בדיקת minOrder
  if (coupon.minOrder && subtotal < coupon.minOrder) {
    return { 
      discount: 0,
      status: { 
        isValid: false, 
        reason: `נדרש מינימום הזמנה של ₪${coupon.minOrder}`,
        minOrderRequired: coupon.minOrder
      }
    }
  }

  // בדיקת מוצרים/קטגוריות ספציפיים
  if (coupon.applicableProducts && Array.isArray(coupon.applicableProducts) && coupon.applicableProducts.length > 0) {
    const productIds = enrichedItems.map(item => item.productId)
    const hasApplicableProduct = productIds.some(id => coupon.applicableProducts.includes(id))
    if (!hasApplicableProduct) {
      return { 
        discount: 0,
        status: { isValid: false, reason: 'הקופון לא תקף למוצרים בעגלה' }
      }
    }
  }

  if (coupon.applicableCategories && Array.isArray(coupon.applicableCategories) && coupon.applicableCategories.length > 0) {
    const productIds = enrichedItems.map(item => item.productId)
    const productsWithCategories = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        categories: {
          some: {
            categoryId: { in: coupon.applicableCategories }
          }
        }
      },
      select: { id: true }
    })
    if (productsWithCategories.length === 0) {
      return { 
        discount: 0,
        status: { isValid: false, reason: 'הקופון לא תקף לקטגוריות בעגלה' }
      }
    }
  }

  // בדיקת לקוחות ספציפיים - אם יש applicableCustomers, הקופון תקף רק ללקוחות מחוברים
  if (coupon.applicableCustomers && Array.isArray(coupon.applicableCustomers) && coupon.applicableCustomers.length > 0) {
    if (!customerId) {
      return { 
        discount: 0,
        status: { isValid: false, reason: 'קופון זה מיועד ללקוחות מחוברים בלבד. אנא התחבר לחשבון שלך' }
      }
    }
    if (!coupon.applicableCustomers.includes(customerId)) {
      return { 
        discount: 0,
        status: { isValid: false, reason: 'קופון זה לא תקף לחשבון שלך' }
      }
    }
  }

  // חישוב הנחה לפי סוג
  let discount = 0
  if (coupon.type === "PERCENTAGE") {
    discount = (subtotal * coupon.value) / 100
  } else if (coupon.type === "FIXED") {
    discount = coupon.value
  } else if (coupon.type === "BUY_X_GET_Y") {
    if (coupon.buyQuantity && coupon.getQuantity && coupon.getDiscount !== null) {
      let totalDiscount = 0
      for (const item of enrichedItems) {
        const applicableTimes = Math.floor(item.quantity / coupon.buyQuantity)
        if (applicableTimes > 0) {
          const freeItems = Math.min(applicableTimes * coupon.getQuantity, item.quantity)
          const itemPrice = item.variant?.price || item.product.price
          const discountPerItem = (itemPrice * coupon.getDiscount) / 100
          totalDiscount += discountPerItem * freeItems
        }
      }
      discount = totalDiscount
    }
  } else if (coupon.type === "BUY_X_PAY_Y") {
    // קנה X פריטים, שלם רק על Y מהם
    if (coupon.buyQuantity) {
      // אם יש סכום קבוע לשלם
      if (coupon.payAmount) {
        // חישוב לפי סכום קבוע: הסכום הכולל שישלם הוא payAmount * מספר הקבוצות המלאות
        // נחשב את המחיר הכולל של כל הפריטים
        let totalItemsPrice = 0
        let totalQuantity = 0
        
        for (const item of enrichedItems) {
          const itemPrice = item.variant?.price || item.product.price
          totalItemsPrice += itemPrice * item.quantity
          totalQuantity += item.quantity
        }
        
        // מספר הקבוצות המלאות
        const fullGroups = Math.floor(totalQuantity / coupon.buyQuantity)
        // מספר הפריטים שלא נכנסים לקבוצה מלאה
        const remainingItems = totalQuantity % coupon.buyQuantity
        
        // מחיר הפריטים שלא נכנסים לקבוצה מלאה
        let remainingItemsPrice = 0
        let itemsCounted = 0
        for (const item of enrichedItems) {
          const itemPrice = item.variant?.price || item.product.price
          const itemsToCount = Math.min(item.quantity, remainingItems - itemsCounted)
          if (itemsToCount > 0) {
            remainingItemsPrice += itemPrice * itemsToCount
            itemsCounted += itemsToCount
          }
          if (itemsCounted >= remainingItems) break
        }
        
        // הסכום שישלם = סכום קבוע על כל קבוצה מלאה + מחיר הפריטים שלא נכנסים לקבוצה
        const totalPriceToPay = (coupon.payAmount * fullGroups) + remainingItemsPrice
        
        // ההנחה היא ההפרש בין המחיר המקורי למחיר שישלם
        discount = Math.max(0, totalItemsPrice - totalPriceToPay)
      } else if (coupon.payQuantity) {
        // חישוב רגיל: משלם רק על Y פריטים
        let totalDiscount = 0
        for (const item of enrichedItems) {
          const applicableTimes = Math.floor(item.quantity / coupon.buyQuantity)
          if (applicableTimes > 0) {
            // מספר הפריטים החינמיים בכל קבוצה
            const freeItemsPerGroup = coupon.buyQuantity - coupon.payQuantity
            const totalFreeItems = Math.min(applicableTimes * freeItemsPerGroup, item.quantity - (applicableTimes * coupon.payQuantity))
            const itemPrice = item.variant?.price || item.product.price
            // הנחה של 100% על הפריטים החינמיים
            totalDiscount += itemPrice * totalFreeItems
          }
        }
        discount = totalDiscount
      }
    }
  } else if (coupon.type === "NTH_ITEM_DISCOUNT") {
    if (coupon.nthItem && coupon.value) {
      let totalDiscount = 0
      let itemCounter = 0
      for (const item of enrichedItems) {
        for (let i = 0; i < item.quantity; i++) {
          itemCounter++
          if (itemCounter % coupon.nthItem === 0) {
            const itemPrice = item.variant?.price || item.product.price
            totalDiscount += (itemPrice * coupon.value) / 100
          }
        }
      }
      discount = totalDiscount
    }
  } else if (coupon.type === "VOLUME_DISCOUNT") {
    if (coupon.volumeRules) {
      const volumeRules = coupon.volumeRules as Array<{ quantity: number; discount: number }>
      const totalQuantity = enrichedItems.reduce((sum, item) => sum + item.quantity, 0)
      const sortedRules = [...volumeRules].sort((a, b) => b.quantity - a.quantity)
      
      for (const rule of sortedRules) {
        if (totalQuantity >= rule.quantity) {
          discount = (subtotal * rule.discount) / 100
          break
        }
      }
    }
  }

  // הגבלת מקסימום הנחה
  if (coupon.maxDiscount) {
    discount = Math.min(discount, coupon.maxDiscount)
  }

  // חישוב הנחת לקוח רשום מקופון
  let customerDiscountFromCoupon = 0
  if (coupon.enableCustomerDiscount && coupon.customerDiscountPercent && customerId) {
    // הנחה על ה-subtotal אחרי הנחת הקופון
    const subtotalAfterCoupon = subtotal - discount
    customerDiscountFromCoupon = (subtotalAfterCoupon * coupon.customerDiscountPercent) / 100
  }

  return { 
    discount,
    customerDiscountFromCoupon,
    status: { isValid: true }
  }
}

/**
 * פונקציה מרכזית לחישוב עגלה - משמשת בכל המקומות
 * 
 * @param shopId - ID של החנות
 * @param cartItems - פריטי עגלה (productId, variantId, quantity)
 * @param couponCode - קוד קופון (אופציונלי)
 * @param customerId - ID של לקוח (אופציונלי)
 * @param taxRate - שיעור מע"מ (אופציונלי)
 * @param shippingCost - עלות משלוח (אופציונלי)
 */
export async function calculateCart(
  shopId: string,
  cartItems: Array<{ 
    productId: string; 
    variantId?: string | null; 
    quantity: number; 
    isGift?: boolean; 
    giftDiscountId?: string;
    addons?: Array<{
      addonId: string;
      valueId: string | null;
      label: string;
      price: number;
      quantity: number;
    }>;
    bundleId?: string; // תמיכה ב-bundles
    bundleName?: string;
  }>,
  couponCode: string | null = null,
  customerId: string | null = null,
  taxRate: number | null = null,
  shippingCost: number | null = null
): Promise<CartCalculationResult> {
  // טעינת מוצרים ו-variants
  const productIds = Array.from(new Set(cartItems.map(item => item.productId)))
  const variantIds = cartItems
    .map(item => item.variantId)
    .filter((id): id is string => id !== null && id !== undefined)

  const [products, variants, shop] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, shopId },
      select: {
        id: true,
        slug: true,
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
            productId: true,
          },
        })
      : [],
    prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        taxEnabled: true,
        taxRate: true,
        pricesIncludeTax: true,
        customerDiscountSettings: true,
      },
    }),
  ])

  const productsMap = new Map(products.map(p => [p.id, p]))
  const variantsMap = new Map(variants.map(v => [v.id, v]))

  // טעינת לקוח והגדרות הנחות
  let customerDiscountSettings = null
  let customer = null
  if (customerId) {
    const [shopWithSettings, customerData] = await Promise.all([
      prisma.shop.findUnique({
        where: { id: shopId },
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
  } else {
  }

  // טעינת bundles אם יש פריטים עם bundleId
  const bundleIds = Array.from(new Set(
    cartItems
      .map(item => (item as any).bundleId)
      .filter((id): id is string => id !== null && id !== undefined)
  ))
  
  const bundlesMap = new Map()
  if (bundleIds.length > 0) {
    const bundles = await prisma.bundle.findMany({
      where: {
        id: { in: bundleIds },
        shopId,
      },
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
    })
    
    for (const bundle of bundles) {
      bundlesMap.set(bundle.id, bundle)
    }
  }

  // קיבוץ פריטים לפי bundleId
  const itemsByBundle = new Map<string, typeof cartItems>()
  const regularItems: typeof cartItems = []
  
  for (const item of cartItems) {
    const bundleId = (item as any).bundleId
    if (bundleId) {
      if (!itemsByBundle.has(bundleId)) {
        itemsByBundle.set(bundleId, [])
      }
      itemsByBundle.get(bundleId)!.push(item)
    } else {
      regularItems.push(item)
    }
  }

  // בניית enrichedItems וחישוב subtotal
  const enrichedItems: EnrichedCartItem[] = []
  let subtotal = 0
  let customerDiscountTotal = 0

  // טיפול בפריטים רגילים (לא bundles)
  for (const item of regularItems) {
    const product = productsMap.get(item.productId)
    
    if (!product) {
      continue
    }

    const variant = item.variantId ? variantsMap.get(item.variantId) : null
    
    // אם זה מתנה, המחיר הוא 0
    const basePrice = item.isGift ? 0 : (variant?.price || product.price)
    let itemPrice = basePrice

    // חישוב הנחת לקוח רשום (רק אם זה לא מתנה)
    if (!item.isGift && customerId && customer && customerDiscountSettings) {
      const discount = calculateCustomerDiscountSync(
        customerDiscountSettings as any,
        customer,
        basePrice
      )
      itemPrice = basePrice - discount
      customerDiscountTotal += discount * item.quantity
    }

    // חישוב מחיר addons
    let addonsTotal = 0
    if (item.addons && item.addons.length > 0) {
      for (const addon of item.addons) {
        addonsTotal += addon.price * addon.quantity
      }
    }

    const itemTotal = (itemPrice * item.quantity) + addonsTotal
    
    // אם זה לא מתנה, נוסיף לסכום הביניים
    if (!item.isGift) {
      subtotal += itemTotal
    }

    enrichedItems.push({
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: item.quantity,
      product: {
        id: product.id,
        slug: product.slug,
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
            price: variant.price ?? 0,
            sku: variant.sku,
            inventoryQty: variant.inventoryQty,
          }
        : null,
      price: itemPrice,
      total: itemTotal,
      isGift: item.isGift,
      giftDiscountId: item.giftDiscountId,
      addons: item.addons,
      addonsTotal,
    })
  }

  // טיפול ב-bundles
  for (const [bundleId, bundleItems] of itemsByBundle.entries()) {
    const bundle = bundlesMap.get(bundleId)
    if (!bundle) {
      // אם ה-bundle לא נמצא, נטפל בפריטים כרגיל
      for (const item of bundleItems) {
        const product = productsMap.get(item.productId)
        if (!product) continue
        
        const variant = item.variantId ? variantsMap.get(item.variantId) : null
        const basePrice = item.isGift ? 0 : (variant?.price || product.price)
        let itemPrice = basePrice

        if (!item.isGift && customerId && customer && customerDiscountSettings) {
          const discount = calculateCustomerDiscountSync(
            customerDiscountSettings as any,
            customer,
            basePrice
          )
          itemPrice = basePrice - discount
          customerDiscountTotal += discount * item.quantity
        }

        let addonsTotal = 0
        if (item.addons && item.addons.length > 0) {
          for (const addon of item.addons) {
            addonsTotal += addon.price * addon.quantity
          }
        }

        const itemTotal = (itemPrice * item.quantity) + addonsTotal
        if (!item.isGift) {
          subtotal += itemTotal
        }

        enrichedItems.push({
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          product: {
            id: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            comparePrice: product.comparePrice,
            images: product.images || [],
            sku: product.sku,
          },
          variant: variant ? {
            id: variant.id,
            name: variant.name,
            price: variant.price ?? 0,
            sku: variant.sku,
            inventoryQty: variant.inventoryQty,
          } : null,
          price: itemPrice,
          total: itemTotal,
          isGift: item.isGift,
          giftDiscountId: item.giftDiscountId,
          addons: item.addons,
          addonsTotal,
        })
      }
      continue
    }

    // חישוב כמות bundles (מספר פעמים שה-bundle נוסף)
    // נבדוק כמה פעמים ה-bundle נוסף לפי היחס בין הכמויות
    // אם bundle מכיל מוצר A x2 ומוצר B x1, ואנחנו רואים A x4 ו-B x2, אז bundleQuantity = 2
    const bundleProductQuantities = bundle.products.map(bp => bp.quantity)
    const cartItemQuantities = bundleItems.map(item => item.quantity)
    
    // נחשב את היחס - כמה פעמים ה-bundle נוסף
    let bundleQuantity = 1
    if (bundleProductQuantities.length > 0 && cartItemQuantities.length > 0) {
      // נבדוק את היחס בין הכמויות
      const ratios = bundleItems.map((item, idx) => {
        const bundleProduct = bundle.products.find(bp => bp.productId === item.productId)
        if (!bundleProduct) return 0
        return item.quantity / bundleProduct.quantity
      })
      bundleQuantity = Math.max(...ratios.filter(r => r > 0))
    }
    
    const bundleTotalPrice = bundle.price * bundleQuantity

    // חישוב המחיר המקורי של כל המוצרים בחבילה (ללא הנחה)
    let originalBundlePrice = 0
    for (const bundleProduct of bundle.products) {
      const product = productsMap.get(bundleProduct.productId)
      if (product) {
        originalBundlePrice += product.price * bundleProduct.quantity * bundleQuantity
      }
    }

    // חישוב הנחה על ה-bundle
    const bundleDiscount = Math.max(0, originalBundlePrice - bundleTotalPrice)

    // חישוב הנחת לקוח על ה-bundle (אם יש)
    let bundlePriceAfterCustomerDiscount = bundleTotalPrice
    if (customerId && customer && customerDiscountSettings) {
      const customerDiscount = calculateCustomerDiscountSync(
        customerDiscountSettings as any,
        customer,
        bundleTotalPrice
      )
      bundlePriceAfterCustomerDiscount = bundleTotalPrice - customerDiscount
      customerDiscountTotal += customerDiscount
    }

    // חישוב סכום כולל של addons ב-bundle
    let bundleAddonsTotal = 0
    for (const item of bundleItems) {
      if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
          bundleAddonsTotal += addon.price * addon.quantity
        }
      }
    }

    // חישוב מחיר לכל מוצר בחבילה - נשתמש במחיר המקורי של המוצר
    // אבל נחלק את ההנחה של ה-bundle פרופורציונלית
    const totalOriginalPrice = bundleItems.reduce((sum, item) => {
      const product = productsMap.get(item.productId)
      if (!product) return sum
      const variant = item.variantId ? variantsMap.get(item.variantId) : null
      const basePrice = variant?.price || product.price
      return sum + (basePrice * item.quantity)
    }, 0)

    // הוספת כל המוצרים מהחבילה
    for (const item of bundleItems) {
      const product = productsMap.get(item.productId)
      if (!product) continue

      const variant = item.variantId ? variantsMap.get(item.variantId) : null
      const basePrice = variant?.price || product.price
      
      // חישוב מחיר addons לפריט זה
      let itemAddonsTotal = 0
      if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
          itemAddonsTotal += addon.price * addon.quantity
        }
      }

      // חישוב הנחה פרופורציונלית על הפריט הזה
      const itemOriginalTotal = basePrice * item.quantity
      const itemDiscountRatio = totalOriginalPrice > 0 ? itemOriginalTotal / totalOriginalPrice : 0
      const itemBundleDiscount = bundleDiscount * itemDiscountRatio
      
      // מחיר הפריט = מחיר מקורי - הנחת bundle + addons
      const itemPrice = basePrice - (itemBundleDiscount / item.quantity)
      const itemTotal = (itemPrice * item.quantity) + itemAddonsTotal

      subtotal += itemTotal

      enrichedItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        product: {
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          comparePrice: product.comparePrice,
          images: product.images || [],
          sku: product.sku,
        },
        variant: variant ? {
          id: variant.id,
          name: variant.name,
          price: variant.price ?? 0,
          sku: variant.sku,
          inventoryQty: variant.inventoryQty,
        } : null,
        price: itemPrice,
        total: itemTotal,
        isGift: item.isGift,
        giftDiscountId: item.giftDiscountId,
        addons: item.addons,
        addonsTotal: itemAddonsTotal,
        bundleId: bundle.id,
        bundleName: bundle.name,
        bundlePrice: bundle.price,
      })
    }
  }

  // הוספת מוצרי מתנה לעגלה
  const { giftItems, giftsRequiringVariantSelection } = await addGiftItemsToCart(
    shopId,
    enrichedItems,
    subtotal,
    customerId,
    customer
  )
  
  // הוספת מוצרי המתנה ל-enrichedItems
  enrichedItems.push(...giftItems)

  // חישוב הנחות אוטומטיות
  const automaticDiscountResult = await calculateAutomaticDiscounts(
    shopId,
    enrichedItems,
    subtotal,
    customerId,
    customer
  )
  const automaticDiscount = automaticDiscountResult.amount
  const automaticDiscountTitle = automaticDiscountResult.title

  // חישוב הנחה מקופון
  const couponResult = await calculateCouponDiscount(
    shopId,
    couponCode,
    enrichedItems,
    subtotal,
    customerId
  )

  // חישוב הנחת לקוח רשום מקופון
  const customerDiscountFromCoupon = couponResult.customerDiscountFromCoupon || 0
  
  // הוספת מתנה אוטומטית מקופון
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    })
    
    if (coupon && coupon.giftProductId && coupon.isActive) {
      // בדיקת תנאי המתנה
      let conditionMet = false
      
      if (coupon.giftCondition === "MIN_ORDER_AMOUNT") {
        const minAmount = coupon.giftConditionAmount ?? coupon.minOrder ?? 0
        conditionMet = subtotal >= minAmount
      } else if (coupon.giftCondition === "SPECIFIC_PRODUCT") {
        if (coupon.giftConditionProductId) {
          conditionMet = enrichedItems.some(
            item => item.productId === coupon.giftConditionProductId && !item.isGift
          )
        }
      } else {
        const minAmount = coupon.minOrder || 0
        conditionMet = subtotal >= minAmount
      }
      
      if (conditionMet) {
        // בדיקה אם מוצר המתנה כבר קיים בעגלה
        const giftAlreadyInCart = enrichedItems.some(
          item => item.productId === coupon.giftProductId && !item.isGift
        )
        
        if (!giftAlreadyInCart) {
          // טעינת מוצר המתנה
          const giftProduct = await prisma.product.findUnique({
            where: { id: coupon.giftProductId },
            include: {
              variants: true,
            },
          })
          
          if (giftProduct && giftProduct.status === "PUBLISHED") {
            // בחירת וריאציה
            let selectedVariant = null
            if (coupon.giftVariantId) {
              selectedVariant = giftProduct.variants.find(v => v.id === coupon.giftVariantId)
            } else if (giftProduct.variants.length > 0) {
              // אם יש וריאציות אבל לא נבחרה אחת, נצטרך לבחור
              // נשתמש בוריאציה הראשונה שיש לה מלאי
              selectedVariant = giftProduct.variants.find(v => (v.inventoryQty ?? 0) > 0) || giftProduct.variants[0]
            }
            
            if (selectedVariant || giftProduct.variants.length === 0) {
              // יש וריאציה נבחרת או אין וריאציות בכלל
              const giftPrice = selectedVariant?.price ?? giftProduct.price
              const giftItem: EnrichedCartItem = {
                productId: giftProduct.id,
                variantId: selectedVariant?.id || null,
                quantity: 1,
                product: {
                  id: giftProduct.id,
                  slug: giftProduct.slug,
                  name: giftProduct.name,
                  price: giftProduct.price,
                  sku: giftProduct.sku,
                },
                variant: selectedVariant ? {
                  id: selectedVariant.id,
                  name: selectedVariant.name,
                  price: selectedVariant.price ?? 0,
                  sku: selectedVariant.sku,
                  inventoryQty: selectedVariant.inventoryQty,
                } : null,
                price: 0, // מתנה - מחיר 0
                total: 0,
                isGift: true,
                giftDiscountId: coupon.id,
              }
              enrichedItems.push(giftItem)
            }
          }
        }
      }
    }
  }

  // חישוב מע"מ
  const finalTaxRate = taxRate !== null ? taxRate : (shop?.taxEnabled && shop.taxRate ? shop.taxRate : 0)
  const totalDiscount = automaticDiscount + couponResult.discount
  const pricesIncludeTax = shop?.pricesIncludeTax ?? true // ברירת מחדל: המחירים כוללים מע"מ
  
  const finalPrice = subtotal - totalDiscount - customerDiscountTotal - customerDiscountFromCoupon
  
  let tax = 0
  let total = 0
  
  if (finalTaxRate > 0) {
    if (pricesIncludeTax) {
      // המחירים כוללים מע"מ - המע"מ כבר נכלל במחיר, לא צריך להציג אותו בנפרד
      tax = 0
      total = finalPrice + (shippingCost !== null ? shippingCost : 0)
    } else {
      // המחירים לא כוללים מע"מ - צריך להוסיף מע"מ
      tax = finalPrice * (finalTaxRate / 100)
      total = finalPrice + tax + (shippingCost !== null ? shippingCost : 0)
    }
  } else {
    // אין מע"מ
    total = finalPrice + (shippingCost !== null ? shippingCost : 0)
  }

  // חישוב משלוח
  const shipping = shippingCost !== null ? shippingCost : 0

  const result: CartCalculationResult = {
    items: enrichedItems,
    subtotal,
    customerDiscount: customerDiscountTotal + customerDiscountFromCoupon,
    automaticDiscount,
    automaticDiscountTitle,
    couponDiscount: couponResult.discount,
    tax,
    shipping,
    total: Math.max(0, total),
  }

  // הוספת סטטוס קופון אם יש קוד קופון
  if (couponCode && couponResult.status) {
    result.couponStatus = {
      code: couponCode,
      ...couponResult.status,
    }
  }

  // הוספת מתנות שדורשות בחירת וריאציה
  if (giftsRequiringVariantSelection.length > 0) {
    result.giftsRequiringVariantSelection = giftsRequiringVariantSelection
  }

  return result
}

