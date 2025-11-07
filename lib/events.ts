import { prisma } from "./prisma"
import { sendWebhook } from "./webhooks"

/**
 * יצירת אירוע
 */
export async function createEvent(
  shopId: string,
  type: string,
  payload: any,
  entityType?: string,
  entityId?: string,
  userId?: string
) {
  try {
    // יצירת אירוע במסד הנתונים
    const event = await prisma.shopEvent.create({
      data: {
        shopId,
        type,
        entityType,
        entityId,
        payload,
        userId,
      },
    })

    // שליחת Webhook
    await sendWebhook(shopId, type, payload, entityType, entityId)

    return event
  } catch (error) {
    console.error("Error creating event:", error)
    throw error
  }
}

/**
 * קבלת אירועים
 */
export async function getEvents(
  shopId: string,
  filters?: {
    type?: string
    entityType?: string
    entityId?: string
    limit?: number
  }
) {
  try {
    const where: any = { shopId }

    if (filters?.type) {
      where.type = filters.type
    }

    if (filters?.entityType) {
      where.entityType = filters.entityType
    }

    if (filters?.entityId) {
      where.entityId = filters.entityId
    }

    const events = await prisma.shopEvent.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: filters?.limit || 100,
    })

    return events
  } catch (error) {
    console.error("Error fetching events:", error)
    return []
  }
}

