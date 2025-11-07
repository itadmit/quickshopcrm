import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateBundleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  comparePrice: z.number().optional(),
  isActive: z.boolean().optional(),
  products: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
      position: z.number().int(),
    })
  ).optional(),
})

// GET - קבלת חבילה
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bundle = await prisma.bundle.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        products: {
          include: {
            product: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    })

    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    return NextResponse.json(bundle)
  } catch (error) {
    console.error("Error fetching bundle:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון חבילה
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingBundle = await prisma.bundle.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingBundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateBundleSchema.parse(body)

    // עדכון חבילה
    const bundle = await prisma.bundle.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.comparePrice !== undefined && { comparePrice: data.comparePrice }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    // עדכון מוצרים אם ניתנו
    if (data.products) {
      // מחיקת מוצרים קיימים
      await prisma.bundleProduct.deleteMany({
        where: { bundleId: params.id },
      })

      // הוספת מוצרים חדשים
      await prisma.bundleProduct.createMany({
        data: data.products.map((p) => ({
          bundleId: params.id,
          productId: p.productId,
          quantity: p.quantity,
          position: p.position,
        })),
      })
    }

    await prisma.shopEvent.create({
      data: {
        shopId: bundle.shopId,
        type: "bundle.updated",
        entityType: "bundle",
        entityId: bundle.id,
        payload: {
          bundleId: bundle.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(bundle)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating bundle:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת חבילה
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bundle = await prisma.bundle.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    await prisma.bundle.delete({
      where: { id: params.id },
    })

    await prisma.shopEvent.create({
      data: {
        shopId: bundle.shopId,
        type: "bundle.deleted",
        entityType: "bundle",
        entityId: bundle.id,
        payload: {
          bundleId: bundle.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting bundle:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

