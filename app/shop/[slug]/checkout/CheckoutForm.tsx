"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/components/ui/use-toast"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { useShopTheme } from "@/hooks/useShopTheme"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import {
  trackPageView,
  trackAddPaymentInfo,
  trackPurchase,
} from "@/lib/tracking-events"
import {
  CreditCard,
  Truck,
  Lock,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

interface CartItem {
  productId: string
  variantId: string | null
  quantity: number
  price: number
  total: number
  product: {
    id: string
    name: string
    images: string[]
  }
  variant: {
    id: string
    name: string
  } | null
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
}

interface Shop {
  id: string
  name: string
  logo: string | null
  shippingSettings?: {
    enabled: boolean
    options?: {
      fixed: boolean
      fixedCost: number | null
      free: boolean
      freeOver: boolean
      freeOverAmount: number | null
    }
    zones?: string[]
    time?: string
  }
  pickupSettings?: {
    enabled: boolean
    address?: string
    cost?: number | null
  }
}

interface CheckoutFormProps {
  shop: Shop
  cart: Cart
  customerData: any
  slug: string
}

export function CheckoutForm({ shop, cart, customerData, slug }: CheckoutFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { theme } = useShopTheme(slug)
  const { trackEvent } = useTracking()
  const [processing, setProcessing] = useState(false)
  
  const [formData, setFormData] = useState({
    email: customerData?.email || "",
    phone: customerData?.phone || "",
    firstName: customerData?.firstName || "",
    lastName: customerData?.lastName || "",
    address: "",
    city: "",
    zip: "",
    paymentMethod: "credit_card" as "credit_card" | "bank_transfer" | "cash",
    deliveryMethod: "shipping" as "shipping" | "pickup",
  })

  // חישוב משלוח דינמי - מתעדכן כשמשתנה formData
  const shippingCost = useMemo(() => {
    if (formData.deliveryMethod === "pickup") {
      return shop.pickupSettings?.cost || 0
    }

    if (!shop.shippingSettings?.enabled) {
      return 0
    }

    const options = shop.shippingSettings.options || {}
    
    if (options.freeOver && options.freeOverAmount && cart.subtotal >= options.freeOverAmount) {
      return 0
    }
    
    if (options.free) {
      return 0
    }
    
    if (options.fixed && options.fixedCost) {
      return options.fixedCost
    }

    return 0
  }, [formData.deliveryMethod, shop.shippingSettings, shop.pickupSettings, cart.subtotal])

  const finalTotal = useMemo(() => {
    return cart.subtotal - (cart.discount || 0) + (cart.tax || 0) + shippingCost
  }, [cart.subtotal, cart.discount, cart.tax, shippingCost])

  // PageView event - רק פעם אחת כשהעמוד נטען
  useEffect(() => {
    trackPageView(trackEvent, `/shop/${slug}/checkout`, "תשלום")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]) // רק כשהעמוד משתנה, לא trackEvent

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setProcessing(true)
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (customerData?.id) {
        headers["x-customer-id"] = customerData.id
      }

      const response = await fetch(`/api/storefront/${slug}/checkout`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customerId: customerData?.id || undefined,
          customerName: `${formData.firstName} ${formData.lastName}`,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          shippingAddress: formData.deliveryMethod === "shipping" ? {
            firstName: formData.firstName,
            lastName: formData.lastName,
            address: formData.address,
            city: formData.city,
            zip: formData.zip,
          } : null,
          deliveryMethod: formData.deliveryMethod,
          paymentMethod: formData.paymentMethod,
          couponCode: cart.couponCode,
          shippingCost: shippingCost,
        }),
      })

      if (response.ok) {
        const order = await response.json()
        
        // Purchase event
        const items = cart.items.map((item) => ({
          id: item.productId,
          name: item.product.name,
          price: item.price,
          quantity: item.quantity,
        }))
        
        trackPurchase(trackEvent, {
          id: order.id,
          orderNumber: order.orderNumber || order.id,
          total: finalTotal,
          tax: cart.tax || 0,
          shipping: shippingCost,
          items,
        })
        
        // אם זה תשלום בכרטיס אשראי, redirect ל-payment gateway
        if (formData.paymentMethod === "credit_card" && order.paymentUrl) {
          window.location.href = order.paymentUrl
          return
        }
        
        // אחרת, redirect לדף אישור
        router.push(`/shop/${slug}/order-confirmation/${order.id}`)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת ההזמנה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating order:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת ההזמנה",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <StorefrontHeader 
        slug={slug} 
        shop={shop} 
        cartItemCount={cart.items.reduce((sum, item) => sum + item.quantity, 0)} 
      />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/shop/${slug}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            חזרה לחנות
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">תשלום</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form - Left Side */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Information */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">פרטי יצירת קשר</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      אימייל *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      טלפון *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Method */}
              {(shop.shippingSettings?.enabled || shop.pickupSettings?.enabled) && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    שיטת משלוח
                  </h2>
                  <RadioGroup
                    value={formData.deliveryMethod}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({ ...prev, deliveryMethod: value }))
                    }
                    className="space-y-3"
                  >
                    {shop.shippingSettings?.enabled && (
                      <div className="flex items-center space-x-2 space-x-reverse border border-gray-200 rounded-lg p-4 hover:border-gray-300 cursor-pointer">
                        <RadioGroupItem value="shipping" id="shipping" />
                        <Label htmlFor="shipping" className="cursor-pointer flex-1">
                          <div className="font-medium">משלוח</div>
                          <div className="text-sm text-gray-500">
                            {shippingCost === 0 ? "משלוח חינם" : `₪${shippingCost.toFixed(2)}`}
                            {shop.shippingSettings?.time && ` - ${shop.shippingSettings.time}`}
                          </div>
                        </Label>
                      </div>
                    )}
                    {shop.pickupSettings?.enabled && (
                      <div className="flex items-center space-x-2 space-x-reverse border border-gray-200 rounded-lg p-4 hover:border-gray-300 cursor-pointer">
                        <RadioGroupItem value="pickup" id="pickup" />
                        <Label htmlFor="pickup" className="cursor-pointer flex-1">
                          <div className="font-medium">איסוף עצמי</div>
                          <div className="text-sm text-gray-500">
                            {shop.pickupSettings?.cost ? `₪${shop.pickupSettings.cost.toFixed(2)}` : "חינם"}
                            {shop.pickupSettings?.address && ` - ${shop.pickupSettings.address}`}
                          </div>
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>
              )}

              {/* Shipping Address */}
              {formData.deliveryMethod === "shipping" && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    כתובת משלוח
                  </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                        שם פרטי *
                      </Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                        שם משפחה *
                      </Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                      כתובת *
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                        עיר *
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip" className="text-sm font-medium text-gray-700">
                        מיקוד *
                      </Label>
                      <Input
                        id="zip"
                        value={formData.zip}
                        onChange={(e) => setFormData((prev) => ({ ...prev, zip: e.target.value }))}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
                </div>
              )}

              {/* Pickup Address */}
              {formData.deliveryMethod === "pickup" && shop.pickupSettings?.enabled && shop.pickupSettings?.address && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    כתובת איסוף
                  </h2>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700">{shop.pickupSettings.address}</p>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  שיטת תשלום
                </h2>
                <RadioGroup
                  value={formData.paymentMethod}
                  onValueChange={(value: any) => {
                    setFormData((prev) => ({ ...prev, paymentMethod: value }))
                    // AddPaymentInfo event
                    trackAddPaymentInfo(trackEvent, value, finalTotal)
                  }}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2 space-x-reverse border border-gray-200 rounded-lg p-4 hover:border-gray-300 cursor-pointer">
                    <RadioGroupItem value="credit_card" id="credit_card" />
                    <Label htmlFor="credit_card" className="cursor-pointer flex-1">
                      <div className="font-medium">כרטיס אשראי</div>
                      <div className="text-sm text-gray-500">תשלום מאובטח בכרטיס אשראי</div>
                    </Label>
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse border border-gray-200 rounded-lg p-4 hover:border-gray-300 cursor-pointer">
                    <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                    <Label htmlFor="bank_transfer" className="cursor-pointer flex-1">
                      <div className="font-medium">העברה בנקאית</div>
                      <div className="text-sm text-gray-500">העברת כסף ישירות לחשבון הבנק</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse border border-gray-200 rounded-lg p-4 hover:border-gray-300 cursor-pointer">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="cursor-pointer flex-1">
                      <div className="font-medium">מזומן בהזמנה</div>
                      <div className="text-sm text-gray-500">תשלום במזומן בעת המשלוח</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Order Summary - Right Side */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">סיכום הזמנה</h2>
                
                {/* Cart Items */}
                <div className="space-y-4 mb-6">
                  {cart.items.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      {item.product.images && item.product.images.length > 0 ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                          <Truck className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm line-clamp-2">
                          {item.product.name}
                        </div>
                        {item.variant && (
                          <div className="text-xs text-gray-500">{item.variant.name}</div>
                        )}
                        <div className="text-sm text-gray-600 mt-1">
                          כמות: {item.quantity}
                        </div>
                      </div>
                      <div className="font-medium text-gray-900">
                        ₪{item.total.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">סכום ביניים</span>
                    <span className="font-medium">₪{cart.subtotal.toFixed(2)}</span>
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
                  
                  {cart.discount > 0 && !cart.customerDiscount && !cart.couponDiscount && (
                    <div className="flex justify-between text-green-600">
                      <span>הנחה</span>
                      <span>-₪{cart.discount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {shippingCost > 0 && (
                    <div className="flex justify-between">
                      <span>{formData.deliveryMethod === "pickup" ? "איסוף עצמי" : "משלוח"}</span>
                      <span>₪{shippingCost.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {shippingCost === 0 && (formData.deliveryMethod === "shipping" || formData.deliveryMethod === "pickup") && (
                    <div className="flex justify-between text-green-600">
                      <span>{formData.deliveryMethod === "pickup" ? "איסוף עצמי" : "משלוח"}</span>
                      <span>חינם</span>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-lg">
                    <span>סה"כ</span>
                    <span>₪{finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full mt-6 text-white rounded"
                  style={{ backgroundColor: theme.primaryColor }}
                  size="lg"
                  disabled={processing}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1"
                  }}
                >
                  {processing ? "מעבד..." : `שלם ₪${finalTotal.toFixed(2)}`}
                </Button>
                
                <p className="text-xs text-gray-500 text-center mt-4 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  תשלום מאובטח
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

