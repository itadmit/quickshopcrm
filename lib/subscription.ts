import { prisma } from "@/lib/prisma"
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client"

/**
 * בדיקה אם מנוי פעיל (TRIAL או ACTIVE)
 */
export async function isSubscriptionActive(companyId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
  })

  if (!subscription) {
    return false
  }

  // בדיקה אם תקופת נסיון עדיין פעילה
  if (subscription.status === "TRIAL") {
    return new Date() <= subscription.trialEndDate
  }

  // בדיקה אם מנוי פעיל
  if (subscription.status === "ACTIVE") {
    if (subscription.subscriptionEndDate) {
      return new Date() <= subscription.subscriptionEndDate
    }
    return true
  }

  return false
}

/**
 * קבלת מנוי נוכחי
 */
export async function getCurrentSubscription(companyId: string) {
  return await prisma.subscription.findUnique({
    where: { companyId },
  })
}

/**
 * בדיקה אם יש גישה לתכונות מסחר (QUICK_SHOP)
 */
export async function hasCommerceAccess(companyId: string): Promise<boolean> {
  const subscription = await getCurrentSubscription(companyId)
  
  if (!subscription) {
    return false
  }

  // בטריאל יש גישה מלאה
  if (subscription.plan === "TRIAL") {
    return isSubscriptionActive(companyId)
  }

  // רק QUICK_SHOP יש גישה לתכונות מסחר
  return subscription.plan === "QUICK_SHOP" && subscription.status === "ACTIVE"
}

/**
 * בדיקה אם יש גישה לתכונות תדמית (BRANDING או QUICK_SHOP)
 */
export async function hasBrandingAccess(companyId: string): Promise<boolean> {
  const subscription = await getCurrentSubscription(companyId)
  
  if (!subscription) {
    return false
  }

  if (!isSubscriptionActive(companyId)) {
    return false
  }

  return subscription.plan === "BRANDING" || subscription.plan === "QUICK_SHOP" || subscription.plan === "TRIAL"
}

/**
 * עדכון סטטוס מנוי - בדיקה אם נגמר
 */
export async function checkAndUpdateSubscriptionStatus(companyId: string) {
  const subscription = await getCurrentSubscription(companyId)
  
  if (!subscription) {
    return null
  }

  const now = new Date()
  let shouldUpdate = false
  let newStatus: SubscriptionStatus = subscription.status

  // בדיקה אם תקופת נסיון נגמרה
  if (subscription.status === "TRIAL" && now > subscription.trialEndDate) {
    newStatus = "EXPIRED"
    shouldUpdate = true
  }

  // בדיקה אם מנוי נגמר
  if (subscription.status === "ACTIVE" && subscription.subscriptionEndDate && now > subscription.subscriptionEndDate) {
    newStatus = "EXPIRED"
    shouldUpdate = true
  }

  if (shouldUpdate) {
    return await prisma.subscription.update({
      where: { companyId },
      data: { status: newStatus },
    })
  }

  return subscription
}

/**
 * חישוב מחיר מנוי כולל מעמ
 */
export function calculateSubscriptionPrice(plan: SubscriptionPlan): {
  basePrice: number
  tax: number
  total: number
} {
  const taxRate = 0.18 // 18% מעמ
  let basePrice = 0

  if (plan === "BRANDING") {
    basePrice = 299
  } else if (plan === "QUICK_SHOP") {
    basePrice = 399
  }

  const tax = basePrice * taxRate
  const total = basePrice + tax

  return { basePrice, tax, total }
}

/**
 * יצירת מנוי חדש לאחר תשלום
 */
export async function activateSubscription(
  companyId: string,
  plan: SubscriptionPlan,
  paymentMethod: string, // PayPlus
  paymentDetails: any // PayPlus transaction details
) {
  const now = new Date()
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  const { basePrice } = calculateSubscriptionPrice(plan)

  return await prisma.subscription.update({
    where: { companyId },
    data: {
      plan,
      status: "ACTIVE",
      subscriptionStartDate: now,
      subscriptionEndDate: nextMonth,
      nextBillingDate: nextMonth,
      paymentMethod,
      paymentDetails,
      monthlyPrice: basePrice,
      transactionFee: plan === "QUICK_SHOP" ? 0.5 : null,
      taxRate: 18,
    },
  })
}

/**
 * חידוש מנוי
 */
export async function renewSubscription(companyId: string, paymentAmount: number) {
  const subscription = await getCurrentSubscription(companyId)
  
  if (!subscription) {
    throw new Error("Subscription not found")
  }

  const now = new Date()
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  return await prisma.subscription.update({
    where: { companyId },
    data: {
      lastPaymentDate: now,
      lastPaymentAmount: paymentAmount,
      subscriptionEndDate: nextMonth,
      nextBillingDate: nextMonth,
    },
  })
}

/**
 * ביטול מנוי
 */
export async function cancelSubscription(companyId: string, reason?: string) {
  return await prisma.subscription.update({
    where: { companyId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: reason || null,
    },
  })
}

