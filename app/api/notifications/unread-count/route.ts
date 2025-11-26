import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ספירה מהירה של התראות שלא נקראו בלי לטעון את כל הנתונים
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        companyId: session.user.companyId,
        isRead: false,
      },
    })

    return NextResponse.json({ count: unreadCount })
  } catch (error) {
    console.error("Error fetching unread count:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


