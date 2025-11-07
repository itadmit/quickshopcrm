import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateDiscountSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "BUY_X_GET_Y", "VOLUME_DISCOUNT", "NTH_ITEM_DISCOUNT"]).optional(),
  value: z.number().min(0).optional(),
  buyQuantity: z.number().int().optional(),
  getQuantity: z.number().int().optional(),
  getDiscount: z.number().optional(),
  nthItem: z.number().int().optional(),
  volumeRules: z.any().optional(),
  minOrderAmount: z.number().optional(),
  maxDiscount: z.number().optional(),
  maxUses: z.number().int().optional(),
  usesPerCustomer: z.number().int().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  isAutomatic: z.boolean().optional(),
  canCombine: z.boolean().optional(),
  priority: z.number().int().optional(),
  target: z.enum([
    "ALL_PRODUCTS",
    "SPECIFIC_PRODUCTS",
    "SPECIFIC_CATEGORIES",
    "SPECIFIC_COLLECTIONS",
    "EXCLUDE_PRODUCTS",
    "EXCLUDE_CATEGORIES",
    "EXCLUDE_COLLECTIONS",
  ]).optional(),
  customerTarget: z.enum([
    "ALL_CUSTOMERS",
    "REGISTERED_CUSTOMERS",
    "SPECIFIC_CUSTOMERS",
    "CUSTOMER_TIERS",
  ]).optional(),
  applicableProducts: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional(),
  applicableCollections: z.array(z.string()).optional(),
  excludedProducts: z.array(z.string()).optional(),
  excludedCategories: z.array(z.string()).optional(),
  excludedCollections: z.array(z.string()).optional(),
  customerTiers: z.array(z.string()).optional(),
  specificCustomers: z.array(z.string()).optional(),
})

// GET - קבלת הנחה
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const discount = await prisma.discount.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!discount) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 })
    }

    return NextResponse.json(discount)
  } catch (error) {
    console.error("Error fetching discount:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון הנחה
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingDiscount = await prisma.discount.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingDiscount) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateDiscountSchema.parse(body)

    const discount = await prisma.discount.update({
      where: { id: params.id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type && { type: data.type }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.buyQuantity !== undefined && { buyQuantity: data.buyQuantity }),
        ...(data.getQuantity !== undefined && { getQuantity: data.getQuantity }),
        ...(data.getDiscount !== undefined && { getDiscount: data.getDiscount }),
        ...(data.nthItem !== undefined && { nthItem: data.nthItem }),
        ...(data.volumeRules !== undefined && { volumeRules: data.volumeRules }),
        ...(data.minOrderAmount !== undefined && { minOrderAmount: data.minOrderAmount }),
        ...(data.maxDiscount !== undefined && { maxDiscount: data.maxDiscount }),
        ...(data.maxUses !== undefined && { maxUses: data.maxUses }),
        ...(data.usesPerCustomer !== undefined && { usesPerCustomer: data.usesPerCustomer }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isAutomatic !== undefined && { isAutomatic: data.isAutomatic }),
        ...(data.canCombine !== undefined && { canCombine: data.canCombine }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.target && { target: data.target }),
        ...(data.customerTarget && { customerTarget: data.customerTarget }),
        ...(data.applicableProducts !== undefined && { applicableProducts: data.applicableProducts }),
        ...(data.applicableCategories !== undefined && { applicableCategories: data.applicableCategories }),
        ...(data.applicableCollections !== undefined && { applicableCollections: data.applicableCollections }),
        ...(data.excludedProducts !== undefined && { excludedProducts: data.excludedProducts }),
        ...(data.excludedCategories !== undefined && { excludedCategories: data.excludedCategories }),
        ...(data.excludedCollections !== undefined && { excludedCollections: data.excludedCollections }),
        ...(data.customerTiers !== undefined && { customerTiers: data.customerTiers }),
        ...(data.specificCustomers !== undefined && { specificCustomers: data.specificCustomers }),
      },
    })

    await prisma.shopEvent.create({
      data: {
        shopId: discount.shopId,
        type: "discount.updated",
        entityType: "discount",
        entityId: discount.id,
        payload: {
          discountId: discount.id,
          changes: data,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json(discount)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating discount:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת הנחה
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const discount = await prisma.discount.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!discount) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 })
    }

    await prisma.discount.delete({
      where: { id: params.id },
    })

    await prisma.shopEvent.create({
      data: {
        shopId: discount.shopId,
        type: "discount.deleted",
        entityType: "discount",
        entityId: discount.id,
        payload: {
          discountId: discount.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting discount:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

