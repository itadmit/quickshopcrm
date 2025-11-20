import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { XCircle, RefreshCw } from "lucide-react"
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

export default async function PaymentFailurePage({
  searchParams,
}: {
  searchParams: { orderId?: string }
}) {
  const { orderId } = searchParams

  if (!orderId) {
    redirect("/")
  }

  const order = await getOrder(orderId)

  if (!order) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50" dir="rtl">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            התשלום נכשל
          </h1>
          <p className="text-lg text-gray-600">
            לא הצלחנו לעבד את התשלום שלך
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 space-y-4">
          <p className="text-sm text-gray-600">
            מספר הזמנה: <span className="font-semibold">{order.orderNumber}</span>
          </p>
          <p className="text-sm text-gray-600">
            אנא נסה שוב או פנה לתמיכה
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href={`/shop/${order.shop.slug || order.shop.id}/checkout`}
            className="inline-block w-full px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            נסה שוב
          </Link>
          <Link
            href={`/shop/${order.shop.slug || order.shop.id}`}
            className="inline-block w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            חזור לחנות
          </Link>
        </div>
      </div>
    </div>
  )
}

