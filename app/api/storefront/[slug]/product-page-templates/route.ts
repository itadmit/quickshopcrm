import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// סכמה לאלמנט בעמוד מוצר
const productPageElementSchema = z.object({
  id: z.string(),
  type: z.enum([
    "product-name",
    "product-price",
    "product-description",
    "product-gallery",
    "product-variants",
    "product-quantity",
    "product-buttons",
    "product-reviews",
    "product-related",
    "custom-text",
    "custom-accordion",
    "custom-html",
  ]),
  visible: z.boolean().default(true),
  position: z.number(),
  config: z.record(z.any()).optional(),
})

const createTemplateSchema = z.object({
  name: z.string().min(1, "שם התבנית חובה"),
  elements: z.array(productPageElementSchema),
  isActive: z.boolean().default(true),
})

// GET - קבלת כל התבניות של החנות
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const shop = await prisma.shop.findUnique({
      where: { slug: params.slug },
      select: { 
        id: true, 
        companyId: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // בדיקת הרשאות - רק בעלי חנות יכולים לראות תבניות
    if (session?.user?.companyId !== shop.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // קבלת תבניות מוצר - מודל לא קיים כרגע, מחזירים רשימה ריקה
    // TODO: להוסיף מודל ProductPageTemplate ל-Prisma schema
    const templates: any[] = []

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Error fetching product page templates:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת תבנית חדשה
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const shop = await prisma.shop.findUnique({
      where: { slug: params.slug },
      select: { id: true, companyId: true },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // בדיקת הרשאות
    if (session?.user?.companyId !== shop.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const data = createTemplateSchema.parse(body)

    // מודל לא קיים כרגע - מחזירים שגיאה
    // TODO: להוסיף מודל ProductPageTemplate ל-Prisma schema
    return NextResponse.json(
      { error: "Product page templates are not yet implemented" },
      { status: 501 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating product page template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

