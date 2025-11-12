import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { runAutomationsForEvent } from "@/lib/automations"

const updateAutomationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  trigger: z
    .object({
      type: z.string(),
      filters: z.record(z.any()).optional(),
    })
    .optional(),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.enum([
          "equals",
          "not_equals",
          "greater_than",
          "less_than",
          "contains",
          "not_contains",
          "in",
          "not_in",
        ]),
        value: z.any(),
        logicalOperator: z.enum(["AND", "OR"]).optional(),
      })
    )
    .optional()
    .nullable(),
  actions: z
    .array(
      z.object({
        type: z.string(),
        config: z.record(z.any()),
      })
    )
    .optional(),
})

// GET - קבלת אוטומציה ספציפית
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const automation = await prisma.automation.findUnique({
      where: { id: params.id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            companyId: true,
          },
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    })

    if (!automation) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      )
    }

    // בדיקה שהחנות שייכת לחברה
    if (automation.shop.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json(automation)
  } catch (error) {
    console.error("Error fetching automation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון אוטומציה
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const automation = await prisma.automation.findUnique({
      where: { id: params.id },
      include: {
        shop: {
          select: {
            companyId: true,
          },
        },
      },
    })

    if (!automation) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      )
    }

    // בדיקה שהחנות שייכת לחברה
    if (automation.shop.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const data = updateAutomationSchema.parse(body)

    const updated = await prisma.automation.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.trigger && { trigger: data.trigger as any }),
        ...(data.conditions !== undefined && {
          conditions: data.conditions as any,
        }),
        ...(data.actions && { actions: data.actions as any }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating automation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת אוטומציה
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const automation = await prisma.automation.findUnique({
      where: { id: params.id },
      include: {
        shop: {
          select: {
            companyId: true,
          },
        },
      },
    })

    if (!automation) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      )
    }

    // בדיקה שהחנות שייכת לחברה
    if (automation.shop.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await prisma.automation.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting automation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - הרצת אוטומציה ידנית (לבדיקה)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const automation = await prisma.automation.findUnique({
      where: { id: params.id },
      include: {
        shop: {
          select: {
            id: true,
            companyId: true,
          },
        },
      },
    })

    if (!automation) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      )
    }

    // בדיקה שהחנות שייכת לחברה
    if (automation.shop.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const { testPayload } = body

    const trigger = automation.trigger as any
    await runAutomationsForEvent(
      automation.shopId,
      trigger.type,
      testPayload || {}
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error testing automation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

