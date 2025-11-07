import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createPageSchema = z.object({
  shopId: z.string(),
  title: z.string().min(2, "כותרת חייבת להכיל לפחות 2 תווים"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  content: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  isPublished: z.boolean().default(false),
  showInMenu: z.boolean().default(false),
  menuPosition: z.number().int().optional(),
})

// GET - קבלת כל הדפים
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const isPublished = searchParams.get("isPublished")

    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    if (isPublished !== null) {
      where.isPublished = isPublished === "true"
    }

    const pages = await prisma.page.findMany({
      where,
      orderBy: [
        { menuPosition: "asc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json(pages)
  } catch (error) {
    console.error("Error fetching pages:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת דף חדש
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createPageSchema.parse(body)

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

    // יצירת slug אם לא סופק
    let slug = data.slug
    if (!slug) {
      slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    }

    // בדיקה אם slug כבר קיים בחנות זו
    const existingPage = await prisma.page.findFirst({
      where: {
        shopId: data.shopId,
        slug,
      },
    })

    if (existingPage) {
      return NextResponse.json(
        { error: "דף עם slug זה כבר קיים בחנות זו" },
        { status: 400 }
      )
    }

    // יצירת הדף
    const page = await prisma.page.create({
      data: {
        shopId: data.shopId,
        title: data.title,
        slug,
        content: data.content,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        isPublished: data.isPublished,
        showInMenu: data.showInMenu,
        menuPosition: data.menuPosition,
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: page.shopId,
        type: "page.created",
        entityType: "page",
        entityId: page.id,
        payload: {
          pageId: page.id,
          title: page.title,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(page, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating page:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

