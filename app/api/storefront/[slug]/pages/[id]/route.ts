import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - קבלת דף סטטי ספציפי לפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    // מציאת החנות
    const shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const page = await prisma.page.findFirst({
      where: {
        id: params.id,
        shopId: shop.id,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        seoTitle: true,
        seoDescription: true,
      },
    })

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    return NextResponse.json(page)
  } catch (error) {
    console.error("Error fetching page:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

