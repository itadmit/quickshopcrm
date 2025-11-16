import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSizeChartSchema = z.object({
  name: z.string().min(1).optional(),
  content: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  displayType: z.enum(["global", "categories", "products"]).optional(),
  categoryIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

// GET - קבלת טבלת מידות ספציפית
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sizeChart = await prisma.sizeChart.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!sizeChart) {
      return NextResponse.json(
        { error: "Size chart not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(sizeChart)
  } catch (error) {
    console.error("Error fetching size chart:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון טבלת מידות
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = updateSizeChartSchema.parse(body)

    // בדיקה שהטבלה קיימת ושייכת לחברה
    const existingSizeChart = await prisma.sizeChart.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingSizeChart) {
      return NextResponse.json(
        { error: "Size chart not found" },
        { status: 404 }
      )
    }

    // בדיקה שיש תוכן או תמונה (אם מעדכנים)
    // אם מעדכנים את content או imageUrl, צריך לוודא שיש לפחות אחד
    const newContent = data.content !== undefined ? (data.content || null) : existingSizeChart.content
    const newImageUrl = data.imageUrl !== undefined ? (data.imageUrl || null) : existingSizeChart.imageUrl
    
    if (!newContent && !newImageUrl) {
      return NextResponse.json(
        { error: "יש להזין תוכן או תמונה" },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.content !== undefined) updateData.content = data.content || null
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null
    if (data.displayType !== undefined) updateData.displayType = data.displayType
    if (data.categoryIds !== undefined) updateData.categoryIds = data.categoryIds
    if (data.productIds !== undefined) updateData.productIds = data.productIds
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const sizeChart = await prisma.sizeChart.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(sizeChart)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating size chart:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת טבלת מידות
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sizeChart = await prisma.sizeChart.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!sizeChart) {
      return NextResponse.json(
        { error: "Size chart not found" },
        { status: 404 }
      )
    }

    await prisma.sizeChart.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Size chart deleted successfully" })
  } catch (error) {
    console.error("Error deleting size chart:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

