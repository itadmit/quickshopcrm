import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  getPayPlusCredentials,
  createRecurringPayment,
  getNextMonthDate,
} from "@/lib/payplus"
import { getOrCreatePayPlusProduct } from "@/lib/plugins/billing"
import crypto from "crypto"

/**
 * Webhook מטיפול בחיובים חוזרים של תוספים
 * PayPlus שולח callback על כל תשלום (מוצלח או נכשל)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const headers = Object.fromEntries(req.headers.entries())

    // בדיקת hash (אבטחה)
    const secretKey = process.env.PAYPLUS_SECRET_KEY // צריך להיות ה-secret key הגלובלי
    if (secretKey) {
      const isValid = validatePayPlusHash(body, headers, secretKey)
      if (!isValid) {
        console.error("Invalid PayPlus hash in webhook")
        return NextResponse.json({ error: "Invalid hash" }, { status: 401 })
      }
    }

    const {
      transaction_uid,
      payment_request_uid,
      amount,
      currency_code,
      status,
      more_info,
      token,
      customer_uid,
      cashier_uid,
    } = body

    // פענוח more_info
    let info: any = {}
    try {
      info = JSON.parse(more_info || "{}")
    } catch (e) {
      // אם more_info לא JSON, זה לא תוסף
      return NextResponse.json({ received: true })
    }

    if (info.type !== "plugin_subscription") {
      // זה לא webhook של תוסף
      return NextResponse.json({ received: true })
    }

    const { pluginId, companyId, pluginSubscriptionId } = info

    if (!pluginId || !companyId) {
      return NextResponse.json({ received: true })
    }

    // מציאת PluginSubscription
    const pluginSubscription = await prisma.pluginSubscription.findUnique({
      where: { id: pluginSubscriptionId },
      include: { plugin: true },
    })

    if (!pluginSubscription) {
      console.error("PluginSubscription not found:", pluginSubscriptionId)
      return NextResponse.json({ received: true })
    }

    if (status === "success") {
      // תשלום הצליח
      const now = new Date()

      // אם יש token אבל אין recurringPaymentUid - צריך ליצור הוראת קבע
      if (token && !pluginSubscription.recurringPaymentUid) {
        const payplusCredentials = await getPayPlusCredentials(companyId, true)
        if (payplusCredentials && customer_uid && cashier_uid) {
          // יצירת product ב-PayPlus
          const productUid = await getOrCreatePayPlusProduct(
            payplusCredentials,
            pluginSubscription.plugin.name,
            pluginSubscription.plugin.price!
          )

          // יצירת הוראת קבע
          const recurringResult = await createRecurringPayment(payplusCredentials, {
            customerUid: customer_uid,
            cardToken: token,
            cashierUid: cashier_uid,
            currencyCode: "ILS",
            instantFirstPayment: true,
            recurringType: 2, // Monthly
            recurringRange: 1,
            numberOfCharges: 0, // ללא הגבלה
            startDate: getNextMonthDate(),
            items: [
              {
                productUid: productUid,
                quantity: 1,
                price: Math.round(pluginSubscription.plugin.price! * 100),
              },
            ],
            sendCustomerSuccessEmail: true,
            customerFailureEmail: true,
            extraInfo: more_info,
          })

          if (recurringResult.success && recurringResult.data) {
            // עדכון PluginSubscription עם recurringPaymentUid
            await prisma.pluginSubscription.update({
              where: { id: pluginSubscription.id },
              data: {
                recurringPaymentUid:
                  recurringResult.data.uid || recurringResult.data.recurring_uid,
                cardToken: token,
              },
            })
          }
        }
      }

      // עדכון תאריך תשלום אחרון
      await prisma.pluginSubscription.update({
        where: { id: pluginSubscription.id },
        data: {
          status: "ACTIVE",
          isActive: true,
          lastPaymentDate: now,
          lastPaymentAmount: parseFloat(amount),
          nextBillingDate: new Date(getNextMonthDate()),
          paymentMethod: "PayPlus",
          paymentDetails: {
            transactionUid: transaction_uid,
            paymentRequestUid: payment_request_uid,
            lastPaymentDate: now.toISOString(),
          },
        },
      })

      // הפעלת התוסף
      await prisma.plugin.update({
        where: { id: pluginId },
        data: {
          isActive: true,
          isInstalled: true,
        },
      })
    } else {
      // תשלום נכשל
      await prisma.pluginSubscription.update({
        where: { id: pluginSubscription.id },
        data: {
          status: "FAILED",
        },
      })

      // כיבוי התוסף
      await prisma.plugin.update({
        where: { id: pluginId },
        data: {
          isActive: false,
        },
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Error processing plugin billing webhook:", error)
    // חשוב להחזיר 200 גם במקרה של שגיאה כדי ש-PayPlus לא ינסה שוב
    return NextResponse.json({ received: true, error: "Internal error" })
  }
}

/**
 * בדיקת hash של PayPlus (אבטחה)
 */
function validatePayPlusHash(body: any, headers: any, secretKey: string): boolean {
  if (headers["user-agent"] !== "PayPlus") {
    return false
  }

  const hash = headers["hash"]
  if (!hash) {
    return false
  }

  const message = JSON.stringify(body)
  const genHash = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("base64")

  return genHash === hash
}


