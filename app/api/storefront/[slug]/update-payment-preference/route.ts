import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const customerId = req.headers.get("x-customer-id")

    if (!customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { paymentMethod } = body

    // אימות שיטת התשלום
    if (!paymentMethod || !["credit_card", "bank_transfer", "cash"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
    }

    // מציאת החנות
    const shop = await prisma.shop.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // עדכון העדפת התשלום של הלקוח
    const customer = await prisma.customer.update({
      where: {
        id: customerId,
        shopId: shop.id,
      },
      data: {
        preferredPaymentMethod: paymentMethod,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        preferredPaymentMethod: true,
      },
    })

    // יצירת response
    const response = NextResponse.json({
      success: true,
      preferredPaymentMethod: customer.preferredPaymentMethod,
    })

    // עדכון ה-cookie עם העדפת התשלום החדשה
    const customerData = JSON.stringify({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      preferredPaymentMethod: customer.preferredPaymentMethod,
    })
    
    response.cookies.set(`storefront_customer_${slug}`, customerData, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 ימים
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })

    return response
  } catch (error) {
    console.error("Error updating payment preference:", error)
    return NextResponse.json(
      { error: "Failed to update payment preference" },
      { status: 500 }
    )
  }
}

