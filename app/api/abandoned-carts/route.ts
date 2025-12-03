import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - קבלת עגלות נטושות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")

    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
      abandonedAt: {
        not: null,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    const carts = await prisma.cart.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        abandonedAt: "desc",
      },
    })

    return NextResponse.json(carts)
  } catch (error) {
    console.error("Error fetching abandoned carts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

