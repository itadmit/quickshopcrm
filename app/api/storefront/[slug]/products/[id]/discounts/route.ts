import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - קבלת הנחות אוטומטיות שחלות על מוצר ספציפי
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    // מציאת החנות
    const shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // מציאת המוצר
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        price: true,
        categories: { select: { categoryId: true } },
        collections: { select: { collectionId: true } },
        variants: {
          select: {
            id: true,
            price: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // קבלת variantId מה-query params (אם יש)
    const { searchParams } = new URL(req.url)
    const variantId = searchParams.get("variantId")
    const customerId = searchParams.get("customerId") || req.headers.get("x-customer-id") || null

    // קביעת המחיר הבסיסי (variant או product)
    let basePrice: number
    if (variantId && product.variants) {
      // אם יש variant מוגדר, נשתמש במחיר שלו
      basePrice = product.variants.find(v => v.id === variantId)?.price || product.price
    } else if (product.price === 0 && product.variants && product.variants.length > 0) {
      // אם המוצר עם מחיר 0 אבל יש לו variants, נשתמש במחיר המינימלי
      const variantPrices = product.variants
        .map(v => v.price)
        .filter((p): p is number => p !== null && p !== undefined && p > 0)
      basePrice = variantPrices.length > 0 ? Math.min(...variantPrices) : product.price
    } else {
      // אחרת, נשתמש במחיר המוצר
      basePrice = product.price
    }


    // טעינת לקוח אם יש customerId
    let customer = null
    let customerTier: string | null = null
    let hasEarlyAccess = false
    
    if (customerId) {
      const customerData = await prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          totalSpent: true,
          orderCount: true,
          tier: true,
          premiumClubTier: true,
        },
      })
      customer = customerData
      customerTier = customerData?.premiumClubTier || null
      
      // בדיקת early access
      if (customerTier) {
        const premiumClubPlugin = await prisma.plugin.findFirst({
          where: {
            slug: 'premium-club',
            shopId: shop.id,
            isActive: true,
            isInstalled: true,
          },
          select: { config: true },
        })
        
        if (premiumClubPlugin?.config) {
          const config = premiumClubPlugin.config as any
          if (config.enabled && config.benefits?.earlyAccessToSales) {
            const tier = config.tiers?.find((t: any) => t.slug === customerTier)
            hasEarlyAccess = tier?.benefits?.earlyAccess || false
          }
        }
      }
    }

    const now = new Date()
    
    // מציאת הנחות אוטומטיות פעילות
    // אם יש early access, נכלול גם מבצעים עתידיים
    const discountDateFilter: any = hasEarlyAccess
      ? {} // עם early access, אין הגבלת תאריך
      : {
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
        }
    
    const activeAutomaticDiscounts = await prisma.discount.findMany({
      where: {
        shopId: shop.id,
        isActive: true,
        isAutomatic: true,
        ...discountDateFilter,
      },
      orderBy: { priority: 'desc' },
    })

    // חישוב הנחות עם לוגיקה של canCombine (כמו בעגלה)
    // מחזירים את כל ההנחות הפעילות, אבל אם יש הנחה עם canCombine: false, עוצרים אחריה
    let currentPrice = basePrice
    const appliedDiscounts: Array<{
      id: string
      title: string
      type: string
      value: number
      originalPrice: number
      discountedPrice: number
    }> = []

    console.log('🎁 Product discounts API - Starting calculation:', {
      basePrice,
      customerId: customerId || 'null',
      discountsCount: activeAutomaticDiscounts.length,
      discounts: activeAutomaticDiscounts.map(d => ({
        id: d.id,
        title: d.title,
        priority: d.priority,
        canCombine: d.canCombine,
        customerTarget: d.customerTarget,
      }))
    })

    for (const discount of activeAutomaticDiscounts) {
      console.log('🎁 Product discounts API - Checking discount:', {
        discountId: discount.id,
        title: discount.title,
        target: discount.target,
        customerTarget: discount.customerTarget,
        productId: product.id,
        productCategories: product.categories.map(c => c.categoryId),
        productCollections: product.collections.map(c => c.collectionId),
      })

      // בדיקת customerTarget
      let customerMatch = false
      if (discount.customerTarget === "ALL_CUSTOMERS") {
        customerMatch = true
      } else if (discount.customerTarget === "REGISTERED_CUSTOMERS" && customerId) {
        customerMatch = true
      } else if (discount.customerTarget === "SPECIFIC_CUSTOMERS" && customerId && discount.specificCustomers && Array.isArray(discount.specificCustomers) && discount.specificCustomers.includes(customerId)) {
        customerMatch = true
      } else if (discount.customerTarget === "CUSTOMER_TIERS" && customerId && customer && customer.tier && discount.customerTiers && Array.isArray(discount.customerTiers) && discount.customerTiers.includes(customer.tier)) {
        customerMatch = true
      }

      if (!customerMatch) {
        console.log('🎁 Product discounts API - Discount skipped: customerTarget mismatch', {
          discountId: discount.id,
          title: discount.title,
          customerTarget: discount.customerTarget,
          customerId: customerId || 'null',
        })
        continue
      }

      // בדיקת target (מוצרים/קטגוריות)
      let productMatch = false
      if (discount.target === "ALL_PRODUCTS") {
        productMatch = true
      } else if (discount.target === "SPECIFIC_PRODUCTS") {
        if (discount.applicableProducts && Array.isArray(discount.applicableProducts)) {
          productMatch = discount.applicableProducts.includes(product.id)
        }
      } else if (discount.target === "SPECIFIC_CATEGORIES") {
        if (discount.applicableCategories && Array.isArray(discount.applicableCategories) && discount.applicableCategories.length > 0) {
          const productCategoryIds = product.categories.map(c => c.categoryId)
          productMatch = discount.applicableCategories.some(catId => productCategoryIds.includes(catId))
        }
      } else if (discount.target === "SPECIFIC_COLLECTIONS") {
        if (discount.applicableCollections && Array.isArray(discount.applicableCollections) && discount.applicableCollections.length > 0) {
          const productCollectionIds = product.collections.map(c => c.collectionId)
          productMatch = discount.applicableCollections.some(colId => productCollectionIds.includes(colId))
        }
      } else if (discount.target === "EXCLUDE_PRODUCTS") {
        if (discount.excludedProducts && Array.isArray(discount.excludedProducts)) {
          productMatch = !discount.excludedProducts.includes(product.id)
        } else {
          productMatch = true
        }
      } else if (discount.target === "EXCLUDE_CATEGORIES") {
        if (discount.excludedCategories && Array.isArray(discount.excludedCategories) && discount.excludedCategories.length > 0) {
          const productCategoryIds = product.categories.map(c => c.categoryId)
          productMatch = !discount.excludedCategories.some(catId => productCategoryIds.includes(catId))
        } else {
          productMatch = true
        }
      } else if (discount.target === "EXCLUDE_COLLECTIONS") {
        if (discount.excludedCollections && Array.isArray(discount.excludedCollections) && discount.excludedCollections.length > 0) {
          const productCollectionIds = product.collections.map(c => c.collectionId)
          productMatch = !discount.excludedCollections.some(colId => productCollectionIds.includes(colId))
        } else {
          productMatch = true
        }
      }

      if (!productMatch) {
        console.log('🎁 Product discounts API - Discount skipped: productMatch mismatch', {
          discountId: discount.id,
          title: discount.title,
          target: discount.target,
          productId: product.id,
        })
        continue
      }

      // חישוב מחיר אחרי הנחה (רק עבור PERCENTAGE ו-FIXED)
      let discountedPrice: number | null = null
      if (discount.type === "PERCENTAGE") {
        const discountAmount = (currentPrice * discount.value) / 100
        discountedPrice = currentPrice - discountAmount
        if (discount.maxDiscount) {
          discountedPrice = Math.max(discountedPrice, currentPrice - discount.maxDiscount)
        }
      } else if (discount.type === "FIXED") {
        discountedPrice = Math.max(0, currentPrice - discount.value)
      }

      // רק הנחות עם מחיר מוזל (PERCENTAGE או FIXED) יוצגו
      if (discountedPrice !== null && discountedPrice < currentPrice) {
        console.log('🎁 Product discounts API - Discount applicable:', {
          discountId: discount.id,
          title: discount.title,
          priority: discount.priority,
          canCombine: discount.canCombine,
          discountedPrice,
          currentPrice,
          appliedDiscountsCount: appliedDiscounts.length,
        })

        // אם לא ניתן לשלב, בודקים אם יש הנחות קודמות שהוחלו
        // אם יש, לא מחשבים את ההנחה הזו ועוצרים
        if (!discount.canCombine) {
          // אם יש הנחות קודמות שהוחלו, לא מחשבים את ההנחה הזו ועוצרים
          if (appliedDiscounts.length > 0) {
            console.log('🎁 Product discounts API - Cannot combine, stopping. Applied discounts:', appliedDiscounts.map(d => d.title))
            break
          }
          console.log('🎁 Product discounts API - Cannot combine, no previous discounts, applying this one:', discount.title)
          // אם אין הנחות קודמות, מחשבים ומחילים את ההנחה הזו
          // originalPrice הוא המחיר לפני ההנחה הזו (currentPrice)
          appliedDiscounts.push({
            id: discount.id,
            title: discount.title,
            type: discount.type,
            value: discount.value,
            originalPrice: currentPrice,
            discountedPrice: discountedPrice,
          })
          currentPrice = discountedPrice
          break
        }
        
        console.log('🎁 Product discounts API - Can combine, applying discount:', discount.title)
        // אם ניתן לשלב, מחשבים ומחילים את ההנחה
        // originalPrice הוא המחיר לפני ההנחה הזו (currentPrice)
        appliedDiscounts.push({
          id: discount.id,
          title: discount.title,
          type: discount.type,
          value: discount.value,
          originalPrice: currentPrice,
          discountedPrice: discountedPrice,
        })
        // עדכון המחיר הנוכחי אחרי הוספת ההנחה
        currentPrice = discountedPrice
      }
    }

    // החזרת כל ההנחות שהוחלו
    console.log('🎁 Product discounts API - Final result:', {
      appliedDiscounts: appliedDiscounts.map(d => d.title),
      discountsCount: appliedDiscounts.length,
    })
    return NextResponse.json({ discounts: appliedDiscounts })
  } catch (error) {
    console.error("Error fetching product discounts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

