import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateBlogSchema = z.object({
  title: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
})

// GET - קבלת פרטי בלוג
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const blog = await prisma.blog.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        posts: {
          take: 10,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 })
    }

    return NextResponse.json(blog)
  } catch (error) {
    console.error("Error fetching blog:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון בלוג
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהבלוג שייך לחברה
    const existingBlog = await prisma.blog.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingBlog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateBlogSchema.parse(body)

    // אם משנים slug, בדיקה שהוא לא תפוס
    if (data.slug && data.slug !== existingBlog.slug) {
      const slugExists = await prisma.blog.findFirst({
        where: {
          shopId: existingBlog.shopId,
          slug: data.slug,
        },
      })

      if (slugExists) {
        return NextResponse.json(
          { error: "בלוג עם slug זה כבר קיים בחנות זו" },
          { status: 400 }
        )
      }
    }

    // עדכון הבלוג
    const blog = await prisma.blog.update({
      where: { id: params.id },
      data,
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: blog.shopId,
        type: "blog.updated",
        entityType: "blog",
        entityId: blog.id,
        payload: {
          blogId: blog.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(blog)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating blog:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת בלוג
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהבלוג שייך לחברה
    const blog = await prisma.blog.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 })
    }

    // מחיקת הבלוג
    await prisma.blog.delete({
      where: { id: params.id },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: blog.shopId,
        type: "blog.deleted",
        entityType: "blog",
        entityId: params.id,
        payload: {
          blogId: params.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "Blog deleted successfully" })
  } catch (error) {
    console.error("Error deleting blog:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

