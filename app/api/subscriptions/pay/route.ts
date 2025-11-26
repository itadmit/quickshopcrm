import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { getCurrentSubscription, calculateSubscriptionPrice } from "@/lib/subscription"
import { getPayPlusCredentials, generatePaymentLink } from "@/lib/payplus"
import { z } from "zod"

const paySchema = z.object({
  plan: z.enum(["BRANDING", "QUICK_SHOP"]),
  amount: z.number(),
})

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token?.companyId || !token?.email || !token?.name) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 }
      )
    }

    const companyId = token.companyId as string
    const userEmail = token.email as string
    const userName = token.name as string
    const body = await req.json()
    const { plan, amount } = paySchema.parse(body)

    // בדיקה שיש הגדרות PayPlus גלובליות (למנויי SaaS)
    const payplusCredentials = await getPayPlusCredentials(null, true)

    if (!payplusCredentials) {
      return NextResponse.json(
        { error: "מערכת PayPlus לא מוגדרת. אנא פנה למנהל המערכת." },
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

    const pricing = calculateSubscriptionPrice(plan)
    
    // יצירת Payment Link דרך PayPlus
    const { getBaseUrl } = await import('@/lib/utils')
    const baseUrl = getBaseUrl()
    
    console.log("Using base URL for callbacks:", baseUrl)
    
    const paymentResult = await generatePaymentLink(payplusCredentials, {
      amount: pricing.total,
      currencyCode: "ILS",
      chargeMethod: 1, // 1 = Charge (תשלום רגיל), 3 = Recurring Payments (יידרש הגדרות Recurring ב-PayPlus)
      customerName: userName,
      customerEmail: userEmail,
      refUrlSuccess: `${baseUrl}/api/subscriptions/pay/callback?status=success&companyId=${companyId}&plan=${plan}`,
      refUrlFailure: `${baseUrl}/api/subscriptions/pay/callback?status=failure&companyId=${companyId}`,
      refUrlCallback: `${baseUrl}/api/subscriptions/pay/webhook`,
      sendFailureCallback: true,
      items: [
        {
          name: plan === "BRANDING" ? "מסלול תדמית - Quick Shop" : "מסלול קוויק שופ - Quick Shop",
          quantity: 1,
          price: pricing.total, // המחיר כולל מע"מ כבר
          vatType: "0", // VAT included
        },
      ],
      moreInfo: JSON.stringify({
        companyId,
        plan,
        subscriptionId: subscription.id,
        userId: token.sub,
      }),
      createToken: true, // נשמור token לגבייה חוזרת
    })

    if (!paymentResult.success || !paymentResult.data?.payment_page_link) {
      console.error("PayPlus payment link generation failed:", paymentResult.error)
      return NextResponse.json(
        { error: paymentResult.error || "לא ניתן ליצור קישור תשלום" },
        { status: 500 }
      )
    }

    // שמירת פרטי התשלום הממתין
    await prisma.subscription.update({
      where: { companyId },
      data: {
        paymentDetails: {
          status: "pending",
          plan,
          amount: pricing.total,
          paymentLinkCreatedAt: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({
      message: "קישור תשלום נוצר בהצלחה",
      paymentUrl: paymentResult.data.payment_page_link,
      plan,
      amount: pricing.total,
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

