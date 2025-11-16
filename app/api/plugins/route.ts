import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAllPlugins, getPluginBySlug } from "@/lib/plugins/registry"
import { installPlugin, loadActivePlugins } from "@/lib/plugins/loader"

// GET - קבלת כל התוספים הזמינים
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const companyId = session.user.companyId

    // קבלת כל התוספים הזמינים
    const availablePlugins = getAllPlugins()

    // קבלת תוספים מותקנים וגלובליים (כולל תוספים שהסופר אדמין ערך)
    // רק תוספים שהם isInstalled = true
    const installedPlugins = await prisma.plugin.findMany({
      where: {
        isInstalled: true, // רק תוספים מותקנים
        OR: [
          { shopId: shopId || null },
          { companyId: companyId },
          { shopId: null, companyId: null }, // גלובליים - תוספים שהסופר אדמין ערך
        ],
      },
    })

    // קבלת מנויים פעילים
    const activeSubscriptions = await prisma.pluginSubscription.findMany({
      where: {
        companyId,
        status: "ACTIVE",
        isActive: true,
      },
    })

    // מיזוג התוספים עם מצב ההתקנה
    const pluginsWithStatus = availablePlugins.map(plugin => {
      // חיפוש תוסף מותקן - קודם ספציפי לחנות/חברה, אחר כך גלובלי
      const installed = installedPlugins.find(p => p.slug === plugin.slug)
      const subscription = activeSubscriptions.find(s => s.pluginId === installed?.id)
      
      // תמחור - עדיפות לנתונים מהדאטאבייס (אם הסופר אדמין ערך)
      const isFree = installed?.isFree !== undefined ? installed.isFree : (plugin.isFree ?? true)
      const price = installed?.price !== null && installed?.price !== undefined 
        ? installed.price 
        : (plugin.price || null)
      
      return {
        ...plugin,
        id: installed?.id,
        isInstalled: !!installed,
        isActive: installed?.isActive || false,
        config: installed?.config || plugin.defaultConfig || {},
        installedAt: installed?.installedAt,
        // תמחור - עדיפות לנתונים מהדאטאבייס
        isFree: isFree,
        price: price,
        // מנוי
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          monthlyPrice: subscription.monthlyPrice,
          nextBillingDate: subscription.nextBillingDate,
        } : null,
        // metadata (כולל menuItem)
        metadata: plugin.metadata || installed?.metadata || null,
      }
    })

    return NextResponse.json(pluginsWithStatus)
  } catch (error: any) {
    console.error("Error fetching plugins:", error)
    return NextResponse.json(
      { error: "שגיאה בקבלת תוספים", details: error.message },
      { status: 500 }
    )
  }
}

// POST - התקנת תוסף
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const body = await req.json()
    const { slug, shopId } = body

    if (!slug) {
      return NextResponse.json(
        { error: "נא לספק slug של התוסף" },
        { status: 400 }
      )
    }

    // בדיקה שהתוסף קיים
    const pluginDef = getPluginBySlug(slug)
    if (!pluginDef) {
      return NextResponse.json(
        { error: "תוסף לא נמצא" },
        { status: 404 }
      )
    }

    // התקנת התוסף
    const installed = await installPlugin(
      slug,
      shopId || undefined,
      session.user.companyId
    )

    return NextResponse.json({
      success: true,
      plugin: installed,
    })
  } catch (error: any) {
    console.error("Error installing plugin:", error)
    return NextResponse.json(
      { error: "שגיאה בהתקנת תוסף", details: error.message },
      { status: 500 }
    )
  }
}

