import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateOrderSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
  fulfillmentStatus: z.enum(["UNFULFILLED", "PARTIAL", "FULFILLED"]).optional(),
  shippingMethod: z.string().optional(),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
})

// GET - קבלת פרטי הזמנה
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון הזמנה
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שההזמנה שייכת לחברה
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateOrderSchema.parse(body)

    // עדכון ההזמנה
    const order = await prisma.order.update({
      where: { id: params.id },
      data,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // יצירת אירוע
    const eventType = data.status && data.status !== existingOrder.status
      ? "order.status_changed"
      : "order.updated"

    await prisma.shopEvent.create({
      data: {
        shopId: order.shopId,
        type: eventType,
        entityType: "order",
        entityId: order.id,
        payload: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          ...(data.status && data.status !== existingOrder.status
            ? { oldStatus: existingOrder.status, newStatus: data.status }
            : { changes: data }),
        },
        userId: session.user.id,
      },
    })

    // אם הסטטוס שונה ל-PAID, יצירת אירוע payment
    if (data.paymentStatus === "PAID" && existingOrder.paymentStatus !== "PAID") {
      await prisma.shopEvent.create({
        data: {
          shopId: order.shopId,
          type: "order.paid",
          entityType: "order",
          entityId: order.id,
          payload: {
            orderId: order.id,
            amount: order.total,
            paymentMethod: order.paymentMethod,
          },
          userId: session.user.id,
        },
      })
    }

    // אם הסטטוס שונה ל-SHIPPED, יצירת אירוע shipping
    if (data.status === "SHIPPED" && existingOrder.status !== "SHIPPED") {
      await prisma.shopEvent.create({
        data: {
          shopId: order.shopId,
          type: "order.shipped",
          entityType: "order",
          entityId: order.id,
          payload: {
            orderId: order.id,
            trackingNumber: data.trackingNumber || order.trackingNumber,
          },
          userId: session.user.id,
        },
      })
    }

    return NextResponse.json(order)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating order:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

