import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentSubscription, calculateSubscriptionPrice } from "@/lib/subscription"
import { z } from "zod"

const paySchema = z.object({
  plan: z.enum(["BRANDING", "QUICK_SHOP"]),
  amount: z.number(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 }
      )
    }

    const companyId = session.user.companyId
    const body = await req.json()
    const { plan, amount } = paySchema.parse(body)

    // בדיקה שיש אינטגרציה עם PayPlus
    const payplusIntegration = await prisma.integration.findFirst({
      where: {
        companyId,
        type: "PAYPLUS",
        isActive: true,
      },
    })

    if (!payplusIntegration) {
      return NextResponse.json(
        { error: "אינטגרציה עם PayPlus לא נמצאה. אנא חבר את PayPlus בהגדרות > אינטגרציות" },
        { status: 400 }
      )
    }

    const subscription = await getCurrentSubscription(companyId)
    if (!subscription) {
      return NextResponse.json(
        { error: "מנוי לא נמצא" },
        { status: 404 }
      )
    }

    // כאן תהיה יצירת תשלום דרך PayPlus API
    // לעת עתה, נשתמש במימוש בסיסי
    // TODO: אינטגרציה מלאה עם PayPlus API

    const pricing = calculateSubscriptionPrice(plan)
    
    // יצירת transaction ID זמני (בפועל זה יבוא מ-PayPlus)
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

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
        paymentMethod: "PayPlus",
        paymentDetails: {
          transactionId,
          integrationId: payplusIntegration.id,
        },
        monthlyPrice: pricing.basePrice,
        transactionFee: plan === "QUICK_SHOP" ? 0.5 : null,
        taxRate: 18,
        lastPaymentDate: now,
        lastPaymentAmount: pricing.total,
      },
    })

    return NextResponse.json({
      message: "תשלום נוצר בהצלחה",
      transactionId,
      subscription: updated,
      // paymentUrl: payplusPaymentUrl, // אם PayPlus מחזיר URL לתשלום
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating payment:", error)
    return NextResponse.json(
      { error: "שגיאה ביצירת תשלום" },
      { status: 500 }
    )
  }
}

