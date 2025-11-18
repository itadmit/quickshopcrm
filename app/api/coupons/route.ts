import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createCouponSchema = z.object({
  shopId: z.string(),
  code: z.string().min(2, "קוד קופון חייב להכיל לפחות 2 תווים").optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "BUY_X_GET_Y", "BUY_X_PAY_Y", "VOLUME_DISCOUNT", "NTH_ITEM_DISCOUNT"]),
  value: z.number().min(0, "ערך הנחה חייב להיות חיובי"),
  buyQuantity: z.number().int().optional(),
  getQuantity: z.number().int().optional(),
  getDiscount: z.number().optional(),
  payQuantity: z.number().int().optional(), // עבור BUY_X_PAY_Y
  payAmount: z.number().min(0).optional(), // עבור BUY_X_PAY_Y: סכום קבוע לשלם
  nthItem: z.number().int().optional(),
  volumeRules: z.any().optional(),
  minOrder: z.number().optional(),
  maxDiscount: z.number().optional(),
  maxUses: z.number().int().optional(),
  usesPerCustomer: z.number().int().default(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  applicableProducts: z.array(z.string()).default([]),
  applicableCategories: z.array(z.string()).default([]),
  applicableCustomers: z.array(z.string()).default([]),
  canCombine: z.boolean().default(false),
  influencerId: z.string().optional(),
  // שדות להפעלת מתנה אוטומטית
  giftProductId: z.string().optional(),
  giftVariantId: z.string().optional(),
  giftCondition: z.enum(["MIN_ORDER_AMOUNT", "SPECIFIC_PRODUCT"]).optional(),
  giftConditionProductId: z.string().optional(),
  giftConditionAmount: z.number().optional(),
  // שדות להפעלת הנחת לקוח רשום
  enableCustomerDiscount: z.boolean().default(false),
  customerDiscountPercent: z.number().min(0).max(100).optional(),
})

// GET - קבלת כל הקופונים
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")

    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    const coupons = await prisma.coupon.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(coupons)
  } catch (error) {
    console.error("Error fetching coupons:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת קופון חדש
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createCouponSchema.parse(body)

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // יצירת קוד אוטומטי אם לא סופק
    let code = data.code
    if (!code) {
      code = `COUPON-${Date.now().toString(36).toUpperCase()}`
    }

    // בדיקה אם קוד כבר קיים
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code },
    })

    if (existingCoupon) {
      return NextResponse.json(
        { error: "קוד קופון זה כבר קיים" },
        { status: 400 }
      )
    }

    // המרת תאריכים
    const couponData: any = {
      shopId: data.shopId,
      code,
      type: data.type,
      value: data.value,
      buyQuantity: data.buyQuantity,
      getQuantity: data.getQuantity,
      getDiscount: data.getDiscount,
      payQuantity: data.payQuantity,
      payAmount: data.payAmount,
      nthItem: data.nthItem,
      volumeRules: data.volumeRules,
      minOrder: data.minOrder,
      maxDiscount: data.maxDiscount,
      maxUses: data.maxUses,
      usesPerCustomer: data.usesPerCustomer,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      isActive: data.isActive,
      applicableProducts: data.applicableProducts || [],
      applicableCategories: data.applicableCategories || [],
      applicableCustomers: data.applicableCustomers || [],
      canCombine: data.canCombine,
      influencerId: data.influencerId || null,
      // שדות להפעלת מתנה אוטומטית
      giftProductId: data.giftProductId || null,
      giftVariantId: data.giftVariantId || null,
      giftCondition: data.giftCondition || null,
      giftConditionProductId: data.giftConditionProductId || null,
      giftConditionAmount: data.giftConditionAmount || null,
      // שדות להפעלת הנחת לקוח רשום
      enableCustomerDiscount: data.enableCustomerDiscount || false,
      customerDiscountPercent: data.customerDiscountPercent || null,
    }

    const coupon = await prisma.coupon.create({
      data: couponData,
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: coupon.shopId,
        type: "coupon.created",
        entityType: "coupon",
        entityId: coupon.id,
        payload: {
          couponId: coupon.id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(coupon, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating coupon:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

