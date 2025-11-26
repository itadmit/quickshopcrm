import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const themeSectionSchema = z.object({
  id: z.string(),
  type: z.enum(["section", "block"]),
  name: z.string(),
  icon: z.string().optional(),
  visible: z.boolean(),
  position: z.number(),
  blocks: z.array(z.any()).optional(),
  config: z.record(z.any()).optional(),
})

const updateThemeLayoutSchema = z.object({
  pageType: z.enum(["home", "category", "product"]),
  sections: z.array(themeSectionSchema),
})

// GET - טעינת theme layout לפי סוג דף
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { slug } = params
    const { searchParams } = new URL(request.url)
    const pageType = searchParams.get("pageType") as "home" | "category" | "product" | null

    if (!pageType) {
      return NextResponse.json({ error: "pageType is required" }, { status: 400 })
    }

    const shop = await prisma.shop.findUnique({
      where: { slug },
      select: {
        id: true,
        companyId: true,
        settings: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // בדיקת הרשאות - רק אם מחובר
    if (session?.user?.companyId) {
      if (shop.companyId !== session.user.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
    }

    const settings = (shop.settings as any) || {}
    const layoutKey = `${pageType}PageLayout`
    const layout = settings[layoutKey] || { sections: [] }

    return NextResponse.json({ 
      layout: {
        sections: layout.sections || [],
        ...layout
      }
    })
  } catch (error) {
    console.error("Error fetching theme layout:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - שמירת theme layout
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { slug } = params

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const shop = await prisma.shop.findUnique({
      where: { slug },
      select: {
        id: true,
        companyId: true,
        settings: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // בדיקת הרשאות
    if (shop.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { pageType, sections } = updateThemeLayoutSchema.parse(body)

    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: "Sections must be an array" }, { status: 400 })
    }

    // עדכון הגדרות החנות
    const currentSettings = (shop.settings as any) || {}
    const layoutKey = `${pageType}PageLayout`
    const updatedSettings = {
      ...currentSettings,
      [layoutKey]: {
        sections: sections.sort((a, b) => a.position - b.position),
        updatedAt: new Date().toISOString(),
      },
    }

    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        settings: updatedSettings,
      },
    })

    return NextResponse.json({ 
      success: true, 
      layout: updatedSettings[layoutKey] 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error saving theme layout:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

