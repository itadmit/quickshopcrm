import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - קבלת אינטגרציית Focus Shipping של החברה
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
        type: "FOCUS_SHIPPING",
      },
    })

    return NextResponse.json({ integration })
  } catch (error) {
    console.error("Error fetching Focus Shipping integration:", error)
    return NextResponse.json(
      { error: "שגיאה בקבלת אינטגרציית Focus Shipping" },
      { status: 500 }
    )
  }
}

// POST - יצירה/עדכון אינטגרציית Focus Shipping
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
    const { host, customerNumber, apiKey, name, autoSend, autoSendOn, shippingMethods } = body

    if (!host || !customerNumber) {
      return NextResponse.json(
        { error: "נא למלא את כל השדות הנדרשים (Host ומספר לקוח)" },
        { status: 400 }
      )
    }

    // בדיקה אם יש אינטגרציה קיימת
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        companyId: session.user.companyId,
        type: "FOCUS_SHIPPING",
      },
    })

    const integrationData = {
      companyId: session.user.companyId,
      type: "FOCUS_SHIPPING" as const,
      name: name || "פוקוס",
      apiKey: apiKey || null,
      apiSecret: null, // Focus לא משתמש ב-secret
      config: {
        host,
        customerNumber,
        autoSend: autoSend || false,
        autoSendOn: autoSendOn || "order.paid",
        shippingMethods: shippingMethods || [], // רשימת שיטות משלוח להפעלה
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
    console.error("Error saving Focus Shipping integration:", error)
    return NextResponse.json(
      {
        error: "שגיאה בשמירת אינטגרציית Focus Shipping",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת/כיבוי אינטגרציית Focus Shipping
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
        type: "FOCUS_SHIPPING",
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
    console.error("Error deleting Focus Shipping integration:", error)
    return NextResponse.json(
      { error: "שגיאה במחיקת אינטגרציית Focus Shipping" },
      { status: 500 }
    )
  }
}

