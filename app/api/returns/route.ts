import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createReturnSchema = z.object({
  shopId: z.string(),
  orderId: z.string(),
  customerId: z.string(),
  reason: z.string().min(1, "סיבת ההחזרה היא חובה"),
  items: z.array(z.object({
    orderItemId: z.string(),
    quantity: z.number().int().positive("כמות חייבת להיות מספר חיובי"),
    reason: z.string().optional(),
  })).min(1, "חייב לבחור לפחות פריט אחד להחזרה"),
  notes: z.string().optional(),
})

const updateReturnSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "CANCELLED"]).optional(),
  refundAmount: z.number().optional(),
  refundMethod: z.string().optional(),
  notes: z.string().optional(),
})

// GET - קבלת כל ההחזרות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const orderId = searchParams.get("orderId")
    const customerId = searchParams.get("customerId")
    const status = searchParams.get("status")

    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    if (orderId) {
      where.orderId = orderId
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (status) {
      where.status = status
    }

    const returns = await prisma.return.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(returns)
  } catch (error) {
    console.error("Error fetching returns:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת החזרה חדשה
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createReturnSchema.parse(body)

    // בדיקה שההזמנה והלקוח שייכים לחברה
    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        shop: {
          id: data.shopId,
          companyId: session.user.companyId,
        },
        customerId: data.customerId,
      },
      include: {
        items: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // בדיקה שההזמנה שולמה (לא ניתן להחזיר הזמנה שלא שולמה)
    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: "לא ניתן להחזיר הזמנה שלא שולמה" },
        { status: 400 }
      )
    }

    // בדיקה שהפריטים להחזרה תואמים להזמנה
    for (const returnItem of data.items) {
      const orderItem = order.items.find((item: any) => item.id === returnItem.orderItemId)
      
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
        const pendingRetItem = pendingRetItems.find((item: any) => item.orderItemId === returnItem.orderItemId)
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
        const retItem = retItems.find((item: any) => item.orderItemId === returnItem.orderItemId)
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
        shopId: data.shopId,
        orderId: data.orderId,
        customerId: data.customerId,
        reason: data.reason,
        items: data.items,
        notes: data.notes,
        status: "PENDING",
      },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: returnRequest.shopId,
        type: "return.created",
        entityType: "return",
        entityId: returnRequest.id,
        payload: {
          returnId: returnRequest.id,
          orderId: returnRequest.orderId,
          reason: returnRequest.reason,
        },
        userId: session.user.id,
      },
    })

    // יצירת התראה לכל המנהלים
    try {
      const shop = await prisma.shop.findUnique({
        where: { id: returnRequest.shopId },
        select: { companyId: true },
      })
      
      if (shop) {
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
      }
    } catch (error) {
      console.error("Error sending return notification:", error)
      // לא נכשל את כל התהליך אם שליחת ההתראה נכשלה
    }

    return NextResponse.json(returnRequest, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating return:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

