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
    let statuses = await prisma.orderStatusDefinition.findMany({
      where: { shopId },
      orderBy: { position: "asc" },
    })

    // אם אין סטטוסים, יצירת סטטוסים ברירת מחדל
    if (statuses.length === 0) {
      const defaultStatuses = [
        { key: "PENDING", label: "ממתין", labelEn: "Pending", color: "#F59E0B", icon: "Clock", position: 0, isSystem: true, isDefault: true },
        { key: "CONFIRMED", label: "מאושר", labelEn: "Confirmed", color: "#3B82F6", icon: "CheckCircle", position: 1, isSystem: true, isDefault: false },
        { key: "PAID", label: "שולם", labelEn: "Paid", color: "#10B981", icon: "CreditCard", position: 2, isSystem: true, isDefault: false },
        { key: "PROCESSING", label: "מעובד", labelEn: "Processing", color: "#8B5CF6", icon: "Package", position: 3, isSystem: true, isDefault: false },
        { key: "SHIPPED", label: "נשלח", labelEn: "Shipped", color: "#06B6D4", icon: "Truck", position: 4, isSystem: true, isDefault: false },
        { key: "DELIVERED", label: "נמסר", labelEn: "Delivered", color: "#059669", icon: "CheckCircle2", position: 5, isSystem: true, isDefault: false },
        { key: "CANCELLED", label: "בוטל", labelEn: "Cancelled", color: "#EF4444", icon: "XCircle", position: 6, isSystem: true, isDefault: false },
        { key: "REFUNDED", label: "הוחזר", labelEn: "Refunded", color: "#6B7280", icon: "RotateCcw", position: 7, isSystem: true, isDefault: false },
      ]

      await Promise.all(
        defaultStatuses.map((status: any) =>
          prisma.orderStatusDefinition.create({
            data: {
              shopId,
              ...status,
            },
          })
        )
      )

      // טעינה מחדש של הסטטוסים
      statuses = await prisma.orderStatusDefinition.findMany({
        where: { shopId },
        orderBy: { position: "asc" },
      })
    }

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

