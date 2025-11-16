import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { activatePlugin, deactivatePlugin } from "@/lib/plugins/loader"

// POST - הפעלת תוסף
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

    await activatePlugin(params.slug, shopId, session.user.companyId)

    return NextResponse.json({
      success: true,
      message: "תוסף הופעל בהצלחה",
    })
  } catch (error: any) {
    console.error("Error activating plugin:", error)
    return NextResponse.json(
      { error: "שגיאה בהפעלת תוסף", details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - כיבוי תוסף
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

    await deactivatePlugin(params.slug, shopId, session.user.companyId)

    return NextResponse.json({
      success: true,
      message: "תוסף כובה בהצלחה",
    })
  } catch (error: any) {
    console.error("Error deactivating plugin:", error)
    return NextResponse.json(
      { error: "שגיאה בכיבוי תוסף", details: error.message },
      { status: 500 }
    )
  }
}

