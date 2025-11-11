import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generatePaymentLink as payplusGenerateLink } from "@/lib/payplus"

// GET - קבלת אינטגרציית PayPlus של החברה
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 }
      )
    }

    const integration = await prisma.integration.findFirst({
      where: {
        companyId: session.user.companyId,
        type: "PAYPLUS",
      },
    })

    return NextResponse.json({ integration })
  } catch (error) {
    console.error("Error fetching PayPlus integration:", error)
    return NextResponse.json(
      { error: "שגיאה בקבלת אינטגרציית PayPlus" },
      { status: 500 }
    )
  }
}

// POST - יצירה/עדכון אינטגרציית PayPlus
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { apiKey, secretKey, paymentPageUid, name, useProduction } = body

    if (!apiKey || !secretKey || !paymentPageUid) {
      return NextResponse.json(
        { error: "נא למלא את כל השדות הנדרשים" },
        { status: 400 }
      )
    }

    // בדיקה אם יש אינטגרציה קיימת
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        companyId: session.user.companyId,
        type: "PAYPLUS",
      },
    })

    const integrationData = {
      companyId: session.user.companyId,
      type: "PAYPLUS" as const,
      name: name || "PayPlus",
      apiKey,
      apiSecret: secretKey,
      config: {
        paymentPageUid,
        useProduction: useProduction || false,
      },
      isActive: true,
    }

    let integration
    if (existingIntegration) {
      // עדכון אינטגרציה קיימת
      integration = await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: integrationData,
      })
    } else {
      // יצירת אינטגרציה חדשה
      integration = await prisma.integration.create({
        data: integrationData,
      })
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        isActive: integration.isActive,
        config: integration.config,
      },
    })
  } catch (error: any) {
    console.error("Error saving PayPlus integration:", error)
    return NextResponse.json(
      {
        error: "שגיאה בשמירת אינטגרציית PayPlus",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת אינטגרציית PayPlus
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 }
      )
    }

    const integration = await prisma.integration.findFirst({
      where: {
        companyId: session.user.companyId,
        type: "PAYPLUS",
      },
    })

    if (!integration) {
      return NextResponse.json(
        { error: "אינטגרציה לא נמצאה" },
        { status: 404 }
      )
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting PayPlus integration:", error)
    return NextResponse.json(
      { error: "שגיאה במחיקת אינטגרציית PayPlus" },
      { status: 500 }
    )
  }
}

