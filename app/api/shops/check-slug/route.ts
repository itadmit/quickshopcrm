import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - בדיקת זמינות slug
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")
    const shopId = searchParams.get("shopId") // ID של החנות הנוכחית (אם עורכים)

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 })
    }

    // ולידציה בסיסית
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ 
        available: false, 
        error: "Slug יכול להכיל רק אותיות קטנות, מספרים ומקפים" 
      })
    }

    if (slug.length < 2) {
      return NextResponse.json({ 
        available: false, 
        error: "Slug חייב להכיל לפחות 2 תווים" 
      })
    }

    // בדיקה אם ה-slug כבר קיים
    const existingShop = await prisma.shop.findUnique({
      where: { slug },
      select: { id: true, companyId: true },
    })

    // אם זה אותו shop, ה-slug זמין
    if (existingShop && shopId && existingShop.id === shopId) {
      return NextResponse.json({ available: true })
    }

    // אם ה-slug תפוס על ידי חנות אחרת
    if (existingShop) {
      return NextResponse.json({ 
        available: false, 
        error: "חנות עם slug זה כבר קיימת" 
      })
    }

    // ה-slug פנוי
    return NextResponse.json({ available: true })
  } catch (error) {
    console.error("Error checking slug availability:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

