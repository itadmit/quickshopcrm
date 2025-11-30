import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[\u0590-\u05FFa-zA-Z0-9\-]+$/).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().nullable().optional(),
  type: z.enum(["MANUAL", "AUTOMATIC"]).optional(),
  rules: z.any().optional(),
  isPublished: z.boolean().optional(),
  productIds: z.array(z.string()).optional(),
})

// GET - קבלת קטגוריה לפי slug
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const category = await prisma.category.findFirst({
      where: {
        slug: params.slug,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
          },
        },
        products: {
          select: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                images: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error("Error fetching category:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון קטגוריה
export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = updateCategorySchema.parse(body)

    // בדיקה שהקטגוריה שייכת לחברה
    const category = await prisma.category.findFirst({
      where: {
        slug: params.slug,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // בדיקת parentId אם קיים
    if (data.parentId !== undefined) {
      if (data.parentId === null) {
        // הסרת parent
        data.parentId = null
      } else {
        const parent = await prisma.category.findFirst({
          where: {
            id: data.parentId,
            shopId: category.shopId,
          },
        })

        if (!parent) {
          return NextResponse.json({ error: "Parent category not found" }, { status: 404 })
        }

        // בדיקה שלא יוצרים לולאה (קטגוריה לא יכולה להיות parent של עצמה)
        if (data.parentId === category.id) {
          return NextResponse.json({ error: "Category cannot be its own parent" }, { status: 400 })
        }
      }
    }

    // בדיקת slug אם השתנה
    if (data.slug && data.slug !== category.slug) {
      const existingCategory = await prisma.category.findFirst({
        where: {
          shopId: category.shopId,
          slug: data.slug,
          id: { not: category.id },
        },
      })

      if (existingCategory) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 400 })
      }
    }

    // עדכון מוצרים אם זה MANUAL
    if (data.type === "MANUAL" && data.productIds !== undefined) {
      // מחיקת כל המוצרים הקיימים
      await prisma.productCategory.deleteMany({
        where: { categoryId: category.id },
      })
      
      // הוספת המוצרים החדשים
      if (data.productIds.length > 0) {
        await Promise.all(
          data.productIds.map((productId) =>
            prisma.productCategory.create({
              data: {
                productId,
                categoryId: category.id,
              },
            })
          )
        )
      }
    }

    // עדכון rules אם זה AUTOMATIC
    if (data.type === "AUTOMATIC" && data.rules) {
      const { applyCollectionRules } = await import("@/lib/collection-engine")
      const matchingProductIds = await applyCollectionRules(category.shopId, data.rules)
      
      // מחיקת כל המוצרים הקיימים
      await prisma.productCategory.deleteMany({
        where: { categoryId: category.id },
      })
      
      // הוספת המוצרים החדשים
      if (matchingProductIds.length > 0) {
        await prisma.$transaction(
          matchingProductIds.map((productId) =>
            prisma.productCategory.upsert({
              where: {
                productId_categoryId: {
                  productId,
                  categoryId: category.id,
                },
              },
              update: {},
              create: {
                productId,
                categoryId: category.id,
              },
            })
          )
        )
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: category.id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        image: data.image,
        parentId: data.parentId,
        type: data.type,
        rules: data.rules,
        isPublished: data.isPublished,
      },
    })

    return NextResponse.json(updatedCategory)
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating category:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת קטגוריה
export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהקטגוריה שייכת לחברה
    const category = await prisma.category.findFirst({
      where: {
        slug: params.slug,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // מחיקת הקטגוריה (עם כל הקשרים - cascade)
    await prisma.category.delete({
      where: { id: category.id },
    })

    return NextResponse.json({ message: "הקטגוריה נמחקה בהצלחה" })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

