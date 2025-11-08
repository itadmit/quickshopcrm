import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createCustomerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  shopId: z.string(),
  tier: z.enum(["REGULAR", "VIP", "PREMIUM"]).optional(),
  isSubscribed: z.boolean().optional(),
})

// GET - קבלת כל הלקוחות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const tier = searchParams.get("tier")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    // בניית where clause
    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    if (tier) {
      where.tier = tier
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ]
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          totalSpent: true,
          orderCount: true,
          tier: true,
          isSubscribed: true,
          createdAt: true,
          lastLoginAt: true,
          shop: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ])

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת לקוח חדש (רק לאדמין)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהמשתמש הוא ADMIN או SUPER_ADMIN
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const data = createCustomerSchema.parse(body)

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // בדיקה שהאימייל לא קיים כבר בחנות הזו
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        email: data.email,
        shopId: data.shopId,
      },
    })

    if (existingCustomer) {
      return NextResponse.json(
        { error: "Customer with this email already exists in this shop" },
        { status: 400 }
      )
    }

    // יצירת הלקוח
    const customer = await prisma.customer.create({
      data: {
        email: data.email,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        phone: data.phone || null,
        shopId: data.shopId,
        tier: data.tier || "REGULAR",
        isSubscribed: data.isSubscribed || false,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: customer.shopId,
        type: "customer.created",
        entityType: "customer",
        entityId: customer.id,
        payload: {
          customerId: customer.id,
          email: customer.email,
          createdBy: session.user.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    // טיפול בשגיאות Prisma
    if (error?.code === 'P2002') {
      // Unique constraint violation
      return NextResponse.json(
        { error: "Customer with this email already exists in this shop" },
        { status: 400 }
      )
    }

    if (error?.code === 'P2003') {
      // Foreign key constraint violation
      return NextResponse.json(
        { error: "Invalid shop ID or shop does not exist" },
        { status: 400 }
      )
    }

    console.error("Error creating customer:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

