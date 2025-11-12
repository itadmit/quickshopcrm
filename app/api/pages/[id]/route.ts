import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updatePageSchema = z.object({
  title: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  content: z.string().optional(),
  template: z.enum(["STANDARD", "CHOICES_OF"]).optional(),
  displayType: z.enum(["GRID", "LIST"]).optional(), // סוג תצוגה לטמפלט "הבחירות של"
  selectedProducts: z.array(z.string()).optional(),
  featuredImage: z.string().optional(), // תמונה ראשית לעמוד
  couponCode: z.string().optional(), // קוד קופון להפעלה אוטומטית
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  isPublished: z.boolean().optional(),
  showInMenu: z.boolean().optional(),
  menuPosition: z.number().int().optional(),
})

// GET - קבלת פרטי דף (תומך ב-ID או slug)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ניסיון למצוא לפי ID או slug
    const page = await prisma.page.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
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

// PUT - עדכון דף (תומך ב-ID או slug)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהדף שייך לחברה (תומך ב-ID או slug)
    const existingPage = await prisma.page.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
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

    // עדכון הדף (נשתמש ב-ID האמיתי)
    const page = await prisma.page.update({
      where: { id: existingPage.id },
      data,
    })

    // כבר לא משתמשים ב-showInMenu - המשתמש מוסיף/מסיר דרך עמוד העריכה

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

// DELETE - מחיקת דף (תומך ב-ID או slug)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהדף שייך לחברה (תומך ב-ID או slug)
    const page = await prisma.page.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    // מחיקת הדף (נשתמש ב-ID האמיתי)
    await prisma.page.delete({
      where: { id: page.id },
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

