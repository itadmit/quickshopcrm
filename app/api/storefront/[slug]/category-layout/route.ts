import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateCategoryLayoutSchema = z.object({
  layout: z.enum(["grid", "list", "compact-grid", "large-grid"]),
})

// GET - קבלת תצוגת הקטגוריה
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
    const categoryLayout = settings.categoryLayout || "grid"

    return NextResponse.json({ layout: categoryLayout })
  } catch (error) {
    console.error("Error fetching category layout:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - שמירת תצוגת הקטגוריה
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
    const { layout } = updateCategoryLayoutSchema.parse(body)

    // עדכון ההגדרות עם merge של ההגדרות הקיימות
    const currentSettings = (shop.settings as any) || {}
    const updatedSettings = {
      ...currentSettings,
      categoryLayout: layout,
    }

    // עדכון במסד הנתונים
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        settings: updatedSettings,
      },
    })

    return NextResponse.json({ success: true, layout })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating category layout:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

