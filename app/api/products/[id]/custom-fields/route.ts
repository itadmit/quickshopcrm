import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const setCustomFieldValueSchema = z.object({
  definitionId: z.string(),
  value: z.string().nullable(),
})

// GET /api/products/[id]/custom-fields - Get all custom field values for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get product with its custom field values
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        customFieldValues: {
          include: {
            definition: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    // Get all applicable definitions for this product
    const categoryIds = (product as any).categories.map((pc: any) => pc.categoryId)
    
    const definitions = await prisma.customFieldDefinition.findMany({
      where: {
        shopId: product.shopId,
        OR: [
          { scope: "GLOBAL" },
          {
            AND: [
              { scope: "CATEGORY" },
              { categoryIds: { hasSome: categoryIds } },
            ],
          },
        ],
      },
      orderBy: { position: "asc" },
    })

    // Merge definitions with values
    const result = definitions.map((def: any) => {
      const value = product.customFieldValues.find((v: any) => v.definitionId === def.id)
      return {
        definition: def,
        value: value?.value || null,
        valueId: value?.id || null,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching product custom fields:", error)
    return NextResponse.json(
      { error: "Failed to fetch product custom fields" },
      { status: 500 }
    )
  }
}

// POST /api/products/[id]/custom-fields - Set custom field value for a product
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = setCustomFieldValueSchema.parse(body)

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    // Verify definition exists
    const definition = await prisma.customFieldDefinition.findUnique({
      where: { id: data.definitionId },
    })

    if (!definition) {
      return NextResponse.json(
        { error: "Custom field definition not found" },
        { status: 404 }
      )
    }

    // Upsert value
    const value = await prisma.customFieldValue.upsert({
      where: {
        productId_definitionId: {
          productId: params.id,
          definitionId: data.definitionId,
        },
      },
      update: {
        value: data.value,
      },
      create: {
        productId: params.id,
        definitionId: data.definitionId,
        value: data.value,
      },
    })

    return NextResponse.json(value)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error setting product custom field:", error)
    return NextResponse.json(
      { error: "Failed to set product custom field" },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id]/custom-fields - Batch update all custom field values for a product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const values = z.array(setCustomFieldValueSchema).parse(body)

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    // Batch upsert all values
    const results = await Promise.all(
      values.map((item: any) =>
        prisma.customFieldValue.upsert({
          where: {
            productId_definitionId: {
              productId: params.id,
              definitionId: item.definitionId,
            },
          },
          update: {
            value: item.value,
          },
          create: {
            productId: params.id,
            definitionId: item.definitionId,
            value: item.value,
          },
        })
      )
    )

    return NextResponse.json(results)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating product custom fields:", error)
    return NextResponse.json(
      { error: "Failed to update product custom fields" },
      { status: 500 }
    )
  }
}

