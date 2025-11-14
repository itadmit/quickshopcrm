import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { applyCollectionRules, CollectionRules } from "@/lib/collection-engine"
import { z } from "zod"

const previewRulesSchema = z.object({
  shopId: z.string(),
  rules: z.object({
    conditions: z.array(z.object({
      field: z.enum(["title", "price", "tag", "sku", "status", "availability"]),
      condition: z.enum(["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "starts_with", "ends_with"]),
      value: z.string(),
    })),
    matchType: z.enum(["all", "any"]),
  }),
})

/**
 * GET/POST - Preview של מוצרים שיתאימו לתנאים
 * מאפשר לראות אילו מוצרים יתווספו לקולקציה לפני שמירה
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = previewRulesSchema.parse(body)

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

    // קבלת רשימת מוצרים שמתאימים לתנאים
    const matchingProductIds = await applyCollectionRules(data.shopId, data.rules)

    // קבלת פרטי המוצרים
    const products = await prisma.product.findMany({
      where: {
        id: { in: matchingProductIds },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        images: true,
        status: true,
        availability: true,
        sku: true,
      },
      take: 50, // מוגבל ל-50 מוצרים ל-preview
    })

    return NextResponse.json({
      products,
      total: matchingProductIds.length,
      showing: products.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error previewing collection rules:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

