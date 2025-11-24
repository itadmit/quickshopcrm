import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - דוחות מקורות תנועה
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!shopId) {
      return NextResponse.json({ error: "shopId is required" }, { status: 400 })
    }

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // בניית where clause לתאריכים
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // סוף היום
      dateFilter.lte = end
    }

    const whereClause: any = {
      shopId,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    }

    // סטטיסטיקות כלליות
    const totalOrders = await prisma.order.count({
      where: whereClause,
    })

    const totalRevenue = await prisma.order.aggregate({
      where: whereClause,
      _sum: {
        total: true,
      },
    })

    // הזמנות ממקורות מעקב (עם UTM או trafficSourceId)
    const trackedOrdersWhere = {
      ...whereClause,
      OR: [
        { trafficSourceId: { not: null } },
        { utmSource: { not: null } },
      ],
    }

    const trackedOrdersCount = await prisma.order.count({
      where: trackedOrdersWhere,
    })

    const trackedRevenue = await prisma.order.aggregate({
      where: trackedOrdersWhere,
      _sum: {
        total: true,
      },
    })

    // דוח מפורט לפי מקורות תנועה מוגדרים
    const trafficSources = await prisma.trafficSource.findMany({
      where: {
        shopId,
      },
      include: {
        orders: {
          where: Object.keys(dateFilter).length > 0
            ? { createdAt: dateFilter }
            : {},
          select: {
            id: true,
            total: true,
            createdAt: true,
          },
        },
      },
    })

    const trafficSourcesReport = trafficSources.map((source) => {
      const orders = source.orders
      const revenue = orders.reduce((sum, order) => sum + order.total, 0)
      const avgOrder = orders.length > 0 ? revenue / orders.length : 0

      return {
        id: source.id,
        name: source.name,
        uniqueId: source.uniqueId,
        medium: source.medium,
        campaign: source.campaign,
        orders: orders.length,
        revenue,
        avgOrder,
      }
    })

    // דוח UTM מפורט (כל ההפניות, גם ללא מקור מוגדר)
    const utmOrders = await prisma.order.findMany({
      where: {
        ...whereClause,
        OR: [
          { utmSource: { not: null } },
          { utmMedium: { not: null } },
          { utmCampaign: { not: null } },
        ],
      },
      select: {
        id: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        total: true,
        createdAt: true,
      },
    })

    // קיבוץ לפי UTM parameters
    const utmReportMap = new Map<string, {
      source: string | null
      medium: string | null
      campaign: string | null
      orders: number
      revenue: number
    }>()

    utmOrders.forEach((order) => {
      const key = `${order.utmSource || 'null'}_${order.utmMedium || 'null'}_${order.utmCampaign || 'null'}`
      
      if (!utmReportMap.has(key)) {
        utmReportMap.set(key, {
          source: order.utmSource,
          medium: order.utmMedium,
          campaign: order.utmCampaign,
          orders: 0,
          revenue: 0,
        })
      }

      const entry = utmReportMap.get(key)!
      entry.orders += 1
      entry.revenue += order.total
    })

    const utmReport = Array.from(utmReportMap.values()).map((entry) => ({
      source: entry.source || "לא מוגדר",
      medium: entry.medium || "לא מוגדר",
      campaign: entry.campaign || "לא מוגדר",
      orders: entry.orders,
      revenue: entry.revenue,
      avgOrder: entry.orders > 0 ? entry.revenue / entry.orders : 0,
    }))

    // חישוב אחוזים
    const trackedRevenuePercent =
      totalRevenue._sum.total && totalRevenue._sum.total > 0
        ? (trackedRevenue._sum.total / totalRevenue._sum.total) * 100
        : 0

    const trackedOrdersPercent =
      totalOrders > 0 ? (trackedOrdersCount / totalOrders) * 100 : 0

    return NextResponse.json({
      summary: {
        trackedRevenue: trackedRevenue._sum.total || 0,
        totalRevenue: totalRevenue._sum.total || 0,
        trackedOrders: trackedOrdersCount,
        totalOrders,
        trackedRevenuePercent,
        trackedOrdersPercent,
      },
      trafficSourcesReport,
      utmReport,
    })
  } catch (error) {
    console.error("Error fetching traffic sources report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

