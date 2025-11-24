import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { SignJWT } from "jose"
import { cookies } from "next/headers"

const registerSchema = z.object({
  email: z.string().email("אימייל לא תקין"),
  phone: z.string().min(1, "טלפון הוא חובה"),
  firstName: z.string().min(1, "שם פרטי הוא חובה"),
  lastName: z.string().optional(),
  dateOfBirth: z.string().optional(),
})

// POST - הרשמת לקוח חדש (ללא OTP, ללא סיסמא)
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const shop = await prisma.shop.findUnique({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = registerSchema.parse(body)

    // בדיקה אם הלקוח כבר קיים
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        shopId: shop.id,
        OR: [
          { email: data.email.toLowerCase() },
          { phone: data.phone },
        ],
      },
    })

    if (existingCustomer) {
      return NextResponse.json(
        { error: "לקוח עם אימייל או טלפון זה כבר קיים. אנא התחבר לחשבון שלך" },
        { status: 400 }
      )
    }

    // יצירת לקוח (ללא סיסמא)
    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        email: data.email.toLowerCase(),
        password: null, // אין סיסמא - התחברות רק דרך OTP
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        preferredPaymentMethod: true,
        createdAt: true,
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: shop.id,
        type: "customer.registered",
        entityType: "customer",
        entityId: customer.id,
        payload: {
          customerId: customer.id,
          email: customer.email,
          method: "direct",
        },
      },
    })

    // יצירת JWT token (התחברות אוטומטית אחרי הרשמה)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
    const token = await new SignJWT({
      customerId: customer.id,
      shopId: shop.id,
      email: customer.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(secret)

    // יצירת response
    const response = NextResponse.json({
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        preferredPaymentMethod: customer.preferredPaymentMethod,
      },
    }, { status: 201 })

    // שמירת cookie עם פרטי הלקוח דרך response headers
    const customerData = JSON.stringify({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      preferredPaymentMethod: customer.preferredPaymentMethod,
    })
    
    response.cookies.set(`storefront_customer_${params.slug}`, customerData, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 ימים
      httpOnly: false, // צריך להיות נגיש מ-JavaScript
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // רק ב-production
    })
    
    console.log(`[Register] Cookie set: storefront_customer_${params.slug} for customer ${customer.id}`)

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error registering customer:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

