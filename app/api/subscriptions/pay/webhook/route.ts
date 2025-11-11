import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Webhook (IPN) מ-PayPlus
 * PayPlus שולח התראה לכאן אחרי כל תשלום מוצלח
 * זה קורה בצד השרת ולא תלוי בדפדפן של המשתמש
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    console.log("PayPlus Webhook received:", JSON.stringify(body, null, 2))

    // PayPlus שולח את הנתונים בפורמט מעט שונה
    const transaction = body.transaction || {}
    const data = body.data || {}
    const cardInfo = data.card_information || {}
    
    const transaction_uid = transaction.uid
    const payment_request_uid = transaction.payment_page_request_uid
    const status_code = transaction.status_code
    const amount = transaction.amount
    const currency_code = transaction.currency
    const more_info = transaction.more_info
    const token = cardInfo.token
    const cashier_uid = data.cashier_uid // שמירת ה-cashier_uid
    const customer_uid = data.customer_uid // שמירת ה-customer_uid
    const customer = {
      uid: data.customer_uid,
      email: data.customer_email,
    }

    console.log("Extracted data:", {
      transaction_uid,
      status_code,
      amount,
      hasToken: !!token,
      token: token ? "***" + token.slice(-4) : null,
      cashier_uid,
      customer_uid,
    })

    // בדיקה שהתשלום הצליח
    if (status_code !== "000") {
      console.log("Payment not successful, status code:", status_code)
      return NextResponse.json({ received: true })
    }

    // פענוח ה-more_info (PayPlus חותך אותו לפעמים, אז ננסה לפי email במקום)
    let paymentData
    try {
      paymentData = JSON.parse(more_info || "{}")
    } catch (parseError) {
      // PayPlus חותך את more_info - זה צפוי, נמשיך עם email
      paymentData = {}
    }

    let { companyId, plan, subscriptionId } = paymentData

    // אם אין companyId/plan, נמצא לפי customer email
    if (!companyId || !plan) {
      // אם אין more_info, ננסה למצוא את ה-company לפי customer email
      if (customer?.email) {
        console.log("📧 Trying to find company by customer email:", customer.email)
        
        const user = await prisma.user.findUnique({
          where: { email: customer.email },
          select: { companyId: true },
        })
        
        if (user?.companyId) {
          console.log("🏢 Found company:", user.companyId)
          
          // שמירת ה-Token
          if (token) {
            const existingSubscription = await prisma.subscription.findUnique({
              where: { companyId: user.companyId },
              select: { paymentDetails: true, plan: true },
            })

            const existingDetails = (existingSubscription?.paymentDetails as any) || {}
            const now = new Date()
            const nextMonth = new Date()
            nextMonth.setMonth(nextMonth.getMonth() + 1)

            await prisma.subscription.update({
              where: { companyId: user.companyId },
              data: {
                status: "ACTIVE",
                subscriptionStartDate: now,
                subscriptionEndDate: nextMonth,
                nextBillingDate: nextMonth,
                paymentMethod: "PayPlus",
                lastPaymentDate: now,
                lastPaymentAmount: amount,
                paymentDetails: {
                  ...existingDetails,
                  status: "completed",
                  recurringToken: token,
                  cashierUid: cashier_uid, // שמירת ה-cashier_uid לשימוש בגבייה החוזרת
                  customerUid: customer_uid, // שמירת ה-customer_uid לשימוש בגבייה החוזרת
                  tokenCreatedAt: now.toISOString(),
                  transactionUid: transaction_uid,
                  paymentRequestUid: payment_request_uid,
                  amount,
                  currencyCode: currency_code,
                  lastPaymentDate: now.toISOString(),
                },
              },
            })
            
            console.log("✅ Recurring token saved for company:", user.companyId, "Token:", "***" + token.slice(-4))
            return NextResponse.json({ 
              received: true,
              message: "Token saved successfully" 
            })
          }
        }
      }
      return NextResponse.json({ received: true })
    }

    // עדכון המנוי
    const now = new Date()
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    // נשלוף את המנוי הקיים כדי לשמור על נתונים קיימים
    const existingSubscription = await prisma.subscription.findUnique({
      where: { companyId },
      select: { paymentDetails: true },
    })

    const existingDetails = (existingSubscription?.paymentDetails as any) || {}

    const updatedPaymentDetails = {
      ...existingDetails,
      status: "completed",
      transactionUid: transaction_uid,
      paymentRequestUid: payment_request_uid,
      lastPaymentDate: now.toISOString(),
      amount,
      currencyCode: currency_code,
    }

    // שמירת ה-token לגבייה חוזרת
    if (token) {
      updatedPaymentDetails.recurringToken = token
      updatedPaymentDetails.cashierUid = cashier_uid // שמירת ה-cashier_uid לשימוש בגבייה החוזרת
      updatedPaymentDetails.customerUid = customer_uid // שמירת ה-customer_uid לשימוש בגבייה החוזרת
      updatedPaymentDetails.tokenCreatedAt = now.toISOString()
      console.log("💳 Recurring token included in update:", "***" + token.slice(-4), "Cashier:", cashier_uid, "Customer:", customer_uid)
    }

    await prisma.subscription.update({
      where: { companyId },
      data: {
        plan,
        status: "ACTIVE",
        subscriptionStartDate: now,
        subscriptionEndDate: nextMonth,
        nextBillingDate: nextMonth,
        paymentMethod: "PayPlus",
        paymentDetails: updatedPaymentDetails,
        lastPaymentDate: now,
        lastPaymentAmount: parseFloat(amount),
      },
    })

    console.log("✅ Subscription updated successfully via webhook for company:", companyId)

    return NextResponse.json({ 
      received: true,
      message: "Webhook processed successfully" 
    })
  } catch (error) {
    console.error("Error processing webhook:", error)
    // חשוב להחזיר 200 גם במקרה של שגיאה כדי ש-PayPlus לא ינסה שוב
    return NextResponse.json({ 
      received: true,
      error: "Internal error" 
    })
  }
}

