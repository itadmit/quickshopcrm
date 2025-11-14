import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - טעינת פריסת דף בית
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { slug } = params

    // מציאת החנות
    const shop = await prisma.shop.findUnique({
      where: { slug },
      select: {
        id: true,
        companyId: true,
        settings: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "חנות לא נמצאה" }, { status: 404 })
    }

    // בדיקת הרשאות - רק אם מחובר
    if (session?.user?.companyId) {
      if (shop.companyId !== session.user.companyId) {
        return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
      }
    }

    // טעינת הגדרות דף בית מ-settings
    const settings = shop.settings as any
    const homePageLayout = settings?.homePageLayout || { sections: [] }

    return NextResponse.json(homePageLayout)
  } catch (error) {
    console.error("Error fetching home page layout:", error)
    return NextResponse.json(
      { error: "שגיאה בטעינת פריסת דף בית" },
      { status: 500 }
    )
  }
}

// POST - שמירת פריסת דף בית
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { slug } = params

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 })
    }

    // מציאת החנות
    const shop = await prisma.shop.findUnique({
      where: { slug },
      select: {
        id: true,
        companyId: true,
        settings: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "חנות לא נמצאה" }, { status: 404 })
    }

    // בדיקת הרשאות
    if (shop.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    const body = await request.json()
    const { sections } = body

    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: "סקשנים לא תקינים" }, { status: 400 })
    }

    // עדכון הגדרות החנות
    const currentSettings = (shop.settings as any) || {}
    const updatedSettings = {
      ...currentSettings,
      homePageLayout: {
        sections,
        updatedAt: new Date().toISOString(),
      },
    }

    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        settings: updatedSettings,
      },
    })

    return NextResponse.json({ success: true, layout: updatedSettings.homePageLayout })
  } catch (error) {
    console.error("Error saving home page layout:", error)
    return NextResponse.json(
      { error: "שגיאה בשמירת פריסת דף בית" },
      { status: 500 }
    )
  }
}

