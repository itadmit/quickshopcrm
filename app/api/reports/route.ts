import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// סוגי דוחות
export type ReportType =
  | "sales"
  | "orders"
  | "customers"
  | "products"
  | "inventory"
  | "returns"
  | "coupons"
  | "discounts"
  | "reviews"
  | "marketing"
  | "payments"
  | "shipping"
  | "vip-customers"
  | "top-products"
  | "abandoned-carts"
  | "influencers"
  | "gift-cards"

interface ReportParams {
  shopId: string
  reportType: ReportType
  startDate: string
  endDate: string
  columns?: string[]
}

// GET - קבלת דוח
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const reportType = searchParams.get("reportType") as ReportType
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const columns = searchParams.get("columns")?.split(",").filter(Boolean) || []
    const limitParam = searchParams.get("limit")
    let limit = 10000 // ברירת מחדל
    if (limitParam) {
      const parsedLimit = parseInt(limitParam)
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 50000) {
        limit = parsedLimit
      } else {
        return NextResponse.json(
          { error: "Limit must be between 1 and 50000" },
          { status: 400 }
        )
      }
    }

    // Validation של פרמטרים
    if (!shopId || !reportType) {
      return NextResponse.json(
        { error: "Missing required parameters: shopId and reportType are required" },
        { status: 400 }
      )
    }

    // Validation של סוג דוח
    const validReportTypes: ReportType[] = [
      "sales", "orders", "customers", "products", "inventory",
      "returns", "coupons", "discounts", "reviews", "marketing",
      "payments", "shipping", "vip-customers", "top-products", "abandoned-carts",
      "influencers", "gift-cards"
    ]
    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 }
      )
    }

    // דוח מלאי לא צריך תאריכים
    const needsDates = reportType !== "inventory" && reportType !== "gift-cards"
    if (needsDates && (!startDate || !endDate)) {
      return NextResponse.json(
        { error: "Missing required parameters: startDate and endDate are required for this report" },
        { status: 400 }
      )
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

    // Validation של תאריכים
    let start: Date | null = null
    let end: Date | null = null
    
    if (needsDates) {
      start = new Date(startDate || Date.now())
      end = new Date(endDate || Date.now())
      
      // בדיקה שהתאריכים תקינים
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format" },
          { status: 400 }
        )
      }
      
      // בדיקה שהתאריך התחלה לא מאוחר מתאריך סיום
      if (start > end) {
        return NextResponse.json(
          { error: "Start date must be before or equal to end date" },
          { status: 400 }
        )
      }
      
      // הגבלת טווח תאריכים (מקסימום שנה)
      const maxRange = 365 * 24 * 60 * 60 * 1000 // שנה במילישניות
      if (end.getTime() - start.getTime() > maxRange) {
        return NextResponse.json(
          { error: "Date range cannot exceed 365 days" },
          { status: 400 }
        )
      }
      
      end.setHours(23, 59, 59, 999)
    }

    let data: any[] = []

    switch (reportType) {
      case "sales":
        data = await getSalesReport(shopId, start!, end!, columns, limit)
        break
      case "orders":
        data = await getOrdersReport(shopId, start!, end!, columns, limit)
        break
      case "customers":
        data = await getCustomersReport(shopId, start!, end!, columns, limit)
        break
      case "products":
        data = await getProductsReport(shopId, start!, end!, columns, limit)
        break
      case "inventory":
        data = await getInventoryReport(shopId, columns, limit)
        break
      case "returns":
        data = await getReturnsReport(shopId, start!, end!, columns, limit)
        break
      case "coupons":
        data = await getCouponsReport(shopId, start!, end!, columns, limit)
        break
      case "discounts":
        data = await getDiscountsReport(shopId, start!, end!, columns, limit)
        break
      case "reviews":
        data = await getReviewsReport(shopId, start!, end!, columns, limit)
        break
      case "marketing":
        data = await getMarketingReport(shopId, start!, end!, columns, limit)
        break
      case "payments":
        data = await getPaymentsReport(shopId, start!, end!, columns, limit)
        break
      case "shipping":
        data = await getShippingReport(shopId, start!, end!, columns, limit)
        break
      case "vip-customers":
        data = await getVIPCustomersReport(shopId, start!, end!, columns, limit)
        break
      case "top-products":
        data = await getTopProductsReport(shopId, start!, end!, columns, limit)
        break
      case "abandoned-carts":
        data = await getAbandonedCartsReport(shopId, start!, end!, columns, limit)
        break
      case "influencers":
        data = await getInfluencersReport(shopId, start!, end!, columns, limit)
        break
      case "gift-cards":
        data = await getGiftCardsReport(shopId, start || null, end || null, columns, limit)
        break
    }

    // הגבלת כמות הנתונים (אם הנתונים כבר מוגבלים ב-query, לא צריך slice נוסף)
    // אבל נשמור את המידע על total ו-returned
    const returned = data.length
    const hasMore = returned >= limit // אם קיבלנו בדיוק את ה-limit, כנראה יש עוד

    return NextResponse.json({ 
      data, 
      columns,
      total: hasMore ? returned : returned, // אם יש עוד, לא נדע את ה-total המדויק
      returned,
      hasMore,
      limit 
    })
  } catch (error: any) {
    console.error("Error generating report:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate report" },
      { status: 500 }
    )
  }
}

// דוח מכירות
async function getSalesReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  const orders = await prisma.order.findMany({
    where: {
      shopId,
      createdAt: { gte: start, lte: end },
      paymentStatus: "COMPLETED",
    },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
      customer: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return orders.map((order: any) => {
    const row: any = {}
    if (!columns.length || columns.includes("date"))
      row.date = order.createdAt.toISOString().split("T")[0]
    if (!columns.length || columns.includes("orderNumber"))
      row.orderNumber = order.orderNumber
    if (!columns.length || columns.includes("customerName"))
      row.customerName = order.customerName
    if (!columns.length || columns.includes("customerEmail"))
      row.customerEmail = order.customerEmail
    if (!columns.length || columns.includes("subtotal"))
      row.subtotal = order.subtotal
    if (!columns.length || columns.includes("tax"))
      row.tax = order.tax
    if (!columns.length || columns.includes("shipping"))
      row.shipping = order.shipping
    if (!columns.length || columns.includes("discount"))
      row.discount = order.discount
    if (!columns.length || columns.includes("total"))
      row.total = order.total
    if (!columns.length || columns.includes("paymentMethod"))
      row.paymentMethod = order.paymentMethod || ""
    if (!columns.length || columns.includes("status"))
      row.status = order.status
    if (!columns.length || columns.includes("itemsCount"))
      row.itemsCount = order.items.length
    return row
  })
}

// דוח הזמנות
async function getOrdersReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  const orders = await prisma.order.findMany({
    where: {
      shopId,
      createdAt: { gte: start, lte: end },
    },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
      customer: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return orders.map((order: any) => {
    const row: any = {}
    if (!columns.length || columns.includes("date"))
      row.date = order.createdAt.toISOString().split("T")[0]
    if (!columns.length || columns.includes("orderNumber"))
      row.orderNumber = order.orderNumber
    if (!columns.length || columns.includes("customerName"))
      row.customerName = order.customerName
    if (!columns.length || columns.includes("customerEmail"))
      row.customerEmail = order.customerEmail
    if (!columns.length || columns.includes("customerPhone"))
      row.customerPhone = order.customerPhone || ""
    if (!columns.length || columns.includes("status"))
      row.status = order.status
    if (!columns.length || columns.includes("paymentStatus"))
      row.paymentStatus = order.paymentStatus
    if (!columns.length || columns.includes("fulfillmentStatus"))
      row.fulfillmentStatus = order.fulfillmentStatus
    if (!columns.length || columns.includes("total"))
      row.total = order.total
    if (!columns.length || columns.includes("paymentMethod"))
      row.paymentMethod = order.paymentMethod || ""
    if (!columns.length || columns.includes("shippingMethod"))
      row.shippingMethod = order.shippingMethod || ""
    if (!columns.length || columns.includes("trackingNumber"))
      row.trackingNumber = order.trackingNumber || ""
    if (!columns.length || columns.includes("couponCode"))
      row.couponCode = order.couponCode || ""
    return row
  })
}

// דוח לקוחות
async function getCustomersReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  const customers = await prisma.customer.findMany({
    where: {
      shopId,
      createdAt: { gte: start, lte: end },
    },
    include: {
      orders: {
        where: {
          createdAt: { gte: start, lte: end },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return customers.map((customer: any) => {
    const row: any = {}
    if (!columns.length || columns.includes("date"))
      row.date = customer.createdAt.toISOString().split("T")[0]
    if (!columns.length || columns.includes("email"))
      row.email = customer.email
    if (!columns.length || columns.includes("firstName"))
      row.firstName = customer.firstName || ""
    if (!columns.length || columns.includes("lastName"))
      row.lastName = customer.lastName || ""
    if (!columns.length || columns.includes("phone"))
      row.phone = customer.phone || ""
    if (!columns.length || columns.includes("totalSpent"))
      row.totalSpent = customer.totalSpent
    if (!columns.length || columns.includes("orderCount"))
      row.orderCount = customer.orderCount
    if (!columns.length || columns.includes("tier"))
      row.tier = customer.tier
    if (!columns.length || columns.includes("isSubscribed"))
      row.isSubscribed = customer.isSubscribed ? "כן" : "לא"
    if (!columns.length || columns.includes("ordersInPeriod"))
      row.ordersInPeriod = customer.orders.length
    return row
  })
}

// דוח מוצרים
async function getProductsReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  const products = await prisma.product.findMany({
    where: {
      shopId,
      createdAt: { gte: start, lte: end },
    },
    include: {
      orderItems: {
        where: {
          order: {
            createdAt: { gte: start, lte: end },
          },
        },
      },
      categories: {
        include: {
          category: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return products.map((product: any) => {
    const totalSold = product.orderItems.reduce(
      (sum: any, item: any) => sum + item.quantity,
      0
    )
    const totalRevenue = product.orderItems.reduce(
      (sum: any, item: any) => sum + item.total,
      0
    )

    const row: any = {}
    if (!columns.length || columns.includes("name"))
      row.name = product.name
    if (!columns.length || columns.includes("sku"))
      row.sku = product.sku || ""
    if (!columns.length || columns.includes("price"))
      row.price = product.price
    if (!columns.length || columns.includes("comparePrice"))
      row.comparePrice = product.comparePrice || ""
    if (!columns.length || columns.includes("cost"))
      row.cost = product.cost || ""
    if (!columns.length || columns.includes("inventoryQty"))
      row.inventoryQty = product.inventoryQty
    if (!columns.length || columns.includes("status"))
      row.status = product.status
    if (!columns.length || columns.includes("availability"))
      row.availability = product.availability
    if (!columns.length || columns.includes("category"))
      row.category =
        (product as any).categories[0]?.category?.name || ""
    if (!columns.length || columns.includes("totalSold"))
      row.totalSold = totalSold
    if (!columns.length || columns.includes("totalRevenue"))
      row.totalRevenue = totalRevenue
    if (!columns.length || columns.includes("createdAt"))
      row.createdAt = product.createdAt.toISOString().split("T")[0]
    return row
  })
}

// דוח מלאי
async function getInventoryReport(shopId: string, columns: string[], limit: number = 10000) {
  const products = await prisma.product.findMany({
    where: { shopId },
    include: {
      variants: true,
      categories: {
        include: {
          category: true,
        },
      },
    },
    orderBy: { name: "asc" },
    take: limit,
  })

  const rows: any[] = []
  products.forEach((product: any) => {
    const row: any = {}
    if (!columns.length || columns.includes("name"))
      row.name = product.name
    if (!columns.length || columns.includes("sku"))
      row.sku = product.sku || ""
    if (!columns.length || columns.includes("inventoryQty"))
      row.inventoryQty = product.inventoryQty
    if (!columns.length || columns.includes("lowStockAlert"))
      row.lowStockAlert = (product as any).lowStockAlert || ""
    if (!columns.length || columns.includes("status"))
      row.status = product.status
    if (!columns.length || columns.includes("availability"))
      row.availability = product.availability
    if (!columns.length || columns.includes("category"))
      row.category =
        (product as any).categories[0]?.category?.name || ""
    if (!columns.length || columns.includes("price"))
      row.price = product.price
    if (!columns.length || columns.includes("cost"))
      row.cost = product.cost || ""
    rows.push(row)

    // הוספת וריאציות
    product.variants.forEach((variant: any) => {
      const variantRow: any = {}
      if (!columns.length || columns.includes("name"))
        variantRow.name = `${product.name} - ${variant.name}`
      if (!columns.length || columns.includes("sku"))
        variantRow.sku = variant.sku || ""
      if (!columns.length || columns.includes("inventoryQty"))
        variantRow.inventoryQty = variant.inventoryQty
      if (!columns.length || columns.includes("price"))
        variantRow.price = variant.price || product.price
      if (!columns.length || columns.includes("cost"))
        variantRow.cost = variant.cost || product.cost || ""
      rows.push(variantRow)
    })
  })

  return rows
}

// דוח החזרות
async function getReturnsReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  const returns = await prisma.return.findMany({
    where: {
      shopId,
      createdAt: { gte: start, lte: end },
    },
    include: {
      order: true,
      customer: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return returns.map((returnItem) => {
    const row: any = {}
    if (!columns.length || columns.includes("date"))
      row.date = returnItem.createdAt.toISOString().split("T")[0]
    if (!columns.length || columns.includes("orderNumber"))
      row.orderNumber = returnItem.order.orderNumber
    if (!columns.length || columns.includes("customerName"))
      row.customerName = returnItem.customer.firstName
        ? `${returnItem.customer.firstName} ${returnItem.customer.lastName || ""}`
        : returnItem.customer.email
    if (!columns.length || columns.includes("customerEmail"))
      row.customerEmail = returnItem.customer.email
    if (!columns.length || columns.includes("status"))
      row.status = returnItem.status
    if (!columns.length || columns.includes("reason"))
      row.reason = returnItem.reason
    if (!columns.length || columns.includes("refundAmount"))
      row.refundAmount = returnItem.refundAmount || ""
    if (!columns.length || columns.includes("refundMethod"))
      row.refundMethod = returnItem.refundMethod || ""
    return row
  })
}

// דוח קופונים
async function getCouponsReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  const coupons = await prisma.coupon.findMany({
    where: {
      shopId,
      createdAt: { gte: start, lte: end },
    },
    include: {
      influencer: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return coupons.map((coupon: any) => {
    const row: any = {}
    if (!columns.length || columns.includes("code"))
      row.code = coupon.code
    if (!columns.length || columns.includes("type"))
      row.type = coupon.type
    if (!columns.length || columns.includes("value"))
      row.value = coupon.value
    if (!columns.length || columns.includes("usedCount"))
      row.usedCount = coupon.usedCount
    if (!columns.length || columns.includes("maxUses"))
      row.maxUses = coupon.maxUses || ""
    if (!columns.length || columns.includes("startDate"))
      row.startDate = coupon.startDate
        ? coupon.startDate.toISOString().split("T")[0]
        : ""
    if (!columns.length || columns.includes("endDate"))
      row.endDate = coupon.endDate
        ? coupon.endDate.toISOString().split("T")[0]
        : ""
    if (!columns.length || columns.includes("isActive"))
      row.isActive = coupon.isActive ? "כן" : "לא"
    if (!columns.length || columns.includes("influencer"))
      row.influencer = coupon.influencer?.name || ""
    return row
  })
}

// דוח הנחות
async function getDiscountsReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  const discounts = await prisma.discount.findMany({
    where: {
      shopId,
      createdAt: { gte: start, lte: end },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return discounts.map((discount: any) => {
    const row: any = {}
    if (!columns.length || columns.includes("title"))
      row.title = discount.title
    if (!columns.length || columns.includes("type"))
      row.type = discount.type
    if (!columns.length || columns.includes("value"))
      row.value = discount.value
    if (!columns.length || columns.includes("target"))
      row.target = discount.target
    if (!columns.length || columns.includes("usedCount"))
      row.usedCount = discount.usedCount
    if (!columns.length || columns.includes("maxUses"))
      row.maxUses = discount.maxUses || ""
    if (!columns.length || columns.includes("startDate"))
      row.startDate = discount.startDate
        ? discount.startDate.toISOString().split("T")[0]
        : ""
    if (!columns.length || columns.includes("endDate"))
      row.endDate = discount.endDate
        ? discount.endDate.toISOString().split("T")[0]
        : ""
    if (!columns.length || columns.includes("isActive"))
      row.isActive = discount.isActive ? "כן" : "לא"
    if (!columns.length || columns.includes("isAutomatic"))
      row.isAutomatic = discount.isAutomatic ? "כן" : "לא"
    return row
  })
}

// דוח ביקורות
async function getReviewsReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  const reviews = await prisma.review.findMany({
    where: {
      shopId,
      createdAt: { gte: start, lte: end },
    },
    include: {
      product: true,
      customer: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return reviews.map((review: any) => {
    const row: any = {}
    if (!columns.length || columns.includes("date"))
      row.date = review.createdAt.toISOString().split("T")[0]
    if (!columns.length || columns.includes("productName"))
      row.productName = review.product.name
    if (!columns.length || columns.includes("customerName"))
      row.customerName = review.customer
        ? review.customer.firstName
          ? `${review.customer.firstName} ${review.customer.lastName || ""}`
          : review.customer.email
        : ""
    if (!columns.length || columns.includes("customerEmail"))
      row.customerEmail = review.customer?.email || ""
    if (!columns.length || columns.includes("rating"))
      row.rating = review.rating
    if (!columns.length || columns.includes("title"))
      row.title = review.title || ""
    if (!columns.length || columns.includes("comment"))
      row.comment = review.comment || ""
    if (!columns.length || columns.includes("isApproved"))
      row.isApproved = review.isApproved ? "כן" : "לא"
    if (!columns.length || columns.includes("isVerified"))
      row.isVerified = review.isVerified ? "כן" : "לא"
    if (!columns.length || columns.includes("helpfulCount"))
      row.helpfulCount = review.helpfulCount
    return row
  })
}

// דוח שיווק
async function getMarketingReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  // שילוב של קופונים, הנחות, ועגלות נטושות
  const [coupons, discounts, abandonedCarts] = await Promise.all([
    prisma.coupon.findMany({
      where: { shopId, createdAt: { gte: start, lte: end } },
      take: limit,
    }),
    prisma.discount.findMany({
      where: { shopId, createdAt: { gte: start, lte: end } },
      take: limit,
    }),
    prisma.cart.findMany({
      where: {
        shopId,
        abandonedAt: { gte: start, lte: end },
      },
      include: { customer: true },
      take: limit,
    }),
  ])

  const rows: any[] = []

  coupons.forEach((coupon: any) => {
    const row: any = {}
    if (!columns.length || columns.includes("type"))
      row.type = "קופון"
    if (!columns.length || columns.includes("name"))
      row.name = coupon.code
    if (!columns.length || columns.includes("value"))
      row.value = coupon.value
    if (!columns.length || columns.includes("usedCount"))
      row.usedCount = coupon.usedCount
    if (!columns.length || columns.includes("date"))
      row.date = coupon.createdAt.toISOString().split("T")[0]
    rows.push(row)
  })

  discounts.forEach((discount: any) => {
    const row: any = {}
    if (!columns.length || columns.includes("type"))
      row.type = "הנחה"
    if (!columns.length || columns.includes("name"))
      row.name = discount.title
    if (!columns.length || columns.includes("value"))
      row.value = discount.value
    if (!columns.length || columns.includes("usedCount"))
      row.usedCount = discount.usedCount
    if (!columns.length || columns.includes("date"))
      row.date = discount.createdAt.toISOString().split("T")[0]
    rows.push(row)
  })

  abandonedCarts.forEach((cart: any) => {
    const row: any = {}
    if (!columns.length || columns.includes("type"))
      row.type = "עגלה נטושה"
    if (!columns.length || columns.includes("name"))
      row.name = cart.customer
        ? cart.customer.email
        : "אורח"
    if (!columns.length || columns.includes("value"))
      row.value = (cart.items as any).reduce(
        (sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 0),
        0
      )
    if (!columns.length || columns.includes("date"))
      row.date = cart.abandonedAt
        ? cart.abandonedAt.toISOString().split("T")[0]
        : ""
    rows.push(row)
  })

  return rows
}

// דוח תשלומים
async function getPaymentsReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  const orders = await prisma.order.findMany({
    where: {
      shopId,
      createdAt: { gte: start, lte: end },
      status: { in: ["PAID", "REFUNDED"] },
    },
    include: {
      customer: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return orders.map((order: any) => {
    const row: any = {}
    if (!columns.length || columns.includes("date"))
      row.date = order.paidAt
        ? order.paidAt.toISOString().split("T")[0]
        : order.createdAt.toISOString().split("T")[0]
    if (!columns.length || columns.includes("orderNumber"))
      row.orderNumber = order.orderNumber
    if (!columns.length || columns.includes("customerName"))
      row.customerName = order.customerName
    if (!columns.length || columns.includes("customerEmail"))
      row.customerEmail = order.customerEmail
    if (!columns.length || columns.includes("total"))
      row.total = order.total
    if (!columns.length || columns.includes("paymentMethod"))
      row.paymentMethod = order.paymentMethod || ""
    if (!columns.length || columns.includes("paymentStatus"))
      row.paymentStatus = order.paymentStatus
    if (!columns.length || columns.includes("transactionId"))
      row.transactionId = order.transactionId || ""
    if (!columns.length || columns.includes("paidAt"))
      row.paidAt = order.paidAt
        ? order.paidAt.toISOString().split("T")[0]
        : ""
    return row
  })
}

// דוח משלוחים
async function getShippingReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  const orders = await prisma.order.findMany({
    where: {
      shopId,
      createdAt: { gte: start, lte: end },
      fulfillmentStatus: { in: ["FULFILLED", "PARTIAL"] },
    },
    include: {
      customer: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return orders.map((order: any) => {
    const shippingAddress = order.shippingAddress as any
    const row: any = {}
    if (!columns.length || columns.includes("orderNumber"))
      row.orderNumber = order.orderNumber
    if (!columns.length || columns.includes("customerName"))
      row.customerName = order.customerName
    if (!columns.length || columns.includes("shippingMethod"))
      row.shippingMethod = order.shippingMethod || ""
    if (!columns.length || columns.includes("trackingNumber"))
      row.trackingNumber = order.trackingNumber || ""
    if (!columns.length || columns.includes("shippedAt"))
      row.shippedAt = order.shippedAt
        ? order.shippedAt.toISOString().split("T")[0]
        : ""
    if (!columns.length || columns.includes("deliveredAt"))
      row.deliveredAt = order.deliveredAt
        ? order.deliveredAt.toISOString().split("T")[0]
        : ""
    if (!columns.length || columns.includes("fulfillmentStatus"))
      row.fulfillmentStatus = order.fulfillmentStatus
    if (!columns.length || columns.includes("address"))
      row.address = shippingAddress
        ? `${shippingAddress.street || ""} ${shippingAddress.city || ""} ${shippingAddress.zip || ""}`
        : ""
    return row
  })
}

// דוח לקוחות VIP
async function getVIPCustomersReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  const customers = await prisma.customer.findMany({
    where: {
      shopId,
      tier: { in: ["VIP", "PREMIUM"] },
    },
    include: {
      orders: {
        where: {
          createdAt: { gte: start, lte: end },
        },
      },
    },
    orderBy: { totalSpent: "desc" },
    take: limit,
  })

  return customers.map((customer: any) => {
    const periodSpent = customer.orders.reduce(
      (sum: number, order: { total: number }) => sum + order.total,
      0
    )
    const row: any = {}
    if (!columns.length || columns.includes("email"))
      row.email = customer.email
    if (!columns.length || columns.includes("firstName"))
      row.firstName = customer.firstName || ""
    if (!columns.length || columns.includes("lastName"))
      row.lastName = customer.lastName || ""
    if (!columns.length || columns.includes("phone"))
      row.phone = customer.phone || ""
    if (!columns.length || columns.includes("tier"))
      row.tier = customer.tier
    if (!columns.length || columns.includes("totalSpent"))
      row.totalSpent = customer.totalSpent
    if (!columns.length || columns.includes("orderCount"))
      row.orderCount = customer.orderCount
    if (!columns.length || columns.includes("periodSpent"))
      row.periodSpent = periodSpent
    if (!columns.length || columns.includes("periodOrders"))
      row.periodOrders = customer.orders.length
    return row
  })
}

// דוח מוצרים פופולריים
async function getTopProductsReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  const products = await prisma.product.findMany({
    where: { shopId },
    include: {
      orderItems: {
        where: {
          order: {
            createdAt: { gte: start, lte: end },
            paymentStatus: "COMPLETED",
          },
        },
      },
      categories: {
        include: {
          category: true,
        },
      },
    },
    take: limit,
  })

  const productsWithStats = products
    .map((product: any) => {
      const totalSold = product.orderItems.reduce(
        (sum: number, item: { quantity: number }) => sum + item.quantity,
        0
      )
      const totalRevenue = product.orderItems.reduce(
        (sum: number, item: { total: number }) => sum + item.total,
        0
      )
      return { product, totalSold, totalRevenue }
    })
    .filter((p: any) => p.totalSold > 0)
    .sort((a, b) => b.totalSold - a.totalSold)

  return productsWithStats.map(({ product, totalSold, totalRevenue }) => {
    const row: any = {}
    if (!columns.length || columns.includes("name"))
      row.name = product.name
    if (!columns.length || columns.includes("sku"))
      row.sku = product.sku || ""
    if (!columns.length || columns.includes("price"))
      row.price = product.price
    if (!columns.length || columns.includes("category"))
      row.category =
        (product as any).categories[0]?.category?.name || ""
    if (!columns.length || columns.includes("totalSold"))
      row.totalSold = totalSold
    if (!columns.length || columns.includes("totalRevenue"))
      row.totalRevenue = totalRevenue
    if (!columns.length || columns.includes("averageOrderValue"))
      row.averageOrderValue =
        totalSold > 0 ? totalRevenue / totalSold : 0
    return row
  })
}

// דוח עגלות נטושות
async function getAbandonedCartsReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  const carts = await prisma.cart.findMany({
    where: {
      shopId,
      abandonedAt: { gte: start, lte: end },
    },
    include: {
      customer: true,
    },
    orderBy: { abandonedAt: "desc" },
    take: limit,
  })

  return carts.map((cart: any) => {
    const items = cart.items as any[]
    const total = items.reduce(
      (sum: any, item) => sum + (item.price || 0) * (item.quantity || 0),
      0
    )
    const row: any = {}
    if (!columns.length || columns.includes("date"))
      row.date = cart.abandonedAt
        ? cart.abandonedAt.toISOString().split("T")[0]
        : ""
    if (!columns.length || columns.includes("customerEmail"))
      row.customerEmail = cart.customer?.email || "אורח"
    if (!columns.length || columns.includes("customerName"))
      row.customerName = cart.customer
        ? cart.customer.firstName
          ? `${cart.customer.firstName} ${cart.customer.lastName || ""}`
          : cart.customer.email
        : "אורח"
    if (!columns.length || columns.includes("itemsCount"))
      row.itemsCount = items.length
    if (!columns.length || columns.includes("total"))
      row.total = total
    if (!columns.length || columns.includes("couponCode"))
      row.couponCode = cart.couponCode || ""
    if (!columns.length || columns.includes("recovered"))
      row.recovered = cart.recoveredAt ? "כן" : "לא"
    return row
  })
}

// דוח משפיעניות
async function getInfluencersReport(
  shopId: string,
  start: Date,
  end: Date,
  columns: string[],
  limit: number = 10000
) {
  // קבלת כל הקופונים עם משפיענים
  const coupons = await prisma.coupon.findMany({
    where: {
      shopId,
      influencerId: { not: null },
      createdAt: { gte: start, lte: end },
    },
    include: {
      influencer: true,
      shop: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  // קבלת הזמנות עם קופונים של משפיענים
  const couponCodes = coupons.map((c: any) => c.code)
  const orders = await prisma.order.findMany({
    where: {
      shopId,
      couponCode: { in: couponCodes },
      createdAt: { gte: start, lte: end },
    },
    include: {
      items: true,
    },
  })

  // יצירת מפה של קופון -> משפיען
  const couponToInfluencer = new Map<string, typeof coupons[0]>()
  coupons.forEach((coupon: any) => {
    couponToInfluencer.set(coupon.code, coupon)
  })

  // חישוב סטטיסטיקות לכל קופון בנפרד
  const couponStats = new Map<
    string,
    {
      coupon: typeof coupons[0]
      totalOrders: number
      totalRevenue: number
      totalDiscount: number
    }
  >()

  // אתחול סטטיסטיקות לכל קופון
  coupons.forEach((coupon: any) => {
    couponStats.set(coupon.code, {
      coupon,
      totalOrders: 0,
      totalRevenue: 0,
      totalDiscount: 0,
    })
  })

  // חישוב סטטיסטיקות מההזמנות
  orders.forEach((order: any) => {
    const couponCode = order.couponCode || ""
    const stats = couponStats.get(couponCode)
    if (stats) {
      stats.totalOrders++
      stats.totalRevenue += order.total
      stats.totalDiscount += order.discount || 0
    }
  })

  // יצירת שורות הדוח
  const rows: any[] = []

  couponStats.forEach((stats: any) => {
    const coupon = stats.coupon
    if (!coupon.influencer) return

    const row: any = {}
    if (!columns.length || columns.includes("influencerName"))
      row.influencerName = coupon.influencer.name || ""
    if (!columns.length || columns.includes("influencerEmail"))
      row.influencerEmail = coupon.influencer.email || ""
    if (!columns.length || columns.includes("couponCode"))
      row.couponCode = coupon.code
    if (!columns.length || columns.includes("couponType"))
      row.couponType = coupon.type
    if (!columns.length || columns.includes("couponValue"))
      row.couponValue = coupon.value
    if (!columns.length || columns.includes("usedCount"))
      row.usedCount = coupon.usedCount
    if (!columns.length || columns.includes("maxUses"))
      row.maxUses = coupon.maxUses || ""
    if (!columns.length || columns.includes("totalOrders"))
      row.totalOrders = stats.totalOrders
    if (!columns.length || columns.includes("totalRevenue"))
      row.totalRevenue = stats.totalRevenue
    if (!columns.length || columns.includes("totalDiscount"))
      row.totalDiscount = stats.totalDiscount
    if (!columns.length || columns.includes("averageOrderValue"))
      row.averageOrderValue =
        stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0
    if (!columns.length || columns.includes("isActive"))
      row.isActive = coupon.isActive ? "כן" : "לא"
    if (!columns.length || columns.includes("startDate"))
      row.startDate = coupon.startDate
        ? coupon.startDate.toISOString().split("T")[0]
        : ""
    if (!columns.length || columns.includes("endDate"))
      row.endDate = coupon.endDate
        ? coupon.endDate.toISOString().split("T")[0]
        : ""
    rows.push(row)
  })

  return rows
}

// דוח כרטיסי מתנה
async function getGiftCardsReport(
  shopId: string,
  start: Date | null,
  end: Date | null,
  columns: string[],
  limit: number = 10000
) {
  const where: any = { shopId }

  // אם יש תאריכים, נסנן לפי תאריך יצירה
  if (start && end) {
    where.createdAt = { gte: start, lte: end }
  }

  const giftCards = await prisma.giftCard.findMany({
    where,
    include: {
      transactions: {
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return giftCards.map((giftCard) => {
    const usedAmount = giftCard.amount - giftCard.balance
    const transactionsCount = giftCard.transactions.length
    const lastUsedAt =
      giftCard.transactions.length > 0
        ? giftCard.transactions[0].createdAt
        : null

    const row: any = {}
    if (!columns.length || columns.includes("code"))
      row.code = giftCard.code
    if (!columns.length || columns.includes("recipientName"))
      row.recipientName = giftCard.recipientName || ""
    if (!columns.length || columns.includes("recipientEmail"))
      row.recipientEmail = giftCard.recipientEmail
    if (!columns.length || columns.includes("senderName"))
      row.senderName = giftCard.senderName || ""
    if (!columns.length || columns.includes("amount"))
      row.amount = giftCard.amount
    if (!columns.length || columns.includes("balance"))
      row.balance = giftCard.balance
    if (!columns.length || columns.includes("usedAmount"))
      row.usedAmount = usedAmount
    if (!columns.length || columns.includes("isActive"))
      row.isActive = giftCard.isActive ? "כן" : "לא"
    if (!columns.length || columns.includes("createdAt"))
      row.createdAt = giftCard.createdAt.toISOString().split("T")[0]
    if (!columns.length || columns.includes("expiresAt"))
      row.expiresAt = giftCard.expiresAt
        ? giftCard.expiresAt.toISOString().split("T")[0]
        : ""
    if (!columns.length || columns.includes("transactionsCount"))
      row.transactionsCount = transactionsCount
    if (!columns.length || columns.includes("lastUsedAt"))
      row.lastUsedAt = lastUsedAt
        ? lastUsedAt.toISOString().split("T")[0]
        : ""
    return row
  })
}

