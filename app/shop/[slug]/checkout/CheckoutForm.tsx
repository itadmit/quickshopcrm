"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { CheckoutHeader } from "@/components/storefront/CheckoutHeader"
import { useShopTheme } from "@/hooks/useShopTheme"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import {
  trackPageView,
  trackAddPaymentInfo,
  trackPurchase,
  trackLogin,
  trackSignUp,
} from "@/lib/tracking-events"
import {
  CreditCard,
  Truck,
  Lock,
  LogIn,
  UserPlus,
  Mail,
  User,
  Phone,
  X,
} from "lucide-react"
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
  automaticDiscount?: number
}

interface Shop {
  id: string
  name: string
  description: string | null
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
  checkoutSettings?: {
    primaryColor: string
    backgroundColor: string
    textColor: string
    sectionBgColor: string
    borderColor: string
    showNewsletterCheckbox?: boolean
    newsletterDefaultChecked?: boolean
    footerLinks?: Array<{
      id: string
      text: string
      url: string
    }>
    customFields?: Array<{
      id: string
      label: string
      type: "text" | "textarea" | "date" | "checkbox"
      placeholder?: string
      required: boolean
      enabled: boolean
    }>
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
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  })
  
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
  })
  
  // אתחול customFields values
  const initialCustomFields: Record<string, any> = {}
  shop.checkoutSettings?.customFields?.forEach(field => {
    if (field.enabled) {
      if (field.type === "checkbox") {
        initialCustomFields[field.id] = false
      } else {
        initialCustomFields[field.id] = ""
      }
    }
  })

  const [formData, setFormData] = useState({
    email: customerData?.email || "",
    phone: customerData?.phone || "",
    firstName: customerData?.firstName || "",
    lastName: customerData?.lastName || "",
    companyName: "",
    address: "",
    city: "",
    zip: "",
    orderNotes: "",
    newsletter: shop.checkoutSettings?.newsletterDefaultChecked !== false,
    paymentMethod: "credit_card" as "credit_card" | "bank_transfer" | "cash",
    deliveryMethod: "shipping" as "shipping" | "pickup",
    customFields: initialCustomFields,
  })

  // חישוב משלוח דינמי - מתעדכן כשמשתנה formData
  const shippingCost = useMemo(() => {
    if (formData.deliveryMethod === "pickup") {
      return shop.pickupSettings?.cost || 0
    }

    if (!shop.shippingSettings?.enabled) {
      return 0
    }

    const options = (shop.shippingSettings?.options || {}) as { 
      freeOver?: boolean; 
      freeOverAmount?: number; 
      free?: boolean;
      fixed?: boolean;
      fixedCost?: number;
    }
    
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
    // cart.total כבר מחושב נכון (כולל הנחות ומע"מ), רק מוסיפים משלוח
    return cart.total + shippingCost
  }, [cart.total, shippingCost])

  // PageView event - רק פעם אחת כשהעמוד נטען
  useEffect(() => {
    trackPageView(trackEvent, `/shop/${slug}/checkout`, "תשלום")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]) // רק כשהעמוד משתנה, לא trackEvent

  // עדכון פרטי הלקוח אחרי התחברות/הרשמה
  const updateCustomerData = (customer: any) => {
    setFormData((prev) => ({
      ...prev,
      email: customer.email || prev.email,
      phone: customer.phone || prev.phone,
      firstName: customer.firstName || prev.firstName,
      lastName: customer.lastName || prev.lastName,
    }))
  }

  // טיפול בהתחברות
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)

    try {
      const response = await fetch(`/api/storefront/${slug}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem(`storefront_token_${slug}`, data.token)
        localStorage.setItem(`storefront_customer_${slug}`, JSON.stringify(data.customer))
        
        trackLogin(trackEvent, "email")
        updateCustomerData(data.customer)
        
        toast({
          title: "הצלחה",
          description: "התחברת בהצלחה",
        })
        setLoginOpen(false)
        setLoginData({ email: "", password: "" })
        window.location.reload() // רענון כדי לטעון את פרטי הלקוח
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אימייל או סיסמה לא נכונים",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error logging in:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהתחברות",
        variant: "destructive",
      })
    } finally {
      setLoginLoading(false)
    }
  }

  // טיפול בהרשמה
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "שגיאה",
        description: "הסיסמאות לא תואמות",
        variant: "destructive",
      })
      return
    }

    if (registerData.password.length < 6) {
      toast({
        title: "שגיאה",
        description: "סיסמה חייבת להכיל לפחות 6 תווים",
        variant: "destructive",
      })
      return
    }

    setRegisterLoading(true)

    try {
      const response = await fetch(`/api/storefront/${slug}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerData.email,
          password: registerData.password,
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          phone: registerData.phone,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem(`storefront_token_${slug}`, data.token)
        localStorage.setItem(`storefront_customer_${slug}`, JSON.stringify(data.customer))
        
        trackSignUp(trackEvent, "email")
        updateCustomerData(data.customer)
        
        toast({
          title: "הצלחה",
          description: "נרשמת והתחברת בהצלחה!",
        })
        setRegisterOpen(false)
        setRegisterData({
          email: "",
          password: "",
          confirmPassword: "",
          firstName: "",
          lastName: "",
          phone: "",
        })
        window.location.reload() // רענון כדי לטעון את פרטי הלקוח
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בהרשמה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error registering:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהרשמה",
        variant: "destructive",
      })
    } finally {
      setRegisterLoading(false)
    }
  }

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
        credentials: "include", // חשוב! שולח cookies עם הבקשה
        body: JSON.stringify({
          customerId: customerData?.id || undefined,
          customerName: `${formData.firstName} ${formData.lastName}`,
          customerEmail: formData.email,
          customerPhone: formData.phone || undefined,
          companyName: formData.companyName || undefined,
          orderNotes: formData.orderNotes || undefined,
          newsletter: formData.newsletter,
          shippingAddress: formData.deliveryMethod === "shipping" ? {
            firstName: formData.firstName,
            lastName: formData.lastName,
            address: formData.address,
            city: formData.city,
            zip: formData.zip,
          } : null,
          deliveryMethod: formData.deliveryMethod,
          paymentMethod: formData.paymentMethod,
          couponCode: cart.couponCode || undefined,
          shippingCost: shippingCost,
          customFields: formData.customFields,
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

  const checkoutColors = shop.checkoutSettings || {
    primaryColor: "#9333ea",
    backgroundColor: "#ffffff",
    textColor: "#111827",
    sectionBgColor: "#fafafa", // רקע סיכום הזמנה - ברירת מחדל
    borderColor: "#e5e7eb",
  }

  return (
    <div 
      className="min-h-screen" 
      dir="rtl"
      style={{ 
        backgroundColor: "#ffffff", // רקע לבן כללי
        color: checkoutColors.textColor 
      }}
    >
      <CheckoutHeader shopName={shop.name} shopLogo={shop.logo} shopSlug={slug} />
      
      <div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
            {/* Main Form - Left Side - 60% */}
            <div 
              className="lg:col-span-3 min-h-screen flex justify-end"
              style={{
                backgroundColor: "#ffffff", // רקע לבן על כל הרוחב
              }}
            >
              <div className="w-full max-w-3xl pl-8 pr-4 py-8 space-y-6">
                {/* Page Title */}
                <h1 
                  className="text-2xl font-semibold mb-8"
                  style={{ color: checkoutColors.textColor }}
                >
                  תשלום
                </h1>
                
              {/* Contact Information */}
              <div 
                className="pb-6"
                style={{ 
                  borderBottom: `1px solid #e5e7eb` // מסגרת אפורה
                }}
              >
                <h2 
                  className="text-lg font-semibold mb-4"
                  style={{ color: checkoutColors.textColor }}
                >
                  פרטי איש קשר
                </h2>
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
                      placeholder="כתובת המייל שלך"
                    />
                    
                    {/* Newsletter Checkbox - ממש מתחת לאינפוט של המייל */}
                    {shop.checkoutSettings?.showNewsletterCheckbox !== false && (
                      <div className="flex items-center space-x-2 space-x-reverse mt-2">
                        <Checkbox
                          id="newsletter"
                          checked={formData.newsletter}
                          onCheckedChange={(checked) => 
                            setFormData((prev) => ({ ...prev, newsletter: checked === true }))
                          }
                        />
                        <Label 
                          htmlFor="newsletter" 
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          אני מאשר/ת קבלת דיוור ומבצעים
                        </Label>
                      </div>
                    )}
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
                      placeholder="___-_______"
                    />
                  </div>
                  
                  {/* Account Links */}
                  {!customerData && (
                    <div className="text-sm text-gray-600 pt-2">
                      יש לך חשבון?{" "}
                      <button
                        type="button"
                        onClick={() => setLoginOpen(true)}
                        className="text-blue-600 hover:underline"
                      >
                        התחבר
                      </button>
                      {" "}כדי למלא את הפרטים אוטומטית או{" "}
                      <button
                        type="button"
                        onClick={() => setRegisterOpen(true)}
                        className="text-blue-600 hover:underline"
                      >
                        הירשם לחשבון חדש
                      </button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
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
                    <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
                      שם חברה (אופציונלי)
                    </Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="orderNotes" className="text-sm font-medium text-gray-700">
                      הערות להזמנה
                    </Label>
                    <Textarea
                      id="orderNotes"
                      value={formData.orderNotes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, orderNotes: e.target.value }))}
                      className="mt-1"
                      rows={4}
                      placeholder="הערות נוספות להזמנה שלך..."
                    />
                  </div>

                  {/* Custom Fields */}
                  {shop.checkoutSettings?.customFields?.filter(field => field.enabled).map((field) => (
                    <div key={field.id}>
                      <Label htmlFor={`custom-${field.id}`} className="text-sm font-medium text-gray-700">
                        {field.label}
                        {field.required && <span className="text-red-500 mr-1">*</span>}
                      </Label>
                      {field.type === "textarea" ? (
                        <Textarea
                          id={`custom-${field.id}`}
                          value={formData.customFields[field.id] || ""}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            customFields: {
                              ...prev.customFields,
                              [field.id]: e.target.value
                            }
                          }))}
                          className="mt-1"
                          rows={4}
                          placeholder={field.placeholder}
                          required={field.required}
                        />
                      ) : field.type === "date" ? (
                        <Input
                          id={`custom-${field.id}`}
                          type="date"
                          value={formData.customFields[field.id] || ""}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            customFields: {
                              ...prev.customFields,
                              [field.id]: e.target.value
                            }
                          }))}
                          className="mt-1"
                          required={field.required}
                        />
                      ) : field.type === "checkbox" ? (
                        <div className="flex items-center space-x-2 space-x-reverse mt-2">
                          <Checkbox
                            id={`custom-${field.id}`}
                            checked={formData.customFields[field.id] || false}
                            onCheckedChange={(checked) => setFormData((prev) => ({
                              ...prev,
                              customFields: {
                                ...prev.customFields,
                                [field.id]: checked === true
                              }
                            }))}
                          />
                          <Label htmlFor={`custom-${field.id}`} className="text-sm text-gray-700 cursor-pointer">
                            {field.placeholder || field.label}
                          </Label>
                        </div>
                      ) : (
                        <Input
                          id={`custom-${field.id}`}
                          type="text"
                          value={formData.customFields[field.id] || ""}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            customFields: {
                              ...prev.customFields,
                              [field.id]: e.target.value
                            }
                          }))}
                          className="mt-1"
                          placeholder={field.placeholder}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Method */}
              {(shop.shippingSettings?.enabled || shop.pickupSettings?.enabled) && (
                <div 
                  className="pb-6"
                  style={{ 
                    borderBottom: `1px solid #e5e7eb` // מסגרת אפורה
                  }}
                >
                  <h2 
                    className="text-lg font-semibold mb-4 flex items-center gap-2"
                    style={{ color: checkoutColors.textColor }}
                  >
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
                <div 
                  className="pb-6"
                  style={{ 
                    borderBottom: `1px solid #e5e7eb` // מסגרת אפורה
                  }}
                >
                  <h2 
                    className="text-lg font-semibold mb-4 flex items-center gap-2"
                    style={{ color: checkoutColors.textColor }}
                  >
                    <Truck className="w-5 h-5" />
                    כתובת משלוח
                  </h2>
                <div className="space-y-4">
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
                <div 
                  className="pb-6"
                  style={{ 
                    borderBottom: `1px solid #e5e7eb` // מסגרת אפורה
                  }}
                >
                  <h2 
                    className="text-lg font-semibold mb-4 flex items-center gap-2"
                    style={{ color: checkoutColors.textColor }}
                  >
                    <Truck className="w-5 h-5" />
                    כתובת איסוף
                  </h2>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700">{shop.pickupSettings.address}</p>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div 
                className="pb-6"
                style={{ 
                  borderBottom: `1px solid #e5e7eb` // מסגרת אפורה
                }}
              >
                <h2 
                  className="text-lg font-semibold mb-4 flex items-center gap-2"
                  style={{ color: checkoutColors.textColor }}
                >
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
            </div>

            {/* Order Summary - Right Side - 40% */}
            <div 
              className="lg:col-span-2 min-h-screen flex justify-start"
              style={{
                backgroundColor: checkoutColors.sectionBgColor || "#fafafa", // רקע #fafafa על כל החצי
              }}
            >
              <div className="w-full max-w-md px-8 py-8">
                <div 
                  className="p-6 sticky top-24"
                  style={{ 
                    backgroundColor: checkoutColors.sectionBgColor || "#fafafa", // אותו צבע כמו הרקע
                  }}
                >
                <h2 
                  className="text-lg font-semibold mb-6"
                  style={{ color: checkoutColors.textColor }}
                >
                  סיכום הזמנה
                </h2>
                
                {/* Cart Items */}
                <div className="space-y-4 mb-6">
                  {cart.items.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      {item.product.images && item.product.images.length > 0 ? (
                        <div className="relative">
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="absolute -top-2 -right-2 w-5 h-5 bg-gray-500 text-white text-xs rounded-full flex items-center justify-center">
                            {item.quantity}
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="w-16 h-16 rounded flex items-center justify-center relative"
                          style={{ 
                            backgroundColor: "#e5e7eb40",
                          }}
                        >
                          <Truck className="w-8 h-8" style={{ color: checkoutColors.borderColor }} />
                          <div className="absolute -top-2 -right-2 w-5 h-5 bg-gray-500 text-white text-xs rounded-full flex items-center justify-center">
                            {item.quantity}
                          </div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div 
                          className="font-medium text-sm line-clamp-2"
                          style={{ color: checkoutColors.textColor }}
                        >
                          {item.product.name}
                        </div>
                        {item.variant && (
                          <div 
                            className="text-xs mt-0.5"
                            style={{ color: checkoutColors.textColor, opacity: 0.6 }}
                          >
                            {item.variant.name}
                          </div>
                        )}
                      </div>
                      <div 
                        className="font-medium"
                        style={{ color: checkoutColors.textColor }}
                      >
                        ₪{item.total.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon/Discount Code */}
                <div className="mb-6">
                  {cart.couponCode ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-green-800">
                          {cart.couponCode}
                        </div>
                        {cart.couponDiscount && cart.couponDiscount > 0 && (
                          <div className="text-xs text-green-600">
                            חיסכון של ₪{cart.couponDiscount.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-green-700 hover:text-green-900 hover:bg-green-100"
                        onClick={() => {
                          // TODO: הוסף לוגיקה להסרת קופון
                          toast({
                            title: "הקופון הוסר",
                            description: "הקופון הוסר בהצלחה",
                          })
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="קוד קופון או הנחה"
                        className="flex-1"
                        style={{ backgroundColor: "#ffffff" }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-6"
                        style={{ backgroundColor: "#e5e7eb" }}
                      >
                        החל
                      </Button>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div 
                  className="pt-4 space-y-2 text-sm border-t"
                  style={{ 
                    borderColor: "#e5e7eb"
                  }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: checkoutColors.textColor, opacity: 0.7 }}>סכום ביניים</span>
                    <span className="font-medium" style={{ color: checkoutColors.textColor }}>₪{cart.subtotal.toFixed(2)}</span>
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
                  
                  {shippingCost > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: checkoutColors.textColor, opacity: 0.7 }}>{formData.deliveryMethod === "pickup" ? "איסוף עצמי" : "משלוח"}</span>
                      <span style={{ color: checkoutColors.textColor }}>₪{shippingCost.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {shippingCost === 0 && (formData.deliveryMethod === "shipping" || formData.deliveryMethod === "pickup") && (
                    <div className="flex justify-between text-green-600">
                      <span>{formData.deliveryMethod === "pickup" ? "איסוף עצמי" : "משלוח"}</span>
                      <span>חינם</span>
                    </div>
                  )}
                  
                  {/* Tax info - only if tax is enabled */}
                  {cart.tax > 0 && (
                    <div className="flex justify-between text-xs" style={{ color: checkoutColors.textColor, opacity: 0.6 }}>
                      <span>כולל מע"מ</span>
                      <span>₪{cart.tax.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div 
                    className="pt-2 flex justify-between font-bold text-lg border-t"
                    style={{ 
                      borderColor: "#e5e7eb",
                      color: checkoutColors.textColor
                    }}
                  >
                    <span>סה"כ</span>
                    <span>₪{finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full mt-6 text-white rounded-lg font-semibold"
                  style={{ backgroundColor: checkoutColors.primaryColor }}
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
          </div>
        </form>

        {/* Footer */}
        {shop.checkoutSettings?.footerLinks && shop.checkoutSettings.footerLinks.length > 0 && (
          <div className="border-t mt-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                {shop.checkoutSettings.footerLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {link.text}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Login Modal */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>התחברות</DialogTitle>
            <DialogDescription>
              התחבר לחשבון שלך כדי למלא את הפרטים אוטומטית
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">אימייל</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="login-email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="pr-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">סיסמה</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="login-password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              style={{ backgroundColor: checkoutColors.primaryColor }}
              disabled={loginLoading}
            >
              <LogIn className="w-4 h-4 ml-2" />
              {loginLoading ? "מתחבר..." : "התחבר"}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-600">
            אין לך חשבון?{" "}
            <button
              type="button"
              onClick={() => {
                setLoginOpen(false)
                setRegisterOpen(true)
              }}
              className="text-blue-600 hover:underline"
            >
              הירשם כאן
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Modal */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>הרשמה</DialogTitle>
            <DialogDescription>
              צור חשבון חדש והתחבר אוטומטית
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="register-firstName">שם פרטי</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="register-firstName"
                    value={registerData.firstName}
                    onChange={(e) => setRegisterData((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="שם פרטי"
                    className="pr-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-lastName">שם משפחה</Label>
                <Input
                  id="register-lastName"
                  value={registerData.lastName}
                  onChange={(e) => setRegisterData((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="שם משפחה"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">אימייל *</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="register-email"
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="pr-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-phone">טלפון</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="register-phone"
                  type="tel"
                  value={registerData.phone}
                  onChange={(e) => setRegisterData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="050-1234567"
                  className="pr-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password">סיסמה *</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="register-password"
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="לפחות 6 תווים"
                  className="pr-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-confirmPassword">אימות סיסמה *</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="register-confirmPassword"
                  type="password"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="הזן סיסמה שוב"
                  className="pr-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              style={{ backgroundColor: checkoutColors.primaryColor }}
              disabled={registerLoading}
            >
              <UserPlus className="w-4 h-4 ml-2" />
              {registerLoading ? "נרשם..." : "הירשם והתחבר"}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-600">
            כבר יש לך חשבון?{" "}
            <button
              type="button"
              onClick={() => {
                setRegisterOpen(false)
                setLoginOpen(true)
              }}
              className="text-blue-600 hover:underline"
            >
              התחבר כאן
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

