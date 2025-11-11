import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { testPayPalConnection } from "@/lib/paypal"

// POST - בדיקת חיבור ל-PayPal
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { clientId, clientSecret, useProduction } = body

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "נא למלא את כל השדות הנדרשים" },
        { status: 400 }
      )
    }

    const testResult = await testPayPalConnection({
      clientId,
      clientSecret,
      useProduction: useProduction || false,
    })

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: "החיבור ל-PayPal תקין!",
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: testResult.error || "שגיאה בבדיקת החיבור",
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error testing PayPal connection:", error)
    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בבדיקת החיבור",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

