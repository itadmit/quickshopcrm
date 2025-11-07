import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const validateGiftCardSchema = z.object({
  code: z.string().min(1, "קוד כרטיס המתנה הוא חובה"),
  shopId: z.string().optional(),
})

// POST - אימות כרטיס מתנה
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, shopId } = validateGiftCardSchema.parse(body)

    const where: any = {
      code: code.toUpperCase(),
      isActive: true,
    }

    if (shopId) {
      where.shopId = shopId
    }

    const giftCard = await prisma.giftCard.findFirst({
      where,
    })

    if (!giftCard) {
      return NextResponse.json(
        { error: "כרטיס מתנה לא נמצא או לא פעיל" },
        { status: 404 }
      )
    }

    // בדיקת תאריך תפוגה
    if (giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "כרטיס המתנה פג תוקף" },
        { status: 400 }
      )
    }

    // בדיקת יתרה
    if (giftCard.balance <= 0) {
      return NextResponse.json(
        { error: "אין יתרה בכרטיס המתנה" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      giftCard: {
        id: giftCard.id,
        code: giftCard.code,
        balance: giftCard.balance,
        amount: giftCard.amount,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error validating gift card:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

