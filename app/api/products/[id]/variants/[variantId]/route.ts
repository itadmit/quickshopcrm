import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateVariantSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  price: z.number().optional(),
  comparePrice: z.number().optional(),
  cost: z.number().optional(),
  inventoryQty: z.number().int().optional(),
  weight: z.number().optional(),
  image: z.string().optional(),
  option1: z.string().optional(),
  option1Value: z.string().optional(),
  option2: z.string().optional(),
  option2Value: z.string().optional(),
  option3: z.string().optional(),
  option3Value: z.string().optional(),
})

// GET - קבלת פרטי וריאציה
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהוריאציה שייכת למוצר ולחברה
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: params.variantId,
        product: {
          OR: [
            { id: params.id },
            { slug: params.id }
          ],
          shop: {
            companyId: session.user.companyId,
          },
        },
      },
    })

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 })
    }

    return NextResponse.json(variant)
  } catch (error) {
    console.error("Error fetching variant:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון וריאציה
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהוריאציה שייכת למוצר ולחברה
    const existingVariant = await prisma.productVariant.findFirst({
      where: {
        id: params.variantId,
        product: {
          OR: [
            { id: params.id },
            { slug: params.id }
          ],
          shop: {
            companyId: session.user.companyId,
          },
        },
      },
      include: {
        product: true,
      },
    })

    if (!existingVariant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateVariantSchema.parse(body)

    const variant = await prisma.productVariant.update({
      where: { id: params.variantId },
      data,
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: existingVariant.product.shopId,
        type: "product.variant.updated",
        entityType: "product",
        entityId: params.id,
        payload: {
          productId: params.id,
          variantId: variant.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(variant)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating variant:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת וריאציה
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהוריאציה שייכת למוצר ולחברה
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: params.variantId,
        product: {
          OR: [
            { id: params.id },
            { slug: params.id }
          ],
          shop: {
            companyId: session.user.companyId,
          },
        },
      },
      include: {
        product: true,
      },
    })

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 })
    }

    await prisma.productVariant.delete({
      where: { id: params.variantId },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: variant.product.shopId,
        type: "product.variant.deleted",
        entityType: "product",
        entityId: params.id,
        payload: {
          productId: params.id,
          variantId: params.variantId,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "Variant deleted successfully" })
  } catch (error) {
    console.error("Error deleting variant:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

