import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

// GET - קבלת פופאפים פעילים לחנות (לפרונט)
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const shop = await prisma.shop.findUnique({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // קבלת פופאפים פעילים בלבד
    const popups = await prisma.popup.findMany({
      where: {
        shopId: shop.id,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(popups)
  } catch (error) {
    console.error("Error fetching popups:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

