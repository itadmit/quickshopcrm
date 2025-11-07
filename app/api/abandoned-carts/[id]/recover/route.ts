import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

// POST - שליחת אימייל שחזור עגלה
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cart = await prisma.cart.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
        abandonedAt: {
          not: null,
        },
      },
      include: {
        customer: true,
        shop: true,
      },
    })

    if (!cart || !cart.customer) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 })
    }

    // עדכון תאריך שחזור
    await prisma.cart.update({
      where: { id: cart.id },
      data: { recoveredAt: new Date() },
    })

    // שליחת אימייל שחזור
    const shopSlug = cart.shop.slug
    const cartUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/shop/${shopSlug}/cart`

    try {
      await sendEmail({
        to: cart.customer.email,
        subject: `השלמת הקנייה שלך ב-${cart.shop.name}`,
        html: `
          <div dir="rtl">
            <h2>שלום ${cart.customer.firstName || ""},</h2>
            <p>שמנו לב שהשארת עגלת קניות ב-${cart.shop.name}.</p>
            <p>אנחנו כאן כדי לעזור לך להשלים את הקנייה!</p>
            <a href="${cartUrl}" style="display: inline-block; padding: 12px 24px; background: #6f65e2; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
              השלם את הקנייה
            </a>
          </div>
        `,
      })
    } catch (emailError) {
      console.error("Error sending recovery email:", emailError)
      // לא נכשל אם האימייל לא נשלח
    }

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: cart.shopId,
        type: "cart.recovered",
        entityType: "cart",
        entityId: cart.id,
        payload: {
          cartId: cart.id,
          customerId: cart.customerId,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error recovering cart:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

