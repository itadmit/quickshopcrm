import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createOptionSchema = z.object({
  name: z.string().min(1, "שם האפשרות הוא חובה"),
  type: z.enum(["button", "color", "image", "pattern"]).default("button"),
  values: z.array(z.object({
    id: z.string(),
    label: z.string(),
    metadata: z.any().optional(),
  })).min(1, "יש להוסיף לפחות ערך אחד"),
  position: z.number().int().default(0),
})

const updateOptionSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["button", "color", "image", "pattern"]).optional(),
  values: z.array(z.object({
    id: z.string(),
    label: z.string(),
    metadata: z.any().optional(),
  })).optional(),
  position: z.number().int().optional(),
})

// GET - קבלת כל האפשרויות של מוצר
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

    const options = await prisma.productOption.findMany({
      where: {
        productId: product.id,
      },
      orderBy: {
        position: "asc",
      },
    })

    return NextResponse.json(options)
  } catch (error) {
    console.error("Error fetching product options:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת אפשרות חדשה
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
    const data = createOptionSchema.parse(body)

    const option = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: data.name,
        type: data.type,
        values: data.values as any,
        position: data.position,
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: product.shopId,
        type: "product.option.created",
        entityType: "product",
        entityId: product.id,
        payload: {
          productId: product.id,
          optionId: option.id,
          name: option.name,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(option, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating product option:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

