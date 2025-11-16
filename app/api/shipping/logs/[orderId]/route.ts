import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - היסטוריית לוגים של הזמנה
export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // בדיקה שההזמנה שייכת לחברה
    const order = await prisma.order.findFirst({
      where: {
        id: params.orderId,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "הזמנה לא נמצאה" },
        { status: 404 }
      )
    }

    // קבלת לוגים
    const logs = await prisma.shippingLog.findMany({
      where: {
        orderId: params.orderId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    })

    return NextResponse.json(logs)
  } catch (error: any) {
    console.error("Error getting shipping logs:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה בקבלת לוגי המשלוח",
      },
      { status: 500 }
    )
  }
}

