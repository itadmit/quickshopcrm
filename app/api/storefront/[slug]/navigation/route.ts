import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - קבלת תפריטי ניווט לפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // מציאת החנות
    const shop = await prisma.shop.findUnique({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const location = searchParams.get("location") // HEADER, FOOTER, SIDEBAR

    const where: any = {
      shopId: shop.id,
    }

    if (location) {
      where.location = location
    }

    const navigations = await prisma.navigation.findMany({
      where,
      select: {
        id: true,
        name: true,
        location: true,
        items: true,
      },
    })

    return NextResponse.json(navigations)
  } catch (error) {
    console.error("Error fetching navigation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

