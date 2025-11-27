import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - אתחול קטגוריות בסיסיות לכל החנויות של החברה
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const companyId = session.user.companyId

    // מציאת כל החנויות של החברה
    const shops = await prisma.shop.findMany({
      where: { companyId },
      select: { id: true, name: true },
    })

    if (shops.length === 0) {
      return NextResponse.json(
        { error: "לא נמצאו חנויות לחברה" },
        { status: 404 }
      )
    }

    // הגדרת הקטגוריות הבסיסיות
    const defaultCategories = [
      {
        type: "CUSTOMER" as const,
        name: "לקוחות",
        description: "לקוחות שרכשו באתר",
        color: "#10b981", // ירוק
      },
      {
        type: "CLUB_MEMBER" as const,
        name: "חברי מועדון",
        description: "נרשמו לאתר",
        color: "#3b82f6", // כחול
      },
      {
        type: "NEWSLETTER" as const,
        name: "ניוזלטר",
        description: "נרשמו לטופס ניוזלטר",
        color: "#f59e0b", // כתום
      },
      {
        type: "CONTACT_FORM" as const,
        name: "יצירת קשר",
        description: "השאירו הודעה בטופס יצירת קשר",
        color: "#8b5cf6", // סגול
      },
    ]

    const results = []

    // יצירת קטגוריות לכל חנות
    for (const shop of shops) {
      const shopCategories = []
      
      for (const category of defaultCategories) {
        const existing = await prisma.contactCategory.findUnique({
          where: {
            shopId_type: {
              shopId: shop.id,
              type: category.type,
            },
          },
        })

        if (!existing) {
          const created = await prisma.contactCategory.create({
            data: {
              shopId: shop.id,
              ...category,
            },
          })
          shopCategories.push(created)
        } else {
          shopCategories.push(existing)
        }
      }

      results.push({
        shopId: shop.id,
        shopName: shop.name,
        categories: shopCategories.length,
      })
    }

    return NextResponse.json({
      success: true,
      message: `קטגוריות בסיסיות נוצרו בהצלחה ל-${results.length} חנויות`,
      results,
    })
  } catch (error: any) {
    console.error("Error initializing contact categories:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה באתחול קטגוריות",
      },
      { status: 500 }
    )
  }
}



