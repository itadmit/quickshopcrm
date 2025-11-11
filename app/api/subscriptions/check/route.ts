import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { getSubscriptionInfo } from "@/lib/subscription-middleware"

// GET - בדיקת סטטוס מנוי (לשימוש בדפים)
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token?.companyId) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 }
      )
    }

    const info = await getSubscriptionInfo(token.companyId as string)

    // אם אין מנוי, נחזיר תשובה עם מנוי ברירת מחדל (TRIAL)
    if (!info) {
      return NextResponse.json({
        subscription: null,
        isActive: false,
        hasCommerce: false,
        hasBranding: false,
        daysRemaining: 0,
        isTrial: false,
        isExpiringSoon: false,
      })
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

