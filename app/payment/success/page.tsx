import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { CheckCircle2, Package, Mail, Phone, MapPin, Calendar } from "lucide-react"
import Link from "next/link"

async function getOrder(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            settings: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
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

    return order
  } catch (error) {
    console.error("Error fetching order:", error)
    return null
  }
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { orderId?: string; [key: string]: string | undefined }
}) {
  const { orderId, status, status_code } = searchParams

  if (!orderId) {
    redirect("/")
  }

  const order = await getOrder(orderId)

  if (!order) {
    redirect("/")
  }

  // אם יש פרמטרים של PayPlus שמצביעים על תשלום מוצלח, נעדכן את ההזמנה
  // זה גיבוי למקרה שה-callback לא נקרא
  const isPaymentSuccess = status === "approved" || status_code === "000"
  if (isPaymentSuccess && order.paymentStatus !== "PAID") {
    try {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PAID",
          paidAt: new Date(),
          transactionId: searchParams.transaction_uid || order.transactionId,
        },
      })
      
      // אם התשלום הצליח, נעדכן את המלאי
      const orderWithItems = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
        },
      })

      if (orderWithItems) {
        for (const item of orderWithItems.items) {
          if (item.variantId) {
            const variant = await prisma.productVariant.findUnique({
              where: { id: item.variantId },
              include: { product: { select: { shopId: true, lowStockAlert: true } } },
            })
            
            if (variant) {
              const oldQty = variant.inventoryQty
              const newQty = Math.max(0, oldQty - item.quantity)
              
              await prisma.productVariant.update({
                where: { id: item.variantId },
                data: {
                  inventoryQty: newQty,
                },
              })
            }
          } else if (item.productId) {
            const product = await prisma.product.findUnique({
              where: { id: item.productId },
            })
            
            if (product) {
              const oldQty = product.inventoryQty
              const newQty = Math.max(0, oldQty - item.quantity)
              
              await prisma.product.update({
                where: { id: item.productId },
                data: {
                  inventoryQty: newQty,
                },
              })
            }
          }
        }
      }

      // יצירת אירוע payment.completed
      await prisma.shopEvent.create({
        data: {
          shopId: order.shopId,
          type: "payment.completed",
          entityType: "order",
          entityId: order.id,
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            amount: order.total,
            transactionId: searchParams.transaction_uid || order.transactionId,
            paymentMethod: "credit_card",
            shopId: order.shopId,
          },
          userId: order.customerId || undefined,
        },
      })

      // שליחת מייל אישור תשלום
      const { sendOrderConfirmationEmail } = await import("@/lib/order-email")
      await sendOrderConfirmationEmail(order.id).catch((error) => {
        console.error("Error sending confirmation email:", error)
      })

      // טעינת ההזמנה מחדש עם הנתונים המעודכנים (לא חובה, אבל עוזר לוודא שהנתונים מעודכנים)
      // ההזמנה כבר מעודכנת ב-DB, אז זה רק לוודא שהנתונים נכונים
    } catch (error) {
      console.error("Error updating order status:", error)
      // לא נעצור את התהליך אם יש שגיאה בעדכון
    }
  }

  const shopSettings = order.shop.settings as any
  const thankYouPageSettings = shopSettings?.thankYouPage || {}
  
  // הגדרות ברירת מחדל
  const template = thankYouPageSettings.template || "minimal"
  const primaryColor = thankYouPageSettings.primaryColor || "#9333ea"
  const backgroundColor = thankYouPageSettings.backgroundColor || "#ffffff"
  const textColor = thankYouPageSettings.textColor || "#111827"
  const showOrderDetails = thankYouPageSettings.showOrderDetails !== false
  const showContinueShopping = thankYouPageSettings.showContinueShopping !== false

  // תבנית 1: Minimal (מינימלי)
  if (template === "minimal") {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor }}
        dir="rtl"
      >
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: primaryColor + "20" }}
            >
              <CheckCircle2 
                className="w-12 h-12"
                style={{ color: primaryColor }}
              />
            </div>
          </div>
          
          <div>
            <h1 
              className="text-3xl font-bold mb-2"
              style={{ color: textColor }}
            >
              תודה על הרכישה!
            </h1>
            <p 
              className="text-lg"
              style={{ color: textColor + "CC" }}
            >
              ההזמנה שלך התקבלה בהצלחה
            </p>
          </div>

          {showOrderDetails && (
            <div 
              className="rounded-lg p-6 space-y-4"
              style={{ backgroundColor: textColor + "08" }}
            >
              <div className="flex justify-between items-center">
                <span style={{ color: textColor + "CC" }}>מספר הזמנה:</span>
                <span className="font-semibold" style={{ color: textColor }}>
                  {order.orderNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: textColor + "CC" }}>סכום:</span>
                <span className="font-semibold" style={{ color: textColor }}>
                  ₪{order.total.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {showContinueShopping && (
            <Link
              href={`/shop/${order.shop.slug || order.shop.id}`}
              className="inline-block px-6 py-3 rounded-lg font-medium text-white transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              המשך לקניות
            </Link>
          )}
        </div>
      </div>
    )
  }

  // תבנית 2: Detailed (מפורט)
  if (template === "detailed") {
    return (
      <div 
        className="min-h-screen py-12 px-4"
        style={{ backgroundColor }}
        dir="rtl"
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ backgroundColor: primaryColor + "20" }}
              >
                <CheckCircle2 
                  className="w-16 h-16"
                  style={{ color: primaryColor }}
                />
              </div>
            </div>
            <h1 
              className="text-4xl font-bold mb-2"
              style={{ color: textColor }}
            >
              תודה על הרכישה!
            </h1>
            <p 
              className="text-lg"
              style={{ color: textColor + "CC" }}
            >
              ההזמנה שלך התקבלה בהצלחה ונשלחה לטיפול
            </p>
          </div>

          {showOrderDetails && (
            <div 
              className="rounded-lg p-6 mb-6 space-y-6"
              style={{ backgroundColor: textColor + "08" }}
            >
              <div>
                <h2 
                  className="text-xl font-semibold mb-4"
                  style={{ color: textColor }}
                >
                  פרטי ההזמנה
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span style={{ color: textColor + "CC" }}>מספר הזמנה:</span>
                    <span className="font-semibold" style={{ color: textColor }}>
                      {order.orderNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: textColor + "CC" }}>תאריך:</span>
                    <span style={{ color: textColor }}>
                      {new Date(order.createdAt).toLocaleDateString("he-IL")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: textColor + "CC" }}>סכום כולל:</span>
                    <span className="font-semibold text-xl" style={{ color: primaryColor }}>
                      ₪{order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div>
                  <h3 
                    className="font-semibold mb-3"
                    style={{ color: textColor }}
                  >
                    פריטים בהזמנה:
                  </h3>
                  <div className="space-y-3">
                    {order.items.map((item: any) => {
                      const productImage = item.product?.images?.[0]
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          {/* תמונה של המוצר */}
                          {productImage && (
                            <img
                              src={productImage}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          {/* פרטי המוצר */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium" style={{ color: textColor }}>
                                  {item.name}
                                </p>
                                {item.variant && (
                                  <p className="text-sm mt-0.5" style={{ color: textColor + "AA" }}>
                                    {item.variant.name}
                                  </p>
                                )}
                                <p className="text-sm mt-1" style={{ color: textColor + "CC" }}>
                                  כמות: {item.quantity}
                                </p>
                              </div>
                              <span className="font-semibold flex-shrink-0" style={{ color: textColor }}>
                                ₪{item.total.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {order.customerEmail && (
                <div className="pt-4 border-t" style={{ borderColor: textColor + "20" }}>
                  <p className="text-sm" style={{ color: textColor + "CC" }}>
                    אישור הזמנה נשלח ל-{order.customerEmail}
                  </p>
                </div>
              )}
            </div>
          )}

          {showContinueShopping && (
            <div className="text-center">
              <Link
                href={`/shop/${order.shop.slug || order.shop.id}`}
                className="inline-block px-8 py-3 rounded-lg font-medium text-white transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                המשך לקניות
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  // תבנית 3: Celebration (חגיגי)
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor }}
      dir="rtl"
    >
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="relative">
          <div 
            className="w-32 h-32 rounded-full flex items-center justify-center mx-auto animate-bounce"
            style={{ backgroundColor: primaryColor + "20" }}
          >
            <CheckCircle2 
              className="w-20 h-20"
              style={{ color: primaryColor }}
            />
          </div>
          <div 
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full animate-ping"
            style={{ backgroundColor: primaryColor }}
          />
        </div>
        
        <div>
          <h1 
            className="text-4xl font-bold mb-3"
            style={{ color: textColor }}
          >
            🎉 מזל טוב!
          </h1>
          <p 
            className="text-xl mb-2"
            style={{ color: textColor }}
          >
            ההזמנה שלך התקבלה בהצלחה
          </p>
          <p 
            className="text-lg"
            style={{ color: textColor + "CC" }}
          >
            אנחנו כבר מתחילים להכין אותה עבורך
          </p>
        </div>

        {showOrderDetails && (
          <div 
            className="rounded-lg p-6 space-y-4"
            style={{ backgroundColor: textColor + "08" }}
          >
            <div className="flex justify-between items-center text-lg">
              <span style={{ color: textColor + "CC" }}>מספר הזמנה:</span>
              <span className="font-bold" style={{ color: primaryColor }}>
                {order.orderNumber}
              </span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span style={{ color: textColor + "CC" }}>סכום:</span>
              <span className="font-bold text-2xl" style={{ color: primaryColor }}>
                ₪{order.total.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {showContinueShopping && (
          <div className="space-y-3">
            <Link
              href={`/shop/${order.shop.slug || order.shop.id}`}
              className="inline-block w-full px-8 py-4 rounded-lg font-medium text-white transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              המשך לקניות
            </Link>
            <p className="text-sm" style={{ color: textColor + "CC" }}>
              נשלח לך אימייל עם פרטי ההזמנה
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

