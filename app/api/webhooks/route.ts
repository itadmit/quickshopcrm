import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import crypto from "crypto"

const createWebhookSchema = z.object({
  shopId: z.string(),
  url: z.string().url("URL לא תקין"),
  events: z.array(z.string()).min(1, "יש לבחור לפחות אירוע אחד"),
  isActive: z.boolean().default(true),
})

// POST - יצירת Webhook
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createWebhookSchema.parse(body)

    // בדיקה שהחנות שייכת למשתמש
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // יצירת secret אקראי
    const secret = crypto.randomBytes(32).toString("hex")

    // יצירת Webhook
    const webhook = await prisma.webhook.create({
      data: {
        shopId: data.shopId,
        url: data.url,
        events: data.events,
        secret: secret,
        isActive: data.isActive,
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: data.shopId,
        type: "webhook.created",
        entityType: "webhook",
        entityId: webhook.id,
        payload: {
          webhookId: webhook.id,
          url: webhook.url,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(webhook, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error creating webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
