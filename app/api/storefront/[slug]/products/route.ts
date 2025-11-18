import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - קבלת רשימת מוצרים לפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // אם המשתמש מחובר, נבדוק אם החנות שייכת לחברה שלו
    // זה מאפשר גישה גם לחנות לא מפורסמת אם היא שייכת לחברה שלו
    let shop
    if (session?.user?.companyId) {
      shop = await prisma.shop.findFirst({
        where: {
          slug: params.slug,
          companyId: session.user.companyId,
        },
      })
    } else {
      // אם המשתמש לא מחובר, רק חנויות מפורסמות
      shop = await prisma.shop.findUnique({
        where: {
          slug: params.slug,
          isPublished: true,
        },
      })
    }

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const collection = searchParams.get("collection")
    const search = searchParams.get("search")
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const availability = searchParams.get("availability")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const where: any = {
      shopId: shop.id,
      status: "PUBLISHED",
      availability: {
        not: "DISCONTINUED",
      },
    }

    // חיפוש
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ]
    }

    // קטגוריה (collections)
    if (collection) {
      where.collections = {
        some: {
          collection: {
            slug: collection,
          },
        },
      }
    }

    // סינון לפי מחיר
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) {
        where.price.gte = parseFloat(minPrice)
      }
      if (maxPrice) {
        where.price.lte = parseFloat(maxPrice)
      }
    }

    // סינון לפי זמינות
    if (availability) {
      where.availability = availability
    }

    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          comparePrice: true,
          images: true,
          availability: true,
          inventoryQty: true,
          status: true,
          createdAt: true,
          variants: {
            select: {
              id: true,
              name: true,
              price: true,
              comparePrice: true,
              inventoryQty: true,
              sku: true,
              option1: true,
              option1Value: true,
              option2: true,
              option2Value: true,
              option3: true,
              option3Value: true,
            },
          },
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
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

