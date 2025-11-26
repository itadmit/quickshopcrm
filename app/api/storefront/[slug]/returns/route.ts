import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { jwtVerify } from "jose"
import { z } from "zod"

const createReturnSchema = z.object({
  orderId: z.string(),
  reason: z.string().min(1, "סיבת ההחזרה היא חובה"),
  items: z.array(z.object({
    orderItemId: z.string(),
    quantity: z.number().int().positive("כמות חייבת להיות מספר חיובי"),
    reason: z.string().optional(),
  })).min(1, "חייב לבחור לפחות פריט אחד להחזרה"),
  notes: z.string().optional(),
})

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
      select: {
        id: true,
        companyId: true,
        name: true,
      },
    })

    // אם לא נמצא לפי slug, ננסה לחפש לפי ID (למקרה שה-slug השתנה)
    if (!shop) {
      shop = await prisma.shop.findFirst({
        where: {
          id: params.slug,
          isPublished: true,
        },
        select: {
          id: true,
          companyId: true,
          name: true,
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
          items: true, // הוספת items כדי שנוכל לבדוק כמה הוחזר מכל פריט
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

// POST - יצירת החזרה חדשה בפרונט
export async function POST(
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
      select: {
        id: true,
        companyId: true,
        name: true,
      },
    })

    if (!shop) {
      shop = await prisma.shop.findFirst({
        where: {
          id: params.slug,
          isPublished: true,
        },
        select: {
          id: true,
          companyId: true,
          name: true,
        },
      })
    }

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const token = req.headers.get("x-customer-id")
    
    if (!token) {
      return NextResponse.json({ error: "אימות נדרש" }, { status: 401 })
    }

    // ניסיון לפענח JWT token
    let customerId: string | null = null
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
      const { payload } = await jwtVerify(token, secret)
      
      if (payload.shopId !== shop.id) {
        return NextResponse.json(
          { error: "אימות נכשל" },
          { status: 401 }
        )
      }
      
      customerId = payload.customerId as string
    } catch (jwtError) {
      // אם זה לא JWT, נניח שזה customerId ישיר
      customerId = token
    }

    if (!customerId) {
      return NextResponse.json({ error: "אימות נדרש" }, { status: 401 })
    }

    const body = await req.json()
    const data = createReturnSchema.parse(body)

    // בדיקה שההזמנה שייכת ללקוח ולחנות
    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        shopId: shop.id,
        customerId: customerId,
      },
      include: {
        items: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 })
    }

    // בדיקה שההזמנה שולמה (לא ניתן להחזיר הזמנה שלא שולמה)
    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: "לא ניתן להחזיר הזמנה שלא שולמה" },
        { status: 400 }
      )
    }

    // בדיקה אם יש החזרה מאושרת/הושלמה להזמנה הזו
    const existingApprovedReturns = await prisma.return.findMany({
      where: {
        orderId: order.id,
        status: {
          in: ["APPROVED", "COMPLETED"],
        },
      },
    })

    // אם יש החזרה מאושרת/הושלמה, נבדוק אם כל הפריטים כבר הוחזרו במלואם
    if (existingApprovedReturns.length > 0) {
      // חישוב כמה כבר הוחזר מכל פריט
      const returnedQuantities = new Map<string, number>()
      
      for (const ret of existingApprovedReturns) {
        const retItems = ret.items as Array<{ orderItemId: string; quantity: number }>
        for (const retItem of retItems) {
          const currentQty = returnedQuantities.get(retItem.orderItemId) || 0
          returnedQuantities.set(retItem.orderItemId, currentQty + retItem.quantity)
        }
      }

      // בדיקה אם כל הפריטים שהוזמנו כבר הוחזרו במלואם
      let allItemsFullyReturned = true
      for (const orderItem of order.items) {
        const returnedQty = returnedQuantities.get(orderItem.id) || 0
        if (returnedQty < orderItem.quantity) {
          allItemsFullyReturned = false
          break
        }
      }

      if (allItemsFullyReturned) {
        return NextResponse.json(
          { error: "להזמנה זו כבר יש החזרה מאושרת/הושלמה וכל הפריטים הוחזרו במלואם" },
          { status: 400 }
        )
      }
    }

    // בדיקה שהפריטים להחזרה תואמים להזמנה
    for (const returnItem of data.items) {
      const orderItem = order.items.find((item) => item.id === returnItem.orderItemId)
      
      if (!orderItem) {
        return NextResponse.json(
          { error: `פריט ${returnItem.orderItemId} לא נמצא בהזמנה` },
          { status: 400 }
        )
      }

      // בדיקה שהכמות להחזרה לא עולה על הכמות שהוזמנה
      if (returnItem.quantity > orderItem.quantity) {
        return NextResponse.json(
          { error: `כמות להחזרה (${returnItem.quantity}) גדולה מכמות שהוזמנה (${orderItem.quantity})` },
          { status: 400 }
        )
      }

      // בדיקה אם יש החזרה ממתינה (PENDING) לפריט הזה
      const pendingReturns = await prisma.return.findMany({
        where: {
          orderId: order.id,
          status: "PENDING",
        },
      })

      // בדיקה אם הפריט הזה כבר נמצא בהחזרה ממתינה
      for (const pendingRet of pendingReturns) {
        const pendingRetItems = pendingRet.items as Array<{ orderItemId: string; quantity: number }>
        const pendingRetItem = pendingRetItems.find((item) => item.orderItemId === returnItem.orderItemId)
        if (pendingRetItem) {
          return NextResponse.json(
            { error: `לפריט זה כבר יש בקשת החזרה ממתינה. לא ניתן ליצור החזרה נוספת לאותו פריט` },
            { status: 400 }
          )
        }
      }

      // בדיקה כמה כבר הוחזר מהפריט הזה (מהחזרות מאושרות/הושלמות)
      const approvedReturns = await prisma.return.findMany({
        where: {
          orderId: order.id,
          status: {
            in: ["APPROVED", "COMPLETED"],
          },
        },
      })

      let totalReturnedQty = 0
      for (const ret of approvedReturns) {
        const retItems = ret.items as Array<{ orderItemId: string; quantity: number }>
        const retItem = retItems.find((item) => item.orderItemId === returnItem.orderItemId)
        if (retItem) {
          totalReturnedQty += retItem.quantity
        }
      }

      if (totalReturnedQty + returnItem.quantity > orderItem.quantity) {
        return NextResponse.json(
          { error: `סה"כ כמות מוחזרת (${totalReturnedQty + returnItem.quantity}) גדולה מכמות שהוזמנה (${orderItem.quantity})` },
          { status: 400 }
        )
      }
    }

    // יצירת ההחזרה
    const returnRequest = await prisma.return.create({
      data: {
        shopId: shop.id,
        orderId: data.orderId,
        customerId: customerId,
        reason: data.reason,
        items: data.items,
        notes: data.notes,
        status: "PENDING",
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: shop.id,
        type: "return.created",
        entityType: "return",
        entityId: returnRequest.id,
        payload: {
          returnId: returnRequest.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: customerId,
          reason: data.reason,
        },
        userId: customerId,
      },
    })

    // יצירת התראה לכל המנהלים
    try {
      // בדיקה שה-shop יש לו companyId
      if (!shop.companyId) {
        console.warn(`Shop ${shop.id} has no companyId, skipping notification`)
      } else {
        const { notifyReturnCreated } = await import("@/lib/notification-service")
        await notifyReturnCreated({
          companyId: shop.companyId,
          returnId: returnRequest.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName || undefined,
          customerEmail: order.customerEmail || undefined,
          refundAmount: returnRequest.refundAmount || undefined,
          reason: data.reason,
        })
        console.log(`✅ Return notification sent for return ${returnRequest.id}`)
      }
    } catch (error) {
      console.error("Error sending return notification:", error)
      // לא נכשל את כל התהליך אם שליחת ההתראה נכשלה
    }

    return NextResponse.json(returnRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating storefront return:", error)
    return NextResponse.json(
      { error: "שגיאה ביצירת החזרה" },
      { status: 500 }
    )
  }
}

