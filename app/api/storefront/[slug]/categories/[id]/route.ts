import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET - קבלת קטגוריה ספציפית לפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
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

    // שליפת collection (שאנחנו קוראים לה קטגוריה)
    const collection = await prisma.collection.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shopId: shop.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        type: true,
        rules: true,
        seoTitle: true,
        seoDescription: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    if (!collection) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // המרה לפורמט של קטגוריה (כדי שהפרונט ימשיך לעבוד)
    const categoryFormat = {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      image: collection.image,
      parentId: null, // collections אין להן parent
      parent: null,
      children: [], // collections אין להן children
      _count: collection._count,
    }

    return NextResponse.json(categoryFormat)
  } catch (error) {
    console.error("Error fetching category:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

