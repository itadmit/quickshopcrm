import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generatePaymentLink } from "@/lib/payplus"
import { z } from "zod"

const generateLinkSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  currencyCode: z.enum(["ILS", "USD", "EUR", "GPB"]).optional().default("ILS"),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
})

// POST - יצירת קישור תשלום PayPlus
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { orderId, amount, currencyCode, customerName, customerEmail, customerPhone } = generateLinkSchema.parse(body)

    // קבלת אינטגרציית PayPlus
    const integration = await prisma.integration.findFirst({
      where: {
        companyId: session.user.companyId,
        type: "PAYPLUS",
        isActive: true,
      },
    })

    if (!integration || !integration.apiKey || !integration.apiSecret) {
      return NextResponse.json(
        { error: "אינטגרציית PayPlus לא מוגדרת או לא פעילה" },
        { status: 400 }
      )
    }

    const config = integration.config as any
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // יצירת payment link
    const paymentResult = await generatePaymentLink(
      {
        apiKey: integration.apiKey,
        secretKey: integration.apiSecret,
        paymentPageUid: config.paymentPageUid,
        useProduction: config.useProduction || false,
        terminalUid: "", // לא נדרש ל-payment link
      },
      {
        amount,
        currencyCode: currencyCode || "ILS",
        chargeMethod: 1, // Charge (J4)
        refUrlSuccess: `${baseUrl}/payment/success?orderId=${orderId}`,
        refUrlFailure: `${baseUrl}/payment/failure?orderId=${orderId}`,
        refUrlCallback: `${baseUrl}/api/integrations/payplus/callback`,
        sendFailureCallback: true,
        customerName,
        customerEmail,
        customerPhone,
        moreInfo: `Order ID: ${orderId}`,
      }
    )

    if (!paymentResult.success) {
      return NextResponse.json(
        {
          error: "שגיאה ביצירת קישור תשלום",
          details: paymentResult.error,
        },
        { status: 500 }
      )
    }

    // עדכון ההזמנה עם payment link
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentLink: paymentResult.data?.payment_page_link,
        status: "PENDING",
      },
    })

    return NextResponse.json({
      success: true,
      paymentLink: paymentResult.data?.payment_page_link,
    })
  } catch (error: any) {
    console.error("Error generating PayPlus payment link:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "שגיאה בוולידציה",
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: "שגיאה ביצירת קישור תשלום",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

