import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - קבלת פיקסל ספציפי
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const pixel = await prisma.trackingPixel.findUnique({
      where: { id: params.id },
      include: {
        shop: {
          select: { companyId: true },
        },
      },
    })

    if (!pixel) {
      return NextResponse.json({ error: "פיקסל לא נמצא" }, { status: 404 })
    }

    // בדיקה שהמשתמש שייך לחברה של החנות
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { companyId: true },
    })

    if (!user || user.companyId !== pixel.shop.companyId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    return NextResponse.json(pixel)
  } catch (error) {
    console.error("Error fetching tracking pixel:", error)
    return NextResponse.json(
      { error: "שגיאה בטעינת פיקסל" },
      { status: 500 }
    )
  }
}

// PUT - עדכון פיקסל
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const body = await request.json()
    const { platform, pixelId, accessToken, isActive, events } = body

    const pixel = await prisma.trackingPixel.findUnique({
      where: { id: params.id },
      include: {
        shop: {
          select: { companyId: true },
        },
      },
    })

    if (!pixel) {
      return NextResponse.json({ error: "פיקסל לא נמצא" }, { status: 404 })
    }

    // בדיקה שהמשתמש שייך לחברה של החנות
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { companyId: true },
    })

    if (!user || user.companyId !== pixel.shop.companyId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    const updated = await prisma.trackingPixel.update({
      where: { id: params.id },
      data: {
        platform: platform || pixel.platform,
        pixelId: pixelId || pixel.pixelId,
        accessToken: accessToken !== undefined ? accessToken : pixel.accessToken,
        isActive: isActive !== undefined ? isActive : pixel.isActive,
        events: events !== undefined ? events : pixel.events,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating tracking pixel:", error)
    return NextResponse.json(
      { error: "שגיאה בעדכון פיקסל" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת פיקסל
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const pixel = await prisma.trackingPixel.findUnique({
      where: { id: params.id },
      include: {
        shop: {
          select: { companyId: true },
        },
      },
    })

    if (!pixel) {
      return NextResponse.json({ error: "פיקסל לא נמצא" }, { status: 404 })
    }

    // בדיקה שהמשתמש שייך לחברה של החנות
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { companyId: true },
    })

    if (!user || user.companyId !== pixel.shop.companyId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    await prisma.trackingPixel.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting tracking pixel:", error)
    return NextResponse.json(
      { error: "שגיאה במחיקת פיקסל" },
      { status: 500 }
    )
  }
}

