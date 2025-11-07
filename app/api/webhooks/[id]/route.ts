import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateWebhookSchema = z.object({
  url: z.string().url("URL לא תקין").optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

// GET - קבלת Webhook
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    return NextResponse.json(webhook)
  } catch (error) {
    console.error("Error fetching webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון Webhook
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingWebhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateWebhookSchema.parse(body)

    if (data.url && !data.url.startsWith("http://") && !data.url.startsWith("https://")) {
      return NextResponse.json(
        { error: "URL חייב להתחיל ב-http:// או https://" },
        { status: 400 }
      )
    }

    if (data.events && data.events.length === 0) {
      return NextResponse.json(
        { error: "יש לבחור לפחות אירוע אחד" },
        { status: 400 }
      )
    }

    const webhook = await prisma.webhook.update({
      where: { id: params.id },
      data: {
        ...(data.url && { url: data.url }),
        ...(data.events && { events: data.events }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    await prisma.shopEvent.create({
      data: {
        shopId: webhook.shopId,
        type: "webhook.updated",
        entityType: "webhook",
        entityId: webhook.id,
        payload: {
          webhookId: webhook.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(webhook)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת Webhook
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    await prisma.webhook.delete({
      where: { id: params.id },
    })

    await prisma.shopEvent.create({
      data: {
        shopId: webhook.shopId,
        type: "webhook.deleted",
        entityType: "webhook",
        entityId: webhook.id,
        payload: {
          webhookId: webhook.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
