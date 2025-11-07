import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateOptionSchema = z.object({
  name: z.string().min(1).optional(),
  values: z.array(z.string()).optional(),
  position: z.number().int().optional(),
})

// GET - קבלת פרטי אפשרות
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; optionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהאפשרות שייכת למוצר ולחברה
    const option = await prisma.productOption.findFirst({
      where: {
        id: params.optionId,
        product: {
          id: params.id,
          shop: {
            companyId: session.user.companyId,
          },
        },
      },
    })

    if (!option) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 })
    }

    return NextResponse.json(option)
  } catch (error) {
    console.error("Error fetching option:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון אפשרות
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; optionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהאפשרות שייכת למוצר ולחברה
    const existingOption = await prisma.productOption.findFirst({
      where: {
        id: params.optionId,
        product: {
          id: params.id,
          shop: {
            companyId: session.user.companyId,
          },
        },
      },
      include: {
        product: true,
      },
    })

    if (!existingOption) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateOptionSchema.parse(body)

    const option = await prisma.productOption.update({
      where: { id: params.optionId },
      data,
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: existingOption.product.shopId,
        type: "product.option.updated",
        entityType: "product",
        entityId: params.id,
        payload: {
          productId: params.id,
          optionId: option.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(option)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating option:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת אפשרות
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; optionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהאפשרות שייכת למוצר ולחברה
    const option = await prisma.productOption.findFirst({
      where: {
        id: params.optionId,
        product: {
          id: params.id,
          shop: {
            companyId: session.user.companyId,
          },
        },
      },
      include: {
        product: true,
      },
    })

    if (!option) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 })
    }

    await prisma.productOption.delete({
      where: { id: params.optionId },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: option.product.shopId,
        type: "product.option.deleted",
        entityType: "product",
        entityId: params.id,
        payload: {
          productId: params.id,
          optionId: params.optionId,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "Option deleted successfully" })
  } catch (error) {
    console.error("Error deleting option:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

