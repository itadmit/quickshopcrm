import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - קבלת כל הפיקסלים הפעילים של החנות (לשימוש בפרונט)
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const shop = await prisma.shop.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    })

    if (!shop) {
      return NextResponse.json({ error: "חנות לא נמצאה" }, { status: 404 })
    }

    // בדיקה שהמודל קיים
    if (!prisma.trackingPixel) {
      console.error("trackingPixel model not found in Prisma Client")
      return NextResponse.json(
        { error: "שגיאה בטעינת פיקסלים - מודל לא נמצא" },
        { status: 500 }
      )
    }

    const pixels = await prisma.trackingPixel.findMany({
      where: {
        shopId: shop.id,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        pixelId: true,
        accessToken: true,
        events: true,
      },
    })

    return NextResponse.json(pixels)
  } catch (error) {
    console.error("Error fetching tracking pixels:", error)
    console.error("Error details:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "שגיאה בטעינת פיקסלים" },
      { status: 500 }
    )
  }
}

