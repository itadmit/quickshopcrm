import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateCouponSchema = z.object({
  code: z.string().min(2).optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "BUY_X_GET_Y", "BUY_X_PAY_Y", "VOLUME_DISCOUNT", "NTH_ITEM_DISCOUNT"]).optional(),
  value: z.number().min(0).optional(),
  buyQuantity: z.number().int().optional(),
  getQuantity: z.number().int().optional(),
  getDiscount: z.number().optional(),
  payQuantity: z.number().int().optional(),
  payAmount: z.number().min(0).optional(),
  nthItem: z.number().int().optional(),
  volumeRules: z.any().optional(),
  minOrder: z.number().optional(),
  maxDiscount: z.number().optional(),
  maxUses: z.number().int().optional(),
  usesPerCustomer: z.number().int().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  applicableProducts: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional(),
  applicableCustomers: z.array(z.string()).optional(),
  canCombine: z.boolean().optional(),
  influencerId: z.string().optional(),
  // שדות להפעלת מתנה אוטומטית
  giftProductId: z.string().optional(),
  giftVariantId: z.string().optional(),
  giftCondition: z.enum(["MIN_ORDER_AMOUNT", "SPECIFIC_PRODUCT"]).optional(),
  giftConditionProductId: z.string().optional(),
  giftConditionAmount: z.number().optional(),
  // שדות להפעלת הנחת לקוח רשום
  enableCustomerDiscount: z.boolean().optional(),
  customerDiscountPercent: z.number().min(0).max(100).optional(),
})

// GET - קבלת פרטי קופון
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
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
    })

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
    }

    return NextResponse.json(coupon)
  } catch (error) {
    console.error("Error fetching coupon:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון קופון
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateCouponSchema.parse(body)

    // אם משנים קוד, בדיקה שהוא לא קיים
    if (data.code && data.code !== coupon.code) {
      const existingCoupon = await prisma.coupon.findUnique({
        where: { code: data.code },
      })

      if (existingCoupon) {
        return NextResponse.json(
          { error: "קוד קופון זה כבר קיים" },
          { status: 400 }
        )
      }
    }

    // המרת תאריכים
    const updateData: any = { ...data }
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null
    }
    if (data.influencerId !== undefined) {
      updateData.influencerId = data.influencerId || null
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id: params.id },
      data: updateData,
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: coupon.shopId,
        type: "coupon.updated",
        entityType: "coupon",
        entityId: coupon.id,
        payload: {
          couponId: coupon.id,
          code: updatedCoupon.code,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(updatedCoupon)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating coupon:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת קופון
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
    }

    await prisma.coupon.delete({
      where: { id: params.id },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: coupon.shopId,
        type: "coupon.deleted",
        entityType: "coupon",
        entityId: coupon.id,
        payload: {
          couponId: coupon.id,
          code: coupon.code,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting coupon:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

