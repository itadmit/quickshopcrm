import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - קבלת נתונים סטטיסטיים למשפיען
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהמשתמש הוא משפיען
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || user.role !== "INFLUENCER") {
      return NextResponse.json({ error: "Unauthorized - Influencer only" }, { status: 403 })
    }

    // קבלת כל הקופונים של המשפיען
    const coupons = await prisma.coupon.findMany({
      where: {
        influencerId: user.id,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    if (coupons.length === 0) {
      return NextResponse.json({
        coupons: [],
        totalOrders: 0,
        totalRevenue: 0,
        totalDiscount: 0,
        orders: [],
        stats: {
          clicks: 0,
          conversions: 0,
          conversionRate: 0,
          averageOrderValue: 0,
        },
      })
    }

    // קבלת כל הקודים
    const couponCodes = coupons.map((c) => c.code)

    // קבלת הזמנות שבוצעו עם הקופונים של המשפיען
    const orders = await prisma.order.findMany({
      where: {
        couponCode: {
          in: couponCodes,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // חישוב סטטיסטיקות
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
    const totalDiscount = orders.reduce((sum, order) => sum + order.discount, 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // קבלת מוצרים פופולריים
    const productSales: Record<string, { product: any; count: number; revenue: number }> = {}
    
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.product) {
          const key = item.product.id
          if (!productSales[key]) {
            productSales[key] = {
              product: item.product,
              count: 0,
              revenue: 0,
            }
          }
          productSales[key].count += item.quantity
          productSales[key].revenue += item.total
        }
      })
    })

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => ({
        id: item.product.id,
        name: item.product.name,
        image: item.product.images[0] || null,
        quantitySold: item.count,
        revenue: item.revenue,
      }))

    // קבלת נתונים לפי חודש (12 חודשים אחרונים)
    const monthlyData: Record<string, { revenue: number; orders: number }> = {}
    const now = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      monthlyData[key] = { revenue: 0, orders: 0 }
    }

    orders.forEach((order) => {
      const date = new Date(order.createdAt)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      if (monthlyData[key]) {
        monthlyData[key].revenue += order.total
        monthlyData[key].orders += 1
      }
    })

    const monthlyChartData = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      orders: data.orders,
    }))

    return NextResponse.json({
      coupons: coupons.map((c) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        value: c.value,
        usedCount: c.usedCount,
        maxUses: c.maxUses,
        isActive: c.isActive,
        startDate: c.startDate,
        endDate: c.endDate,
        shop: c.shop,
      })),
      totalOrders,
      totalRevenue,
      totalDiscount,
      averageOrderValue,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        total: o.total,
        discount: o.discount,
        status: o.status,
        couponCode: o.couponCode,
        createdAt: o.createdAt,
        customerName: o.customerName,
        shop: o.shop,
        items: o.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
      })),
      topProducts,
      monthlyChartData,
    })
  } catch (error) {
    console.error("Error fetching influencer stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
