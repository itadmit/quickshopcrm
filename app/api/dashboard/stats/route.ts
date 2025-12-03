import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const companyId = session.user.companyId

    // Get all shops for the company
    const shops = await prisma.shop.findMany({
      where: { companyId },
      select: {
        id: true,
        isPublished: true,
        _count: {
          select: {
            products: true,
            orders: true,
            customers: true,
          },
        },
      },
    })

    // Get all products across all shops
    const products = await prisma.product.findMany({
      where: {
        shop: {
          companyId,
        },
      },
      select: {
        status: true,
      },
    })

    // Get all orders across all shops
    const orders = await prisma.order.findMany({
      where: {
        shop: {
          companyId,
        },
      },
      select: {
        status: true,
        total: true,
        createdAt: true,
      },
    })

    // Calculate stats
    const shopsTotal = shops.length
    // "חנויות פעילות" = כל החנויות במערכת (לא רק אלה שפורסמו)
    const shopsActive = shops.length

    const productsTotal = products.length
    const productsPublished = products.filter((p: any) => p.status === "PUBLISHED").length

    const ordersTotal = orders.length
    const ordersPending = orders.filter((o: any) => o.status === "PENDING").length

    // Calculate revenue - רק הזמנות שהושלמו (PAID, PROCESSING, SHIPPED, DELIVERED, COMPLETED)
    const completedStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CONFIRMED']
    const completedOrders = orders.filter((order: any) => 
      completedStatuses.includes(order.status.toUpperCase())
    )
    
    const revenueTotal = completedOrders.reduce((sum, order) => sum + order.total, 0)
    
    // Revenue this month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const revenueThisMonth = completedOrders
      .filter((order: any) => new Date(order.createdAt) >= startOfMonth)
      .reduce((sum, order) => sum + order.total, 0)

    // Get recent notifications
    const recentNotifications = await prisma.notification.findMany({
      where: {
        companyId,
      },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    })

    return NextResponse.json({
      shops: {
        total: shopsTotal,
        active: shopsActive,
      },
      products: {
        total: productsTotal,
        published: productsPublished,
      },
      orders: {
        total: ordersTotal,
        pending: ordersPending,
      },
      revenue: {
        total: revenueTotal,
        thisMonth: revenueThisMonth,
      },
      recentNotifications: recentNotifications.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

