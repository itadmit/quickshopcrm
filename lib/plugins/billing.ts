// לוגיקת בילינג ותשלום לתוספים

import { prisma } from "@/lib/prisma"
import {
  getPayPlusCredentials,
  createRecurringPayment,
  createPayPlusProduct,
  searchPayPlusProduct,
  generatePaymentLink,
  deleteRecurringPayment,
  setRecurringPaymentValid,
  getNextMonthDate,
  getEndOfCurrentMonth,
} from "@/lib/payplus"

/**
 * רכישת תוסף בתשלום
 */
export async function subscribeToPlugin(
  companyId: string,
  pluginId: string
): Promise<{ success: boolean; paymentLink?: string; error?: string }> {
  try {
    // 1. בדיקת התוסף
    const plugin = await prisma.plugin.findUnique({
      where: { id: pluginId },
    })

    if (!plugin) {
      return { success: false, error: "תוסף לא נמצא" }
    }

    if (plugin.isFree) {
      return { success: false, error: "תוסף זה חינמי - השתמש ב-installPlugin" }
    }

    if (!plugin.price) {
      return { success: false, error: "מחיר לא הוגדר לתוסף זה" }
    }

    // 2. בדיקה אם כבר יש מנוי פעיל
    const existingSubscription = await prisma.pluginSubscription.findUnique({
      where: {
        companyId_pluginId: { companyId, pluginId },
      },
    })

    if (existingSubscription && existingSubscription.status === "ACTIVE") {
      return { success: false, error: "יש לך כבר מנוי פעיל לתוסף זה" }
    }

    // 3. קבלת פרטי מנוי בסיסי
    const baseSubscription = await prisma.subscription.findUnique({
      where: { companyId },
    })

    if (!baseSubscription || baseSubscription.status !== "ACTIVE") {
      return {
        success: false,
        error: "נדרש מנוי פעיל כדי לרכוש תוספים",
      }
    }

    // 4. קבלת פרטי PayPlus (SaaS mode)
    const payplusCredentials = await getPayPlusCredentials(companyId, true)
    if (!payplusCredentials) {
      return { success: false, error: "הגדרות PayPlus לא נמצאו" }
    }

    // 5. בדיקה אם יש token במנוי הבסיסי
    const paymentDetails = baseSubscription.paymentDetails as any
    const hasToken = paymentDetails?.recurringToken

    // 6. יצירת PluginSubscription
    const pluginSubscription = await prisma.pluginSubscription.upsert({
      where: {
        companyId_pluginId: { companyId, pluginId },
      },
      create: {
        companyId,
        pluginId,
        status: "PENDING",
        monthlyPrice: plugin.price,
      },
      update: {
        status: "PENDING",
        monthlyPrice: plugin.price,
      },
    })

    // 7. אם יש token - יצירת הוראת קבע ישירה
    if (hasToken && paymentDetails.customerUid && paymentDetails.cashierUid) {
      try {
        // יצירת/חיפוש product ב-PayPlus
        const productUid = await getOrCreatePayPlusProduct(
          payplusCredentials,
          plugin.name,
          plugin.price
        )

        // יצירת הוראת קבע
        const recurringResult = await createRecurringPayment(payplusCredentials, {
          customerUid: paymentDetails.customerUid,
          cardToken: paymentDetails.recurringToken,
          cashierUid: paymentDetails.cashierUid,
          currencyCode: "ILS",
          instantFirstPayment: true, // גבייה מידית
          recurringType: 2, // Monthly
          recurringRange: 1, // כל חודש
          numberOfCharges: 0, // ללא הגבלה
          startDate: getNextMonthDate(), // תאריך החודש הבא
          items: [
            {
              productUid: productUid,
              quantity: 1,
              price: Math.round(plugin.price * 100), // באגורות
            },
          ],
          sendCustomerSuccessEmail: true,
          customerFailureEmail: true,
          extraInfo: JSON.stringify({
            type: "plugin_subscription",
            pluginId: pluginId,
            companyId: companyId,
            pluginSubscriptionId: pluginSubscription.id,
          }),
        })

        if (recurringResult.success && recurringResult.data) {
          // עדכון PluginSubscription
          await prisma.pluginSubscription.update({
            where: { id: pluginSubscription.id },
            data: {
              status: "ACTIVE",
              isActive: true,
              recurringPaymentUid: recurringResult.data.uid || recurringResult.data.recurring_uid,
              cardToken: paymentDetails.recurringToken,
              startDate: new Date(),
              nextBillingDate: new Date(getNextMonthDate()),
              paymentMethod: "PayPlus",
              paymentDetails: {
                recurringPaymentUid: recurringResult.data.uid || recurringResult.data.recurring_uid,
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

          return { success: true }
        } else {
          return {
            success: false,
            error: recurringResult.error || "שגיאה ביצירת הוראת קבע",
          }
        }
      } catch (error: any) {
        console.error("Error creating recurring payment:", error)
        return {
          success: false,
          error: error.message || "שגיאה ביצירת הוראת קבע",
        }
      }
    }

    // 8. אם אין token - יצירת payment page
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const paymentResult = await generatePaymentLink(payplusCredentials, {
      amount: plugin.price,
      currencyCode: "ILS",
      chargeMethod: 1, // Charge
      createToken: true, // חשוב! יוצר token
      customerName: baseSubscription.paymentDetails?.customerName as string,
      customerEmail: baseSubscription.paymentDetails?.customerEmail as string,
      items: [
        {
          name: plugin.name,
          quantity: 1,
          price: plugin.price,
          vatType: "0", // VAT included
        },
      ],
      moreInfo: JSON.stringify({
        type: "plugin_subscription",
        pluginId: pluginId,
        companyId: companyId,
        pluginSubscriptionId: pluginSubscription.id,
      }),
      refUrlSuccess: `${baseUrl}/api/plugins/billing/callback?status=success&pluginId=${pluginId}&companyId=${companyId}`,
      refUrlFailure: `${baseUrl}/api/plugins/billing/callback?status=failure&pluginId=${pluginId}&companyId=${companyId}`,
      refUrlCallback: `${baseUrl}/api/plugins/billing/webhook`,
      sendFailureCallback: true,
    })

    if (!paymentResult.success || !paymentResult.data?.payment_page_link) {
      return {
        success: false,
        error: paymentResult.error || "לא ניתן ליצור קישור תשלום",
      }
    }

    return {
      success: true,
      paymentLink: paymentResult.data.payment_page_link,
    }
  } catch (error: any) {
    console.error("Error subscribing to plugin:", error)
    return {
      success: false,
      error: error.message || "שגיאה ברכישת תוסף",
    }
  }
}

/**
 * ביטול מנוי לתוסף
 */
export async function cancelPluginSubscription(
  companyId: string,
  pluginId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscription = await prisma.pluginSubscription.findUnique({
      where: {
        companyId_pluginId: { companyId, pluginId },
      },
    })

    if (!subscription) {
      return { success: false, error: "מנוי לא נמצא" }
    }

    if (subscription.status === "CANCELLED") {
      return { success: false, error: "המנוי כבר בוטל" }
    }

    // ביטול הוראת קבע ב-PayPlus
    if (subscription.recurringPaymentUid) {
      const payplusCredentials = await getPayPlusCredentials(companyId, true)
      if (payplusCredentials) {
        // כיבוי הוראת קבע (לא מחיקה - נשאר פעיל עד סוף החודש)
        await setRecurringPaymentValid(
          payplusCredentials,
          subscription.recurringPaymentUid,
          false
        )
      }
    }

    // עדכון PluginSubscription
    await prisma.pluginSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
        endDate: new Date(getEndOfCurrentMonth()), // נשאר פעיל עד סוף החודש
      },
    })

    // כיבוי התוסף בסוף החודש (או מיד - לפי החלטה)
    // כאן נכבה מיד, אבל אפשר לשנות ל-endDate
    await prisma.plugin.update({
      where: { id: pluginId },
      data: {
        isActive: false,
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error("Error cancelling plugin subscription:", error)
    return {
      success: false,
      error: error.message || "שגיאה בביטול מנוי",
    }
  }
}

/**
 * Helper: יצירת/חיפוש Product ב-PayPlus
 */
export async function getOrCreatePayPlusProduct(
  credentials: any,
  pluginName: string,
  price: number
): Promise<string> {
  // חיפוש product קיים
  const searchResult = await searchPayPlusProduct(credentials, pluginName)
  if (searchResult.success && searchResult.data) {
    return searchResult.data.uid
  }

  // יצירת product חדש
  const createResult = await createPayPlusProduct(credentials, {
    name: pluginName,
    price: Math.round(price * 100), // באגורות
    currencyCode: "ILS",
    vatType: 0, // VAT included
    description: `תוסף: ${pluginName}`,
  })

  if (!createResult.success || !createResult.data?.uid) {
    throw new Error(createResult.error || "Failed to create PayPlus product")
  }

  return createResult.data.uid
}

/**
 * קבלת כל התוספים הפעילים של חברה
 */
export async function getCompanyActivePlugins(companyId: string) {
  return await prisma.pluginSubscription.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      isActive: true,
    },
    include: {
      plugin: true,
    },
  })
}

/**
 * חישוב סכום כולל של כל התוספים
 */
export async function calculateTotalPluginsPrice(companyId: string): Promise<number> {
  const activePlugins = await getCompanyActivePlugins(companyId)
  return activePlugins.reduce((total, sub) => total + sub.monthlyPrice, 0)
}

