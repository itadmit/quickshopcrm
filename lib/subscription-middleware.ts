import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { 
  isSubscriptionActive, 
  hasCommerceAccess, 
  hasBrandingAccess,
  checkAndUpdateSubscriptionStatus 
} from "@/lib/subscription"
import { NextResponse } from "next/server"

/**
 * בדיקת מנוי פעיל לפני גישה לדף
 * מחזיר NextResponse עם שגיאה אם אין גישה
 */
export async function checkSubscriptionAccess(
  requireCommerce: boolean = false,
  requireBranding: boolean = false
): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.companyId) {
    return NextResponse.json(
      { error: "לא מאומת" },
      { status: 401 }
    )
  }

  const companyId = session.user.companyId

  // בדיקה ועדכון סטטוס אם צריך
  await checkAndUpdateSubscriptionStatus(companyId)

  const isActive = await isSubscriptionActive(companyId)

  if (!isActive) {
    return NextResponse.json(
      { 
        error: "מנוי לא פעיל",
        message: "המנוי שלך פג תוקף. אנא חידש את המנוי כדי להמשיך להשתמש במערכת.",
        redirectTo: "/settings?tab=subscription"
      },
      { status: 403 }
    )
  }

  // בדיקת גישה לתכונות מסחר
  if (requireCommerce) {
    const hasCommerce = await hasCommerceAccess(companyId)
    if (!hasCommerce) {
      return NextResponse.json(
        { 
          error: "אין גישה לתכונות מסחר",
          message: "תכונות מסחר זמינות רק במסלול קוויק שופ. אנא שדרג את המנוי שלך.",
          redirectTo: "/settings?tab=subscription"
        },
        { status: 403 }
      )
    }
  }

  // בדיקת גישה לתכונות תדמית
  if (requireBranding) {
    const hasBranding = await hasBrandingAccess(companyId)
    if (!hasBranding) {
      return NextResponse.json(
        { 
          error: "אין גישה לתכונות תדמית",
          message: "תכונות תדמית זמינות רק במסלול תדמית או קוויק שופ. אנא שדרג את המנוי שלך.",
          redirectTo: "/settings?tab=subscription"
        },
        { status: 403 }
      )
    }
  }

  return null // הכל תקין
}

/**
 * קבלת מידע על מנוי לצורך תצוגה בדפים
 */
export async function getSubscriptionInfo(companyId: string) {
  const { 
    getCurrentSubscription, 
    isSubscriptionActive, 
    hasCommerceAccess, 
    hasBrandingAccess, 
    checkAndUpdateSubscriptionStatus 
  } = await import("@/lib/subscription")
  const { prisma } = await import("@/lib/prisma")
  
  await checkAndUpdateSubscriptionStatus(companyId)
  
  let subscription = await getCurrentSubscription(companyId)
  
  // אם אין מנוי, ניצור מנוי נסיון אוטומטית
  if (!subscription) {
    console.log("No subscription found in getSubscriptionInfo, creating trial subscription")
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 7)

    subscription = await prisma.subscription.create({
      data: {
        companyId: companyId,
        plan: "TRIAL",
        status: "TRIAL",
        trialStartDate: new Date(),
        trialEndDate: trialEndDate,
      },
    })
    console.log("Trial subscription created:", subscription.id)
  }

  const isActive = await isSubscriptionActive(companyId)
  const hasCommerce = await hasCommerceAccess(companyId)
  const hasBranding = await hasBrandingAccess(companyId)

  const now = new Date()
  let daysRemaining = 0

  if (subscription.status === "TRIAL") {
    daysRemaining = Math.ceil(
      (subscription.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
  } else if (subscription.status === "ACTIVE" && subscription.subscriptionEndDate) {
    daysRemaining = Math.ceil(
      (subscription.subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  return {
    subscription,
    isActive,
    hasCommerce,
    hasBranding,
    daysRemaining: Math.max(0, daysRemaining),
    isTrial: subscription.plan === "TRIAL",
    isExpiringSoon: daysRemaining <= 3 && daysRemaining > 0,
  }
}

