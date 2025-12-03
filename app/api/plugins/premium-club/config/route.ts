import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updatePluginConfig } from "@/lib/plugins/loader"

// סימון הראוט כדינמי כדי למנוע ניסיון רינדור סטטי
export const dynamic = 'force-dynamic'

// GET - קבלת הגדרות מועדון פרימיום
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")

    if (!shopId) {
      return NextResponse.json({ error: "shopId נדרש" }, { status: 400 })
    }

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "חנות לא נמצאה" }, { status: 404 })
    }

    // חיפוש התוסף
    const plugin = await prisma.plugin.findFirst({
      where: {
        slug: "premium-club",
        OR: [
          { shopId },
          { companyId: session.user.companyId, shopId: null },
          { shopId: null, companyId: null },
        ],
      },
    })

    if (!plugin) {
      // אם התוסף לא קיים, מחזירים הגדרות ברירת מחדל
      return NextResponse.json({
        config: {
          enabled: false,
          tiers: [],
          benefits: {},
          notifications: {
            tierUpgradeEmail: true,
            tierUpgradeSMS: false,
          },
        },
      })
    }

    return NextResponse.json({
      config: plugin.config || {
        enabled: false,
        tiers: [],
        benefits: {},
        notifications: {
          tierUpgradeEmail: true,
          tierUpgradeSMS: false,
        },
      },
    })
  } catch (error: any) {
    console.error("Error fetching premium club config:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה בקבלת הגדרות מועדון פרימיום",
      },
      { status: 500 }
    )
  }
}

// PUT - עדכון הגדרות מועדון פרימיום
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const body = await req.json()
    const { config, shopId } = body

    if (!shopId) {
      return NextResponse.json({ error: "shopId נדרש" }, { status: 400 })
    }

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "חנות לא נמצאה" }, { status: 404 })
    }

    // עדכון הגדרות התוסף
    await updatePluginConfig("premium-club", config, shopId, session.user.companyId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error updating premium club config:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה בעדכון הגדרות מועדון פרימיום",
      },
      { status: 500 }
    )
  }
}




