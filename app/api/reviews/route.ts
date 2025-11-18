import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isReviewsPluginActive } from "@/lib/plugins/reviews-helper"

const createReviewSchema = z.object({
  shopId: z.string(),
  productId: z.string(),
  customerId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().optional(),
  comment: z.string().optional(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  isApproved: z.boolean().optional(),
})

// GET - קבלת כל הביקורות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה אם תוסף הביקורות פעיל
    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const isActive = await isReviewsPluginActive(shopId || undefined, session.user.companyId)
    
    if (!isActive) {
      return NextResponse.json({ error: "Reviews plugin is not active" }, { status: 403 })
    }

    const productId = searchParams.get("productId")
    const isApproved = searchParams.get("isApproved")

    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    if (productId) {
      where.productId = productId
    }

    if (isApproved !== null) {
      where.isApproved = isApproved === "true"
    }

    const reviews = await prisma.review.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(reviews)
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת ביקורת חדשה
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createReviewSchema.parse(body)

    // בדיקה אם תוסף הביקורות פעיל
    const isActive = await isReviewsPluginActive(data.shopId, session.user.companyId)
    
    if (!isActive) {
      return NextResponse.json({ error: "Reviews plugin is not active" }, { status: 403 })
    }

    // בדיקה שהחנות והמוצר שייכים לחברה
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        shop: {
          id: data.shopId,
          companyId: session.user.companyId,
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // יצירת הביקורת
    const review = await prisma.review.create({
      data: {
        shopId: data.shopId,
        productId: data.productId,
        customerId: data.customerId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        images: data.images || [],
        videos: data.videos || [],
        tags: data.tags || [],
        isApproved: false, // דורש אישור
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: review.shopId,
        type: "review.created",
        entityType: "review",
        entityId: review.id,
        payload: {
          reviewId: review.id,
          productId: review.productId,
          rating: review.rating,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating review:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

