import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { CreditCard, Loader2, ExternalLink, ArrowRight } from "lucide-react"
import Link from "next/link"

async function getOrder(orderId: string, shopSlug: string) {
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
          },
        },
      },
    })

    // בדיקה שההזמנה שייכת לחנות הנכונה
    if (!order || order.shop.slug !== shopSlug) {
      return null
    }

    return order
  } catch (error) {
    console.error("Error fetching order:", error)
    return null
  }
}

export default async function PaymentPage({
  params,
}: {
  params: { slug: string; id: string }
}) {
  const order = await getOrder(params.id, params.slug)

  if (!order) {
    redirect(`/shop/${params.slug}`)
  }

  // אם יש paymentLink, נציג אותו (בודק גם ב-notes אם הוא שם זמנית)
  const paymentLink = order.paymentLink || (order.notes?.includes('Payment Link:') 
    ? order.notes.split('Payment Link:')[1]?.split('\n')[0]?.trim() 
    : null)
  
  if (paymentLink) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                המשך לתשלום
              </h1>
              <p className="text-lg text-gray-600">
                הזמנה #{order.orderNumber}
              </p>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                סיכום הזמנה
              </h2>
              
              {order.items && order.items.length > 0 && (
                <div className="space-y-2 mb-4">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-gray-700">
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span className="font-medium">
                        ₪{item.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-200 pt-4 space-y-2">
                {order.subtotal > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>סכום ביניים:</span>
                    <span>₪{order.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>הנחה:</span>
                    <span>-₪{order.discount.toFixed(2)}</span>
                  </div>
                )}
                {order.shipping > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>משלוח:</span>
                    <span>₪{order.shipping.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>סה"כ לתשלום:</span>
                  <span className="text-emerald-600">₪{order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Link */}
            <div className="space-y-4">
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-4 px-6 rounded-lg transition-colors"
              >
                <span>המשך לתשלום מאובטח</span>
                <ExternalLink className="w-5 h-5" />
              </a>

              <p className="text-sm text-gray-500 text-center">
                תועבר לדף תשלום מאובטח של PayPlus
              </p>
            </div>

            {/* Back to shop */}
            <div className="pt-4 border-t border-gray-200">
              <Link
                href={`/shop/${params.slug}`}
                className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>חזור לחנות</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // אם אין paymentLink, נציג הודעה שהתשלום לא זמין
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-yellow-600 animate-spin" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ממתין לקישור תשלום
          </h1>
          
          <p className="text-lg text-gray-600 mb-6">
            קישור התשלום עדיין לא מוכן. אנא נסה שוב בעוד כמה רגעים.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              מספר הזמנה: <span className="font-semibold">{order.orderNumber}</span>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              סכום: <span className="font-semibold">₪{order.total.toFixed(2)}</span>
            </p>
          </div>

          <div className="space-y-3">
            <a
              href={`/shop/${params.slug}/payment/${params.id}`}
              className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-6 rounded-lg transition-colors text-center"
            >
              רענן דף
            </a>
            
            <Link
              href={`/shop/${params.slug}`}
              className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors text-center"
            >
              חזור לחנות
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

