import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateAddonSchema = z.object({
  name: z.string().min(1).optional(),
  required: z.boolean().optional(),
  scope: z.enum(["GLOBAL", "PRODUCT", "CATEGORY"]).optional(),
  productIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  position: z.number().optional(),
})

// GET /api/product-addons/[id] - Get single addon
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const addon = await prisma.productAddon.findUnique({
      where: { id: params.id },
      include: {
        values: {
          orderBy: { position: "asc" },
        },
        _count: {
          select: { values: true },
        },
      },
    })

    if (!addon) {
      return NextResponse.json(
        { error: "Product addon not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(addon)
  } catch (error) {
    console.error("Error fetching product addon:", error)
    return NextResponse.json(
      { error: "Failed to fetch product addon" },
      { status: 500 }
    )
  }
}

// PUT /api/product-addons/[id] - Update addon
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = updateAddonSchema.parse(body)

    const existing = await prisma.productAddon.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Product addon not found" },
        { status: 404 }
      )
    }

    // Validate scope
    if (data.scope === "PRODUCT" && data.productIds && data.productIds.length === 0) {
      return NextResponse.json(
        { error: "Product scope requires at least one product" },
        { status: 400 }
      )
    }

    if (data.scope === "CATEGORY" && data.categoryIds && data.categoryIds.length === 0) {
      return NextResponse.json(
        { error: "Category scope requires at least one category" },
        { status: 400 }
      )
    }

    const addon = await prisma.productAddon.update({
      where: { id: params.id },
      data,
      include: {
        values: {
          orderBy: { position: "asc" },
        },
      },
    })

    return NextResponse.json(addon)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating product addon:", error)
    return NextResponse.json(
      { error: "Failed to update product addon" },
      { status: 500 }
    )
  }
}

// DELETE /api/product-addons/[id] - Delete addon
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.productAddon.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Product addon not found" },
        { status: 404 }
      )
    }

    await prisma.productAddon.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      message: "Product addon deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting product addon:", error)
    return NextResponse.json(
      { error: "Failed to delete product addon" },
      { status: 500 }
    )
  }
}

