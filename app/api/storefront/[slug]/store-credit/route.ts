import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { jwtVerify } from "jose"

// GET - קבלת קרדיט בחנות של לקוח בסטורפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // נסה למצוא את החנות לפי slug או ID
    let shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    if (!shop) {
      shop = await prisma.shop.findFirst({
        where: {
          id: params.slug,
          isPublished: true,
        },
      })
    }

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const token = req.headers.get("x-customer-id")
    
    if (!token) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 401 })
    }

    // ניסיון לפענח JWT token
    let customerId: string | null = null
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
      const { payload } = await jwtVerify(token, secret)
      
      if (payload.shopId !== shop.id) {
        return NextResponse.json(
          { error: "אימות נכשל" },
          { status: 401 }
        )
      }
      
      customerId = payload.customerId as string
    } catch (jwtError) {
      // אם זה לא JWT, נניח שזה customerId ישיר
      customerId = token
    }

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 401 })
    }

    // מציאת קרדיט בחנות של הלקוח
    const storeCredit = await prisma.storeCredit.findFirst({
      where: {
        shopId: shop.id,
        customerId: customerId,
      },
      include: {
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10, // 10 העסקאות האחרונות
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(storeCredit || null)
  } catch (error) {
    console.error("Error fetching storefront store credit:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

