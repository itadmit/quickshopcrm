import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAllPlugins } from "@/lib/plugins/registry"

export const dynamic = 'force-dynamic'

// GET - קבלת כל התוספים (לסופר אדמין)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    // קבלת תוספים מהדאטאבייס
    const dbPlugins = await prisma.plugin.findMany({
      orderBy: [
        { displayOrder: "asc" },
        { name: "asc" },
      ],
    })

    // קבלת כל התוספים המובנים מה-registry
    const builtInPlugins = getAllPlugins()

    // מיזוג התוספים - אם תוסף קיים בדאטאבייס, נשתמש בו, אחרת נשתמש בהגדרה מה-registry
    const mergedPlugins = builtInPlugins.map(pluginDef => {
      const dbPlugin = dbPlugins.find(p => p.slug === pluginDef.slug)
      
      if (dbPlugin) {
        // אם התוסף קיים בדאטאבייס, נשתמש בו (עם העדכונים מהדאטאבייס)
        return dbPlugin
      } else {
        // אם התוסף לא קיים בדאטאבייס, ניצור אובייקט מההגדרה
        return {
          id: `builtin-${pluginDef.slug}`, // ID זמני
          slug: pluginDef.slug,
          name: pluginDef.name,
          description: pluginDef.description || null,
          icon: pluginDef.icon || null,
          version: pluginDef.version,
          author: pluginDef.author || null,
          type: pluginDef.type,
          category: pluginDef.category,
          isActive: false,
          isInstalled: false,
          isBuiltIn: pluginDef.isBuiltIn || false,
          scriptUrl: pluginDef.scriptUrl || null,
          scriptContent: pluginDef.scriptContent || null,
          injectLocation: pluginDef.injectLocation || null,
          configSchema: null,
          config: pluginDef.defaultConfig || null,
          metadata: pluginDef.metadata || null,
          requirements: pluginDef.requirements || null,
          isFree: pluginDef.isFree ?? true,
          price: pluginDef.price || null,
          currency: "ILS",
          isEditable: true,
          isDeletable: false,
          adminNotes: null,
          displayOrder: 0,
          shopId: null,
          companyId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          installedAt: null,
        }
      }
    })

    // הוספת תוספים מהדאטאבייס שלא מובנים (תוספים מותאמים אישית)
    const customPlugins = dbPlugins.filter(
      p => !builtInPlugins.find(bp => bp.slug === p.slug)
    )

    // שילוב הכל לפי displayOrder
    const allPlugins = [...mergedPlugins, ...customPlugins].sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder
      }
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json(allPlugins)
  } catch (error: any) {
    console.error("Error fetching plugins:", error)
    return NextResponse.json(
      { error: "שגיאה בקבלת תוספים", details: error.message },
      { status: 500 }
    )
  }
}

