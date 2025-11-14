import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateCustomFieldSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  validations: z.any().optional(),
  scope: z.enum(["GLOBAL", "CATEGORY"]).optional(),
  categoryIds: z.array(z.string()).optional(),
  showInStorefront: z.boolean().optional(),
  position: z.number().optional(),
})

// GET /api/custom-fields/[id] - Get single custom field definition
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const definition = await prisma.customFieldDefinition.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { values: true },
        },
      },
    })

    if (!definition) {
      return NextResponse.json(
        { error: "Custom field not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(definition)
  } catch (error) {
    console.error("Error fetching custom field:", error)
    return NextResponse.json(
      { error: "Failed to fetch custom field" },
      { status: 500 }
    )
  }
}

// PUT /api/custom-fields/[id] - Update custom field definition
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = updateCustomFieldSchema.parse(body)

    // Check if definition exists
    const existing = await prisma.customFieldDefinition.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Custom field not found" },
        { status: 404 }
      )
    }

    // Validate categoryIds if scope is CATEGORY
    if (data.scope === "CATEGORY" && data.categoryIds && data.categoryIds.length === 0) {
      return NextResponse.json(
        { error: "Category scope requires at least one category" },
        { status: 400 }
      )
    }

    const definition = await prisma.customFieldDefinition.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(definition)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating custom field:", error)
    return NextResponse.json(
      { error: "Failed to update custom field" },
      { status: 500 }
    )
  }
}

// DELETE /api/custom-fields/[id] - Delete custom field definition
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if definition exists
    const existing = await prisma.customFieldDefinition.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { values: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Custom field not found" },
        { status: 404 }
      )
    }

    // Delete definition (values will be cascade deleted)
    await prisma.customFieldDefinition.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      message: "Custom field deleted successfully",
      deletedValues: existing._count.values,
    })
  } catch (error) {
    console.error("Error deleting custom field:", error)
    return NextResponse.json(
      { error: "Failed to delete custom field" },
      { status: 500 }
    )
  }
}

