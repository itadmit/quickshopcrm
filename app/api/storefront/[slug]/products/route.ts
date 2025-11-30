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
    const collection = searchParams.get("collection") || searchParams.get("category")
    const search = searchParams.get("search")
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const availability = searchParams.get("availability")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    
    // קבלת customerId מ-header או query (אם יש)
    const customerId = req.headers.get("x-customer-id") || searchParams.get("customerId")
    
    // טעינת רמת מועדון פרימיום של הלקוח (אם יש)
    let customerTier: string | null = null
    let hasEarlyAccess = false
    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { premiumClubTier: true },
      })
      customerTier = customer?.premiumClubTier || null
      
      // בדיקת early access
      if (customerTier) {
        const premiumClubPlugin = await prisma.plugin.findFirst({
          where: {
            slug: 'premium-club',
            shopId: shop.id,
            isActive: true,
            isInstalled: true,
          },
          select: { config: true },
        })
        
        if (premiumClubPlugin?.config) {
          const config = premiumClubPlugin.config as any
          if (config.enabled && config.benefits?.earlyAccessToSales) {
            const tier = config.tiers?.find((t: any) => t.slug === customerTier)
            hasEarlyAccess = tier?.benefits?.earlyAccess || false
          }
        }
      }
    }

    const where: any = {
      shopId: shop.id,
      status: "PUBLISHED",
      isHidden: false,
      availability: {
        not: "DISCONTINUED",
      },
    }

    // חיפוש
    const searchConditions: any[] = []
    if (search) {
      searchConditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      })
    }

    // קטגוריה - תמיכה גם ב-ID וגם ב-slug
    if (collection) {
      where.categories = {
        some: {
          OR: [
            { categoryId: collection },
            { category: { slug: collection } },
          ],
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

    // סינון מוצרים בלעדיים - רק אם הלקוח ברמה המתאימה
    if (customerTier) {
      // אם יש מוצרים בלעדיים, נבדוק שהלקוח ברמה המתאימה
      searchConditions.push({
        OR: [
          { exclusiveToTier: { isEmpty: true } }, // מוצרים לא בלעדיים
          { exclusiveToTier: { has: customerTier } }, // מוצרים בלעדיים לרמה של הלקוח
        ],
      })
    } else {
      // אם אין לקוח או אין רמה, נציג רק מוצרים לא בלעדיים
      searchConditions.push({ exclusiveToTier: { isEmpty: true } })
    }

    // שילוב כל התנאים
    if (searchConditions.length > 0) {
      where.AND = searchConditions
    }

    // אם יש קטגוריה, נטען את כל המוצרים ונמיין לפי position
    // אחרת נמיין לפי sortBy הרגיל
    let orderBy: any = {}
    
    if (!collection) {
      orderBy[sortBy] = sortOrder
    }

    // אם יש קטגוריה, נטען את כל המוצרים ונמיין לפי position
    // אחרת נטען עם pagination רגיל
    let allProducts: any[] = []
    let total: number
    
    if (collection) {
      // טעינת כל המוצרים בקטגוריה עם position
      const productsWithPosition = await prisma.product.findMany({
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
          categories: {
            where: {
              OR: [
                { categoryId: collection },
                { category: { slug: collection } },
              ],
            },
            select: {
              position: true,
            },
            take: 1,
          },
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
      })
      
      // מיון לפי position
      allProducts = productsWithPosition.sort((a, b) => {
        const aPosition = a.categories?.[0]?.position ?? 999999
        const bPosition = b.categories?.[0]?.position ?? 999999
        return aPosition - bPosition
      })
      
      total = allProducts.length
      
      // pagination ידני
      allProducts = allProducts.slice((page - 1) * limit, page * limit)
    } else {
      // טעינה רגילה עם pagination
      const result = await Promise.all([
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
      
      allProducts = result[0]
      total = result[1]
    }

    return NextResponse.json({
      products: allProducts,
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

