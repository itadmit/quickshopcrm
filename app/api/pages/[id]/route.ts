import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updatePageSchema = z.object({
  title: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  content: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  isPublished: z.boolean().optional(),
  showInMenu: z.boolean().optional(),
  menuPosition: z.number().int().optional(),
})

// GET - קבלת פרטי דף
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const page = await prisma.page.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    return NextResponse.json(page)
  } catch (error) {
    console.error("Error fetching page:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון דף
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהדף שייך לחברה
    const existingPage = await prisma.page.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingPage) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updatePageSchema.parse(body)

    // אם משנים slug, בדיקה שהוא לא תפוס
    if (data.slug && data.slug !== existingPage.slug) {
      const slugExists = await prisma.page.findFirst({
        where: {
          shopId: existingPage.shopId,
          slug: data.slug,
        },
      })

      if (slugExists) {
        return NextResponse.json(
          { error: "דף עם slug זה כבר קיים בחנות זו" },
          { status: 400 }
        )
      }
    }

    // עדכון הדף
    const page = await prisma.page.update({
      where: { id: params.id },
      data,
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: page.shopId,
        type: "page.updated",
        entityType: "page",
        entityId: page.id,
        payload: {
          pageId: page.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(page)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating page:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת דף
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהדף שייך לחברה
    const page = await prisma.page.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // מחיקת הדף
    await prisma.page.delete({
      where: { id: params.id },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: page.shopId,
        type: "page.deleted",
        entityType: "page",
        entityId: params.id,
        payload: {
          pageId: params.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "Page deleted successfully" })
  } catch (error) {
    console.error("Error deleting page:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

