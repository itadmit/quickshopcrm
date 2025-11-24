import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"

const popupSchema = z.object({
  name: z.string().min(1, "שם הפופאפ נדרש"),
  layout: z.enum(["one-column", "two-column"]).default("one-column"),
  borderRadius: z.number().min(0).max(50).default(0),
  isActive: z.boolean().default(true),
  content: z.any(), // JSON content
  displayFrequency: z.enum(["every-visit", "once-daily", "once-weekly", "once-monthly"]).default("every-visit"),
  displayLocation: z.enum(["all-pages", "specific-pages"]).default("all-pages"),
  specificPages: z.array(z.string()).optional(),
  delay: z.number().min(0).optional().default(0),
  trigger: z.enum(["on-load", "on-exit-intent", "on-scroll"]).default("on-load"),
  scrollPercentage: z.number().min(0).max(100).optional(),
  backgroundColor: z.string().optional().default("#ffffff"),
  textColor: z.string().optional().default("#000000"),
  overlayColor: z.string().optional().default("#000000"),
  overlayOpacity: z.number().min(0).max(1).optional().default(0.5),
})

// GET - קבלת כל הפופאפים של החנות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")

    if (!shopId) {
      return NextResponse.json({ error: "shopId is required" }, { status: 400 })
    }

    // בדיקה שהחנות שייכת לחברה של המשתמש
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const popups = await prisma.popup.findMany({
      where: {
        shopId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(popups)
  } catch (error) {
    console.error("Error fetching popups:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת פופאפ חדש
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = popupSchema.parse(body)

    // בדיקה שהחנות שייכת לחברה של המשתמש
    const shop = await prisma.shop.findFirst({
      where: {
        id: body.shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const popup = await prisma.popup.create({
      data: {
        shopId: body.shopId,
        name: data.name,
        layout: data.layout,
        borderRadius: data.borderRadius,
        isActive: data.isActive,
        content: data.content || [],
        displayFrequency: data.displayFrequency,
        displayLocation: data.displayLocation,
        specificPages: data.specificPages || null,
        delay: data.delay,
        trigger: data.trigger,
        scrollPercentage: data.scrollPercentage || null,
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        overlayColor: data.overlayColor,
        overlayOpacity: data.overlayOpacity,
      },
    })

    return NextResponse.json(popup)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error creating popup:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

