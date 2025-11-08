import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

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
  config: z.record(z.any()).optional(), // הגדרות נוספות לכל אלמנט
})

const updateProductPageLayoutSchema = z.object({
  elements: z.array(productPageElementSchema),
})

// GET - קבלת ה-layout של עמוד המוצר
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const shop = await prisma.shop.findUnique({
      where: { slug: params.slug },
      select: { id: true, settings: true },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const settings = (shop.settings as any) || {}
    const productPageLayout = settings.productPageLayout || getDefaultLayout()

    return NextResponse.json({ layout: productPageLayout })
  } catch (error) {
    console.error("Error fetching product page layout:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - שמירת ה-layout של עמוד המוצר
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const shop = await prisma.shop.findUnique({
      where: { slug: params.slug },
      select: { id: true, settings: true },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const body = await req.json()
    const { elements } = updateProductPageLayoutSchema.parse(body)

    // עדכון ההגדרות עם merge של ההגדרות הקיימות
    const currentSettings = (shop.settings as any) || {}
    const updatedSettings = {
      ...currentSettings,
      productPageLayout: {
        elements: elements.sort((a, b) => a.position - b.position),
        updatedAt: new Date().toISOString(),
      },
    }

    // עדכון במסד הנתונים
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        settings: updatedSettings,
      },
    })

    return NextResponse.json({ success: true, layout: updatedSettings.productPageLayout })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating product page layout:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// פונקציה להחזרת layout ברירת מחדל
function getDefaultLayout() {
  return {
    elements: [
      { id: "gallery", type: "product-gallery", visible: true, position: 0 },
      { id: "name", type: "product-name", visible: true, position: 1 },
      { id: "price", type: "product-price", visible: true, position: 2 },
      { id: "description", type: "product-description", visible: true, position: 3 },
      { id: "variants", type: "product-variants", visible: true, position: 4 },
      { id: "quantity", type: "product-quantity", visible: true, position: 5 },
      { id: "buttons", type: "product-buttons", visible: true, position: 6 },
      { id: "reviews", type: "product-reviews", visible: true, position: 7 },
      { id: "related", type: "product-related", visible: true, position: 8 },
    ],
    updatedAt: new Date().toISOString(),
  }
}

