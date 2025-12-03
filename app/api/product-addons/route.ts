import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schema validation
const createAddonSchema = z.object({
  shopId: z.string(),
  name: z.string().min(1),
  type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT_INPUT", "CHECKBOX"]),
  required: z.boolean().default(false),
  scope: z.enum(["GLOBAL", "PRODUCT", "CATEGORY"]).default("GLOBAL"),
  productIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  position: z.number().default(0),
  values: z.array(z.object({
    label: z.string(),
    price: z.number(),
    position: z.number().default(0),
  })).optional(),
})

// GET /api/product-addons - Get all product addons for a shop
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get("shopId")
    const productId = searchParams.get("productId")
    const scope = searchParams.get("scope")

    if (!shopId) {
      return NextResponse.json(
        { error: "shopId is required" },
        { status: 400 }
      )
    }

    const where: any = { shopId }
    
    if (scope) {
      where.scope = scope
    }

    // אם יש productId, נחזיר רק addons רלוונטיים למוצר זה
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          categories: {
            select: { categoryId: true },
          },
        },
      })

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        )
      }

      const categoryIds = (product as any).categories.map((pc: any) => pc.categoryId)

      // טען addons רלוונטיים למוצר
      const addons = await prisma.productAddon.findMany({
        where: {
          shopId,
          OR: [
            { scope: "GLOBAL" },
            {
              AND: [
                { scope: "PRODUCT" },
                { productIds: { has: productId } },
              ],
            },
            {
              AND: [
                { scope: "CATEGORY" },
                { categoryIds: { hasSome: categoryIds } },
              ],
            },
          ],
        },
        include: {
          values: {
            orderBy: { position: "asc" },
          },
        },
        orderBy: { position: "asc" },
      })

      return NextResponse.json(addons)
    }

    // טען את כל ה-addons
    const addons = await prisma.productAddon.findMany({
      where,
      include: {
        values: {
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    })

    return NextResponse.json(addons)
  } catch (error) {
    console.error("Error fetching product addons:", error)
    return NextResponse.json(
      { error: "Failed to fetch product addons" },
      { status: 500 }
    )
  }
}

// POST /api/product-addons - Create new product addon
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createAddonSchema.parse(body)

    // Validate scope
    if (data.scope === "PRODUCT" && data.productIds.length === 0) {
      return NextResponse.json(
        { error: "Product scope requires at least one product" },
        { status: 400 }
      )
    }

    if (data.scope === "CATEGORY" && data.categoryIds.length === 0) {
      return NextResponse.json(
        { error: "Category scope requires at least one category" },
        { status: 400 }
      )
    }

    // יצירת addon עם values
    const { values, ...addonData } = data

    const addon = await prisma.productAddon.create({
      data: {
        ...addonData,
        values: values
          ? {
              create: values,
            }
          : undefined,
      },
      include: {
        values: true,
      },
    })

    return NextResponse.json(addon, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating product addon:", error)
    return NextResponse.json(
      { error: "Failed to create product addon" },
      { status: 500 }
    )
  }
}

