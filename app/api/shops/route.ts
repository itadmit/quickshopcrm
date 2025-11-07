import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createShopSchema = z.object({
  name: z.string().min(2, "שם החנות חייב להכיל לפחות 2 תווים"),
  slug: z.string().min(2, "Slug חייב להכיל לפחות 2 תווים").regex(/^[a-z0-9-]+$/, "Slug יכול להכיל רק אותיות קטנות, מספרים ומקפים"),
  description: z.string().optional(),
  category: z.string().optional(),
  logo: z.string().nullable().optional(),
  email: z.string().email("אימייל לא תקין").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  workingHours: z.any().optional(),
  currency: z.string().default("ILS"),
  taxEnabled: z.boolean().default(true),
  taxRate: z.number().default(18),
  theme: z.string().optional(),
  themeSettings: z.any().optional(),
  settings: z.any().optional(),
})

// GET - קבלת כל החנויות של החברה
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const shops = await prisma.shop.findMany({
      where: {
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        description: true,
        logo: true,
        category: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true,
            orders: true,
            customers: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(shops)
  } catch (error) {
    console.error("Error fetching shops:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת חנות חדשה
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createShopSchema.parse(body)

    // בדיקה אם slug כבר קיים
    const existingShop = await prisma.shop.findUnique({
      where: { slug: data.slug },
    })

    if (existingShop) {
      return NextResponse.json(
        { error: "חנות עם slug זה כבר קיימת" },
        { status: 400 }
      )
    }

    // יצירת חנות
    const shop = await prisma.shop.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        category: data.category,
        logo: data.logo,
        email: data.email,
        phone: data.phone,
        address: data.address,
        workingHours: data.workingHours,
        currency: data.currency,
        taxEnabled: data.taxEnabled,
        taxRate: data.taxRate,
        theme: data.theme || "default",
        themeSettings: data.themeSettings || null,
        settings: data.settings || null,
        isPublished: true, // חנות חדשה תהיה פורסמת כברירת מחדל
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        category: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: shop.id,
        type: "shop.created",
        entityType: "shop",
        entityId: shop.id,
        payload: {
          shopId: shop.id,
          name: shop.name,
          slug: shop.slug,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(shop, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating shop:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

