import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateNavigationSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().optional(),
  items: z.any().optional(),
})

// GET - קבלת פרטי תפריט ניווט
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const navigation = await prisma.navigation.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!navigation) {
      return NextResponse.json({ error: "Navigation not found" }, { status: 404 })
    }

    return NextResponse.json(navigation)
  } catch (error) {
    console.error("Error fetching navigation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון תפריט ניווט
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהתפריט שייך לחברה
    const existingNavigation = await prisma.navigation.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingNavigation) {
      return NextResponse.json({ error: "Navigation not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateNavigationSchema.parse(body)

    // אם משנים location, בדיקה שהוא לא תפוס
    if (data.location && data.location !== existingNavigation.location) {
      const locationExists = await prisma.navigation.findFirst({
        where: {
          shopId: existingNavigation.shopId,
          location: data.location,
        },
      })

      if (locationExists) {
        return NextResponse.json(
          { error: "תפריט במיקום זה כבר קיים" },
          { status: 400 }
        )
      }
    }

    // עדכון התפריט
    const navigation = await prisma.navigation.update({
      where: { id: params.id },
      data,
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: navigation.shopId,
        type: "navigation.updated",
        entityType: "navigation",
        entityId: navigation.id,
        payload: {
          navigationId: navigation.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(navigation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating navigation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת תפריט ניווט
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהתפריט שייך לחברה
    const navigation = await prisma.navigation.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!navigation) {
      return NextResponse.json({ error: "Navigation not found" }, { status: 404 })
    }

    // מחיקת התפריט
    await prisma.navigation.delete({
      where: { id: params.id },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: navigation.shopId,
        type: "navigation.deleted",
        entityType: "navigation",
        entityId: params.id,
        payload: {
          navigationId: params.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "Navigation deleted successfully" })
  } catch (error) {
    console.error("Error deleting navigation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

