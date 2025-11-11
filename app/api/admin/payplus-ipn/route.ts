import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { getPayPlusCredentials, getPayPlusIPNFull } from "@/lib/payplus"

/**
 * GET - קבלת מידע מלא על תשלום דרך IPN FULL
 * שימושי לדיבוג ולקבלת מידע מלא על transaction
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token || token.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const transactionUid = searchParams.get("transaction_uid")
    const paymentRequestUid = searchParams.get("payment_request_uid")

    if (!transactionUid && !paymentRequestUid) {
      return NextResponse.json(
        { error: "נדרש transaction_uid או payment_request_uid" },
        { status: 400 }
      )
    }

    // קבלת credentials של PayPlus
    const payplusCredentials = await getPayPlusCredentials(null, true)
    if (!payplusCredentials) {
      return NextResponse.json({ error: "PayPlus לא מוגדר" }, { status: 400 })
    }

    // קבלת מידע מלא דרך IPN
    const ipnResult = await getPayPlusIPNFull(payplusCredentials, {
      transactionUid: transactionUid || undefined,
      paymentRequestUid: paymentRequestUid || undefined,
      relatedTransaction: true,
    })

    if (!ipnResult.success) {
      return NextResponse.json(
        { error: ipnResult.error || "שגיאה בקבלת מידע מ-PayPlus" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: ipnResult.data,
    })
  } catch (error) {
    console.error("Error getting PayPlus IPN:", error)
    return NextResponse.json({ error: "שגיאה בקבלת מידע" }, { status: 500 })
  }
}

