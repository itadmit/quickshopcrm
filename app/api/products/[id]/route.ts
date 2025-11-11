import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().min(0).optional(),
  comparePrice: z.number().optional(),
  cost: z.number().optional(),
  taxEnabled: z.boolean().optional(),
  inventoryEnabled: z.boolean().optional(),
  inventoryQty: z.number().int().optional(),
  lowStockAlert: z.number().int().optional(),
  weight: z.number().optional(),
  dimensions: z.any().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  images: z.array(z.string()).optional(),
  video: z.string().optional(),
  minQuantity: z.number().int().optional(),
  maxQuantity: z.number().int().optional(),
  availability: z.enum(["IN_STOCK", "OUT_OF_STOCK", "PRE_ORDER", "BACKORDER", "DISCONTINUED"]).optional(),
  availableDate: z.string().datetime().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  customFields: z.any().optional(),
})

// GET - קבלת פרטי מוצר
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            domain: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        tags: true,
        variants: true,
        options: true,
        reviews: {
          where: {
            isApproved: true,
          },
          take: 10,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון מוצר
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהמוצר שייך לחברה
    const existingProduct = await prisma.product.findFirst({
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

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateProductSchema.parse(body)

    // אם משנים slug, בדיקה שהוא לא תפוס
    if (data.slug && data.slug !== existingProduct.slug) {
      const slugExists = await prisma.product.findFirst({
        where: {
          shopId: existingProduct.shopId,
          slug: data.slug,
          NOT: {
            id: existingProduct.id
          }
        },
      })

      if (slugExists) {
        return NextResponse.json(
          { error: "מוצר עם slug זה כבר קיים בחנות זו" },
          { status: 400 }
        )
      }
    }

    // המרת availableDate אם קיים
    const updateData: any = { ...data }
    if (updateData.availableDate) {
      updateData.availableDate = new Date(updateData.availableDate)
    }

    // עדכון המוצר
    const product = await prisma.product.update({
      where: { id: existingProduct.id },
      data: updateData,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            domain: true,
          },
        },
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: product.shopId,
        type: "product.updated",
        entityType: "product",
        entityId: product.id,
        payload: {
          productId: product.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating product:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת מוצר
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהמוצר שייך לחברה
    const product = await prisma.product.findFirst({
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

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // מחיקת המוצר (עם כל הקשרים - cascade)
    await prisma.product.delete({
      where: { id: product.id },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: product.shopId,
        type: "product.deleted",
        entityType: "product",
        entityId: product.id,
        payload: {
          productId: product.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "Product deleted successfully" })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

