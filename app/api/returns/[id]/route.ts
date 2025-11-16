import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateReturnSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "CANCELLED"]).optional(),
  refundAmount: z.number().optional(),
  refundMethod: z.string().optional(),
  notes: z.string().optional(),
})

// GET - קבלת פרטי החזרה
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const returnRequest = await prisma.return.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        order: {
          include: {
            items: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    if (!returnRequest) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 })
    }

    return NextResponse.json(returnRequest)
  } catch (error) {
    console.error("Error fetching return:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון החזרה
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שההחזרה שייכת לחברה
    const existingReturn = await prisma.return.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        order: {
          include: {
            items: true,
          },
        },
        shop: {
          select: {
            companyId: true,
          },
        },
      },
    })

    if (!existingReturn) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateReturnSchema.parse(body)

    const oldStatus = existingReturn.status
    const newStatus = data.status || oldStatus

    // שימוש ב-transaction כדי להבטיח עקביות נתונים
    const result = await prisma.$transaction(async (tx) => {
      // עדכון ההחזרה
      const returnRequest = await tx.return.update({
        where: { id: params.id },
        data,
      })

      // אם החזרה אושרה או הושלמה, נחזיר את המלאי
      // חשוב: נבדוק שההחזרה לא אושרה כבר בעבר (מניעת החזרת מלאי כפולה)
      if (
        (newStatus === "APPROVED" || newStatus === "COMPLETED") &&
        oldStatus !== "APPROVED" &&
        oldStatus !== "COMPLETED"
      ) {
      const returnItems = existingReturn.items as Array<{
        orderItemId: string
        quantity: number
        reason?: string
      }>

      // בדיקה שהפריטים להחזרה תואמים להזמנה
      if (!Array.isArray(returnItems) || returnItems.length === 0) {
        console.warn(`Return ${params.id} has no items or invalid items structure`)
        // לא נכשל, רק נרשום אזהרה
      }

      for (const returnItem of returnItems) {
        const orderItem = existingReturn.order.items.find(
          (item) => item.id === returnItem.orderItemId
        )

        if (!orderItem) {
          console.warn(`Order item ${returnItem.orderItemId} not found in order ${existingReturn.order.id}`)
          continue // נדלג על פריט שלא נמצא
        }

        // בדיקה שהכמות להחזרה לא עולה על הכמות שהוזמנה
        const quantityToReturn = Math.min(returnItem.quantity, orderItem.quantity)
        
        if (returnItem.quantity > orderItem.quantity) {
          console.warn(`Return quantity (${returnItem.quantity}) exceeds order quantity (${orderItem.quantity}) for item ${returnItem.orderItemId}, limiting to ${quantityToReturn}`)
        }

        if (orderItem && orderItem.variantId) {
          // החזרת המלאי לווריאנט
          const variant = await tx.productVariant.findUnique({
            where: { id: orderItem.variantId },
            include: {
              product: {
                select: {
                  shopId: true,
                  inventoryEnabled: true,
                  inventoryQty: true,
                },
              },
            },
          })

          if (variant && variant.product.inventoryEnabled) {
            const oldQty = variant.inventoryQty
            const newQty = oldQty + quantityToReturn

            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                inventoryQty: newQty,
              },
            })

            // יצירת אירוע החזרת מלאי
            await tx.shopEvent.create({
              data: {
                shopId: variant.product.shopId,
                type: "inventory.updated",
                entityType: "product_variant",
                entityId: variant.id,
                payload: {
                  productId: variant.productId,
                  variantId: variant.id,
                  oldQty,
                  newQty,
                  returnId: returnRequest.id,
                  reason: "return_approved",
                },
                userId: session.user.id,
              },
            })
          }
        } else if (orderItem && orderItem.productId && !orderItem.variantId) {
          // אם זה מוצר ללא ווריאנטים, נעדכן את המלאי של המוצר
          const product = await tx.product.findUnique({
            where: { id: orderItem.productId },
            select: {
              shopId: true,
              inventoryEnabled: true,
              inventoryQty: true,
            },
          })

          if (product && product.inventoryEnabled) {
            const quantityToReturnProduct = Math.min(returnItem.quantity, orderItem.quantity)
            const oldQty = product.inventoryQty
            const newQty = oldQty + quantityToReturnProduct

            await tx.product.update({
              where: { id: product.id },
              data: {
                inventoryQty: newQty,
              },
            })

            // יצירת אירוע החזרת מלאי
            await tx.shopEvent.create({
              data: {
                shopId: product.shopId,
                type: "inventory.updated",
                entityType: "product",
                entityId: product.id,
                payload: {
                  productId: product.id,
                  oldQty,
                  newQty,
                  returnId: returnRequest.id,
                  reason: "return_approved",
                },
                userId: session.user.id,
              },
            })
          }
        }
      }

      // יצירת אירוע עדכון החזרה
      await tx.shopEvent.create({
        data: {
          shopId: returnRequest.shopId,
          type: "return.updated",
          entityType: "return",
          entityId: returnRequest.id,
          payload: {
            returnId: returnRequest.id,
            status: returnRequest.status,
            oldStatus,
            changes: data,
          },
          userId: session.user.id,
        },
      })

      return returnRequest
    })

    const returnRequest = result

    // זיכוי דרך PayPlus (מחוץ ל-transaction כי זה external API)
    if (
      returnRequest.refundAmount &&
      returnRequest.refundAmount > 0 &&
      returnRequest.refundMethod === "ORIGINAL_PAYMENT" &&
      existingReturn.order.transactionId
    ) {
      // בדיקה אם יש אינטגרציה עם PayPlus
      const payplusIntegration = await prisma.integration.findFirst({
        where: {
          companyId: existingReturn.shop.companyId,
          type: "PAYPLUS",
          isActive: true,
        },
      })

      if (payplusIntegration && (payplusIntegration.apiKey || (payplusIntegration.config as any)?.apiKey)) {
        try {
          const { refundByTransactionUID, getPayPlusCredentials } = await import("@/lib/payplus")

          const credentials = await getPayPlusCredentials(existingReturn.shop.companyId)
          if (credentials && credentials.apiKey && credentials.secretKey) {
            const refundResult = await refundByTransactionUID(credentials, {
              transactionUid: existingReturn.order.transactionId,
              amount: returnRequest.refundAmount,
              moreInfo: `Return ID: ${returnRequest.id}, Order: ${existingReturn.order.orderNumber}`,
            })

            if (refundResult.success) {
              // יצירת אירוע זיכוי מוצלח
              await prisma.shopEvent.create({
                data: {
                  shopId: returnRequest.shopId,
                  type: "refund.processed",
                  entityType: "return",
                  entityId: returnRequest.id,
                  payload: {
                    returnId: returnRequest.id,
                    orderId: existingReturn.order.id,
                    amount: returnRequest.refundAmount,
                    transactionId: refundResult.data?.transaction_uid || existingReturn.order.transactionId,
                    method: "payplus",
                  },
                  userId: session.user.id,
                },
              })
            } else {
              console.error("PayPlus refund failed:", refundResult.error)
              // יצירת אירוע זיכוי נכשל
              await prisma.shopEvent.create({
                data: {
                  shopId: returnRequest.shopId,
                  type: "refund.failed",
                  entityType: "return",
                  entityId: returnRequest.id,
                  payload: {
                    returnId: returnRequest.id,
                    orderId: existingReturn.order.id,
                    amount: returnRequest.refundAmount,
                    error: refundResult.error,
                    method: "payplus",
                  },
                  userId: session.user.id,
                },
              })
            }
          }
        } catch (refundError: any) {
          console.error("Error processing PayPlus refund:", refundError)
          // לא נכשל את כל התהליך, רק נרשום שגיאה
        }
      }
    }

    return NextResponse.json(returnRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating return:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת החזרה
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שההחזרה שייכת לחברה
    const returnRequest = await prisma.return.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!returnRequest) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 })
    }

    // מחיקת ההחזרה
    await prisma.return.delete({
      where: { id: params.id },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: returnRequest.shopId,
        type: "return.deleted",
        entityType: "return",
        entityId: params.id,
        payload: {
          returnId: params.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "Return deleted successfully" })
  } catch (error) {
    console.error("Error deleting return:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

