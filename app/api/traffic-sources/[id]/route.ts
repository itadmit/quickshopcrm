import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateTrafficSourceSchema = z.object({
  name: z.string().min(1).optional(),
  uniqueId: z.string().min(1).optional(),
  medium: z.string().optional(),
  campaign: z.string().optional(),
  referralLink: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
})

// GET - קבלת מקור תנועה ספציפי
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const trafficSource = await prisma.trafficSource.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    })

    if (!trafficSource) {
      return NextResponse.json(
        { error: "Traffic source not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ trafficSource })
  } catch (error) {
    console.error("Error fetching traffic source:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון מקור תנועה
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = updateTrafficSourceSchema.parse(body)

    // בדיקה שהמקור שייך לחברה
    const existing = await prisma.trafficSource.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Traffic source not found" },
        { status: 404 }
      )
    }

    // אם משנים uniqueId, בדיקה שהוא לא קיים כבר
    if (data.uniqueId && data.uniqueId !== existing.uniqueId) {
      const duplicate = await prisma.trafficSource.findUnique({
        where: {
          shopId_uniqueId: {
            shopId: existing.shopId,
            uniqueId: data.uniqueId,
          },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: "מזהה ייחודי זה כבר קיים בחנות זו" },
          { status: 400 }
        )
      }
    }

    const trafficSource = await prisma.trafficSource.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.uniqueId && { uniqueId: data.uniqueId }),
        ...(data.medium !== undefined && { medium: data.medium || null }),
        ...(data.campaign !== undefined && { campaign: data.campaign || null }),
        ...(data.referralLink !== undefined && {
          referralLink: data.referralLink || null,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    return NextResponse.json({ trafficSource })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating traffic source:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת מקור תנועה
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהמקור שייך לחברה
    const existing = await prisma.trafficSource.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Traffic source not found" },
        { status: 404 }
      )
    }

    await prisma.trafficSource.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting traffic source:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}



