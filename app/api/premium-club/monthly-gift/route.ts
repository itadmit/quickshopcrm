import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET - קבלת מתנה חודשית זמינה ללקוח
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { shopId?: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId") || params.shopId
    const customerId = searchParams.get("customerId") || req.headers.get("x-customer-id")

    if (!shopId || !customerId) {
      return NextResponse.json(
        { error: "shopId and customerId are required" },
        { status: 400 }
      )
    }

    // טעינת לקוח ורמת מועדון פרימיום
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        tier: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!customer || customer.tier === "REGULAR") {
      return NextResponse.json(
        { error: "Customer not found or not a premium club member" },
        { status: 404 }
      )
    }

    // טעינת הגדרות מועדון פרימיום
    const premiumClubPlugin = await prisma.plugin.findFirst({
      where: {
        slug: 'premium-club',
        shopId,
        isActive: true,
        isInstalled: true,
      },
      select: { config: true },
    })

    if (!premiumClubPlugin?.config) {
      return NextResponse.json(
        { error: "Premium club plugin not configured" },
        { status: 404 }
      )
    }

    const config = premiumClubPlugin.config as any
    if (!config.enabled || !config.benefits?.monthlyGift) {
      return NextResponse.json(
        { available: false, message: "Monthly gift not enabled" }
      )
    }

    // מציאת הרמה של הלקוח
    const tier = config.tiers?.find((t: any) => t.slug === customer.tier)
    if (!tier?.benefits?.monthlyGift) {
      return NextResponse.json(
        { available: false, message: "Monthly gift not available for this tier" }
      )
    }

    // בדיקה אם הלקוח כבר קיבל מתנה החודש
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const monthlyGiftRecord = await prisma.shopEvent.findFirst({
      where: {
        shopId,
        type: "premium_club.monthly_gift",
        entityType: "customer",
        entityId: customerId,
        createdAt: {
          gte: new Date(currentYear, currentMonth, 1),
          lt: new Date(currentYear, currentMonth + 1, 1),
        },
      },
    })

    if (monthlyGiftRecord) {
      return NextResponse.json({
        available: false,
        message: "Monthly gift already claimed this month",
        claimedAt: monthlyGiftRecord.createdAt,
      })
    }

    // החזרת מידע על המתנה הזמינה
    return NextResponse.json({
      available: true,
      tier: customer.tier,
      gift: tier.benefits.monthlyGift,
    })
  } catch (error) {
    console.error("Error fetching monthly gift:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST - קבלת מתנה חודשית
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { shopId?: string } }
) {
  try {
    const body = await req.json()
    const shopId = body.shopId
    const customerId = body.customerId || req.headers.get("x-customer-id")

    if (!shopId || !customerId) {
      return NextResponse.json(
        { error: "shopId and customerId are required" },
        { status: 400 }
      )
    }

    // טעינת לקוח ורמת מועדון פרימיום
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        tier: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!customer || customer.tier === "REGULAR") {
      return NextResponse.json(
        { error: "Customer not found or not a premium club member" },
        { status: 404 }
      )
    }

    // טעינת הגדרות מועדון פרימיום
    const premiumClubPlugin = await prisma.plugin.findFirst({
      where: {
        slug: 'premium-club',
        shopId,
        isActive: true,
        isInstalled: true,
      },
      select: { config: true },
    })

    if (!premiumClubPlugin?.config) {
      return NextResponse.json(
        { error: "Premium club plugin not configured" },
        { status: 404 }
      )
    }

    const config = premiumClubPlugin.config as any
    if (!config.enabled || !config.benefits?.monthlyGift) {
      return NextResponse.json(
        { error: "Monthly gift not enabled" },
        { status: 400 }
      )
    }

    // מציאת הרמה של הלקוח
    const tier = config.tiers?.find((t: any) => t.slug === customer.tier)
    if (!tier?.benefits?.monthlyGift) {
      return NextResponse.json(
        { error: "Monthly gift not available for this tier" },
        { status: 400 }
      )
    }

    // בדיקה אם הלקוח כבר קיבל מתנה החודש
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const monthlyGiftRecord = await prisma.shopEvent.findFirst({
      where: {
        shopId,
        type: "premium_club.monthly_gift",
        entityType: "customer",
        entityId: customerId,
        createdAt: {
          gte: new Date(currentYear, currentMonth, 1),
          lt: new Date(currentYear, currentMonth + 1, 1),
        },
      },
    })

    if (monthlyGiftRecord) {
      return NextResponse.json(
        { error: "Monthly gift already claimed this month" },
        { status: 400 }
      )
    }

    // יצירת רשומה של קבלת המתנה
    await prisma.shopEvent.create({
      data: {
        shopId,
        type: "premium_club.monthly_gift",
        entityType: "customer",
        entityId: customerId,
        payload: {
          tier: customer.tier,
          gift: tier.benefits.monthlyGift,
        },
      },
    })

    // אם המתנה היא קוד הנחה, ניצור קופון
    let couponCode = null
    if (tier.benefits.monthlyGift.type === 'DISCOUNT_CODE') {
      const discountValue = tier.benefits.monthlyGift.value || 0
      const discountType = tier.benefits.monthlyGift.discountType || 'PERCENTAGE'
      
      // יצירת קופון חד-פעמי ללקוח
      const coupon = await prisma.coupon.create({
        data: {
          shopId,
          code: `MONTHLY-${customerId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
          type: discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED',
          value: discountValue,
          maxUses: 1,
          usedCount: 0,
          isActive: true,
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ימים
        },
      })
      couponCode = coupon.code
    }

    return NextResponse.json({
      success: true,
      gift: tier.benefits.monthlyGift,
      couponCode,
      message: "Monthly gift claimed successfully",
    })
  } catch (error) {
    console.error("Error claiming monthly gift:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

