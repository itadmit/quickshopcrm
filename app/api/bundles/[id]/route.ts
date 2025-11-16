import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateBundleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  price: z.number().min(0).optional(),
  comparePrice: z.number().min(0).optional().nullable(),
  image: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  products: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
        position: z.number().int().default(0),
      })
    )
    .optional(),
})

// GET - קבלת חבילה ספציפית
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
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
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
              },
            },
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    })

    if (!bundle) {
      return NextResponse.json({ error: "חבילה לא נמצאה" }, { status: 404 })
    }

    return NextResponse.json(bundle)
  } catch (error: any) {
    console.error("Error fetching bundle:", error)
    return NextResponse.json(
      { error: "שגיאה בקבלת חבילה", details: error.message },
      { status: 500 }
    )
  }
}

// PATCH - עדכון חבילה
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
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
      return NextResponse.json({ error: "חבילה לא נמצאה" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateBundleSchema.parse(body)

    // עדכון החבילה
    const bundle = await prisma.bundle.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.comparePrice !== undefined && { comparePrice: data.comparePrice }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // עדכון מוצרים אם סופקו
    if (data.products) {
      // מחיקת מוצרים קיימים
      await prisma.bundleProduct.deleteMany({
        where: { bundleId: params.id },
      })

      // יצירת מוצרים חדשים
      await prisma.bundleProduct.createMany({
        data: data.products.map((p) => ({
          bundleId: params.id,
          productId: p.productId,
          quantity: p.quantity,
          position: p.position,
        })),
      })
    }

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: bundle.shopId,
        type: "bundle.updated",
        entityType: "bundle",
        entityId: bundle.id,
        payload: {
          bundleId: bundle.id,
          name: bundle.name,
        },
        userId: session.user.id,
      },
    })

    // טעינה מחדש עם המוצרים המעודכנים
    const updatedBundle = await prisma.bundle.findUnique({
      where: { id: params.id },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedBundle)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating bundle:", error)
    return NextResponse.json(
      { error: "שגיאה בעדכון חבילה", details: error.message },
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
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
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
      return NextResponse.json({ error: "חבילה לא נמצאה" }, { status: 404 })
    }

    await prisma.bundle.delete({
      where: { id: params.id },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: bundle.shopId,
        type: "bundle.deleted",
        entityType: "bundle",
        entityId: bundle.id,
        payload: {
          bundleId: bundle.id,
          name: bundle.name,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true, message: "חבילה נמחקה בהצלחה" })
  } catch (error: any) {
    console.error("Error deleting bundle:", error)
    return NextResponse.json(
      { error: "שגיאה במחיקת חבילה", details: error.message },
      { status: 500 }
    )
  }
}

