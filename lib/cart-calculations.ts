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
  total: number // מחיר כולל כמות
}

/**
 * תוצאות חישוב עגלה
 */
export interface CartCalculationResult {
  items: EnrichedCartItem[]
  subtotal: number
  customerDiscount: number
  automaticDiscount: number
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
 * חישוב הנחות אוטומטיות
 */
async function calculateAutomaticDiscounts(
  shopId: string,
  enrichedItems: EnrichedCartItem[],
  subtotal: number,
  customerId: string | null,
  customer: { totalSpent: number; orderCount: number; tier: string | null } | null
): Promise<number> {
  let automaticDiscount = 0
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

    // אם לא ניתן לשלב, נעצור אחרי הראשונה
    if (!autoDiscount.canCombine) {
      break
    }
  }

  return automaticDiscount
}

/**
 * חישוב הנחה מקופון
 */
async function calculateCouponDiscount(
  shopId: string,
  couponCode: string | null,
  enrichedItems: EnrichedCartItem[],
  subtotal: number
): Promise<{ discount: number; status?: { isValid: boolean; reason?: string; minOrderRequired?: number } }> {
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

  return { 
    discount,
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
  cartItems: Array<{ productId: string; variantId?: string | null; quantity: number }>,
  couponCode: string | null = null,
  customerId: string | null = null,
  taxRate: number | null = null,
  shippingCost: number | null = null
): Promise<CartCalculationResult> {
  // טעינת מוצרים ו-variants
  const productIds = [...new Set(cartItems.map(item => item.productId))]
  const variantIds = cartItems
    .map(item => item.variantId)
    .filter((id): id is string => id !== null && id !== undefined)

  console.log('🛒 calculateCart - Looking for variants:', variantIds)
  console.log('🛒 calculateCart - Cart items:', cartItems.map(item => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity
  })))

  const [products, variants, shop] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, shopId },
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
            productId: true,
          },
        })
      : [],
    prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        taxEnabled: true,
        taxRate: true,
        customerDiscountSettings: true,
      },
    }),
  ])

  console.log('🛒 calculateCart - Found variants in DB:', variants.map((v: any) => ({
    id: v.id,
    name: v.name,
    productId: v.productId
  })))
  console.log('🛒 calculateCart - Missing variants:', variantIds.filter(id => !variants.find((v: any) => v.id === id)))

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
  }

  // בניית enrichedItems וחישוב subtotal
  const enrichedItems: EnrichedCartItem[] = []
  let subtotal = 0
  let customerDiscountTotal = 0

  for (const item of cartItems) {
    const product = productsMap.get(item.productId)
    
    if (!product) {
      continue
    }

    const variant = item.variantId ? variantsMap.get(item.variantId) : null
    
    if (item.variantId && !variant) {
      console.warn('⚠️ calculateCart - Variant not found in DB:', {
        variantId: item.variantId,
        productId: item.productId,
        productName: product.name,
        availableVariantIds: Array.from(variantsMap.keys())
      })
    }
    
    const basePrice = variant?.price || product.price
    let itemPrice = basePrice

    // חישוב הנחת לקוח רשום
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
      variantId: item.variantId || null,
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

  // חישוב הנחות אוטומטיות
  const automaticDiscount = await calculateAutomaticDiscounts(
    shopId,
    enrichedItems,
    subtotal,
    customerId,
    customer
  )

  // חישוב הנחה מקופון
  const couponResult = await calculateCouponDiscount(
    shopId,
    couponCode,
    enrichedItems,
    subtotal
  )

  // חישוב מע"מ - המחירים כבר כוללים מע"ם, אז רק מפרידים אותו לתצוגה
  const finalTaxRate = taxRate !== null ? taxRate : (shop?.taxEnabled && shop.taxRate ? shop.taxRate : 0)
  const totalDiscount = automaticDiscount + couponResult.discount
  
  // אם יש מע"ם, מחשבים כמה מתוך המחיר הוא מע"ם (לא מוסיפים!)
  // דוגמה: אם המחיר 117 והמע"מ 17%, אז המחיר לפני מע"ם הוא 100 והמע"ם הוא 17
  const finalPrice = subtotal - totalDiscount - customerDiscountTotal
  const tax = finalTaxRate > 0
    ? finalPrice - (finalPrice / (1 + finalTaxRate / 100))
    : 0

  // חישוב משלוח
  const shipping = shippingCost !== null ? shippingCost : 0

  // סה"כ - המחירים כבר כוללים מע"ם, אז לא מוסיפים אותו
  const total = finalPrice + shipping

  const result: CartCalculationResult = {
    items: enrichedItems,
    subtotal,
    customerDiscount: customerDiscountTotal,
    automaticDiscount,
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

  return result
}

