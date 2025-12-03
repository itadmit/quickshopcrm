import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateStoreCreditSchema = z.object({
  customerId: z.string().optional(),
  amount: z.number().min(0).optional(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
})

// GET - קבלת קרדיט בחנות
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const storeCredit = await prisma.storeCredit.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        customer: true,
      },
    })

    if (!storeCredit) {
      return NextResponse.json({ error: "Store credit not found" }, { status: 404 })
    }

    return NextResponse.json(storeCredit)
  } catch (error) {
    console.error("Error fetching store credit:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון קרדיט בחנות
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingCredit = await prisma.storeCredit.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingCredit) {
      return NextResponse.json({ error: "Store credit not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateStoreCreditSchema.parse(body)

    const storeCredit = await prisma.storeCredit.update({
      where: { id: params.id },
      data: {
        ...(data.customerId && { customerId: data.customerId }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.endDate !== undefined && { expiresAt: data.endDate ? new Date(data.endDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    })

    await prisma.shopEvent.create({
      data: {
        shopId: storeCredit.shopId,
        type: "store_credit.updated",
        entityType: "store_credit",
        entityId: storeCredit.id,
        payload: {
          storeCreditId: storeCredit.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(storeCredit)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating store credit:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת קרדיט בחנות
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const storeCredit = await prisma.storeCredit.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!storeCredit) {
      return NextResponse.json({ error: "Store credit not found" }, { status: 404 })
    }

    await prisma.storeCredit.delete({
      where: { id: params.id },
    })

    await prisma.shopEvent.create({
      data: {
        shopId: storeCredit.shopId,
        type: "store_credit.deleted",
        entityType: "store_credit",
        entityId: storeCredit.id,
        payload: {
          storeCreditId: storeCredit.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting store credit:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

