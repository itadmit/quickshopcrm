import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { loadActivePlugins } from "@/lib/plugins/loader"

export const dynamic = 'force-dynamic'

// GET - קבלת תוספים פעילים
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const companyId = searchParams.get("companyId")

    // טעינת תוספים פעילים
    // אם יש shopId, נטען תוספים של החנות
    // אם יש companyId, נטען תוספים של החברה
    // אחרת, נטען תוספים גלובליים
    const activePlugins = await loadActivePlugins(
      shopId || undefined,
      companyId || undefined
    )

    return NextResponse.json(activePlugins)
  } catch (error: any) {
    console.error("Error fetching active plugins:", error)
    return NextResponse.json(
      { error: "שגיאה בקבלת תוספים פעילים", details: error.message },
      { status: 500 }
    )
  }
}

