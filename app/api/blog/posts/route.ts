import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createBlogPostSchema = z.object({
  shopId: z.string(),
  title: z.string().min(1, "כותרת הפוסט היא חובה"),
  slug: z.string().min(1, "Slug הוא חובה"),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  isPublished: z.boolean().default(false),
})

// POST - יצירת פוסט בבלוג
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createBlogPostSchema.parse(body)

    // בדיקה שהחנות שייכת למשתמש
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // מציאת או יצירת בלוג לחנות
    let blog = await prisma.blog.findFirst({
      where: {
        shopId: data.shopId,
      },
    })

    if (!blog) {
      blog = await prisma.blog.create({
        data: {
          shopId: data.shopId,
          title: shop.name,
          slug: shop.slug,
        },
      })
    }

    // יצירת פוסט
    const post = await prisma.blogPost.create({
      data: {
        blogId: blog.id,
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        isPublished: data.isPublished,
        publishedAt: data.isPublished ? new Date() : null,
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: data.shopId,
        type: "blog.post_created",
        entityType: "blog_post",
        entityId: post.id,
        payload: {
          postId: post.id,
          title: post.title,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error creating blog post:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
