import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createValueSchema = z.object({
  label: z.string().min(1),
  price: z.number(),
  position: z.number().default(0),
})

// POST /api/product-addons/[id]/values - Add value to addon
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = createValueSchema.parse(body)

    // Verify addon exists
    const addon = await prisma.productAddon.findUnique({
      where: { id: params.id },
    })

    if (!addon) {
      return NextResponse.json(
        { error: "Product addon not found" },
        { status: 404 }
      )
    }

    const value = await prisma.productAddonValue.create({
      data: {
        ...data,
        addonId: params.id,
      },
    })

    return NextResponse.json(value, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating addon value:", error)
    return NextResponse.json(
      { error: "Failed to create addon value" },
      { status: 500 }
    )
  }
}

// DELETE /api/product-addons/[id]/values/[valueId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const valueId = searchParams.get("valueId")

    if (!valueId) {
      return NextResponse.json(
        { error: "valueId is required" },
        { status: 400 }
      )
    }

    await prisma.productAddonValue.delete({
      where: { id: valueId },
    })

    return NextResponse.json({
      message: "Value deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting addon value:", error)
    return NextResponse.json(
      { error: "Failed to delete addon value" },
      { status: 500 }
    )
  }
}

