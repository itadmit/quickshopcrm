import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { SignJWT } from "jose"
import { cookies } from "next/headers"

const verifySchema = z.object({
  email: z.string().email("אימייל לא תקין").optional(),
  phone: z.string().optional(),
  code: z.string().length(6, "קוד OTP חייב להכיל 6 ספרות"),
  dateOfBirth: z.string().optional(),
}).refine((data) => data.email || data.phone, {
  message: "אנא הזן טלפון או אימייל",
})

// POST - אימות OTP והתחברות
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
    const data = verifySchema.parse(body)

    // מציאת לקוח לפי אימייל או טלפון
    let customer = null
    let emailToUse: string | null = null

    if (data.email) {
      emailToUse = data.email.toLowerCase()
      customer = await prisma.customer.findFirst({
        where: {
          shopId: shop.id,
          email: emailToUse,
        },
      })
    } else if (data.phone) {
      customer = await prisma.customer.findFirst({
        where: {
          shopId: shop.id,
          phone: data.phone,
        },
      })
      if (customer) {
        emailToUse = customer.email
      }
    }

    if (!customer || !emailToUse) {
      return NextResponse.json(
        { error: "חשבון לא נמצא. אנא הירשם תחילה" },
        { status: 404 }
      )
    }

    // מציאת OTP לפי האימייל של הלקוח
    const otp = await prisma.otpToken.findFirst({
      where: {
        shopId: shop.id,
        email: emailToUse,
        code: data.code,
        used: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (!otp) {
      // עדכון מספר ניסיונות אם יש OTP לא נכון
      const latestOtp = await prisma.otpToken.findFirst({
        where: {
          shopId: shop.id,
          email: emailToUse,
          used: false,
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      if (latestOtp) {
        await prisma.otpToken.update({
          where: { id: latestOtp.id },
          data: { attempts: { increment: 1 } },
        })

        // אם יש יותר מ-5 ניסיונות, מחכים 15 דקות
        if (latestOtp.attempts >= 5) {
          return NextResponse.json(
            { error: "יותר מדי ניסיונות. אנא בקש קוד חדש" },
            { status: 429 }
          )
        }
      }

      return NextResponse.json(
        { error: "קוד לא תקין. אנא נסה שוב" },
        { status: 400 }
      )
    }

    // בדיקת תפוגה
    if (otp.expiresAt < new Date()) {
      await prisma.otpToken.update({
        where: { id: otp.id },
        data: { used: true },
      })
      return NextResponse.json(
        { error: "קוד פג תוקף. אנא בקש קוד חדש" },
        { status: 400 }
      )
    }

    // סימון OTP כמשומש
    await prisma.otpToken.update({
      where: { id: otp.id },
      data: { used: true },
    })

    // הלקוח כבר נמצא למעלה, אז זה תמיד התחברות (לא הרשמה)
    // אם הלקוח לא קיים, כבר החזרנו שגיאה למעלה

    // עדכון תאריך התחברות אחרונה
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        lastLoginAt: new Date(),
        emailVerified: true, // אימות אימייל דרך OTP
      },
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

    // יצירת אירוע התחברות
    await prisma.shopEvent.create({
      data: {
        shopId: shop.id,
        type: "customer.logged_in",
        entityType: "customer",
        entityId: customer.id,
        payload: {
          customerId: customer.id,
          email: customer.email,
          method: "otp",
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
      },
    })

    // שמירת cookie עם פרטי הלקוח דרך response headers
    const customerData = JSON.stringify({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
    })
    
    response.cookies.set(`storefront_customer_${params.slug}`, customerData, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 ימים
      httpOnly: false, // צריך להיות נגיש מ-JavaScript
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // רק ב-production
    })
    
    console.log(`[OTP Verify] Cookie set: storefront_customer_${params.slug} for customer ${customer.id}`)

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error verifying OTP:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

