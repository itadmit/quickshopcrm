import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { subscribeToPlugin } from "@/lib/plugins/billing"
import { getPluginBySlug } from "@/lib/plugins/registry"
import { installPlugin } from "@/lib/plugins/loader"

// POST - רכישת תוסף בתשלום
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId") || undefined

    // חיפוש התוסף - קודם ספציפי, אחר כך גלובלי
    let plugin = await prisma.plugin.findFirst({
      where: {
        slug: params.slug,
        OR: [
          ...(shopId ? [{ shopId }] : []),
          { companyId: session.user.companyId, shopId: null },
          { shopId: null, companyId: null }, // גלובלי
        ],
      },
    })

    // אם התוסף לא נמצא במסד הנתונים, נבדוק ב-registry ונתקין אותו
    if (!plugin) {
      const pluginDef = getPluginBySlug(params.slug)
      if (!pluginDef) {
        return NextResponse.json({ error: "תוסף לא נמצא" }, { status: 404 })
      }

      // התקנת התוסף (אבל לא הפעלה - זה יקרה אחרי התשלום)
      plugin = await installPlugin(
        params.slug,
        shopId || undefined,
        session.user.companyId
      )
    }

    if (plugin.isFree) {
      return NextResponse.json(
        { error: "תוסף זה חינמי - השתמש ב-install" },
        { status: 400 }
      )
    }

    // רכישת התוסף
    const result = await subscribeToPlugin(session.user.companyId, plugin.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "שגיאה ברכישת תוסף" },
        { status: 500 }
      )
    }

    // אם יש paymentLink - מחזירים אותו
    if (result.paymentLink) {
      return NextResponse.json({
        success: true,
        paymentLink: result.paymentLink,
        message: "נא להשלים את התשלום",
      })
    }

    // אם אין paymentLink - התוסף הופעל ישירות (היה token)
    return NextResponse.json({
      success: true,
      message: "התוסף הופעל בהצלחה",
    })
  } catch (error: any) {
    console.error("Error subscribing to plugin:", error)
    return NextResponse.json(
      { error: "שגיאה ברכישת תוסף", details: error.message },
      { status: 500 }
    )
  }
}

