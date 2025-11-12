import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - קבלת פרטי חנות לפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // אם המשתמש מחובר, נבדוק אם החנות שייכת לחברה שלו
    // זה מאפשר גישה גם לחנות לא מפורסמת אם היא שייכת לחברה שלו
    let shop
    if (session?.user?.companyId) {
      shop = await prisma.shop.findFirst({
        where: {
          slug: params.slug,
          companyId: session.user.companyId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          description: true,
          logo: true,
          favicon: true,
          category: true,
          email: true,
          phone: true,
          address: true,
          workingHours: true,
          currency: true,
          taxEnabled: true,
          taxRate: true,
          theme: true,
          themeSettings: true,
          settings: true,
          isPublished: true,
        },
      })
    } else {
      // אם המשתמש לא מחובר, נבדוק גם חנויות לא מפורסמות (לצורך הצגת דף תחזוקה)
      shop = await prisma.shop.findFirst({
        where: {
          slug: params.slug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          description: true,
          logo: true,
          favicon: true,
          category: true,
          email: true,
          phone: true,
          address: true,
          workingHours: true,
          currency: true,
          taxEnabled: true,
          taxRate: true,
          theme: true,
          themeSettings: true,
          settings: true,
          isPublished: true,
        },
      })
    }

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // הוספת cache headers ל-Next.js
    return NextResponse.json(shop, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    })
  } catch (error) {
    console.error("Error fetching shop info:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

