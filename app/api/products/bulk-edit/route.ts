import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - קבלת מוצרים עם וריאציות לעריכה קבוצתית
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const ids = searchParams.get("ids")?.split(",").filter(Boolean)

    // בניית where clause
    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    if (ids && ids.length > 0) {
      where.id = { in: ids }
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        status: true,
        price: true,
        comparePrice: true,
        cost: true,
        inventoryQty: true,
        availability: true,
        isHidden: true,
        images: true,
        variants: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            comparePrice: true,
            cost: true,
            inventoryQty: true,
            weight: true,
            image: true,
            option1: true,
            option1Value: true,
            option2: true,
            option2Value: true,
            option3: true,
            option3Value: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1000, // הגבלה למניעת עומס
    })

    // המרת הנתונים לפורמט המתאים
    const formattedProducts = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      status: product.status,
      price: product.price,
      comparePrice: product.comparePrice,
      cost: product.cost,
      inventoryQty: product.inventoryQty,
      availability: product.availability,
      isHidden: product.isHidden || false,
      vendor: null, // TODO: להוסיף שדה vendor למוצר אם נדרש
      category: (product as any).categories[0]?.category?.name || null,
      categories: (product as any).categories.map((pc: any) => ({
        categoryId: pc.category.id,
        category: pc.category,
      })), // שמירת הקטגוריות המלאות להשוואה
      images: product.images || [],
      variants: product.variants,
    }))

    return NextResponse.json({
      products: formattedProducts,
    })
  } catch (error: any) {
    console.error("Error fetching products for bulk edit:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    )
  }
}

