import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import {
  getCurrentSubscription,
  isSubscriptionActive,
  hasCommerceAccess,
  hasBrandingAccess,
  checkAndUpdateSubscriptionStatus,
  calculateSubscriptionPrice,
} from "@/lib/subscription"
import { z } from "zod"

// GET - קבלת מנוי נוכחי
export async function GET(req: NextRequest) {
  try {
    console.log("GET /api/subscriptions called")
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    })
    console.log("Token:", token ? "exists" : "null")

    if (!token?.companyId) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 }
      )
    }

    const companyId = token.companyId as string

    // בדיקה ועדכון סטטוס אם צריך
    await checkAndUpdateSubscriptionStatus(companyId)

    let subscription = await getCurrentSubscription(companyId)

    // אם אין מנוי, ניצור מנוי נסיון אוטומטית
    if (!subscription) {
      console.log("No subscription found, creating trial subscription")
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

    // חישוב ימים נותרים
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

    const isActive = await isSubscriptionActive(companyId)
    const hasCommerce = await hasCommerceAccess(companyId)
    const hasBranding = await hasBrandingAccess(companyId)

    return NextResponse.json({
      subscription: {
        ...subscription,
        daysRemaining: Math.max(0, daysRemaining),
        isActive,
        hasCommerce,
        hasBranding,
      },
    })
  } catch (error) {
    console.error("Error fetching subscription:", error)
    return NextResponse.json(
      { error: "שגיאה בקבלת מנוי" },
      { status: 500 }
    )
  }
}

// POST - יצירת/הפעלת מנוי
const activateSubscriptionSchema = z.object({
  plan: z.enum(["BRANDING", "QUICK_SHOP"]),
  paymentMethod: z.string(),
  paymentDetails: z.any(),
})

export async function POST(req: NextRequest) {
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

    const companyId = token.companyId as string
    const body = await req.json()
    const { plan, paymentMethod, paymentDetails } = activateSubscriptionSchema.parse(body)

    const subscription = await getCurrentSubscription(companyId)

    if (!subscription) {
      return NextResponse.json(
        { error: "מנוי לא נמצא" },
        { status: 404 }
      )
    }

    // חישוב מחיר
    const pricing = calculateSubscriptionPrice(plan)

    // הפעלת מנוי
    const now = new Date()
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    const updated = await prisma.subscription.update({
      where: { companyId },
      data: {
        plan,
        status: "ACTIVE",
        subscriptionStartDate: now,
        subscriptionEndDate: nextMonth,
        nextBillingDate: nextMonth,
        paymentMethod,
        paymentDetails,
        monthlyPrice: pricing.basePrice,
        transactionFee: plan === "QUICK_SHOP" ? 0.5 : null,
        taxRate: 18,
        lastPaymentDate: now,
        lastPaymentAmount: pricing.total,
      },
    })

    return NextResponse.json({
      message: "מנוי הופעל בהצלחה",
      subscription: updated,
      pricing,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error activating subscription:", error)
    return NextResponse.json(
      { error: "שגיאה בהפעלת מנוי" },
      { status: 500 }
    )
  }
}

