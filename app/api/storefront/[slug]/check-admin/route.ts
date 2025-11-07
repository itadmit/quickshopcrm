import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - בדיקה אם המשתמש הוא מנהל החנות
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ isAdmin: false })
    }

    // בדיקה אם החנות שייכת לחברה של המשתמש
    const shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        companyId: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ isAdmin: false })
    }

    // בדיקה אם המשתמש הוא ADMIN או SUPER_ADMIN
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER"

    return NextResponse.json({ isAdmin })
  } catch (error) {
    console.error("Error checking admin status:", error)
    return NextResponse.json({ isAdmin: false })
  }
}

