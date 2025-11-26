import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/order-statuses - קבלת כל הסטטוסים של החנות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // קבלת החנות של המשתמש
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        company: {
          include: {
            shops: {
              take: 1,
            },
          },
        },
      },
    })

    if (!user?.company?.shops?.[0]) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const shopId = user.company.shops[0].id

    // קבלת כל הסטטוסים של החנות
    const statuses = await prisma.orderStatusDefinition.findMany({
      where: { shopId },
      orderBy: { position: "asc" },
    })

    return NextResponse.json(statuses)
  } catch (error) {
    console.error("Error fetching order statuses:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/order-statuses - יצירת סטטוס חדש
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        company: {
          include: {
            shops: {
              take: 1,
            },
          },
        },
      },
    })

    if (!user?.company?.shops?.[0]) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const shopId = user.company.shops[0].id
    const body = await req.json()

    const { key, label, labelEn, color, icon, description, position } = body

    // בדיקה אם הסטטוס כבר קיים
    const existing = await prisma.orderStatusDefinition.findUnique({
      where: {
        shopId_key: {
          shopId,
          key,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Status with this key already exists" },
        { status: 400 }
      )
    }

    // יצירת סטטוס חדש
    const status = await prisma.orderStatusDefinition.create({
      data: {
        shopId,
        key,
        label,
        labelEn,
        color,
        icon,
        description,
        position: position ?? 999,
        isSystem: false,
        isDefault: false,
      },
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error("Error creating order status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

