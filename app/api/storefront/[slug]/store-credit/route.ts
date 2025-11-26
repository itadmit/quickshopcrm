import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyStorefrontCustomer } from "@/lib/storefront-auth"

// GET - קבלת קרדיט בחנות של לקוח בסטורפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // אימות לקוח (כולל בדיקה שהלקוח קיים)
    const auth = await verifyStorefrontCustomer(req, params.slug)
    if (!auth.success || !auth.customerId || !auth.shop) {
      return auth.error!
    }

    // מציאת קרדיט בחנות של הלקוח
    const storeCredit = await prisma.storeCredit.findFirst({
      where: {
        shopId: auth.shop.id,
        customerId: auth.customerId,
      },
      include: {
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10, // 10 העסקאות האחרונות
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(storeCredit || null)
  } catch (error) {
    console.error("Error fetching storefront store credit:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

