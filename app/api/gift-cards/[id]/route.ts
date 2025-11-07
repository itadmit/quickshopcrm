import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateGiftCardSchema = z.object({
  amount: z.number().min(0.01).optional(),
  balance: z.number().min(0).optional(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  senderName: z.string().optional(),
  message: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
})

// GET - קבלת פרטי כרטיס מתנה
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const giftCard = await prisma.giftCard.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        transactions: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                total: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!giftCard) {
      return NextResponse.json({ error: "Gift card not found" }, { status: 404 })
    }

    return NextResponse.json(giftCard)
  } catch (error) {
    console.error("Error fetching gift card:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון כרטיס מתנה
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שכרטיס המתנה שייך לחברה
    const existingGiftCard = await prisma.giftCard.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingGiftCard) {
      return NextResponse.json({ error: "Gift card not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateGiftCardSchema.parse(body)

    const updateData: any = { ...data }
    if (updateData.expiresAt) {
      updateData.expiresAt = new Date(updateData.expiresAt)
    }

    // עדכון כרטיס המתנה
    const giftCard = await prisma.giftCard.update({
      where: { id: params.id },
      data: updateData,
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: giftCard.shopId,
        type: "gift_card.updated",
        entityType: "gift_card",
        entityId: giftCard.id,
        payload: {
          giftCardId: giftCard.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(giftCard)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating gift card:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת כרטיס מתנה
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שכרטיס המתנה שייך לחברה
    const giftCard = await prisma.giftCard.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!giftCard) {
      return NextResponse.json({ error: "Gift card not found" }, { status: 404 })
    }

    // מחיקת כרטיס המתנה
    await prisma.giftCard.delete({
      where: { id: params.id },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: giftCard.shopId,
        type: "gift_card.deleted",
        entityType: "gift_card",
        entityId: params.id,
        payload: {
          giftCardId: params.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "Gift card deleted successfully" })
  } catch (error) {
    console.error("Error deleting gift card:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

