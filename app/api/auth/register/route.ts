import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(2, "השם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("אימייל לא תקין"),
  password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים"),
  companyName: z.string().min(2, "שם החברה חייב להכיל לפחות 2 תווים"),
  phone: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, companyName, phone } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "משתמש עם אימייל זה כבר קיים" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Check if this should be a super admin
    const isSuperAdmin = email === process.env.SUPER_ADMIN_EMAIL

    // Create company, user, and subscription in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name: companyName,
        },
      })

      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone: phone || null,
          role: isSuperAdmin ? "SUPER_ADMIN" : "ADMIN",
          companyId: company.id,
        },
      })

      // Create trial subscription (7 days)
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 7)

      const subscription = await tx.subscription.create({
        data: {
          companyId: company.id,
          plan: "TRIAL",
          status: "TRIAL",
          trialStartDate: new Date(),
          trialEndDate: trialEndDate,
        },
      })

      return { company, user, subscription }
    })

    return NextResponse.json({
      message: "משתמש נוצר בהצלחה",
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "אירעה שגיאה ביצירת המשתמש" },
      { status: 500 }
    )
  }
}


