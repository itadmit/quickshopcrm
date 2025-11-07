import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSubscriptionInfo } from "@/lib/subscription-middleware"

// GET - בדיקת סטטוס מנוי (לשימוש בדפים)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 }
      )
    }

    const info = await getSubscriptionInfo(session.user.companyId)

    if (!info) {
      return NextResponse.json(
        { error: "מנוי לא נמצא" },
        { status: 404 }
      )
    }

    return NextResponse.json(info)
  } catch (error) {
    console.error("Error checking subscription:", error)
    return NextResponse.json(
      { error: "שגיאה בבדיקת מנוי" },
      { status: 500 }
    )
  }
}

