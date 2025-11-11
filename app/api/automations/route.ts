import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const automationSchema = z.object({
  shopId: z.string(),
  name: z.string().min(1, "שם האוטומציה חובה"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  trigger: z.object({
    type: z.string(),
    filters: z.record(z.any()).optional(),
  }),
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
    .optional(),
  actions: z.array(
    z.object({
      type: z.string(),
      config: z.record(z.any()),
    })
  ),
})

// GET - קבלת כל האוטומציות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")

    if (!shopId) {
      return NextResponse.json(
        { error: "shopId is required" },
        { status: 400 }
      )
    }

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const automations = await prisma.automation.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { logs: true },
        },
      },
    })

    return NextResponse.json(automations)
  } catch (error) {
    console.error("Error fetching automations:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת אוטומציה חדשה
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = automationSchema.parse(body)

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const automation = await prisma.automation.create({
      data: {
        shopId: data.shopId,
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        trigger: data.trigger,
        conditions: data.conditions || null,
        actions: data.actions,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json(automation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating automation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

