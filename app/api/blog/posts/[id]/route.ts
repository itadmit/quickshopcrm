import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateBlogPostSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  isPublished: z.boolean().optional(),
})

// GET - קבלת פוסט
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const post = await prisma.blogPost.findFirst({
      where: {
        id: params.id,
        blog: {
          shop: {
            companyId: session.user.companyId,
          },
        },
      },
      include: {
        blog: {
          include: {
            shop: true,
          },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error("Error fetching blog post:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון פוסט
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingPost = await prisma.blogPost.findFirst({
      where: {
        id: params.id,
        blog: {
          shop: {
            companyId: session.user.companyId,
          },
        },
      },
      include: {
        blog: true,
      },
    })

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateBlogPostSchema.parse(body)

    const post = await prisma.blogPost.update({
      where: { id: params.id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.slug && { slug: data.slug }),
        ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.isPublished !== undefined && {
          isPublished: data.isPublished,
          publishedAt: data.isPublished && !existingPost.publishedAt ? new Date() : existingPost.publishedAt,
        }),
      },
    })

    await prisma.shopEvent.create({
      data: {
        shopId: existingPost.blog.shopId,
        type: "blog.post_updated",
        entityType: "blog_post",
        entityId: post.id,
        payload: {
          postId: post.id,
          title: post.title,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(post)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating blog post:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת פוסט
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const post = await prisma.blogPost.findFirst({
      where: {
        id: params.id,
        blog: {
          shop: {
            companyId: session.user.companyId,
          },
        },
      },
      include: {
        blog: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const shopId = post.blog.shopId

    await prisma.blogPost.delete({
      where: { id: params.id },
    })

    await prisma.shopEvent.create({
      data: {
        shopId: shopId,
        type: "blog.post_deleted",
        entityType: "blog_post",
        entityId: post.id,
        payload: {
          postId: post.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting blog post:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

