"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ChevronRight,
  Tag,
} from "lucide-react"
import Link from "next/link"
import { CartSkeleton } from "@/components/skeletons/CartSkeleton"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import {
  trackPageView,
  trackViewCart,
  trackRemoveFromCart,
  trackInitiateCheckout,
} from "@/lib/tracking-events"

interface CartItem {
  productId: string
  variantId: string | null
  product: {
    id: string
    name: string
    price: number
    images: string[]
  }
  variant: {
    id: string
    name: string
    price: number | null
  } | null
  quantity: number
}

interface Cart {
  id: string
  items: CartItem[]
  subtotal: number
  tax: number
  shipping: number
  total: number
  couponCode: string | null
  discount: number
  customerDiscount?: number
  couponDiscount?: number
  automaticDiscount?: number
}

export default function CartPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [couponCode, setCouponCode] = useState("")
  const [customerId, setCustomerId] = useState<string | null>(null)
  const { trackEvent } = useTracking()

  useEffect(() => {
    const customerData = localStorage.getItem(`storefront_customer_${slug}`)
    if (customerData) {
      try {
        const parsed = JSON.parse(customerData)
        setCustomerId(parsed.id)
      } catch (error) {
        console.error("Error parsing customer data:", error)
      }
    }
    fetchCart()
    
    // PageView event
    trackPageView(trackEvent, `/shop/${slug}/cart`, "עגלת קניות")
  }, [slug])

  const fetchCart = async () => {
    setLoading(true)
    try {
      const headers: HeadersInit = {}
      if (customerId) {
        headers["x-customer-id"] = customerId
      }

      const response = await fetch(`/api/storefront/${slug}/cart`, {
        headers,
        credentials: 'include', // חשוב! שולח cookies עם הבקשה
      })
      if (response.ok) {
        const data = await response.json()
        setCart(data)
        
        // ViewCart event
        if (data.items && data.items.length > 0) {
          const items = data.items.map((item: CartItem) => ({
            id: item.productId,
            name: item.product.name,
            price: item.variant?.price || item.product.price,
            quantity: item.quantity,
          }))
          trackViewCart(trackEvent, items, data.total)
        }
      }
    } catch (error) {
      console.error("Error fetching cart:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (productId: string, variantId: string | null, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(productId, variantId)
      return
    }

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (customerId) {
        headers["x-customer-id"] = customerId
      }

      const response = await fetch(`/api/storefront/${slug}/cart`, {
        method: "PUT",
        headers,
        credentials: 'include', // חשוב! שולח cookies עם הבקשה
        body: JSON.stringify({
          productId,
          variantId,
          quantity,
        }),
      })

      if (response.ok) {
        fetchCart()
      }
    } catch (error) {
      console.error("Error updating cart:", error)
    }
  }

  const removeItem = async (productId: string, variantId: string | null) => {
    try {
      const headers: HeadersInit = {}
      if (customerId) {
        headers["x-customer-id"] = customerId
      }

      // מציאת הפריט לפני ההסרה כדי לשלוח אירוע
      const itemToRemove = cart?.items.find(
        (item) => item.productId === productId && item.variantId === variantId
      )

      const params = new URLSearchParams({ productId })
      if (variantId) {
        params.append("variantId", variantId)
      }

      const response = await fetch(`/api/storefront/${slug}/cart?${params}`, {
        method: "DELETE",
        headers,
        credentials: 'include', // חשוב! שולח cookies עם הבקשה
      })

      if (response.ok) {
        // RemoveFromCart event
        if (itemToRemove) {
          trackRemoveFromCart(trackEvent, {
            id: itemToRemove.productId,
            name: itemToRemove.product.name,
          }, itemToRemove.quantity)
        }
        fetchCart()
      }
    } catch (error) {
      console.error("Error removing item:", error)
    }
  }

  const applyCoupon = async () => {
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (customerId) {
        headers["x-customer-id"] = customerId
      }

      const response = await fetch(`/api/storefront/${slug}/cart`, {
        method: "PUT",
        headers,
        credentials: 'include', // חשוב! שולח cookies עם הבקשה
        body: JSON.stringify({
          couponCode,
        }),
      })

      if (response.ok) {
        fetchCart()
        setCouponCode("")
      } else {
        const error = await response.json()
        alert(error.error || "קוד קופון לא תקין")
      }
    } catch (error) {
      console.error("Error applying coupon:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <CartSkeleton />
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href={`/shop/${slug}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ChevronRight className="w-5 h-5" />
              חזרה לחנות
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">העגלה שלך ריקה</h2>
            <p className="text-gray-600 mb-6">הוסף מוצרים לעגלה כדי להתחיל</p>
            <Link href={`/shop/${slug}`}>
              <Button className="prodify-gradient text-white">
                המשך לקניות
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href={`/shop/${slug}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ChevronRight className="w-5 h-5" />
            חזרה לחנות
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">עגלת קניות</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item, index) => {
              const price = item.variant?.price || item.product.price
              return (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {item.product.images && item.product.images.length > 0 && (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {item.product.name}
                        </h3>
                        {item.variant && (
                          <p className="text-sm text-gray-600 mb-2">
                            {item.variant.name}
                          </p>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.variantId,
                                  item.quantity - 1
                                )
                              }
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-12 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.variantId,
                                  item.quantity + 1
                                )
                              }
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <span className="font-semibold">
                            ₪{(price * item.quantity).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.productId, item.variantId)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">סיכום הזמנה</h2>

                {/* Coupon */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="קוד קופון"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                    />
                    <Button onClick={applyCoupon} variant="outline">
                      <Tag className="w-4 h-4" />
                    </Button>
                  </div>
                  {cart.couponCode && (
                    <Badge className="mt-2 bg-green-100 text-green-800">
                      קופון: {cart.couponCode}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span>סכום ביניים</span>
                    <span>₪{cart.subtotal.toFixed(2)}</span>
                  </div>
                  {cart.customerDiscount && cart.customerDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>הנחת לקוח</span>
                      <span>-₪{cart.customerDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {cart.couponDiscount && cart.couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>קופון</span>
                      <span>-₪{cart.couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {cart.automaticDiscount && cart.automaticDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>הנחה אוטומטית</span>
                      <span>-₪{cart.automaticDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {cart.shipping > 0 && (
                    <div className="flex justify-between">
                      <span>משלוח</span>
                      <span>₪{cart.shipping.toFixed(2)}</span>
                    </div>
                  )}
                  {cart.tax > 0 && (
                    <div className="flex justify-between">
                      <span>מע"מ</span>
                      <span>₪{cart.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>סה"כ</span>
                    <span>₪{cart.total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    // InitiateCheckout event
                    const items = cart.items.map((item) => ({
                      id: item.productId,
                      name: item.product.name,
                      price: item.variant?.price || item.product.price,
                      quantity: item.quantity,
                    }))
                    trackInitiateCheckout(trackEvent, items, cart.total)
                    router.push(`/shop/${slug}/checkout`)
                  }}
                  className="w-full prodify-gradient text-white"
                  size="lg"
                >
                  המשך לתשלום
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

