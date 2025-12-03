import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isReviewsPluginActive } from "@/lib/plugins/reviews-helper"

const createAnswerSchema = z.object({
  answer: z.string().min(1).max(1000),
  customerId: z.string().optional(),
})

// GET - קבלת תשובות לשאלה
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: ProductQuestion model not implemented yet
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
  /* try {
    const question = await prisma.productQuestion.findUnique({
      where: { id: params.id },
      select: { shopId: true, shop: { select: { companyId: true } } },
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // בדיקה אם תוסף הביקורות פעיל
    const isActive = await isReviewsPluginActive(
      question.shopId,
      question.shop.companyId
    )

    if (!isActive) {
      return NextResponse.json({ error: "Reviews plugin is not active" }, { status: 403 })
    }

    const answers = await prisma.productAnswer.findMany({
      where: {
        questionId: params.id,
        isApproved: true, // רק תשובות מאושרות בסטורפרונט
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

    return NextResponse.json(answers)
  } catch (error) {
    console.error("Error fetching answers:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת תשובה חדשה
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: ProductQuestion model not implemented yet
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
  /* try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const data = createAnswerSchema.parse(body)

    // מציאת השאלה
    const question = await prisma.productQuestion.findUnique({
      where: { id: params.id },
      select: { shopId: true, shop: { select: { companyId: true } } },
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // בדיקה אם תוסף הביקורות פעיל
    const isActive = await isReviewsPluginActive(
      question.shopId,
      question.shop.companyId
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
          id: question.shopId,
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

    // יצירת התשובה
    const answer = await prisma.productAnswer.create({
      data: {
        questionId: params.id,
        shopId: question.shopId,
        userId: userId || null,
        customerId: customerId || null,
        answer: data.answer,
        isShopOwner,
        isApproved: isShopOwner, // תשובות של בעל חנות מאושרות אוטומטית
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

    return NextResponse.json(answer, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating answer:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} */
}

