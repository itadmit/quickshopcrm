import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isReviewsPluginActive } from "@/lib/plugins/reviews-helper"

// GET - אנליטיקה לביקורות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")

    if (!shopId) {
      return NextResponse.json({ error: "shopId is required" }, { status: 400 })
    }

    // בדיקה אם תוסף הביקורות פעיל
    const isActive = await isReviewsPluginActive(shopId, session.user.companyId)

    if (!isActive) {
      return NextResponse.json({ error: "Reviews plugin is not active" }, { status: 403 })
    }

    // סטטיסטיקות כלליות
    const [
      totalReviews,
      approvedReviews,
      pendingReviews,
      averageRating,
      ratingDistribution,
      reviewsWithMedia,
      verifiedReviews,
      reviewsByMonth,
      topProducts,
      topTags,
    ] = await Promise.all([
      // סך הכל ביקורות
      prisma.review.count({
        where: { shopId },
      }),

      // ביקורות מאושרות
      prisma.review.count({
        where: { shopId, isApproved: true },
      }),

      // ביקורות ממתינות
      prisma.review.count({
        where: { shopId, isApproved: false },
      }),

      // דירוג ממוצע
      prisma.review.aggregate({
        where: { shopId, isApproved: true },
        _avg: { rating: true },
      }),

      // התפלגות דירוגים
      prisma.review.groupBy({
        by: ["rating"],
        where: { shopId, isApproved: true },
        _count: { rating: true },
      }),

      // ביקורות עם מדיה
      prisma.review.count({
        where: {
          shopId,
          isApproved: true,
          images: { isEmpty: false },
        },
      }),

      // ביקורות מאומתות
      prisma.review.count({
        where: { shopId, isApproved: true, isVerified: true },
      }),

      // ביקורות לפי חודש (12 חודשים אחרונים)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as count
        FROM reviews
        WHERE "shopId" = ${shopId}
          AND "isApproved" = true
          AND "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
      `,

      // מוצרים עם הכי הרבה ביקורות
      prisma.review.groupBy({
        by: ["productId"],
        where: { shopId, isApproved: true },
        _count: { productId: true },
        orderBy: { _count: { productId: "desc" } },
        take: 10,
      }),

      // תגיות הכי נפוצות
      prisma.review.findMany({
        where: { shopId, isApproved: true },
        select: { id: true },
      }),
    ])

    // עיבוד תגיות - לא זמין כרגע כי tags לא קיים במודל Review
    const tagCounts: Record<string, number> = {}
    const topTagsArray: Array<{ name: string; count: number }> = []

    // עיבוד מוצרים עם הכי הרבה ביקורות
    const topProductsWithNames = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId || undefined },
          select: { name: true },
        })
        return {
          productId: item.productId,
          productName: product?.name || "Unknown",
          reviewCount: item._count.productId,
        }
      })
    )

    return NextResponse.json({
      totalReviews,
      approvedReviews,
      pendingReviews,
      averageRating: averageRating._avg.rating || 0,
      ratingDistribution: ratingDistribution.map((item: any) => ({
        rating: item.rating,
        count: item._count.rating,
      })),
      reviewsWithMedia,
      verifiedReviews,
      verificationRate: approvedReviews > 0 
        ? (verifiedReviews / approvedReviews) * 100 
        : 0,
      reviewsByMonth: reviewsByMonth,
      topProducts: topProductsWithNames,
      topTags: topTagsArray,
    })
  } catch (error) {
    console.error("Error fetching review analytics:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

