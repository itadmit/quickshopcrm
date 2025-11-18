import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isReviewsPluginActive } from "@/lib/plugins/reviews-helper"

const createReplySchema = z.object({
  comment: z.string().min(1).max(1000),
  customerId: z.string().optional(),
})

// GET - קבלת תגובות לביקורת
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const review = await prisma.review.findUnique({
      where: { id: params.id },
      select: { shopId: true },
    })

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // בדיקה אם תוסף הביקורות פעיל
    const session = await getServerSession(authOptions)
    const isActive = await isReviewsPluginActive(
      review.shopId,
      session?.user?.companyId || undefined
    )

    if (!isActive) {
      return NextResponse.json({ error: "Reviews plugin is not active" }, { status: 403 })
    }

    const replies = await prisma.reviewReply.findMany({
      where: {
        reviewId: params.id,
        isApproved: true, // רק תגובות מאושרות בסטורפרונט
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    return NextResponse.json(replies)
  } catch (error) {
    console.error("Error fetching replies:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת תגובה חדשה
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const data = createReplySchema.parse(body)

    // מציאת הביקורת
    const review = await prisma.review.findUnique({
      where: { id: params.id },
      select: { shopId: true, shop: { select: { companyId: true } } },
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

    // בדיקה אם זה בעל חנות או לקוח
    let userId: string | null = null
    let customerId: string | null = null
    let isShopOwner = false

    if (session?.user?.companyId) {
      // בדיקה אם זה בעל חנות
      const shop = await prisma.shop.findFirst({
        where: {
          id: review.shopId,
          companyId: session.user.companyId,
        },
      })

      if (shop) {
        userId = session.user.id
        isShopOwner = true
      }
    }

    if (!isShopOwner && data.customerId) {
      customerId = data.customerId
    }

    if (!userId && !customerId) {
      return NextResponse.json(
        { error: "Must be authenticated as shop owner or customer" },
        { status: 401 }
      )
    }

    // יצירת התגובה
    const reply = await prisma.reviewReply.create({
      data: {
        reviewId: params.id,
        shopId: review.shopId,
        userId: userId || null,
        customerId: customerId || null,
        comment: data.comment,
        isShopOwner,
        isApproved: isShopOwner, // תגובות של בעל חנות מאושרות אוטומטית
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(reply, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating reply:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

