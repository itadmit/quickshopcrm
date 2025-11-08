import { prisma } from "./prisma"

interface DiscountSettings {
  enabled: boolean
  baseDiscount?: {
    type: "PERCENTAGE" | "FIXED"
    value: number
    applicableTo: "ALL_PRODUCTS" | "CATEGORIES" | "PRODUCTS"
  }
  tiers?: Array<{
    name: string
    minSpent: number
    minOrders: number
    discount: {
      type: "PERCENTAGE" | "FIXED"
      value: number
    }
  }>
}

/**
 * חישוב הנחה ללקוח רשום
 */
export async function calculateCustomerDiscount(
  shopId: string,
  customerId: string,
  productId: string,
  basePrice: number
): Promise<number> {
  try {
    // קבלת הגדרות הנחות של החנות
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { customerDiscountSettings: true },
    })

    if (!shop || !shop.customerDiscountSettings) {
      return 0
    }

    const settings = (shop.customerDiscountSettings as unknown) as DiscountSettings

    if (!settings.enabled) {
      return 0
    }

    // קבלת פרטי לקוח
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        totalSpent: true,
        orderCount: true,
        tier: true,
      },
    })

    if (!customer) {
      return 0
    }

    // בדיקת tier
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

    // אם אין tier מתאים, בדיקת baseDiscount
    if (discount === 0 && settings.baseDiscount) {
      // בדיקת התאמה למוצר
      let applicable = false

      if (settings.baseDiscount.applicableTo === "ALL_PRODUCTS") {
        applicable = true
      } else if (settings.baseDiscount.applicableTo === "PRODUCTS") {
        // צריך לבדוק אם המוצר ברשימה - לא מיושם כאן
        applicable = true // פשוט
      } else if (settings.baseDiscount.applicableTo === "CATEGORIES") {
        // צריך לבדוק אם המוצר בקטגוריה - לא מיושם כאן
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

    return Math.min(discount, basePrice) // לא יותר מהמחיר
  } catch (error) {
    console.error("Error calculating customer discount:", error)
    return 0
  }
}

/**
 * עדכון tier של לקוח
 */
export async function updateCustomerTier(shopId: string, customerId: string) {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { customerDiscountSettings: true },
    })

    if (!shop || !shop.customerDiscountSettings) {
      return
    }

    const settings = (shop.customerDiscountSettings as unknown) as DiscountSettings

    if (!settings.enabled || !settings.tiers) {
      return
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        totalSpent: true,
        orderCount: true,
        tier: true,
      },
    })

    if (!customer) {
      return
    }

    // מציאת ה-tier הגבוה ביותר שהלקוח עומד בו
    let highestTier = "REGULAR"

    for (const tier of settings.tiers) {
      if (
        customer.totalSpent >= tier.minSpent &&
        customer.orderCount >= tier.minOrders
      ) {
        highestTier = tier.name.toUpperCase()
      }
    }

    // עדכון tier אם השתנה
    if (customer.tier !== highestTier) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { tier: highestTier as any },
      })
    }
  } catch (error) {
    console.error("Error updating customer tier:", error)
  }
}

