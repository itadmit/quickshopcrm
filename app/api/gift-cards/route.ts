import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { randomBytes } from "crypto"
import { sendEmail, emailTemplates } from "@/lib/email"

const createGiftCardSchema = z.object({
  shopId: z.string(),
  amount: z.number().min(0.01, "סכום חייב להיות גדול מ-0"),
  balance: z.number().min(0).optional(),
  recipientEmail: z.string().email("אימייל לא תקין"),
  recipientName: z.string().optional(),
  senderName: z.string().optional(),
  message: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  sendEmail: z.boolean().default(true), // האם לשלוח מייל
})

// GET - קבלת כל כרטיסי המתנה
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const isActive = searchParams.get("isActive")

    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    if (isActive !== null) {
      where.isActive = isActive === "true"
    }

    const giftCards = await prisma.giftCard.findMany({
      where,
      include: {
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(giftCards)
  } catch (error) {
    console.error("Error fetching gift cards:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת כרטיס מתנה חדש
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createGiftCardSchema.parse(body)

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // יצירת קוד ייחודי
    let code: string
    let codeExists = true
    while (codeExists) {
      code = randomBytes(8).toString("hex").toUpperCase()
      const existing = await prisma.giftCard.findUnique({
        where: { code },
      })
      codeExists = !!existing
    }

    // יצירת כרטיס המתנה
    const giftCard = await prisma.giftCard.create({
      data: {
        shopId: data.shopId,
        code: code!,
        amount: data.amount,
        balance: data.balance ?? data.amount,
        recipientEmail: data.recipientEmail,
        recipientName: data.recipientName,
        senderName: data.senderName,
        message: data.message,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        isActive: data.isActive,
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: giftCard.shopId,
        type: "gift_card.created",
        entityType: "gift_card",
        entityId: giftCard.id,
        payload: {
          giftCardId: giftCard.id,
          code: giftCard.code,
          amount: giftCard.amount,
        },
        userId: session.user.id,
      },
    })

    // שליחת מייל עם כרטיס המתנה (רק אם המשתמש בחר)
    const shouldSendEmail = data.sendEmail !== false && data.sendEmail !== undefined
    console.log(`📧 Gift card email check:`, { 
      sendEmail: data.sendEmail, 
      shouldSendEmail,
      recipientEmail: giftCard.recipientEmail 
    })
    
    if (shouldSendEmail) {
      try {
        const shopUrl = shop.domain 
          ? `https://${shop.domain}` 
          : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/shop/${shop.slug}`
        
        console.log(`📧 Generating email template for gift card ${giftCard.code}...`)
        
        const emailTemplate = await emailTemplates.giftCard(
          shop.id,
          {
            code: giftCard.code,
            amount: giftCard.amount,
            balance: giftCard.balance,
            recipientName: giftCard.recipientName,
            senderName: giftCard.senderName,
            message: giftCard.message,
            expiresAt: giftCard.expiresAt,
          },
          shop.name,
          shopUrl
        )

        console.log(`📧 Email template generated, sending to ${giftCard.recipientEmail}...`)

        await sendEmail({
          to: giftCard.recipientEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          shopId: shop.id,
        })

        console.log(`✅ Gift card email sent successfully to ${giftCard.recipientEmail}`)
      } catch (emailError) {
        // לא נכשל את יצירת gift card אם שליחת המייל נכשלה
        console.error("❌ Error sending gift card email:", emailError)
        if (emailError instanceof Error) {
          console.error("Error details:", emailError.message, emailError.stack)
        }
      }
    } else {
      console.log(`ℹ️ Email not sent - user chose not to send email (sendEmail: ${data.sendEmail})`)
    }

    return NextResponse.json(giftCard, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating gift card:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת כרטיס מתנה
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const giftCardId = searchParams.get("id")

    if (!giftCardId) {
      return NextResponse.json(
        { error: "Gift card ID is required" },
        { status: 400 }
      )
    }

    // בדיקה שהכרטיס שייך לחברה
    const giftCard = await prisma.giftCard.findFirst({
      where: {
        id: giftCardId,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        shop: true,
      },
    })

    if (!giftCard) {
      return NextResponse.json(
        { error: "Gift card not found" },
        { status: 404 }
      )
    }

    // מחיקת כרטיס המתנה
    await prisma.giftCard.delete({
      where: { id: giftCardId },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: giftCard.shopId,
        type: "gift_card.deleted",
        entityType: "gift_card",
        entityId: giftCardId,
        payload: {
          giftCardId: giftCard.id,
          code: giftCard.code,
          amount: giftCard.amount,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(
      { message: "Gift card deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting gift card:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

