import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createStoreCreditSchema = z.object({
  shopId: z.string(),
  customerId: z.string(),
  amount: z.number().min(0, "סכום חייב להיות חיובי"),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
})

// GET - קבלת אשראי בחנות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")

    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    const credits = await prisma.storeCredit.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(credits)
  } catch (error) {
    console.error("Error fetching store credits:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת אשראי בחנות
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createStoreCreditSchema.parse(body)

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

    // בדיקה שהלקוח שייך לחנות
    const customer = await prisma.customer.findFirst({
      where: {
        id: data.customerId,
        shopId: data.shopId,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // בדיקה אם יש כבר אשראי ללקוח
    const existingCredit = await prisma.storeCredit.findFirst({
      where: {
        shopId: data.shopId,
        customerId: data.customerId,
      },
    })

    let credit
    if (existingCredit) {
      // עדכון יתרה קיימת
      credit = await prisma.storeCredit.update({
        where: { id: existingCredit.id },
        data: {
          balance: existingCredit.balance + data.amount,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : existingCredit.expiresAt,
          reason: data.notes || existingCredit.reason,
        },
      })
    } else {
      // יצירת אשראי חדש
      credit = await prisma.storeCredit.create({
        data: {
          shopId: data.shopId,
          customerId: data.customerId,
          amount: data.amount,
          balance: data.amount,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          reason: data.notes || null,
        },
      })
    }

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: data.shopId,
        type: "store_credit.created",
        entityType: "store_credit",
        entityId: credit.id,
        payload: {
          storeCreditId: credit.id,
          customerId: data.customerId,
          amount: data.amount,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(credit, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error creating store credit:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

