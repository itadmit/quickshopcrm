import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET - קבלת טבלאות מידות לפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId")
    const categoryId = searchParams.get("categoryId")

    // מציאת החנות
    let shop
    if (session?.user?.companyId) {
      shop = await prisma.shop.findFirst({
        where: {
          slug: params.slug,
          companyId: session.user.companyId,
        },
      })
    } else {
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

    const where: any = {
      shopId: shop.id,
      isActive: true,
    }

    // אם יש productId או categoryId, נחפש טבלאות מידות רלוונטיות
    if (productId) {
      // קבלת קטגוריות של המוצר
      const productCategories = await prisma.productCategory.findMany({
        where: { productId },
        select: { categoryId: true },
      })
      const categoryIds = productCategories.map((c) => c.categoryId)

      where.OR = [
        { displayType: "global" },
        { displayType: "products", productIds: { has: productId } },
        ...(categoryIds.length > 0
          ? [
              {
                displayType: "categories",
                categoryIds: { hasSome: categoryIds },
              },
            ]
          : []),
      ]
    } else if (categoryId) {
      where.OR = [
        { displayType: "global" },
        { displayType: "categories", categoryIds: { has: categoryId } },
      ]
    } else {
      // אם אין productId או categoryId, נחזיר רק גלובליות
      where.displayType = "global"
    }

    const sizeCharts = await prisma.sizeChart.findMany({
      where,
      select: {
        id: true,
        name: true,
        content: true,
        imageUrl: true,
        displayType: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(sizeCharts)
  } catch (error) {
    console.error("Error fetching size charts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

