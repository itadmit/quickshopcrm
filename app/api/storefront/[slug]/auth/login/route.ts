import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"

const loginSchema = z.object({
  email: z.string().email("אימייל לא תקין"),
  password: z.string().min(1, "סיסמה היא חובה"),
})

// POST - התחברות לקוח
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
    const data = loginSchema.parse(body)

    // מציאת לקוח
    const customer = await prisma.customer.findFirst({
      where: {
        shopId: shop.id,
        email: data.email,
      },
    })

    if (!customer || !customer.password) {
      return NextResponse.json(
        { error: "אימייל או סיסמה לא נכונים" },
        { status: 401 }
      )
    }

    // בדיקת סיסמה
    const passwordValid = await bcrypt.compare(data.password, customer.password)
    if (!passwordValid) {
      return NextResponse.json(
        { error: "אימייל או סיסמה לא נכונים" },
        { status: 401 }
      )
    }

    // עדכון תאריך התחברות אחרונה
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    })

    // יצירת JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
    const token = await new SignJWT({
      customerId: customer.id,
      shopId: shop.id,
      email: customer.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(secret)

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: shop.id,
        type: "customer.logged_in",
        entityType: "customer",
        entityId: customer.id,
        payload: {
          customerId: customer.id,
        },
      },
    })

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
    })

    // שמירת cookie עם פרטי הלקוח
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
      secure: process.env.NODE_ENV === "production",
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error logging in customer:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

