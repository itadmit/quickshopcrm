import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createVariantSchema = z.object({
  name: z.string().min(1, "שם הוריאציה הוא חובה"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  price: z.number().optional(),
  comparePrice: z.number().optional(),
  cost: z.number().optional(),
  inventoryQty: z.number().int().default(0),
  weight: z.number().optional(),
  image: z.string().optional(),
  option1: z.string().optional(),
  option1Value: z.string().optional(),
  option2: z.string().optional(),
  option2Value: z.string().optional(),
  option3: z.string().optional(),
  option3Value: z.string().optional(),
})

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

// GET - קבלת כל הוריאציות של מוצר
export async function GET(
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

    const variants = await prisma.productVariant.findMany({
      where: {
        productId: product.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    return NextResponse.json(variants)
  } catch (error) {
    console.error("Error fetching product variants:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת וריאציה חדשה
export async function POST(
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

    const body = await req.json()
    const data = createVariantSchema.parse(body)

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: data.name,
        sku: data.sku,
        barcode: data.barcode,
        price: data.price,
        comparePrice: data.comparePrice,
        cost: data.cost,
        inventoryQty: data.inventoryQty,
        weight: data.weight,
        image: data.image,
        option1: data.option1,
        option1Value: data.option1Value,
        option2: data.option2,
        option2Value: data.option2Value,
        option3: data.option3,
        option3Value: data.option3Value,
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: product.shopId,
        type: "product.variant.created",
        entityType: "product",
        entityId: product.id,
        payload: {
          productId: product.id,
          variantId: variant.id,
          name: variant.name,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(variant, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating product variant:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

