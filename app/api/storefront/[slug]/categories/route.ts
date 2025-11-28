import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET - קבלת כל הקטגוריות לפרונט
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
      })
    } else {
      // אם המשתמש לא מחובר, רק חנויות מפורסמות
      shop = await prisma.shop.findUnique({
        where: {
          slug: params.slug,
          isPublished: true,
        },
      })
    }

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // שליפת קטגוריות
    const categories = await prisma.category.findMany({
      where: {
        shopId: shop.id,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
            _count: {
              select: {
                products: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

