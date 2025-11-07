import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - קבלת כל הפיקסלים של החנות
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get("shopId")

    if (!shopId) {
      return NextResponse.json({ error: "shopId נדרש" }, { status: 400 })
    }

    // בדיקה שהמשתמש שייך לחברה של החנות
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { companyId: true },
    })

    if (!shop) {
      return NextResponse.json({ error: "חנות לא נמצאה" }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { companyId: true },
    })

    if (!user || user.companyId !== shop.companyId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    const pixels = await prisma.trackingPixel.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(pixels)
  } catch (error) {
    console.error("Error fetching tracking pixels:", error)
    return NextResponse.json(
      { error: "שגיאה בטעינת פיקסלים" },
      { status: 500 }
    )
  }
}

// POST - יצירת פיקסל חדש
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const body = await request.json()
    const { shopId, platform, pixelId, accessToken, isActive, events } = body

    if (!shopId || !platform || !pixelId) {
      return NextResponse.json(
        { error: "shopId, platform ו-pixelId נדרשים" },
        { status: 400 }
      )
    }

    // בדיקה שהמשתמש שייך לחברה של החנות
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { companyId: true },
    })

    if (!shop) {
      return NextResponse.json({ error: "חנות לא נמצאה" }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { companyId: true },
    })

    if (!user || user.companyId !== shop.companyId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    // בדיקה שאין כבר פיקסל מאותה פלטפורמה לחנות זו
    const existing = await prisma.trackingPixel.findFirst({
      where: {
        shopId,
        platform,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "קיים כבר פיקסל עבור פלטפורמה זו" },
        { status: 400 }
      )
    }

    const pixel = await prisma.trackingPixel.create({
      data: {
        shopId,
        platform,
        pixelId,
        accessToken: accessToken || null,
        isActive: isActive !== undefined ? isActive : true,
        events: events || [],
      },
    })

    return NextResponse.json(pixel, { status: 201 })
  } catch (error) {
    console.error("Error creating tracking pixel:", error)
    return NextResponse.json(
      { error: "שגיאה ביצירת פיקסל" },
      { status: 500 }
    )
  }
}

