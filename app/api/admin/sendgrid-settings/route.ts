import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const sendgridSettingsSchema = z.object({
  apiKey: z.string().min(1, "API Key נדרש"),
  fromEmail: z.string().email("כתובת אימייל לא תקינה").optional(),
  fromName: z.string().optional(),
})

// GET - קבלת הגדרות SendGrid גלובליות
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token || token.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "אין הרשאה - נדרשת הרשאת Super Admin" },
        { status: 403 }
      )
    }

    // חיפוש הגדרות גלובליות
    const settings = await prisma.company.findUnique({
      where: { id: "SENDGRID_GLOBAL_SETTINGS" },
      select: {
        settings: true,
      },
    })

    if (!settings || !settings.settings) {
      return NextResponse.json({
        configured: false,
        settings: null,
      })
    }

    const sendgridSettings = (settings.settings as any)?.sendgrid

    return NextResponse.json({
      configured: !!sendgridSettings,
      settings: sendgridSettings ? {
        apiKey: sendgridSettings.apiKey ? "***" : null, // לא נחזיר את המפתח האמיתי
        fromEmail: sendgridSettings.fromEmail || "no-reply@my-quickshop.com",
        fromName: sendgridSettings.fromName || "Quick Shop",
      } : null,
    })
  } catch (error) {
    console.error("Error fetching SendGrid settings:", error)
    return NextResponse.json(
      { error: "שגיאה בטעינת הגדרות" },
      { status: 500 }
    )
  }
}

// POST - שמירת/עדכון הגדרות SendGrid גלובליות
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token || token.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "אין הרשאה - נדרשת הרשאת Super Admin" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const settings = sendgridSettingsSchema.parse(body)

    // שמירה או עדכון ההגדרות
    await prisma.company.upsert({
      where: { id: "SENDGRID_GLOBAL_SETTINGS" },
      update: {
        settings: {
          sendgrid: {
            apiKey: settings.apiKey,
            fromEmail: settings.fromEmail || "no-reply@my-quickshop.com",
            fromName: settings.fromName || "Quick Shop",
          },
        },
        updatedAt: new Date(),
      },
      create: {
        id: "SENDGRID_GLOBAL_SETTINGS",
        name: "SendGrid Global Settings (Quick Shop SaaS)",
        settings: {
          sendgrid: {
            apiKey: settings.apiKey,
            fromEmail: settings.fromEmail || "no-reply@my-quickshop.com",
            fromName: settings.fromName || "Quick Shop",
          },
        },
      },
    })

    return NextResponse.json({
      message: "הגדרות SendGrid נשמרו בהצלחה",
      settings: {
        apiKey: "***", // לא נחזיר את המפתח האמיתי
        fromEmail: settings.fromEmail || "no-reply@my-quickshop.com",
        fromName: settings.fromName || "Quick Shop",
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error saving SendGrid settings:", error)
    return NextResponse.json(
      { error: "שגיאה בשמירת הגדרות" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת הגדרות SendGrid גלובליות
export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token || token.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "אין הרשאה - נדרשת הרשאת Super Admin" },
        { status: 403 }
      )
    }

    await prisma.company.delete({
      where: { id: "SENDGRID_GLOBAL_SETTINGS" },
    })

    return NextResponse.json({
      message: "הגדרות SendGrid נמחקו בהצלחה",
    })
  } catch (error) {
    console.error("Error deleting SendGrid settings:", error)
    return NextResponse.json(
      { error: "שגיאה במחיקת הגדרות" },
      { status: 500 }
    )
  }
}

