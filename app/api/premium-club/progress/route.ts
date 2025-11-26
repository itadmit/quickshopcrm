import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface PremiumClubTier {
  slug: string
  name: string
  color: string
  priority: number
  minSpent?: number | null
  minOrders?: number | null
  discount?: {
    type: 'PERCENTAGE' | 'FIXED'
    value: number
  } | null
  benefits: {
    freeShipping?: boolean
    earlyAccess?: boolean
    exclusiveProducts?: boolean
    birthdayGift?: boolean
    pointsMultiplier?: number | null
  }
}

interface PremiumClubConfig {
  enabled: boolean
  tiers: PremiumClubTier[]
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const customerId = searchParams.get("customerId")

    console.log('[Premium Progress API] Request received:', { shopId, customerId })

    if (!shopId || !customerId) {
      console.log('[Premium Progress API] Missing params')
      return NextResponse.json(
        { error: "חסרים פרמטרים" },
        { status: 400 }
      )
    }

    // מציאת החנות
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { companyId: true },
    })

    if (!shop) {
      return NextResponse.json(
        { error: "חנות לא נמצאה" },
        { status: 404 }
      )
    }

    // מציאת תוסף Premium Club
    const plugin = await prisma.plugin.findFirst({
      where: {
        slug: 'premium-club',
        isActive: true,
        isInstalled: true,
        OR: [
          { shopId },
          { companyId: shop.companyId, shopId: null },
          { shopId: null, companyId: null },
        ],
      },
      select: { config: true },
    })

    if (!plugin?.config) {
      console.log('[Premium Progress API] Plugin not found or no config')
      return NextResponse.json({ enabled: false })
    }

    const config = plugin.config as PremiumClubConfig

    console.log('[Premium Progress API] Plugin config:', {
      enabled: config.enabled,
      tiersCount: config.tiers?.length || 0
    })
    console.log('[Premium Progress API] Plugin config:', { enabled: config.enabled, tiersCount: config.tiers?.length })

    if (!config.enabled || !config.tiers || config.tiers.length === 0) {
      console.log('[Premium Progress API] Plugin disabled or no tiers')
      return NextResponse.json({ enabled: false })
    }

    // מציאת הלקוח עם סטטיסטיקות
    const customer = await prisma.customer.findFirst({
      where: { 
        id: customerId,
        shopId: shopId
      },
      select: {
        premiumClubTier: true,
        totalSpent: true,
        orderCount: true,
      },
    })

    if (!customer) {
      console.error(`[Premium Progress API] Customer not found or deleted: ${customerId}`)
      return NextResponse.json(
        { error: "לקוח לא נמצא או נמחק" },
        { status: 401 }
      )
    }

    const totalSpent = customer.totalSpent || 0
    const totalOrders = customer.orderCount || 0

    // מיון רמות לפי priority (נמוך = בסיסי, גבוה = מתקדם)
    const sortedTiers = [...config.tiers].sort((a, b) => a.priority - b.priority)

    // מציאת הרמה הנוכחית
    const currentTier = sortedTiers.find(t => t.slug === customer.premiumClubTier)
    const currentTierIndex = currentTier ? sortedTiers.findIndex(t => t.slug === currentTier.slug) : -1

    // מציאת הרמה הבאה
    let nextTier: PremiumClubTier | null = null
    if (currentTierIndex < sortedTiers.length - 1) {
      nextTier = sortedTiers[currentTierIndex + 1]
    } else if (currentTierIndex === -1 && sortedTiers.length > 0) {
      // אין רמה נוכחית - הרמה הבאה היא הראשונה
      nextTier = sortedTiers[0]
    }

    // חישוב התקדמות לרמה הבאה
    let progress = 100
    let spentToNext = 0
    let ordersToNext = 0
    let spentProgress = 100
    let ordersProgress = 100

    if (nextTier) {
      // חישוב התקדמות לפי סכום
      if (nextTier.minSpent != null && nextTier.minSpent > 0) {
        spentProgress = Math.min(100, Math.max(0, (totalSpent / nextTier.minSpent) * 100))
        spentToNext = Math.max(0, nextTier.minSpent - totalSpent)
      } else {
        spentProgress = 100
        spentToNext = 0
      }

      // חישוב התקדמות לפי הזמנות
      if (nextTier.minOrders != null && nextTier.minOrders > 0) {
        ordersProgress = Math.min(100, Math.max(0, (totalOrders / nextTier.minOrders) * 100))
        ordersToNext = Math.max(0, nextTier.minOrders - totalOrders)
      } else {
        ordersProgress = 100
        ordersToNext = 0
      }

      // התקדמות כללית - לפי הקריטריון הנמוך יותר (צריך לעמוד בשניהם)
      if (nextTier.minSpent != null && nextTier.minOrders != null) {
        progress = Math.min(spentProgress, ordersProgress)
      } else if (nextTier.minSpent != null) {
        progress = spentProgress
      } else if (nextTier.minOrders != null) {
        progress = ordersProgress
      } else {
        progress = 100
      }
    }

    return NextResponse.json({
      enabled: true,
      currentTier: currentTier ? {
        slug: currentTier.slug,
        name: currentTier.name,
        color: currentTier.color,
        benefits: currentTier.benefits,
        discount: currentTier.discount,
      } : null,
      nextTier: nextTier ? {
        slug: nextTier.slug,
        name: nextTier.name,
        color: nextTier.color,
        minSpent: nextTier.minSpent,
        minOrders: nextTier.minOrders,
      } : null,
      progress: Math.round(progress),
      spentToNext: Math.round(spentToNext),
      ordersToNext,
      totalSpent: Math.round(totalSpent),
      totalOrders,
      allTiers: sortedTiers.map(t => ({
        slug: t.slug,
        name: t.name,
        color: t.color,
        minSpent: t.minSpent,
        minOrders: t.minOrders,
      })),
    })
  } catch (error: any) {
    console.error("[Premium Progress API] Error:", error)
    console.error("[Premium Progress API] Error stack:", error?.stack)
    return NextResponse.json(
      { error: "שגיאה בטעינת נתוני מועדון פרימיום", details: error?.message },
      { status: 500 }
    )
  }
}

