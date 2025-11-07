import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateGalleryLayoutSchema = z.object({
  layout: z.enum(["standard", "right-side", "left-side", "masonry", "fixed"]),
})

// GET - קבלת תצוגת הגלריה
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
    const galleryLayout = settings.productGalleryLayout || "standard"

    return NextResponse.json({ layout: galleryLayout })
  } catch (error) {
    console.error("Error fetching gallery layout:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - שמירת תצוגת הגלריה
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
    const { layout } = updateGalleryLayoutSchema.parse(body)

    // עדכון ההגדרות עם merge של ההגדרות הקיימות
    const currentSettings = (shop.settings as any) || {}
    const updatedSettings = {
      ...currentSettings,
      productGalleryLayout: layout,
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

    console.error("Error updating gallery layout:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

