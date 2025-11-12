import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - יצירת תפריטים ברירת מחדל לכל החנויות של המשתמש
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה אם זה admin או manager
    const allowedRoles = ['ADMIN', 'MANAGER', 'SUPER_ADMIN']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized - Admin or Manager only" }, { status: 401 })
    }

    const body = await req.json()
    const userEmail = body.email || session.user.email

    if (!userEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // מציאת המשתמש לפי אימייל
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        company: {
          include: {
            shops: {
              include: {
                Navigation: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!user.companyId) {
      return NextResponse.json({ error: "User has no company" }, { status: 400 })
    }

    const company = user.company
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const shops = company.shops
    if (shops.length === 0) {
      return NextResponse.json({ 
        message: "No shops found for this user",
        created: 0 
      })
    }

    // תפריטים ברירת מחדל
    const defaultNavigations = [
      { name: "תפריט למחשב", location: "DESKTOP" },
      { name: "תפריט למובייל", location: "MOBILE" },
      { name: "תפריט לפוטר", location: "FOOTER" },
      { name: "תפריט לצ'ק אאוט", location: "CHECKOUT" },
    ]

    let totalCreated = 0
    const results = []

    // עבור כל חנות
    for (const shop of shops) {
      const existingLocations = new Set(shop.Navigation.map((nav: any) => nav.location))
      const createdForShop = []

      // יצירת תפריטים שחסרים
      for (const nav of defaultNavigations) {
        if (!existingLocations.has(nav.location)) {
          try {
            const navigation = await prisma.navigation.create({
              data: {
                shopId: shop.id,
                name: nav.name,
                location: nav.location,
                items: [],
              },
            })
            createdForShop.push(nav.location)
            totalCreated++
          } catch (error: any) {
            // אם יש שגיאה (למשל תפריט כבר קיים), נדלג
            console.error(`Error creating navigation ${nav.location} for shop ${shop.id}:`, error.message)
          }
        }
      }

      results.push({
        shopId: shop.id,
        shopName: shop.name,
        created: createdForShop,
        skipped: defaultNavigations.filter(nav => existingLocations.has(nav.location)).map(nav => nav.location),
      })
    }

    return NextResponse.json({
      message: `Created ${totalCreated} default navigations`,
      totalCreated,
      results,
    })
  } catch (error) {
    console.error("Error creating default navigations:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

