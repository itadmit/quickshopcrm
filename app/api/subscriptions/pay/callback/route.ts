import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Callback מ-PayPlus אחרי תשלום מוצלח/כושל
 * הלקוח מופנה לכאן אחרי התשלום
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get("status")
    const companyId = searchParams.get("companyId")
    const plan = searchParams.get("plan")
    const transactionUid = searchParams.get("transaction_uid")
    const paymentUid = searchParams.get("payment_uid")
    const token = searchParams.get("token") || searchParams.get("customer_token")

    console.log("Payment callback received:", {
      status,
      companyId,
      plan,
      transactionUid,
      paymentUid,
      token: token ? "***" + token.slice(-4) : null,
    })

    if (!companyId) {
      return NextResponse.redirect(new URL("/settings?tab=subscription&error=missing_data", req.url))
    }

    if (status === "success") {
      // תשלום הצליח - נעדכן את המנוי
      const now = new Date()
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      // נשלוף את המנוי הקיים כדי לא לדרוס את הטוקן שכבר נשמר ב-webhook
      const existingSubscription = await prisma.subscription.findUnique({
        where: { companyId },
        select: { paymentDetails: true },
      })

      const existingDetails = (existingSubscription?.paymentDetails as any) || {}

      const paymentDetails: any = {
        ...existingDetails, // שומרים על הטוקן שכבר נשמר ב-webhook
        status: "completed",
        transactionUid,
        paymentUid,
        lastPaymentDate: now.toISOString(),
      }

      // אם יש token בפרמטרים (לא צפוי ב-PayPlus, אבל למקרה), נעדכן אותו
      if (token) {
        paymentDetails.recurringToken = token
        paymentDetails.tokenCreatedAt = now.toISOString()
        console.log("📝 Saving recurring token from callback:", "***" + token.slice(-4))
      } else if (existingDetails.recurringToken) {
        console.log("✅ Recurring token already exists (saved via webhook):", "***" + existingDetails.recurringToken.slice(-4))
      }

      await prisma.subscription.update({
        where: { companyId },
        data: {
          plan: plan as any,
          status: "ACTIVE",
          subscriptionStartDate: now,
          subscriptionEndDate: nextMonth,
          nextBillingDate: nextMonth,
          paymentMethod: "PayPlus",
          paymentDetails,
          lastPaymentDate: now,
          lastPaymentAmount: plan === "BRANDING" ? 352.82 : 470.82, // כולל מע"מ
        },
      })

      console.log("Subscription activated successfully for company:", companyId)

      // הפניה לעמוד הצלחה
      return NextResponse.redirect(
        new URL("/settings?tab=subscription&success=payment_completed", req.url)
      )
    } else {
      // תשלום נכשל
      await prisma.subscription.update({
        where: { companyId },
        data: {
          paymentDetails: {
            status: "failed",
            lastAttempt: new Date().toISOString(),
          },
        },
      })

      console.log("Payment failed for company:", companyId)

      // הפניה לעמוד כישלון
      return NextResponse.redirect(
        new URL("/settings?tab=subscription&error=payment_failed", req.url)
      )
    }
  } catch (error) {
    console.error("Error in payment callback:", error)
    return NextResponse.redirect(
      new URL("/settings?tab=subscription&error=callback_error", req.url)
    )
  }
}

