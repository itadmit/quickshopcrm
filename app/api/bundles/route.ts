import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createBundleSchema = z.object({
  shopId: z.string(),
  name: z.string().min(1, "שם החבילה הוא חובה"),
  description: z.string().optional(),
  price: z.number().min(0, "מחיר חייב להיות חיובי"),
  comparePrice: z.number().optional(),
  isActive: z.boolean().default(true),
  products: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
      position: z.number().int(),
    })
  ),
})

// POST - יצירת חבילת מוצרים
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createBundleSchema.parse(body)

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

    // יצירת חבילה
    const bundle = await prisma.bundle.create({
      data: {
        shopId: data.shopId,
        name: data.name,
        description: data.description,
        price: data.price,
        comparePrice: data.comparePrice,
        isActive: data.isActive,
        products: {
          create: data.products,
        },
      },
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: data.shopId,
        type: "bundle.created",
        entityType: "bundle",
        entityId: bundle.id,
        payload: {
          bundleId: bundle.id,
          name: bundle.name,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(bundle, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error creating bundle:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
