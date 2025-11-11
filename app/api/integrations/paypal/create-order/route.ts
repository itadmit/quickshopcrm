import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPayPalOrder } from "@/lib/paypal"
import { z } from "zod"

const createOrderSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  currencyCode: z.string().optional().default("ILS"),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
})

// POST - יצירת הזמנה PayPal
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
    const { orderId, amount, currencyCode, customerName, customerEmail } = createOrderSchema.parse(body)

    // קבלת אינטגרציית PayPal
    const integration = await prisma.integration.findFirst({
      where: {
        companyId: session.user.companyId,
        type: "PAYPAL",
        isActive: true,
      },
    })

    if (!integration || !integration.apiKey || !integration.apiSecret) {
      return NextResponse.json(
        { error: "אינטגרציית PayPal לא מוגדרת או לא פעילה" },
        { status: 400 }
      )
    }

    const config = integration.config as any
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // יצירת הזמנה ב-PayPal
    const orderResult = await createPayPalOrder(
      {
        clientId: integration.apiKey,
        clientSecret: integration.apiSecret,
        useProduction: config.useProduction || false,
      },
      {
        amount,
        currencyCode: currencyCode || "ILS",
        orderId,
        customerName,
        customerEmail,
        returnUrl: `${baseUrl}/payment/success?orderId=${orderId}`,
        cancelUrl: `${baseUrl}/payment/failure?orderId=${orderId}`,
      }
    )

    if (!orderResult.success) {
      return NextResponse.json(
        {
          error: "שגיאה ביצירת הזמנה PayPal",
          details: orderResult.error,
        },
        { status: 500 }
      )
    }

    // עדכון ההזמנה עם PayPal order ID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentLink: orderResult.data?.approvalUrl,
        paymentTransactionId: orderResult.data?.orderId,
        paymentStatus: "PENDING",
      },
    })

    return NextResponse.json({
      success: true,
      orderId: orderResult.data?.orderId,
      approvalUrl: orderResult.data?.approvalUrl,
    })
  } catch (error: any) {
    console.error("Error creating PayPal order:", error)

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
        error: "שגיאה ביצירת הזמנה PayPal",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

