import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE - מחיקת רשומה מרשימת המתנה
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const { id } = params

    // מציאת הרשומה
    const waitlistItem = await prisma.waitlist.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            companyId: true,
          },
        },
      },
    })

    if (!waitlistItem) {
      return NextResponse.json({ error: "רשומה לא נמצאה" }, { status: 404 })
    }

    // בדיקה שהחנות שייכת לחברה
    if (waitlistItem.shop.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 })
    }

    // מחיקת הרשומה
    await prisma.waitlist.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting waitlist entry:", error)
    return NextResponse.json(
      { error: "שגיאה במחיקת רשומה" },
      { status: 500 }
    )
  }
}

