import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createDiscountSchema = z.object({
  shopId: z.string(),
  title: z.string().min(1, "כותרת ההנחה היא חובה"),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "BUY_X_GET_Y", "VOLUME_DISCOUNT", "NTH_ITEM_DISCOUNT", "FREE_GIFT"]),
  value: z.number().min(0, "ערך ההנחה חייב להיות חיובי").optional(),
  buyQuantity: z.number().int().optional(),
  getQuantity: z.number().int().optional(),
  getDiscount: z.number().optional(),
  nthItem: z.number().int().optional(),
  volumeRules: z.any().optional(),
  minOrderAmount: z.number().optional(),
  giftProductId: z.string().optional(),
  giftCondition: z.enum(["MIN_ORDER_AMOUNT", "SPECIFIC_PRODUCT"]).optional(),
  giftConditionProductId: z.string().optional(),
  giftConditionAmount: z.number().optional(),
  giftVariantId: z.string().optional(),
  maxDiscount: z.number().optional(),
  maxUses: z.number().int().optional(),
  usesPerCustomer: z.number().int().default(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  isAutomatic: z.boolean().default(false),
  canCombine: z.boolean().default(false),
  priority: z.number().int().default(0),
  target: z.enum([
    "ALL_PRODUCTS",
    "SPECIFIC_PRODUCTS",
    "SPECIFIC_CATEGORIES",
    "SPECIFIC_COLLECTIONS",
    "EXCLUDE_PRODUCTS",
    "EXCLUDE_CATEGORIES",
    "EXCLUDE_COLLECTIONS",
  ]),
  customerTarget: z.enum([
    "ALL_CUSTOMERS",
    "REGISTERED_CUSTOMERS",
    "SPECIFIC_CUSTOMERS",
    "CUSTOMER_TIERS",
  ]),
  applicableProducts: z.array(z.string()).default([]),
  applicableCategories: z.array(z.string()).default([]),
  applicableCollections: z.array(z.string()).default([]),
  excludedProducts: z.array(z.string()).default([]),
  excludedCategories: z.array(z.string()).default([]),
  excludedCollections: z.array(z.string()).default([]),
  customerTiers: z.array(z.string()).default([]),
  specificCustomers: z.array(z.string()).default([]),
})

// GET - קבלת הנחות
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

    const discounts = await prisma.discount.findMany({
      where,
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json(discounts)
  } catch (error) {
    console.error("Error fetching discounts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת הנחה
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createDiscountSchema.parse(body)

    console.log('🎁 Creating discount:', {
      type: data.type,
      isAutomatic: data.isAutomatic,
      giftProductId: data.giftProductId,
      giftCondition: data.giftCondition,
      giftConditionAmount: data.giftConditionAmount,
    })

    // בדיקה שהחנות שייכת למשתמש
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const discount = await prisma.discount.create({
      data: {
        shopId: data.shopId,
        title: data.title,
        description: data.description,
        type: data.type,
        value: data.value || 0,
        buyQuantity: data.buyQuantity,
        getQuantity: data.getQuantity,
        getDiscount: data.getDiscount,
        nthItem: data.nthItem,
        volumeRules: data.volumeRules,
        minOrderAmount: data.minOrderAmount,
        maxDiscount: data.maxDiscount,
        maxUses: data.maxUses,
        usesPerCustomer: data.usesPerCustomer,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive,
        isAutomatic: data.isAutomatic,
        canCombine: data.canCombine,
        priority: data.priority,
        target: data.target,
        customerTarget: data.customerTarget,
        applicableProducts: data.applicableProducts,
        applicableCategories: data.applicableCategories,
        applicableCollections: data.applicableCollections,
        excludedProducts: data.excludedProducts,
        excludedCategories: data.excludedCategories,
        excludedCollections: data.excludedCollections,
        customerTiers: data.customerTiers,
        specificCustomers: data.specificCustomers,
        giftProductId: data.giftProductId,
        giftCondition: data.giftCondition,
        giftConditionProductId: data.giftConditionProductId,
        giftConditionAmount: data.giftConditionAmount,
        giftVariantId: data.giftVariantId,
      },
    })

    console.log('🎁 Discount created:', {
      id: discount.id,
      type: discount.type,
      isAutomatic: discount.isAutomatic,
      isActive: discount.isActive,
      giftProductId: discount.giftProductId,
      giftCondition: discount.giftCondition,
      giftConditionAmount: discount.giftConditionAmount,
    })

    await prisma.shopEvent.create({
      data: {
        shopId: data.shopId,
        type: "discount.created",
        entityType: "discount",
        entityId: discount.id,
        payload: {
          discountId: discount.id,
          title: discount.title,
          type: discount.type,
          isAutomatic: discount.isAutomatic,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(discount, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error creating discount:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

