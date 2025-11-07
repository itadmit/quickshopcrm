import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateReturnSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "CANCELLED"]).optional(),
  refundAmount: z.number().optional(),
  refundMethod: z.string().optional(),
  notes: z.string().optional(),
})

// GET - קבלת פרטי החזרה
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const returnRequest = await prisma.return.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        order: {
          include: {
            items: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    if (!returnRequest) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 })
    }

    return NextResponse.json(returnRequest)
  } catch (error) {
    console.error("Error fetching return:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון החזרה
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שההחזרה שייכת לחברה
    const existingReturn = await prisma.return.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingReturn) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateReturnSchema.parse(body)

    // עדכון ההחזרה
    const returnRequest = await prisma.return.update({
      where: { id: params.id },
      data,
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: returnRequest.shopId,
        type: "return.updated",
        entityType: "return",
        entityId: returnRequest.id,
        payload: {
          returnId: returnRequest.id,
          status: returnRequest.status,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(returnRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating return:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת החזרה
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שההחזרה שייכת לחברה
    const returnRequest = await prisma.return.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!returnRequest) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 })
    }

    // מחיקת ההחזרה
    await prisma.return.delete({
      where: { id: params.id },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: returnRequest.shopId,
        type: "return.deleted",
        entityType: "return",
        entityId: params.id,
        payload: {
          returnId: params.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "Return deleted successfully" })
  } catch (error) {
    console.error("Error deleting return:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

