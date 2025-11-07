import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createNavigationSchema = z.object({
  shopId: z.string(),
  name: z.string().min(2, "שם התפריט חייב להכיל לפחות 2 תווים"),
  location: z.string().min(1, "מיקום התפריט הוא חובה"),
  items: z.any(), // JSON structure for menu items
})

const updateNavigationSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().optional(),
  items: z.any().optional(),
})

// GET - קבלת כל תפריטי הניווט
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const location = searchParams.get("location")

    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    if (location) {
      where.location = location
    }

    const navigations = await prisma.navigation.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(navigations)
  } catch (error) {
    console.error("Error fetching navigations:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת תפריט ניווט חדש
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createNavigationSchema.parse(body)

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // בדיקה אם כבר קיים תפריט במיקום זה
    const existingNavigation = await prisma.navigation.findFirst({
      where: {
        shopId: data.shopId,
        location: data.location,
      },
    })

    if (existingNavigation) {
      return NextResponse.json(
        { error: "תפריט במיקום זה כבר קיים" },
        { status: 400 }
      )
    }

    // יצירת התפריט
    const navigation = await prisma.navigation.create({
      data: {
        shopId: data.shopId,
        name: data.name,
        location: data.location,
        items: data.items || [],
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: navigation.shopId,
        type: "navigation.created",
        entityType: "navigation",
        entityId: navigation.id,
        payload: {
          navigationId: navigation.id,
          name: navigation.name,
          location: navigation.location,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(navigation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating navigation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

