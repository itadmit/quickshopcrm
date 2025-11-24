"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
import {
  Package,
  Calendar,
  Coins,
  MapPin,
  CreditCard,
  Truck,
  ArrowRight,
  ShoppingBag,
} from "lucide-react"
import Link from "next/link"

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
  isPublished: boolean
}

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  total: number
  product: {
    id: string
    name: string
    images: string[]
    slug: string
  }
  variant: {
    id: string
    name: string
  } | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  fulfillmentStatus: string
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  shippingMethod: string | null
  trackingNumber: string | null
  createdAt: string
  items: OrderItem[]
  shippingAddress: any // JSON field
  billingAddress: any | null // JSON field
}

export default function StorefrontOrderPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchShopInfo()
    fetchCartCount()
    fetchOrder()
  }, [slug, orderId])

  const fetchShopInfo = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/info`)
      if (response.ok) {
        const data = await response.json()
        setShop(data)
      }
    } catch (error) {
      console.error("Error fetching shop info:", error)
    }
  }

  const fetchCartCount = async () => {
    try {
      const token = localStorage.getItem(`storefront_token_${slug}`)
      const headers: HeadersInit = {}
      if (token) {
        headers["x-customer-id"] = token
      }

      const response = await fetch(`/api/storefront/${slug}/cart/count`, {
        headers,
      })
      
      if (response.ok) {
        const data = await response.json()
        setCartItemCount(data.count || 0)
      } else {
        setCartItemCount(0)
      }
    } catch (error) {
      console.error("Error fetching cart count:", error)
    }
  }

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem(`storefront_token_${slug}`)
      
      if (!token) {
        router.push(`/shop/${slug}/login`)
        return
      }

      const response = await fetch(`/api/storefront/${slug}/orders/${orderId}`, {
        headers: {
          "x-customer-id": token,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      } else if (response.status === 404) {
        router.push(`/shop/${slug}/account`)
      } else {
        router.push(`/shop/${slug}/account`)
      }
    } catch (error) {
      console.error("Error fetching order:", error)
      router.push(`/shop/${slug}/account`)
    } finally {
      setLoading(false)
    }
  }

  // פונקציה לתרגום סטטוס לעברית
  const getStatusText = (status: string, paymentStatus?: string) => {
    // אם התשלום שולם, נציג "שולם" במקום "ממתין"
    if (paymentStatus === "PAID" && status === "PENDING") {
      return "שולם"
    }
    
    const statusMap: Record<string, string> = {
      PENDING: "ממתין לתשלום",
      CONFIRMED: "מאושר",
      PROCESSING: "מעבד",
      SHIPPED: "נשלח",
      DELIVERED: "נמסר",
      CANCELLED: "בוטל",
      REFUNDED: "הוחזר",
    }
    return statusMap[status] || status
  }

  // פונקציה לקביעת צבע סטטוס
  const getStatusColor = (status: string, paymentStatus?: string) => {
    // אם הוזמן ביקרוק ובוטל - אדום
    if (status === "CANCELLED" || status === "REFUNDED") {
      return "bg-red-100 text-red-700 border-red-200"
    }
    // אם הוזמן ביקרוק - ירוק
    if (paymentStatus === "PAID" && status !== "CANCELLED") {
      return "bg-green-100 text-green-700 border-green-200"
    }
    // פנדינג - צהוב
    if (status === "PENDING") {
      return "bg-yellow-100 text-yellow-700 border-yellow-200"
    }
    // סטטוסים אחרים - כחול פסטל
    return "bg-blue-100 text-blue-700 border-blue-200"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
        <StorefrontHeader
          slug={slug}
          shop={shop}
          cartItemCount={cartItemCount}
          onCartUpdate={fetchCartCount}
        />
        <main className="flex-1">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <FormSkeleton />
          </div>
        </main>
        <footer className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <p className="text-gray-600 text-sm">
                &copy; {new Date().getFullYear()} {shop?.name || "חנות"}. כל הזכויות שמורות.
              </p>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Header */}
      <StorefrontHeader
        slug={slug}
        shop={shop}
        cartItemCount={cartItemCount}
        onCartUpdate={fetchCartCount}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Back Button */}
        <Link href={`/shop/${slug}/account`}>
          <Button variant="ghost" className="mb-6">
            <ArrowRight className="w-4 h-4 ml-2" />
            חזרה לחשבון שלי
          </Button>
        </Link>

        {/* Order Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">
                  הזמנה #{order.orderNumber}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(order.status, order.paymentStatus)}>
                    {getStatusText(order.status, order.paymentStatus)}
                  </Badge>
                  {order.paymentStatus && (
                    <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                      {order.paymentStatus === "PAID" ? "שולם" : 
                       order.paymentStatus === "PENDING" ? "ממתין לתשלום" : 
                       order.paymentStatus === "FAILED" ? "תשלום נכשל" : 
                       order.paymentStatus === "REFUNDED" ? "הוחזר" : order.paymentStatus}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">תאריך הזמנה</div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">
                    {new Date(order.createdAt).toLocaleDateString("he-IL")}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>פריטים בהזמנה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                      {item.product.images && item.product.images.length > 0 && (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <Link href={`/shop/${slug}/products/${item.product.slug || item.product.id}`}>
                          <h3 className="font-semibold hover:text-blue-600 transition-colors">
                            {item.product.name}
                          </h3>
                        </Link>
                        {item.variant && (
                          <p className="text-sm text-gray-600">{item.variant.name}</p>
                        )}
                        <p className="text-sm text-gray-600 mt-1">
                          כמות: {item.quantity}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">₪{item.total.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">
                          ₪{item.price.toFixed(2)} ליחידה
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    כתובת משלוח
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {(() => {
                      const address = typeof order.shippingAddress === 'string' 
                        ? JSON.parse(order.shippingAddress) 
                        : order.shippingAddress
                      return (
                        <>
                          {address.firstName && address.lastName && (
                            <p className="font-medium">
                              {address.firstName} {address.lastName}
                            </p>
                          )}
                          {address.address && (
                            <p className="text-gray-700">{address.address}</p>
                          )}
                          {address.city && address.zip && (
                            <p className="text-gray-700">
                              {address.city} {address.zip}
                            </p>
                          )}
                          {address.country && (
                            <p className="text-gray-700">{address.country}</p>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tracking */}
            {order.trackingNumber && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    מעקב משלוח
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {order.shippingMethod && (
                      <p className="text-gray-700">
                        <span className="font-medium">שיטת משלוח:</span> {order.shippingMethod}
                      </p>
                    )}
                    <p className="text-gray-700">
                      <span className="font-medium">מספר מעקב:</span> {order.trackingNumber}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>סיכום הזמנה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-gray-700">
                  <span>סה"כ ביניים</span>
                  <span>₪{order.subtotal.toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>הנחה</span>
                    <span>-₪{order.discount.toFixed(2)}</span>
                  </div>
                )}
                {order.shipping > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>משלוח</span>
                    <span>₪{order.shipping.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-4 flex justify-between text-lg font-bold">
                  <span>סה"כ</span>
                  <span>₪{order.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-gray-600 text-sm">
              &copy; {new Date().getFullYear()} {shop?.name || "חנות"}. כל הזכויות שמורות.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

