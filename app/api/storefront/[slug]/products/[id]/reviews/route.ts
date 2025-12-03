import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isReviewsPluginActive, getReviewsPluginConfig } from "@/lib/plugins/reviews-helper"

// GET - קבלת ביקורות למוצר
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const rating = searchParams.get("rating") // Optional filter by rating

    // מציאת החנות
    const shop = await prisma.shop.findUnique({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // בדיקה שהמוצר קיים ושייך לחנות - נסה לפי ID או slug
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shopId: shop.id,
        status: "PUBLISHED",
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const where: any = {
      productId: product.id,
      isApproved: true,
    }

    if (rating) {
      where.rating = parseInt(rating)
    }

    const [reviews, total, averageRating] = await Promise.all([
      prisma.review.findMany({
        where,
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          images: true,
          isVerified: true,
          helpfulCount: true,
          createdAt: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({
        where: {
          productId: product.id,
          isApproved: true,
        },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      }),
    ])

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      averageRating: averageRating._avg.rating || 0,
      totalReviews: averageRating._count.rating || 0,
    })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת ביקורת חדשה
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const body = await req.json()
    const { rating, title, comment, images, video, tags, customerId } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      )
    }

    // מציאת החנות
    const shop = await prisma.shop.findUnique({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // בדיקה אם תוסף הביקורות פעיל
    const isActive = await isReviewsPluginActive(shop.id, shop.companyId)
    
    if (!isActive) {
      return NextResponse.json({ error: "Reviews plugin is not active" }, { status: 403 })
    }

    // קבלת הגדרות התוסף
    const config = await getReviewsPluginConfig(shop.id, shop.companyId)

    // בדיקה שהמוצר קיים - נסה לפי ID או slug
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shopId: shop.id,
        status: "PUBLISHED",
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // בדיקת הגדרות התוסף
    const allowVideos = config.allowVideos !== false
    const allowImages = config.allowImages !== false
    const maxImages = config.maxImages || 5
    const maxVideos = config.maxVideos || 1

    // בדיקת מגבלות
    if (video && (!allowVideos)) {
      return NextResponse.json(
        { error: `Maximum ${maxVideos} video${maxVideos > 1 ? 's' : ''} allowed` },
        { status: 400 }
      )
    }

    if (images && images.length > 0 && (!allowImages || images.length > maxImages)) {
      return NextResponse.json(
        { error: `Maximum ${maxImages} image${maxImages > 1 ? 's' : ''} allowed` },
        { status: 400 }
      )
    }

    // אימות רכישה אוטומטי אם מופעל
    let verifiedOrderId: string | null = null
    let isVerified = false

    if (config.verifyPurchase && customerId) {
      const order = await prisma.order.findFirst({
        where: {
          shopId: shop.id,
          customerId: customerId,
          status: {
            in: ["DELIVERED", "SHIPPED"],
          },
          items: {
            some: {
              productId: product.id,
            },
          },
        },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      })

      if (order) {
        verifiedOrderId = order.id
        isVerified = true
      }
    } else if (customerId) {
      // אם אין אימות רכישה אבל יש customerId, נסמן כלקוח רשום
      isVerified = true
    }

    // יצירת ביקורת (ממתינה לאישור אם requireApproval = true)
    const requireApproval = config.requireApproval !== false
    const review = await prisma.review.create({
      data: {
        shopId: shop.id,
        productId: product.id,
        customerId: customerId || null,
        rating,
        title: title || null,
        comment: comment || null,
        images: allowImages ? (images || []) : [],
        isApproved: !requireApproval, // אם לא דורש אישור, מאשרים אוטומטית
        isVerified,
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error("Error creating review:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

