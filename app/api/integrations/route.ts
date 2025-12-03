import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - קבלת כל האינטגרציות של החברה
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 }
      )
    }

    const integrations = await prisma.integration.findMany({
      where: {
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        type: true,
        name: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
        // לא נחזיר apiKey ו-apiSecret מסיבות אבטחה
      },
    })

    return NextResponse.json(integrations)
  } catch (error) {
    console.error("Error fetching integrations:", error)
    return NextResponse.json(
      { error: "שגיאה בקבלת אינטגרציות" },
      { status: 500 }
    )
  }
}

