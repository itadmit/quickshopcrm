"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Autocomplete } from "@/components/ui/autocomplete"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { CheckoutHeader } from "@/components/storefront/CheckoutHeader"
import { useShopTheme } from "@/hooks/useShopTheme"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { useCitySearch, useStreetSearch } from "@/hooks/useIsraelAddress"
import {
  trackPageView,
  trackInitiateCheckout,
  trackAddPaymentInfo,
  trackPurchase,
} from "@/lib/tracking-events"
import {
  CreditCard,
  Truck,
  Mail,
  User,
  Phone,
  X,
  Lock,
  Coins,
} from "lucide-react"
import Link from "next/link"

interface CartItem {
  productId: string
  variantId: string | null
  quantity: number
  price: number
  total: number
  addons?: Array<{
    addonId: string
    valueId: string | null
    label: string
    price: number
    quantity: number
  }>
  bundleId?: string
  bundleName?: string
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
  automaticDiscountTitle?: string
}

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
  hasPaymentProvider?: boolean // האם יש ספק תשלום פעיל
  paymentMethods?: {
    bankTransfer?: {
      enabled: boolean
      instructions?: string
    }
    cash?: {
      enabled: boolean
      minOrderEnabled?: boolean
      minOrderAmount?: number | null
    }
  }
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
    showZipField?: boolean
    zipRequired?: boolean
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
  const [storeCredit, setStoreCredit] = useState<any>(null)
  const [useStoreCredit, setUseStoreCredit] = useState(false)
  
  // למנוע tracking כפול
  const hasTrackedPageView = useRef(false)
  const hasTrackedCheckout = useRef(false)
  
  // Autocomplete hooks לערים ורחובות
  const citySearch = useCitySearch(slug)
  const [selectedCityForStreets, setSelectedCityForStreets] = useState("")
  const streetSearch = useStreetSearch(slug, selectedCityForStreets)
  
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

  // קביעת שיטת תשלום ברירת מחדל - לפי מה שמופעל
  const bankTransferEnabled = shop.paymentMethods?.bankTransfer?.enabled === true
  const cashEnabled = shop.paymentMethods?.cash?.enabled === true
  
  // בדיקה אם יש לפחות שיטת תשלום אחת מופעלת
  const hasAnyPaymentMethod = shop.hasPaymentProvider || bankTransferEnabled || cashEnabled
  
  // קביעת ברירת מחדל - לפי סדר עדיפות: כרטיס אשראי > העברה בנקאית > מזומן
  let defaultPaymentMethod: "credit_card" | "bank_transfer" | "cash" | null = null
  if (shop.hasPaymentProvider) {
    defaultPaymentMethod = "credit_card"
  } else if (bankTransferEnabled) {
    defaultPaymentMethod = "bank_transfer"
  } else if (cashEnabled) {
    defaultPaymentMethod = "cash"
  }

  const [formData, setFormData] = useState({
    email: customerData?.email || "",
    phone: customerData?.phone || "",
    firstName: customerData?.firstName || "",
    lastName: customerData?.lastName || "",
    companyName: "",
    address: "",
    houseNumber: "",
    apartment: "",
    floor: "",
    city: "",
    zip: "",
    orderNotes: "",
    newsletter: shop.checkoutSettings?.newsletterDefaultChecked !== false,
    createAccount: false, // האם הלקוח רוצה להרשם לחשבון
    saveDetails: false, // האם הלקוח רוצה לשמור פרטים לפעם הבאה
    paymentMethod: defaultPaymentMethod || ("bank_transfer" as "credit_card" | "bank_transfer" | "cash"),
    deliveryMethod: "shipping" as "shipping" | "pickup",
    customFields: initialCustomFields,
    selectedAddressId: "",
  })
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])

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

  // חישוב סכום אחרי שימוש בקרדיט בחנות
  const storeCreditAmount = useMemo(() => {
    if (!useStoreCredit || !storeCredit || storeCredit.balance <= 0) {
      return 0
    }
    // השתמש בקרדיט עד הסכום המקסימלי (מינימום בין היתרה לסכום ההזמנה)
    return Math.min(storeCredit.balance, cart.total + shippingCost)
  }, [useStoreCredit, storeCredit, cart.total, shippingCost])

  const finalTotal = useMemo(() => {
    // cart.total כבר מחושב נכון (כולל הנחות ומע"מ), רק מוסיפים משלוח ומפחיתים קרדיט
    const total = cart.total + shippingCost - storeCreditAmount
    return Math.max(0, total) // לא יכול להיות שלילי
  }, [cart.total, shippingCost, storeCreditAmount])

  // טעינת קרדיט בחנות
  useEffect(() => {
    if (customerData?.id) {
      const token = localStorage.getItem(`storefront_token_${slug}`)
      if (token) {
        fetch(`/api/storefront/${slug}/store-credit`, {
          headers: {
            "x-customer-id": token,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.balance > 0) {
              setStoreCredit(data)
              setUseStoreCredit(true) // ברירת מחדל - להשתמש בקרדיט אם יש
            }
          })
          .catch((err) => console.error("Error fetching store credit:", err))
      }
    }
  }, [customerData?.id, slug])

  // PageView event - רק פעם אחת כשהעמוד נטען
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      trackPageView(trackEvent, `/shop/${slug}/checkout`, "תשלום")
      hasTrackedPageView.current = true
    }
  }, [slug, trackEvent])

  // InitiateCheckout event - רק פעם אחת כשהעמוד נטען
  useEffect(() => {
    if (!hasTrackedCheckout.current) {
      trackInitiateCheckout(
        trackEvent,
        cart.items.map((item) => ({
          id: item.variantId || item.product.id, // אם יש variant, נשלח את ה-variant ID
          name: item.variant?.name 
            ? `${item.product.name} - ${item.variant.name}` 
            : item.product.name, // אם יש variant, נוסיף את שם הvariant
          price: item.price,
          quantity: item.quantity,
        })),
        cart.total
      )
      hasTrackedCheckout.current = true
    }
  }, [cart.id, cart.items, cart.total, trackEvent])

  // טעינת כתובות שמורות
  useEffect(() => {
    const loadAddresses = async () => {
      if (!customerData?.id) return

      try {
        const token = localStorage.getItem(`storefront_token_${slug}`)
        if (!token) return

        const response = await fetch(`/api/storefront/${slug}/account/addresses`, {
          headers: {
            "x-customer-token": token,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setSavedAddresses(data.addresses || [])
          
          // אם יש כתובת אחת, נבחר אותה אוטומטית
          if (data.addresses && data.addresses.length === 1) {
            const addr = data.addresses[0]
            setFormData((prev) => ({
              ...prev,
              selectedAddressId: addr.id,
              firstName: addr.firstName || prev.firstName,
              lastName: addr.lastName || prev.lastName,
              address: addr.address || "",
              houseNumber: addr.houseNumber || "",
              apartment: addr.apartment || "",
              floor: addr.floor || "",
              city: addr.city || "",
              zip: addr.zip || "",
            }))
          }
        }
      } catch (error) {
        console.error("Error loading addresses:", error)
      }
    }

    loadAddresses()
  }, [customerData?.id, slug])

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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // בדיקה אם נבחר "כרטיס אשראי" אבל אין ספק תשלום
    if (formData.paymentMethod === "credit_card" && !shop.hasPaymentProvider) {
      toast({
        title: "שגיאה",
        description: "אין ספק תשלום מוגדר. אנא בחר שיטת תשלום אחרת",
        variant: "destructive",
      })
      return
    }
    
    // בדיקת סכום מינימום למזומן
    if (formData.paymentMethod === "cash" && shop.paymentMethods?.cash?.minOrderEnabled && shop.paymentMethods?.cash?.minOrderAmount) {
      if (finalTotal < shop.paymentMethods.cash.minOrderAmount) {
        toast({
          title: "שגיאה",
          description: `סכום מינימום להזמנה במזומן הוא ₪${shop.paymentMethods.cash.minOrderAmount}. סכום ההזמנה הנוכחי הוא ₪${finalTotal.toFixed(2)}`,
          variant: "destructive",
        })
        return
      }
    }
    
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
          createAccount: formData.createAccount,
          saveDetails: formData.saveDetails,
          shippingAddress: formData.deliveryMethod === "shipping" ? {
            firstName: formData.firstName,
            lastName: formData.lastName,
            city: formData.city,
            address: formData.address,
            houseNumber: formData.houseNumber,
            apartment: formData.apartment || undefined,
            floor: formData.floor || undefined,
            zip: formData.zip || undefined,
          } : null,
          deliveryMethod: formData.deliveryMethod,
          paymentMethod: formData.paymentMethod,
          couponCode: cart.couponCode || undefined,
          shippingCost: shippingCost,
          storeCreditAmount: useStoreCredit ? storeCreditAmount : 0, // הוספת סכום קרדיט בחנות
          customFields: formData.customFields,
        }),
      })

      if (response.ok) {
        const order = await response.json()
        
        // Purchase event
        const items = cart.items.map((item) => ({
          id: item.variantId || item.productId, // אם יש variant, נשלח את ה-variant ID
          name: item.variant?.name 
            ? `${item.product.name} - ${item.variant.name}` 
            : item.product.name, // אם יש variant, נוסיף את שם הvariant
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
        if (formData.paymentMethod === "credit_card") {
          if (order.paymentUrl) {
            window.location.href = order.paymentUrl
            return
          } else {
            // אם אין paymentUrl, זה אומר שאין ספק תשלום - נציג שגיאה
            toast({
              title: "שגיאה",
              description: "אין ספק תשלום מוגדר. אנא בחר שיטת תשלום אחרת או פנה לתמיכה",
              variant: "destructive",
            })
            setProcessing(false)
            return
          }
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

                    {/* Create Account Checkbox - רק אם הלקוח לא מחובר */}
                    {!customerData?.id && (
                      <div className="flex items-center space-x-2 space-x-reverse mt-2">
                        <Checkbox
                          id="createAccount"
                          checked={formData.createAccount}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({ ...prev, createAccount: checked === true }))
                          }
                        />
                        <Label 
                          htmlFor="createAccount" 
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          צור חשבון כדי לעקוב אחרי הזמנות ולשמור פרטים לפעם הבאה
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
                      <Link
                        href={`/shop/${slug}/login`}
                        className="text-blue-600 hover:underline"
                      >
                        התחבר
                      </Link>
                      {" "}כדי למלא את הפרטים אוטומטית או{" "}
                      <Link
                        href={`/shop/${slug}/register`}
                        className="text-blue-600 hover:underline"
                      >
                        הירשם לחשבון חדש
                      </Link>
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
                  {savedAddresses.length > 0 && customerData?.id && (
                    <div>
                      <Label htmlFor="selectAddress" className="text-sm font-medium text-gray-700">
                        בחר כתובת שמורה
                      </Label>
                      <Select
                        value={formData.selectedAddressId}
                        onValueChange={(value) => {
                          if (value === "new") {
                            setFormData((prev) => ({ ...prev, selectedAddressId: "", address: "", houseNumber: "", apartment: "", floor: "", city: "", zip: "" }))
                          } else {
                            const selectedAddr = savedAddresses.find((addr) => addr.id === value)
                            if (selectedAddr) {
                              setFormData((prev) => ({
                                ...prev,
                                selectedAddressId: value,
                                firstName: selectedAddr.firstName || prev.firstName,
                                lastName: selectedAddr.lastName || prev.lastName,
                                address: selectedAddr.address || "",
                                houseNumber: selectedAddr.houseNumber || "",
                                apartment: selectedAddr.apartment || "",
                                floor: selectedAddr.floor || "",
                                city: selectedAddr.city || "",
                                zip: selectedAddr.zip || "",
                              }))
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="בחר כתובת או הוסף חדשה" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">הוסף כתובת חדשה</SelectItem>
                          {savedAddresses.map((addr) => (
                            <SelectItem key={addr.id} value={addr.id}>
                              {addr.firstName} {addr.lastName} - {addr.city}, {addr.address} {addr.houseNumber}{addr.apartment ? `, דירה ${addr.apartment}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                        עיר *
                      </Label>
                      <Autocomplete
                        id="city"
                        value={formData.city}
                        onChange={(value) => {
                          setFormData((prev) => ({ ...prev, city: value, selectedAddressId: "" }))
                          citySearch.setQuery(value)
                        }}
                        onSelect={(option) => {
                          setFormData((prev) => ({ ...prev, city: option.value, selectedAddressId: "" }))
                          setSelectedCityForStreets(option.value)
                        }}
                        options={citySearch.cities.map((city) => ({
                          value: city.cityName,
                          label: city.cityName,
                        }))}
                        loading={citySearch.loading}
                        placeholder="התחל להקליד עיר..."
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                        רחוב *
                      </Label>
                      <Autocomplete
                        id="address"
                        value={formData.address}
                        onChange={(value) => {
                          setFormData((prev) => ({ ...prev, address: value, selectedAddressId: "" }))
                          streetSearch.setQuery(value)
                        }}
                        onSelect={(option) => {
                          setFormData((prev) => ({ ...prev, address: option.value, selectedAddressId: "" }))
                        }}
                        options={streetSearch.streets.map((street) => ({
                          value: street.streetName,
                          label: street.streetName,
                        }))}
                        loading={streetSearch.loading}
                        placeholder={formData.city ? "התחל להקליד רחוב..." : "בחר עיר תחילה..."}
                        className="mt-1"
                        required
                        disabled={!formData.city}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="houseNumber" className="text-sm font-medium text-gray-700">
                        מספר בית *
                      </Label>
                      <Input
                        id="houseNumber"
                        value={formData.houseNumber}
                        onChange={(e) => setFormData((prev) => ({ ...prev, houseNumber: e.target.value, selectedAddressId: "" }))}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="apartment" className="text-sm font-medium text-gray-700">
                        דירה
                      </Label>
                      <Input
                        id="apartment"
                        value={formData.apartment}
                        onChange={(e) => setFormData((prev) => ({ ...prev, apartment: e.target.value, selectedAddressId: "" }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="floor" className="text-sm font-medium text-gray-700">
                        קומה
                      </Label>
                      <Input
                        id="floor"
                        value={formData.floor}
                        onChange={(e) => setFormData((prev) => ({ ...prev, floor: e.target.value, selectedAddressId: "" }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  {shop.checkoutSettings?.showZipField === true && (
                    <div>
                      <Label htmlFor="zip" className="text-sm font-medium text-gray-700">
                        מיקוד {shop.checkoutSettings?.zipRequired === true && "*"}
                      </Label>
                      <Input
                        id="zip"
                        value={formData.zip}
                        onChange={(e) => setFormData((prev) => ({ ...prev, zip: e.target.value, selectedAddressId: "" }))}
                        required={shop.checkoutSettings?.zipRequired === true}
                        className="mt-1"
                      />
                    </div>
                  )}
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

              {/* Store Credit */}
              {storeCredit && storeCredit.balance > 0 && (
                <div 
                  className="pb-6"
                  style={{ 
                    borderBottom: `1px solid #e5e7eb`
                  }}
                >
                  <div className="flex items-center space-x-2 space-x-reverse border border-emerald-200 rounded-lg p-4 bg-emerald-50">
                    <Checkbox
                      id="useStoreCredit"
                      checked={useStoreCredit}
                      onCheckedChange={(checked) => setUseStoreCredit(checked === true)}
                    />
                    <Label htmlFor="useStoreCredit" className="cursor-pointer flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            <Coins className="w-4 h-4 text-emerald-600" />
                            השתמש בקרדיט בחנות
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            יתרה זמינה: ₪{storeCredit.balance.toFixed(2)}
                            {storeCreditAmount > 0 && (
                              <span className="text-emerald-700 font-semibold mr-2">
                                • ינוכה: ₪{storeCreditAmount.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Label>
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
                  {finalTotal > 0 ? "שיטת תשלום" : "אישור הזמנה"}
                </h2>
                {finalTotal === 0 ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      ההזמנה מכוסה במלואה בקרדיט בחנות. אין צורך בתשלום נוסף.
                    </p>
                  </div>
                ) : !hasAnyPaymentMethod ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      אין שיטות תשלום זמינות. אנא הגדר שיטת תשלום בהגדרות האינטגרציות.
                    </p>
                  </div>
                ) : (
                  <RadioGroup
                    value={formData.paymentMethod}
                    onValueChange={(value: any) => {
                      setFormData((prev) => ({ ...prev, paymentMethod: value }))
                      // AddPaymentInfo event
                      trackAddPaymentInfo(trackEvent, value, finalTotal)
                    }}
                    className="space-y-3"
                  >
                    {shop.hasPaymentProvider && (
                      <div className="flex items-center space-x-2 space-x-reverse border border-gray-200 rounded-lg p-4 hover:border-gray-300 cursor-pointer">    
                        <RadioGroupItem value="credit_card" id="credit_card" />
                        <Label htmlFor="credit_card" className="cursor-pointer flex-1">                                                                           
                          <div className="font-medium">כרטיס אשראי</div>
                          <div className="text-sm text-gray-500">תשלום מאובטח בכרטיס אשראי</div>                                                                  
                        </Label>
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    {bankTransferEnabled && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 space-x-reverse border border-gray-200 rounded-lg p-4 hover:border-gray-300 cursor-pointer">      
                          <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                          <Label htmlFor="bank_transfer" className="cursor-pointer flex-1">                                                                           
                            <div className="font-medium">העברה בנקאית</div>
                            <div className="text-sm text-gray-500">העברת כסף ישירות לחשבון הבנק</div>                                                                 
                          </Label>
                        </div>
                        {shop.paymentMethods?.bankTransfer?.instructions && (
                          <div className="mr-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {shop.paymentMethods.bankTransfer.instructions}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {cashEnabled && (
                      <div className="flex items-center space-x-2 space-x-reverse border border-gray-200 rounded-lg p-4 hover:border-gray-300 cursor-pointer">      
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash" className="cursor-pointer flex-1">
                          <div className="font-medium">מזומן בהזמנה</div>
                          <div className="text-sm text-gray-500">
                            תשלום במזומן בעת המשלוח
                            {shop.paymentMethods?.cash?.minOrderEnabled && shop.paymentMethods?.cash?.minOrderAmount && (
                              <span className="block mt-1 text-xs text-gray-600">
                                (מינימום הזמנה: ₪{shop.paymentMethods.cash.minOrderAmount})
                              </span>
                            )}
                          </div>                                                                      
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                )}
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
                        {(item as any).bundleName && (
                          <div 
                            className="text-xs mt-0.5 font-medium"
                            style={{ color: '#9333ea' }}
                          >
                            חלק מחבילה: {(item as any).bundleName}
                          </div>
                        )}
                        {item.variant && (
                          <div 
                            className="text-xs mt-0.5"
                            style={{ color: checkoutColors.textColor, opacity: 0.6 }}
                          >
                            {item.variant.name}
                          </div>
                        )}
                        {(item as any).addons && (item as any).addons.length > 0 && (
                          <div className="text-xs mt-0.5" style={{ color: checkoutColors.textColor, opacity: 0.6 }}>
                            {(item as any).addons.map((addon: any, idx: number) => (
                              <div key={idx}>
                                {addon.label}
                                {addon.price > 0 && ` (+₪${addon.price.toFixed(2)})`}
                              </div>
                            ))}
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
                      <span>{cart.automaticDiscountTitle || 'הנחה אוטומטית'}</span>
                      <span>-₪{cart.automaticDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {storeCreditAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        קרדיט בחנות
                      </span>
                      <span>-₪{storeCreditAmount.toFixed(2)}</span>
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
                  
                  {/* Tax info - only if tax is enabled and showTaxInCart is not false */}
                  {theme.showTaxInCart !== false && cart.tax > 0 && (
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
                  disabled={processing || !hasAnyPaymentMethod || (formData.paymentMethod === "credit_card" && !shop.hasPaymentProvider)}
                  onMouseEnter={(e) => {
                    if (!processing && !(formData.paymentMethod === "credit_card" && !shop.hasPaymentProvider)) {
                      e.currentTarget.style.opacity = "0.9"
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1"
                  }}
                >
                  {processing ? "מעבד..." : `שלם ₪${finalTotal.toFixed(2)}`}
                </Button>
                
                {formData.paymentMethod === "credit_card" && !shop.hasPaymentProvider && (
                  <p className="text-sm text-red-600 text-center mt-2">
                    אין ספק תשלום מוגדר. אנא בחר שיטת תשלום אחרת
                  </p>
                )}
                
                {!hasAnyPaymentMethod && (
                  <p className="text-sm text-yellow-600 text-center mt-2">
                    אין שיטות תשלום זמינות. אנא הגדר שיטת תשלום בהגדרות האינטגרציות
                  </p>
                )}
                
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

    </div>
  )
}

