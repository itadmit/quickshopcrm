import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - קבלת דפים סטטיים לפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
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

    const pages = await prisma.page.findMany({
      where: {
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
        showInMenu: true,
        menuPosition: true,
      },
      orderBy: {
        menuPosition: "asc",
      },
    })

    return NextResponse.json(pages)
  } catch (error) {
    console.error("Error fetching pages:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

