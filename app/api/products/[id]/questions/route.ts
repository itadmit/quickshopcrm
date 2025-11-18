import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isReviewsPluginActive } from "@/lib/plugins/reviews-helper"

const createQuestionSchema = z.object({
  question: z.string().min(1).max(500),
  customerId: z.string().optional(),
})

// GET - קבלת שאלות על מוצר
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { shopId: true, shop: { select: { companyId: true } } },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // בדיקה אם תוסף הביקורות פעיל
    const isActive = await isReviewsPluginActive(
      product.shopId,
      product.shop.companyId
    )

    if (!isActive) {
      return NextResponse.json({ error: "Reviews plugin is not active" }, { status: 403 })
    }

    const questions = await prisma.productQuestion.findMany({
      where: {
        productId: params.id,
        isApproved: true, // רק שאלות מאושרות בסטורפרונט
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        answers: {
          where: {
            isApproved: true,
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(questions)
  } catch (error) {
    console.error("Error fetching questions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת שאלה חדשה
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const data = createQuestionSchema.parse(body)

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { shopId: true, shop: { select: { companyId: true } } },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // בדיקה אם תוסף הביקורות פעיל
    const isActive = await isReviewsPluginActive(
      product.shopId,
      product.shop.companyId
    )

    if (!isActive) {
      return NextResponse.json({ error: "Reviews plugin is not active" }, { status: 403 })
    }

    // יצירת השאלה
    const question = await prisma.productQuestion.create({
      data: {
        productId: params.id,
        shopId: product.shopId,
        customerId: data.customerId || null,
        question: data.question,
        isApproved: false, // דורש אישור מנהל
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json(question, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating question:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

