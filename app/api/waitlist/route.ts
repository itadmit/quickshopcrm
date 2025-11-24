import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - קבלת רשימת המתנה (לניהול)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const productId = searchParams.get("productId")
    const variantId = searchParams.get("variantId")

    if (!shopId) {
      return NextResponse.json({ error: "shopId נדרש" }, { status: 400 })
    }

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "חנות לא נמצאה" }, { status: 404 })
    }

    const where: any = {
      shopId,
    }

    if (productId) {
      where.productId = productId
    }

    if (variantId) {
      where.variantId = variantId
    }

    const waitlist = await prisma.waitlist.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            option1: true,
            option1Value: true,
            option2: true,
            option2Value: true,
            option3: true,
            option3Value: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(waitlist)
  } catch (error) {
    console.error("Error fetching waitlist:", error)
    return NextResponse.json(
      { error: "שגיאה בטעינת רשימת המתנה" },
      { status: 500 }
    )
  }
}

// POST - הרשמה לרשימת המתנה
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { shopId, productId, variantId, email, customerId } = body

    if (!shopId || !productId || !email) {
      return NextResponse.json(
        { error: "shopId, productId ו-email נדרשים" },
        { status: 400 }
      )
    }

    // בדיקה שהמוצר קיים
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        shopId,
      },
      include: {
        variants: variantId
          ? {
              where: {
                id: variantId,
              },
            }
          : false,
      },
    })

    if (!product) {
      return NextResponse.json({ error: "מוצר לא נמצא" }, { status: 404 })
    }

    // אם יש variantId, בדיקה שהוא קיים
    if (variantId) {
      const variant = product.variants?.find((v: any) => v.id === variantId)
      if (!variant) {
        return NextResponse.json(
          { error: "וריאציה לא נמצאה" },
          { status: 404 }
        )
      }
    }

    // בדיקה אם כבר קיים רשומה
    const existing = await prisma.waitlist.findFirst({
      where: {
        shopId,
        productId,
        variantId: variantId || null,
        email,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "כבר נרשמת לרשימת המתנה למוצר זה" },
        { status: 400 }
      )
    }

    // יצירת רשומה חדשה
    const waitlistItem = await prisma.waitlist.create({
      data: {
        shopId,
        productId,
        variantId: variantId || null,
        email,
        customerId: customerId || null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(waitlistItem)
  } catch (error: any) {
    console.error("Error creating waitlist entry:", error)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "כבר נרשמת לרשימת המתנה למוצר זה" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "שגיאה בהרשמה לרשימת המתנה" },
      { status: 500 }
    )
  }
}

