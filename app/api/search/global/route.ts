import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - חיפוש גלובלי בכל המערכת
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")
    const shopId = searchParams.get("shopId")

    if (!query || query.length < 1) {
      return NextResponse.json({ products: [], orders: [], customers: [], plugins: [] })
    }

    console.log('Global search - query:', query, 'shopId:', shopId, 'companyId:', session.user.companyId)

    // בניית תנאי החיפוש
    const baseWhere: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      baseWhere.shopId = shopId
    }

    // חיפוש במקביל בכל הישויות
    const [products, orders, customers, plugins] = await Promise.all([
      // מוצרים
      prisma.product.findMany({
        where: {
          ...baseWhere,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          price: true,
          images: true,
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      // הזמנות
      prisma.order.findMany({
        where: {
          ...baseWhere,
          OR: [
            { orderNumber: { contains: query, mode: "insensitive" } },
            { customerName: { contains: query, mode: "insensitive" } },
            { customerEmail: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerEmail: true,
          total: true,
          status: true,
          createdAt: true,
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      // לקוחות
      prisma.customer.findMany({
        where: {
          ...baseWhere,
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          totalSpent: true,
          orderCount: true,
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      // תוספים
      prisma.plugin.findMany({
        where: {
          companyId: session.user.companyId,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          type: true,
          category: true,
          isActive: true,
          isInstalled: true,
          isFree: true,
          price: true,
        },
        take: 5,
        orderBy: {
          displayOrder: 'asc',
        },
      }),
    ])

    console.log('Search results:', {
      productsCount: products.length,
      ordersCount: orders.length,
      customersCount: customers.length,
      products: products.map(p => ({ id: p.id, name: p.name })),
    })

    // מיפוי התוצאות לפורמט אחיד
    const results = {
      products: products.map(p => {
        // טיפול ב-images - Prisma מחזיר String[] כמערך
        const imageUrl = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null

        return {
          type: 'product',
          id: p.id,
          title: p.name,
          subtitle: p.sku || `₪${p.price.toFixed(2)}`,
          image: imageUrl,
          url: `/products/${p.slug}`,
          shopName: p.shop.name,
        }
      }),
      orders: orders.map(o => ({
        type: 'order',
        id: o.id,
        title: `Order #${o.orderNumber}`, // Will be translated on client
        titleKey: 'search.orderTitle',
        titleParams: { number: o.orderNumber },
        subtitle: o.customerName || o.customerEmail,
        meta: `₪${o.total.toFixed(2)} • ${o.status}`,
        url: `/orders/${o.id}`,
        shopName: o.shop.name,
      })),
      customers: customers.map(c => ({
        type: 'customer',
        id: c.id,
        title: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email,
        subtitle: c.email,
        meta: `${c.orderCount} orders • ₪${c.totalSpent.toFixed(2)}`, // Will be translated on client
        url: `/customers/${c.id}`,
        shopName: c.shop.name,
      })),
      plugins: plugins.map(pl => ({
        type: 'plugin',
        id: pl.id,
        title: pl.name,
        subtitle: pl.description || '',
        meta: pl.isFree ? 'Free' : `₪${pl.price?.toFixed(2) || '0'}/month`, // Will be translated on client
        url: `/settings/plugins`,
        icon: pl.icon,
        category: pl.category,
        isActive: pl.isActive,
        isInstalled: pl.isInstalled,
      })),
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error("Global search error:", error)
    console.error("Error stack:", error.stack)
    return NextResponse.json(
      { 
        error: "Failed to perform search",
        details: error.message,
        products: [],
        orders: [],
        customers: [],
        plugins: []
      },
      { status: 500 }
    )
  }
}

