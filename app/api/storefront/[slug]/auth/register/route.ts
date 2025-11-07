import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const registerSchema = z.object({
  email: z.string().email("אימייל לא תקין"),
  password: z.string().min(6, "סיסמה חייבת להכיל לפחות 6 תווים"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
})

// POST - הרשמת לקוח חדש
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
        email: data.email,
      },
    })

    if (existingCustomer) {
      return NextResponse.json(
        { error: "לקוח עם אימייל זה כבר קיים" },
        { status: 400 }
      )
    }

    // הצפנת סיסמה
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // יצירת לקוח
    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
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
        },
      },
    })

    return NextResponse.json(customer, { status: 201 })
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

