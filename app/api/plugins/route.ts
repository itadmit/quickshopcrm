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
    let availablePlugins = []
    try {
      availablePlugins = getAllPlugins()
    } catch (registryError: any) {
      return NextResponse.json(
        { error: "שגיאה בקבלת תוספים", details: registryError?.message || "שגיאה בטעינת רשימת התוספים" },
        { status: 500 }
      )
    }

    // קבלת תוספים מותקנים וגלובליים (כולל תוספים שהסופר אדמין ערך)
    // רק תוספים שהם isInstalled = true
    let installedPlugins = []
    let activeSubscriptions = []
    
    // ניסיון לגשת למודלים - אם הם לא קיימים, נמשיך עם רשימות ריקות
    // בדיקה שהמודלים קיימים ב-Prisma client
    if (prisma && 'plugin' in prisma && typeof (prisma as any).plugin?.findMany === 'function') {
      try {
        // בניית תנאי החיפוש - תוספים פר חנות או גלובליים
        const whereConditions: any[] = [
          { shopId: null, companyId: null }, // גלובליים - תוספים שהסופר אדמין ערך
        ]
        
        // אם יש shopId, נחפש תוספים ספציפיים לחנות הזו
        if (shopId) {
          whereConditions.unshift({ shopId: shopId }) // תוספים ספציפיים לחנות
        } else {
          // אם אין shopId, נחפש תוספים ברמת החברה
          whereConditions.unshift({ companyId: companyId }) // תוספים ברמת החברה
        }
        
        installedPlugins = await (prisma as any).plugin.findMany({
          where: {
            isInstalled: true, // רק תוספים מותקנים
            OR: whereConditions,
          },
        })
      } catch (pluginError: any) {
        // אם יש שגיאה, נמשיך עם רשימה ריקה
        installedPlugins = []
      }
    }

    if (prisma && 'pluginSubscription' in prisma && typeof (prisma as any).pluginSubscription?.findMany === 'function') {
      try {
        // קבלת מנויים פעילים
        activeSubscriptions = await (prisma as any).pluginSubscription.findMany({
          where: {
            companyId,
            status: "ACTIVE",
            isActive: true,
          },
        })
      } catch (subscriptionError: any) {
        // אם יש שגיאה, נמשיך עם רשימה ריקה
        activeSubscriptions = []
      }
    }

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
    return NextResponse.json(
      { error: "שגיאה בהתקנת תוסף", details: error.message },
      { status: 500 }
    )
  }
}

