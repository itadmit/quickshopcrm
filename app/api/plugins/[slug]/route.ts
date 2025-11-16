import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPluginBySlug } from "@/lib/plugins/registry"
import {
  activatePlugin,
  deactivatePlugin,
  uninstallPlugin,
  updatePluginConfig,
} from "@/lib/plugins/loader"

// GET - קבלת פרטי תוסף
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    // קבלת הגדרות התוסף מהרישום
    const pluginDef = getPluginBySlug(params.slug)
    if (!pluginDef) {
      return NextResponse.json(
        { error: "תוסף לא נמצא" },
        { status: 404 }
      )
    }

    // חיפוש תוסף במסד הנתונים (גם גלובלי וגם ספציפי)
    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    
    const plugin = await prisma.plugin.findFirst({
      where: {
        slug: params.slug,
        OR: [
          { shopId: shopId || null },
          { companyId: session.user.companyId },
          { shopId: null, companyId: null }, // גלובליים
        ],
      },
    })

    // אם התוסף לא קיים במסד הנתונים, נשתמש בהגדרה מה-registry
    if (!plugin) {
      return NextResponse.json({
        ...pluginDef,
        id: `builtin-${params.slug}`,
        isInstalled: false,
        isActive: false,
        config: pluginDef.defaultConfig || {},
        definition: pluginDef,
      })
    }

    return NextResponse.json({
      ...plugin,
      definition: pluginDef,
    })
  } catch (error: any) {
    console.error("Error fetching plugin:", error)
    return NextResponse.json(
      { error: "שגיאה בקבלת תוסף", details: error.message },
      { status: 500 }
    )
  }
}

// PUT - עדכון תוסף
export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const body = await req.json()
    const { config } = body
    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId") || undefined

    if (config !== undefined) {
      const updated = await updatePluginConfig(
        params.slug,
        config,
        shopId,
        session.user.companyId
      )
      return NextResponse.json({
        success: true,
        plugin: updated,
      })
    }

    return NextResponse.json(
      { error: "לא הועברו נתונים לעדכון" },
      { status: 400 }
    )
  } catch (error: any) {
    console.error("Error updating plugin:", error)
    return NextResponse.json(
      { error: "שגיאה בעדכון תוסף", details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - הסרת תוסף
export async function DELETE(
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

    await uninstallPlugin(params.slug, shopId, session.user.companyId)

    return NextResponse.json({
      success: true,
      message: "תוסף הוסר בהצלחה",
    })
  } catch (error: any) {
    console.error("Error uninstalling plugin:", error)
    return NextResponse.json(
      { error: "שגיאה בהסרת תוסף", details: error.message },
      { status: 500 }
    )
  }
}

