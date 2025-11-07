import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().optional(),
  comment: z.string().optional(),
  images: z.array(z.string()).optional(),
  isApproved: z.boolean().optional(),
})

// GET - קבלת פרטי ביקורת
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const review = await prisma.review.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    return NextResponse.json(review)
  } catch (error) {
    console.error("Error fetching review:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון ביקורת
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהביקורת שייכת לחברה
    const existingReview = await prisma.review.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateReviewSchema.parse(body)

    // עדכון הביקורת
    const review = await prisma.review.update({
      where: { id: params.id },
      data,
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: review.shopId,
        type: "review.updated",
        entityType: "review",
        entityId: review.id,
        payload: {
          reviewId: review.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(review)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating review:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת ביקורת
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהביקורת שייכת לחברה
    const review = await prisma.review.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // מחיקת הביקורת
    await prisma.review.delete({
      where: { id: params.id },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: review.shopId,
        type: "review.deleted",
        entityType: "review",
        entityId: params.id,
        payload: {
          reviewId: params.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "Review deleted successfully" })
  } catch (error) {
    console.error("Error deleting review:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

