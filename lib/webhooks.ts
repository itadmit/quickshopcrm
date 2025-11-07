import { prisma } from "./prisma"
import crypto from "crypto"

interface WebhookPayload {
  event: string
  shopId: string
  entityType?: string
  entityId?: string
  data: any
  timestamp: string
}

/**
 * שליחת Webhook לאירוע
 */
export async function sendWebhook(
  shopId: string,
  event: string,
  data: any,
  entityType?: string,
  entityId?: string
) {
  try {
    // מציאת כל ה-Webhooks הפעילים של החנות שמאזינים לאירוע זה
    const webhooks = await prisma.webhook.findMany({
      where: {
        shopId,
        isActive: true,
        events: {
          has: event,
        },
      },
    })

    if (webhooks.length === 0) {
      return
    }

    const payload: WebhookPayload = {
      event,
      shopId,
      entityType,
      entityId,
      data,
      timestamp: new Date().toISOString(),
    }

    // שליחה לכל Webhook
    const promises = webhooks.map(async (webhook) => {
      try {
        const signature = createSignature(JSON.stringify(payload), webhook.secret)
        const startTime = Date.now()

        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event,
            "X-Webhook-Shop-Id": shopId,
          },
          body: JSON.stringify(payload),
        })

        const durationMs = Date.now() - startTime
        let responseBody = null
        try {
          if (response.ok) {
            const text = await response.text()
            responseBody = text ? JSON.parse(text) : null
          }
        } catch (e) {
          // Ignore JSON parse errors
        }

        // שמירת לוג
        await prisma.webhookLog.create({
          data: {
            webhookId: webhook.id,
            eventType: event,
            payload,
            responseCode: response.status,
            responseBody,
            durationMs,
          },
        })

        // עדכון תאריך הפעלה אחרונה
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: { lastTriggeredAt: new Date() },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (error: any) {
        // שמירת לוג שגיאה
        await prisma.webhookLog.create({
          data: {
            webhookId: webhook.id,
            eventType: event,
            payload,
            error: error.message || "Unknown error",
            durationMs: 0,
          },
        })
      }
    })

    await Promise.all(promises)
  } catch (error) {
    console.error("Error sending webhook:", error)
  }
}

/**
 * יצירת חתימה HMAC
 */
function createSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex")
}

/**
 * אימות חתימת Webhook
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createSignature(payload, secret)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

