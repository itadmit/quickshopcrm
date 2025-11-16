import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createBundleSchema = z.object({
  shopId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  comparePrice: z.number().min(0).optional().nullable(),
  image: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  products: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
      position: z.number().int().default(0),
    })
  ),
})

// GET - קבלת כל החבילות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")

    if (!shopId) {
      return NextResponse.json({ error: "נא לספק shopId" }, { status: 400 })
    }

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "חנות לא נמצאה" }, { status: 404 })
    }

    const bundles = await prisma.bundle.findMany({
      where: { shopId },
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
          orderBy: {
            position: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(bundles)
  } catch (error: any) {
    console.error("Error fetching bundles:", error)
    return NextResponse.json(
      { error: "שגיאה בקבלת חבילות", details: error.message },
      { status: 500 }
    )
  }
}

// POST - יצירת חבילה חדשה
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const body = await req.json()
    const data = createBundleSchema.parse(body)

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "חנות לא נמצאה" }, { status: 404 })
    }

    // יצירת החבילה
    const bundle = await prisma.bundle.create({
      data: {
        shopId: data.shopId,
        name: data.name,
        description: data.description || null,
        price: data.price,
        comparePrice: data.comparePrice || null,
        image: data.image || null,
        isActive: data.isActive,
        products: {
          create: data.products.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
            position: p.position,
          })),
        },
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

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: bundle.shopId,
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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating bundle:", error)
    return NextResponse.json(
      { error: "שגיאה ביצירת חבילה", details: error.message },
      { status: 500 }
    )
  }
}

