import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createTrafficSourceSchema = z.object({
  shopId: z.string(),
  name: z.string().min(1, "שם מקור התנועה חובה"),
  uniqueId: z.string().min(1, "מזהה ייחודי חובה"),
  medium: z.string().optional(),
  campaign: z.string().optional(),
  referralLink: z.string().url().optional().or(z.literal("")),
})

// GET - קבלת כל מקורות התנועה של החנות
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

    const trafficSources = await prisma.trafficSource.findMany({
      where: {
        shopId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    })

    return NextResponse.json({ trafficSources })
  } catch (error) {
    console.error("Error fetching traffic sources:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת מקור תנועה חדש
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createTrafficSourceSchema.parse(body)

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

    // בדיקה אם uniqueId כבר קיים בחנות הזו
    const existing = await prisma.trafficSource.findUnique({
      where: {
        shopId_uniqueId: {
          shopId: data.shopId,
          uniqueId: data.uniqueId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "מזהה ייחודי זה כבר קיים בחנות זו" },
        { status: 400 }
      )
    }

    // יצירת מקור תנועה
    const trafficSource = await prisma.trafficSource.create({
      data: {
        shopId: data.shopId,
        name: data.name,
        uniqueId: data.uniqueId,
        medium: data.medium || null,
        campaign: data.campaign || null,
        referralLink: data.referralLink || null,
      },
    })

    return NextResponse.json({ trafficSource }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating traffic source:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


