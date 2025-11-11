import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const payplusSettingsSchema = z.object({
  apiKey: z.string().min(1, "API Key נדרש"),
  secretKey: z.string().min(1, "Secret Key נדרש"),
  terminalUid: z.string().min(1, "Terminal UID נדרש"),
  paymentPageUid: z.string().optional(),
  cashierUid: z.string().optional(),
  useProduction: z.boolean().default(false),
})

// GET - קבלת הגדרות PayPlus גלובליות
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

    // חיפוש הגדרות גלובליות - נשמור אותן בטבלת Company עם ID מיוחד
    const settings = await prisma.company.findUnique({
      where: { id: "PAYPLUS_GLOBAL_SETTINGS" },
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

    const payplusSettings = (settings.settings as any)?.payplus

    return NextResponse.json({
      configured: !!payplusSettings,
      settings: payplusSettings ? {
        apiKey: payplusSettings.apiKey || null,
        secretKey: payplusSettings.secretKey || null,
        terminalUid: payplusSettings.terminalUid,
        paymentPageUid: payplusSettings.paymentPageUid,
        cashierUid: payplusSettings.cashierUid,
        useProduction: payplusSettings.useProduction || false,
      } : null,
    })
  } catch (error) {
    console.error("Error fetching PayPlus settings:", error)
    return NextResponse.json(
      { error: "שגיאה בטעינת הגדרות" },
      { status: 500 }
    )
  }
}

// POST - שמירת/עדכון הגדרות PayPlus גלובליות
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
    const settings = payplusSettingsSchema.parse(body)

    // שמירה או עדכון ההגדרות
    await prisma.company.upsert({
      where: { id: "PAYPLUS_GLOBAL_SETTINGS" },
      update: {
        settings: {
          payplus: settings,
        },
        updatedAt: new Date(),
      },
      create: {
        id: "PAYPLUS_GLOBAL_SETTINGS",
        name: "PayPlus Global Settings (Quick Shop SaaS)",
        settings: {
          payplus: settings,
        },
      },
    })

    return NextResponse.json({
      message: "הגדרות PayPlus נשמרו בהצלחה",
      settings: {
        apiKey: settings.apiKey,
        secretKey: settings.secretKey,
        terminalUid: settings.terminalUid,
        paymentPageUid: settings.paymentPageUid,
        cashierUid: settings.cashierUid,
        useProduction: settings.useProduction,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error saving PayPlus settings:", error)
    return NextResponse.json(
      { error: "שגיאה בשמירת הגדרות" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת הגדרות PayPlus גלובליות
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
      where: { id: "PAYPLUS_GLOBAL_SETTINGS" },
    })

    return NextResponse.json({
      message: "הגדרות PayPlus נמחקו בהצלחה",
    })
  } catch (error) {
    console.error("Error deleting PayPlus settings:", error)
    return NextResponse.json(
      { error: "שגיאה במחיקת הגדרות" },
      { status: 500 }
    )
  }
}

