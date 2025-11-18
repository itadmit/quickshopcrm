import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPluginBySlug } from "@/lib/plugins/registry"

// GET - קבלת תוסף ספציפי
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    const plugin = await prisma.plugin.findUnique({
      where: { id: params.id },
    })

    if (!plugin) {
      return NextResponse.json({ error: "תוסף לא נמצא" }, { status: 404 })
    }

    return NextResponse.json(plugin)
  } catch (error: any) {
    console.error("Error fetching plugin:", error)
    return NextResponse.json(
      { error: "שגיאה בקבלת תוסף", details: error.message },
      { status: 500 }
    )
  }
}

// PATCH - עדכון תוסף
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, price, isFree, adminNotes, displayOrder } = body

    // אם זה תוסף מובנה שלא קיים במסד הנתונים (ID מתחיל ב-builtin-)
    if (params.id.startsWith('builtin-')) {
      const slug = params.id.replace('builtin-', '')
      const pluginDef = getPluginBySlug(slug)
      
      if (!pluginDef) {
        return NextResponse.json({ error: "תוסף לא נמצא" }, { status: 404 })
      }

      // יצירת התוסף במסד הנתונים
      const created = await prisma.plugin.create({
        data: {
          slug: pluginDef.slug,
          name: name || pluginDef.name,
          description: description !== undefined ? description : (pluginDef.description || null),
          icon: pluginDef.icon || null,
          version: pluginDef.version,
          author: pluginDef.author || null,
          type: pluginDef.type,
          category: pluginDef.category,
          isBuiltIn: pluginDef.isBuiltIn || false,
          isInstalled: false,
          isActive: false,
          scriptUrl: pluginDef.scriptUrl || null,
          scriptContent: pluginDef.scriptContent || null,
          injectLocation: pluginDef.injectLocation || null,
          configSchema: pluginDef.configSchema ? JSON.parse(JSON.stringify(pluginDef.configSchema)) : null,
          config: pluginDef.defaultConfig ? JSON.parse(JSON.stringify(pluginDef.defaultConfig)) : null,
          metadata: pluginDef.metadata ? JSON.parse(JSON.stringify(pluginDef.metadata)) : null,
          requirements: pluginDef.requirements ? JSON.parse(JSON.stringify(pluginDef.requirements)) : null,
          isFree: isFree !== undefined ? isFree : (pluginDef.isFree ?? true),
          price: price !== undefined ? (isFree ? null : price) : (pluginDef.price || null),
          currency: "ILS",
          isEditable: true,
          isDeletable: false,
          adminNotes: adminNotes || null,
          displayOrder: displayOrder !== undefined ? displayOrder : 0,
          shopId: null,
          companyId: null,
        },
      })

      return NextResponse.json({
        success: true,
        plugin: created,
      })
    }

    // בדיקה שהתוסף קיים וניתן לעריכה
    const plugin = await prisma.plugin.findUnique({
      where: { id: params.id },
    })

    if (!plugin) {
      return NextResponse.json({ error: "תוסף לא נמצא" }, { status: 404 })
    }

    if (!plugin.isEditable) {
      return NextResponse.json(
        { error: "תוסף זה לא ניתן לעריכה" },
        { status: 400 }
      )
    }

    // עדכון התוסף
    const updated = await prisma.plugin.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: isFree ? null : price }),
        ...(isFree !== undefined && { isFree }),
        ...(adminNotes !== undefined && { adminNotes }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
    })

    return NextResponse.json({
      success: true,
      plugin: updated,
    })
  } catch (error: any) {
    console.error("Error updating plugin:", error)
    return NextResponse.json(
      { error: "שגיאה בעדכון תוסף", details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת תוסף
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    // בדיקה שהתוסף קיים וניתן למחיקה
    const plugin = await prisma.plugin.findUnique({
      where: { id: params.id },
      include: {
        subscriptions: true,
      },
    })

    if (!plugin) {
      return NextResponse.json({ error: "תוסף לא נמצא" }, { status: 404 })
    }

    if (!plugin.isDeletable) {
      return NextResponse.json(
        { error: "תוסף זה לא ניתן למחיקה" },
        { status: 400 }
      )
    }

    // בדיקה שיש מנויים פעילים
    const activeSubscriptions = plugin.subscriptions.filter(
      (s) => s.status === "ACTIVE" && s.isActive
    )

    if (activeSubscriptions.length > 0) {
      return NextResponse.json(
        {
          error: "לא ניתן למחוק תוסף שיש לו מנויים פעילים",
          activeSubscriptions: activeSubscriptions.length,
        },
        { status: 400 }
      )
    }

    // מחיקת התוסף
    await prisma.plugin.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: "תוסף נמחק בהצלחה",
    })
  } catch (error: any) {
    console.error("Error deleting plugin:", error)
    return NextResponse.json(
      { error: "שגיאה במחיקת תוסף", details: error.message },
      { status: 500 }
    )
  }
}

