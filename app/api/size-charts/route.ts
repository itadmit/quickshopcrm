import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSizeChartSchema = z.object({
  shopId: z.string(),
  name: z.string().min(1, "שם טבלת המידות הוא חובה"),
  content: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  displayType: z.enum(["global", "categories", "products"]).default("global"),
  categoryIds: z.array(z.string()).default([]),
  productIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
})

const updateSizeChartSchema = z.object({
  name: z.string().min(1).optional(),
  content: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  displayType: z.enum(["global", "categories", "products"]).optional(),
  categoryIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

// GET - קבלת כל טבלאות המידות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const productId = searchParams.get("productId")
    const categoryId = searchParams.get("categoryId")

    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
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
        { displayType: "global", isActive: true },
        { displayType: "products", productIds: { has: productId }, isActive: true },
        ...(categoryIds.length > 0
          ? [
              {
                displayType: "categories",
                categoryIds: { hasSome: categoryIds },
                isActive: true,
              },
            ]
          : []),
      ]
    } else if (categoryId) {
      where.OR = [
        { displayType: "global", isActive: true },
        { displayType: "categories", categoryIds: { has: categoryId }, isActive: true },
      ]
    }

    const sizeCharts = await prisma.sizeChart.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
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

// POST - יצירת טבלת מידות חדשה
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createSizeChartSchema.parse(body)

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // בדיקה שיש תוכן או תמונה
    if (!data.content && !data.imageUrl) {
      return NextResponse.json(
        { error: "יש להזין תוכן או תמונה" },
        { status: 400 }
      )
    }

    const sizeChart = await prisma.sizeChart.create({
      data: {
        shopId: data.shopId,
        name: data.name,
        content: data.content || null,
        imageUrl: data.imageUrl || null,
        displayType: data.displayType,
        categoryIds: data.categoryIds || [],
        productIds: data.productIds || [],
        isActive: data.isActive,
      },
    })

    return NextResponse.json(sizeChart, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating size chart:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

