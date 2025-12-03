import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isReviewsPluginActive } from "@/lib/plugins/reviews-helper"

const verifyPurchaseSchema = z.object({
  reviewId: z.string(),
  customerId: z.string(),
  productId: z.string(),
})

// POST - אימות רכישה אוטומטי
// בודק אם הלקוח קנה את המוצר ומעדכן את הביקורת
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = verifyPurchaseSchema.parse(body)

    // מציאת הביקורת
    const review = await prisma.review.findUnique({
      where: { id: data.reviewId },
      include: {
        shop: {
          select: { companyId: true },
        },
      },
    })

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // בדיקה אם תוסף הביקורות פעיל
    const isActive = await isReviewsPluginActive(
      review.shopId,
      review.shop.companyId
    )

    if (!isActive) {
      return NextResponse.json({ error: "Reviews plugin is not active" }, { status: 403 })
    }

    // בדיקה אם הלקוח קנה את המוצר
    const order = await prisma.order.findFirst({
      where: {
        shopId: review.shopId,
        customerId: data.customerId,
        status: {
          in: ["DELIVERED", "SHIPPED"], // רק הזמנות שהושלמו
        },
        items: {
          some: {
            productId: data.productId,
          },
        },
      },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (!order) {
      return NextResponse.json(
        { verified: false, message: "No purchase found for this product" },
        { status: 200 }
      )
    }

    // עדכון הביקורת עם אימות הרכישה
    await prisma.review.update({
      where: { id: data.reviewId },
      data: {
        isVerified: true,
      },
    })

    return NextResponse.json({
      verified: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      purchasedAt: order.createdAt,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error verifying purchase:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

