import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createBlogSchema = z.object({
  shopId: z.string(),
  title: z.string().min(2, "כותרת הבלוג חייבת להכיל לפחות 2 תווים"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
})

// GET - קבלת כל הבלוגים
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")

    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    const blogs = await prisma.blog.findMany({
      where,
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(blogs)
  } catch (error) {
    console.error("Error fetching blogs:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת בלוג חדש
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createBlogSchema.parse(body)

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
    const existingBlog = await prisma.blog.findFirst({
      where: {
        shopId: data.shopId,
        slug,
      },
    })

    if (existingBlog) {
      return NextResponse.json(
        { error: "בלוג עם slug זה כבר קיים בחנות זו" },
        { status: 400 }
      )
    }

    // יצירת הבלוג
    const blog = await prisma.blog.create({
      data: {
        shopId: data.shopId,
        title: data.title,
        slug,
        description: data.description,
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: blog.shopId,
        type: "blog.created",
        entityType: "blog",
        entityId: blog.id,
        payload: {
          blogId: blog.id,
          title: blog.title,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(blog, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating blog:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

