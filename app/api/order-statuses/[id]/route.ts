import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/order-statuses/[id] - קבלת סטטוס ספציפי
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const status = await prisma.orderStatusDefinition.findUnique({
      where: { id: params.id },
    })

    if (!status) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 })
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error("Error fetching order status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH /api/order-statuses/[id] - עדכון סטטוס
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    // בדיקה אם הסטטוס קיים
    const existing = await prisma.orderStatusDefinition.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 })
    }

    // אי אפשר לערוך את ה-key של סטטוס מערכת
    if (existing.isSystem && body.key && body.key !== existing.key) {
      return NextResponse.json(
        { error: "Cannot change key of system status" },
        { status: 400 }
      )
    }

    // עדכון הסטטוס
    const status = await prisma.orderStatusDefinition.update({
      where: { id: params.id },
      data: {
        label: body.label,
        labelEn: body.labelEn,
        color: body.color,
        icon: body.icon,
        description: body.description,
        position: body.position,
        isActive: body.isActive,
        isDefault: body.isDefault,
      },
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error("Error updating order status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/order-statuses/[id] - מחיקת סטטוס
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const status = await prisma.orderStatusDefinition.findUnique({
      where: { id: params.id },
    })

    if (!status) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 })
    }

    // לא ניתן למחוק סטטוס מערכת
    if (status.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system status" },
        { status: 400 }
      )
    }

    // בדיקה אם יש הזמנות עם הסטטוס הזה
    const ordersCount = await prisma.order.count({
      where: {
        shopId: status.shopId,
        status: status.key as any,
      },
    })

    if (ordersCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete status. ${ordersCount} orders are using this status.` },
        { status: 400 }
      )
    }

    // מחיקת הסטטוס
    await prisma.orderStatusDefinition.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting order status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

