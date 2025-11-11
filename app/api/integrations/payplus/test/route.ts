import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { generatePaymentLink } from "@/lib/payplus"

// POST - בדיקת חיבור ל-PayPlus
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
    const { apiKey, secretKey, paymentPageUid, useProduction } = body

    if (!apiKey || !secretKey || !paymentPageUid) {
      return NextResponse.json(
        { error: "נא למלא את כל השדות הנדרשים" },
        { status: 400 }
      )
    }

    // ניסיון ליצור payment link קטן לבדיקה (1 שקל)
    const testResult = await generatePaymentLink(
      {
        apiKey,
        secretKey,
        paymentPageUid,
        useProduction: useProduction || false,
        terminalUid: "", // לא נדרש לבדיקה
      },
      {
        amount: 1,
        currencyCode: "ILS",
        chargeMethod: 1, // Charge
        refUrlSuccess: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/test-payment-success`,
        refUrlFailure: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/test-payment-failure`,
      }
    )

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: "החיבור ל-PayPlus תקין!",
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
    console.error("Error testing PayPlus connection:", error)
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

