import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateCustomerSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  addresses: z.any().optional(),
  tier: z.enum(["REGULAR", "VIP", "PREMIUM"]).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  isSubscribed: z.boolean().optional(),
})

// GET - קבלת פרטי לקוח
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
        _count: {
          select: {
            orders: true,
            carts: true,
            reviews: true,
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error fetching customer:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון לקוח
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהלקוח שייך לחברה
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateCustomerSchema.parse(body)

    // עדכון הלקוח
    const customer = await prisma.customer.update({
      where: { id: params.id },
      data,
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
        type: "customer.updated",
        entityType: "customer",
        entityId: customer.id,
        payload: {
          customerId: customer.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    // אם ה-tier השתנה, יצירת אירוע
    if (data.tier && data.tier !== existingCustomer.tier) {
      await prisma.shopEvent.create({
        data: {
          shopId: customer.shopId,
          type: "customer.tier_upgraded",
          entityType: "customer",
          entityId: customer.id,
          payload: {
            customerId: customer.id,
            oldTier: existingCustomer.tier,
            newTier: data.tier,
          },
          userId: session.user.id,
        },
      })
    }

    return NextResponse.json(customer)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating customer:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

