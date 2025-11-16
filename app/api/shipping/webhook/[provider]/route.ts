import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getShippingProvider } from "@/lib/shipping/registry"
import { ShippingManager } from "@/lib/shipping/manager"

// POST - Webhook מחברת משלוחים
export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = getShippingProvider(params.provider)
    if (!provider || !provider.processWebhook) {
      return NextResponse.json(
        { error: "Provider לא תומך ב-webhook" },
        { status: 400 }
      )
    }

    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key] = value
    })

    const body = await req.text()
    let payload: any
    try {
      payload = JSON.parse(body)
    } catch {
      // אם לא JSON, ננסה XML או טקסט
      payload = body
    }

    // מציאת כל האינטגרציות של החברה הזו
    const integrations = await prisma.integration.findMany({
      where: {
        type: `${params.provider.toUpperCase()}_SHIPPING` as any,
        isActive: true,
      },
    })

    // עיבוד webhook לכל אינטגרציה
    for (const integration of integrations) {
      try {
        const config = {
          apiKey: integration.apiKey,
          apiSecret: integration.apiSecret,
          ...(integration.config as any),
        }

        const result = await provider.processWebhook!(payload, headers, config)

        if (result.valid && result.orderId) {
          // עדכון סטטוס הזמנה
          await ShippingManager.updateShippingStatus(
            result.orderId,
            result.status || "in_transit",
            {
              trackingNumber: result.trackingNumber,
              webhookData: result.data,
            }
          )
        }
      } catch (error) {
        console.error(`Error processing webhook for integration ${integration.id}:`, error)
        // ממשיכים עם האינטגרציות הבאות
      }
    }

    // תמיד מחזירים 200 (גם אם יש שגיאה)
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Error processing webhook:", error)
    // תמיד מחזירים 200
    return NextResponse.json({ received: true, error: error.message })
  }
}

