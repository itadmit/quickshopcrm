import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - קבלת החזרות של לקוח בפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // נסה למצוא את החנות לפי slug או ID
    let shop = await prisma.shop.findFirst({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    // אם לא נמצא לפי slug, ננסה לחפש לפי ID (למקרה שה-slug השתנה)
    if (!shop) {
      shop = await prisma.shop.findFirst({
        where: {
          id: params.slug,
          isPublished: true,
        },
      })
    }

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const customerId = req.headers.get("x-customer-id") || searchParams.get("customerId")
    const customerEmail = searchParams.get("customerEmail")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    if (!customerId && !customerEmail) {
      return NextResponse.json({ error: "Customer ID or email required" }, { status: 400 })
    }

    // בניית where clause
    const where: any = {
      shopId: shop.id,
    }

    if (customerId) {
      where.customerId = customerId
    } else if (customerEmail) {
      // אם יש רק email, נחפש את הלקוח
      const customer = await prisma.customer.findFirst({
        where: {
          shopId: shop.id,
          email: customerEmail,
        },
      })
      if (customer) {
        where.customerId = customer.id
      } else {
        return NextResponse.json({ returns: [], pagination: { page, limit, total: 0, totalPages: 0 } })
      }
    }

    const [returns, total] = await Promise.all([
      prisma.return.findMany({
        where,
        select: {
          id: true,
          orderId: true,
          status: true,
          reason: true,
          refundAmount: true,
          refundMethod: true,
          createdAt: true,
          updatedAt: true,
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.return.count({ where }),
    ])

    return NextResponse.json({
      returns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching storefront returns:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

