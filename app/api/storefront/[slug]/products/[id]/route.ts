import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - קבלת פרטי מוצר לפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    // מציאת החנות - נסה גם אם לא פורסמה (לצורך תצוגה מקדימה)
    const shop = await prisma.shop.findFirst({
      where: {
        OR: [
          { slug: params.slug, isPublished: true },
          { slug: params.slug }
        ]
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // קבלת customerId מ-header (אם יש)
    const customerId = req.headers.get("x-customer-id")
    
    // טעינת רמת מועדון פרימיום של הלקוח (אם יש)
    let customerTier: string | null = null
    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { premiumClubTier: true },
      })
      customerTier = customer?.premiumClubTier || null
    }

    // נסה למצוא את המוצר לפי ID או slug
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shopId: shop.id,
        status: "PUBLISHED",
        isHidden: false,
      },
      include: {
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        tags: true,
        variants: true,
        options: {
          select: {
            id: true,
            name: true,
            type: true,
            values: true,
            position: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
        reviews: {
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
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
      },
    })

    if (!product) {
      // נסה למצוא את המוצר גם אם לא פורסם (לצורך דיבוג)
      const allProducts = await prisma.product.findMany({
        where: {
          OR: [
            { id: params.id },
            { slug: params.id }
          ],
          shopId: shop.id,
        },
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
        },
      })
      // לוג רק בפיתוח
      if (process.env.NODE_ENV === "development") {
        console.log("Product not found. Available products:", allProducts)
      }
      
      return NextResponse.json({ 
        error: "Product not found",
        debug: {
          searchedId: params.id,
          shopSlug: params.slug,
          availableProducts: allProducts
        }
      }, { status: 404 })
    }

    // בדיקת גישה למוצר בלעדי
    if (product.exclusiveToTier && product.exclusiveToTier.length > 0) {
      if (!customerTier || !product.exclusiveToTier.includes(customerTier)) {
        return NextResponse.json(
          { error: "מוצר זה זמין רק לחברי מועדון פרימיום ברמה מתאימה" },
          { status: 403 }
        )
      }
    }

    // החזרת המוצר עם כל הנתונים כולל SEO
    const productResponse = {
      ...product,
      seoTitle: product.seoTitle || product.name,
      seoDescription: product.seoDescription || product.description || null,
    }

    // הוספת cache headers ל-Next.js
    return NextResponse.json(productResponse, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

