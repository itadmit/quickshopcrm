import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PUT - עדכון קטגוריות של איש קשר
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const body = await req.json()
    const { categoryTypes } = body // מערך של קטגוריות: ["CUSTOMER", "NEWSLETTER"]

    if (!Array.isArray(categoryTypes)) {
      return NextResponse.json(
        { error: "categoryTypes חייב להיות מערך" },
        { status: 400 }
      )
    }

    // בדיקה שהאיש קשר שייך לחברה
    const contact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!contact) {
      return NextResponse.json(
        { error: "איש קשר לא נמצא" },
        { status: 404 }
      )
    }

    // מציאת קטגוריות לפי type
    const categories = await prisma.contactCategory.findMany({
      where: {
        shopId: contact.shopId,
        type: { in: categoryTypes },
      },
    })

    if (categories.length !== categoryTypes.length) {
      return NextResponse.json(
        { error: "חלק מהקטגוריות לא נמצאו" },
        { status: 400 }
      )
    }

    // מחיקת כל ה-assignments הקיימים
    await prisma.contactCategoryAssignment.deleteMany({
      where: {
        contactId: params.id,
      },
    })

    // יצירת assignments חדשים
    await Promise.all(
      categories.map((category: any) =>
        prisma.contactCategoryAssignment.create({
          data: {
            contactId: params.id,
            categoryId: category.id,
            metadata: {
              updatedAt: new Date().toISOString(),
              source: "manual",
            },
          },
        })
      )
    )

    // רענון contact עם קטגוריות חדשות
    const updatedContact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        categoryAssignments: {
          include: {
            category: true,
          },
        },
        customer: true,
      },
    })

    return NextResponse.json(updatedContact)
  } catch (error: any) {
    console.error("Error updating contact categories:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה בעדכון קטגוריות",
      },
      { status: 500 }
    )
  }
}




