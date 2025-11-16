import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cancelPluginSubscription } from "@/lib/plugins/billing"
import { prisma } from "@/lib/prisma"

// POST - ביטול מנוי לתוסף
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

    const body = await req.json()
    const { reason } = body

    // חיפוש התוסף - קודם ספציפי, אחר כך גלובלי
    const plugin = await prisma.plugin.findFirst({
      where: {
        slug: params.slug,
        OR: [
          ...(shopId ? [{ shopId }] : []),
          { companyId: session.user.companyId, shopId: null },
          { shopId: null, companyId: null }, // גלובלי
        ],
      },
    })

    if (!plugin) {
      return NextResponse.json({ error: "תוסף לא נמצא" }, { status: 404 })
    }

    const result = await cancelPluginSubscription(
      session.user.companyId,
      plugin.id,
      reason
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "שגיאה בביטול מנוי" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "המנוי בוטל בהצלחה. התוסף יישאר פעיל עד סוף החודש.",
    })
  } catch (error: any) {
    console.error("Error cancelling plugin subscription:", error)
    return NextResponse.json(
      { error: "שגיאה בביטול מנוי", details: error.message },
      { status: 500 }
    )
  }
}

