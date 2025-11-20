"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, CheckCircle2, ChevronDown, ExternalLink, CreditCard, Truck, Zap } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useShop } from "@/components/providers/ShopProvider"
import Image from "next/image"

// קטגוריות האינטגרציות
const integrationCategories = [
  { key: "payment", label: "תשלום", icon: CreditCard, divider: false },
  { key: "shipping", label: "משלוחים", icon: Truck, divider: false },
  { key: "automation", label: "אוטומציות", icon: Zap, divider: false },
]

// רשימת ספקי תשלום
const paymentProviders = [
  {
    id: "payplus",
    name: "פייפלוס",
    nameEn: "PayPlus",
    logo: "/logos/payplus.svg",
    type: "ספק תשלום",
    registrationUrl: "https://www.payplus.co.il",
  },
  {
    id: "paypal",
    name: "PayPal",
    nameEn: "PayPal",
    logo: "/logos/paypal.png",
    type: "ספק תשלום",
    registrationUrl: "https://developer.paypal.com",
  },
]

// רשימת חברות משלוחים
const shippingProviders = [
  {
    id: "focus",
    name: "פוקוס",
    nameEn: "Focus",
    logo: "https://focuslogistics.co.il/wp-content/uploads/2022/03/logo-desktop-1.svg",
    type: "חברת משלוחים",
    registrationUrl: null, // אם יש URL לרישום
  },
]

export default function IntegrationsPage() {
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [activeCategory, setActiveCategory] = useState<"payment" | "shipping" | "automation">("payment")
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  
  // PayPlus Integration State
  const [payplusApiKey, setPayplusApiKey] = useState("")
  const [payplusSecretKey, setPayplusSecretKey] = useState("")
  const [payplusPaymentPageUid, setPayplusPaymentPageUid] = useState("")
  const [showPayplusSecretKey, setShowPayplusSecretKey] = useState(false)
  const [payplusConnected, setPayplusConnected] = useState(false)
  const [payplusLoading, setPayplusLoading] = useState(false)
  const [payplusTesting, setPayplusTesting] = useState(false)
  const [payplusUseProduction, setPayplusUseProduction] = useState(false)

  // PayPal Integration State
  const [paypalClientId, setPaypalClientId] = useState("")
  const [paypalSecret, setPaypalSecret] = useState("")
  const [showPaypalSecret, setShowPaypalSecret] = useState(false)
  const [paypalConnected, setPaypalConnected] = useState(false)
  const [paypalLoading, setPaypalLoading] = useState(false)
  const [paypalUseProduction, setPaypalUseProduction] = useState(false)

  // Bank Transfer State
  const [bankTransferEnabled, setBankTransferEnabled] = useState(false)
  const [bankTransferInstructions, setBankTransferInstructions] = useState("")
  const [bankTransferLoading, setBankTransferLoading] = useState(false)

  // Cash on Delivery State
  const [cashEnabled, setCashEnabled] = useState(false)
  const [cashMinOrderEnabled, setCashMinOrderEnabled] = useState(false)
  const [cashMinOrderAmount, setCashMinOrderAmount] = useState("")
  const [cashLoading, setCashLoading] = useState(false)

  // Focus Shipping Integration State
  const [focusHost, setFocusHost] = useState("")
  const [focusCustomerNumber, setFocusCustomerNumber] = useState("")
  const [focusApiKey, setFocusApiKey] = useState("")
  const [showFocusApiKey, setShowFocusApiKey] = useState(false)
  const [focusConnected, setFocusConnected] = useState(false)
  const [focusLoading, setFocusLoading] = useState(false)
  const [focusAutoSend, setFocusAutoSend] = useState(false)
  const [focusAutoSendOn, setFocusAutoSendOn] = useState<"order.created" | "order.paid">("order.paid")
  const [focusShippingMethods, setFocusShippingMethods] = useState<string[]>([]) // אילו שיטות משלוח להפעיל עליהן

  // Load integrations status
  useEffect(() => {
    if (!selectedShop?.id) return
    
    // Load PayPlus
    fetch('/api/integrations/payplus')
      .then(res => res.json())
      .then(data => {
        if (data.integration && data.integration.isActive) {
          setPayplusConnected(true)
          const config = data.integration.config || {}
          if (config.paymentPageUid) {
            setPayplusPaymentPageUid(config.paymentPageUid)
          }
          if (config.useProduction) {
            setPayplusUseProduction(true)
          }
        }
      })
      .catch(console.error)

    // Load PayPal
    fetch('/api/integrations/paypal')
      .then(res => res.json())
      .then(data => {
        if (data.integration && data.integration.isActive) {
          setPaypalConnected(true)
          const config = data.integration.config || {}
          if (config.useProduction) {
            setPaypalUseProduction(true)
          }
        }
      })
      .catch(console.error)

    // Load Focus Shipping
    fetch('/api/integrations/focus-shipping')
      .then(res => res.json())
      .then(data => {
        if (data.integration && data.integration.isActive) {
          setFocusConnected(true)
          const config = data.integration.config || {}
          if (config.host) setFocusHost(config.host)
          if (config.customerNumber) setFocusCustomerNumber(config.customerNumber)
          if (config.autoSend) setFocusAutoSend(config.autoSend)
          if (config.autoSendOn) setFocusAutoSendOn(config.autoSendOn)
          if (config.shippingMethods) setFocusShippingMethods(config.shippingMethods || [])
        }
      })
      .catch(console.error)

    // Load shop settings for payment methods
    fetch(`/api/shops/${selectedShop.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.shop && data.shop.settings) {
          const settings = data.shop.settings as any
          const paymentMethods = settings.paymentMethods || {}
          
          // Bank Transfer
          if (paymentMethods.bankTransfer?.enabled) {
            setBankTransferEnabled(true)
            setBankTransferInstructions(paymentMethods.bankTransfer.instructions || "")
          }
          
          // Cash on Delivery
          if (paymentMethods.cash?.enabled) {
            setCashEnabled(true)
            if (paymentMethods.cash.minOrderEnabled) {
              setCashMinOrderEnabled(true)
              setCashMinOrderAmount(paymentMethods.cash.minOrderAmount?.toString() || "")
            }
          }
        }
      })
      .catch(console.error)
  }, [selectedShop?.id])

  const toggleProvider = (providerId: string) => {
    setExpandedProvider(expandedProvider === providerId ? null : providerId)
  }

  const testPayPlusConnection = async () => {
    if (!payplusApiKey || !payplusSecretKey || !payplusPaymentPageUid) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות",
        variant: "destructive",
      })
      return
    }

    setPayplusTesting(true)
    try {
      const res = await fetch('/api/integrations/payplus/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: payplusApiKey,
          secretKey: payplusSecretKey,
          paymentPageUid: payplusPaymentPageUid,
          useProduction: payplusUseProduction,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast({
          title: "הצלחה!",
          description: data.message || "החיבור ל-PayPlus תקין",
        })
      } else {
        toast({
          title: "שגיאה בבדיקה",
          description: data.error || data.details || "לא הצלחנו לבדוק את החיבור",
          variant: "destructive",
          duration: 10000,
        })
      }
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בבדיקת החיבור",
        variant: "destructive",
      })
    } finally {
      setPayplusTesting(false)
    }
  }

  const connectPayPlus = async () => {
    if (!payplusApiKey || !payplusSecretKey || !payplusPaymentPageUid) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות",
        variant: "destructive",
      })
      return
    }

    setPayplusLoading(true)
    try {
      const res = await fetch('/api/integrations/payplus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: payplusApiKey,
          secretKey: payplusSecretKey,
          paymentPageUid: payplusPaymentPageUid,
          name: 'PayPlus',
          useProduction: payplusUseProduction,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setPayplusConnected(true)
        toast({
          title: "הצלחה!",
          description: "החיבור ל-PayPlus הושלם בהצלחה",
        })
      } else {
        console.error('PayPlus connection failed:', data)
        toast({
          title: "שגיאה בהתחברות",
          description: data.error || data.details || "לא הצלחנו להתחבר ל-PayPlus. אנא בדוק את פרטי ההתחברות.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בחיבור ל-PayPlus",
        variant: "destructive",
      })
    } finally {
      setPayplusLoading(false)
    }
  }

  const disconnectPayPlus = async () => {
    try {
      const res = await fetch('/api/integrations/payplus', {
        method: 'DELETE',
      })

      if (res.ok) {
        setPayplusConnected(false)
        setPayplusApiKey("")
        setPayplusSecretKey("")
        setPayplusPaymentPageUid("")
        toast({
          title: "התנתקות הצליחה",
          description: "החיבור ל-PayPlus נותק",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו להתנתק",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהתנתקות",
        variant: "destructive",
      })
    }
  }

  const testPayPalConnection = async () => {
    if (!paypalClientId || !paypalSecret) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות",
        variant: "destructive",
      })
      return
    }

    setPaypalLoading(true)
    try {
      const res = await fetch('/api/integrations/paypal/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: paypalClientId,
          clientSecret: paypalSecret,
          useProduction: paypalUseProduction,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast({
          title: "הצלחה!",
          description: data.message || "החיבור ל-PayPal תקין",
        })
      } else {
        toast({
          title: "שגיאה בבדיקה",
          description: data.error || data.details || "לא הצלחנו לבדוק את החיבור",
          variant: "destructive",
          duration: 10000,
        })
      }
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בבדיקת החיבור",
        variant: "destructive",
      })
    } finally {
      setPaypalLoading(false)
    }
  }

  const connectPayPal = async () => {
    if (!paypalClientId || !paypalSecret) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות",
        variant: "destructive",
      })
      return
    }

    setPaypalLoading(true)
    try {
      const res = await fetch('/api/integrations/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: paypalClientId,
          clientSecret: paypalSecret,
          name: 'PayPal',
          useProduction: paypalUseProduction,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setPaypalConnected(true)
        toast({
          title: "הצלחה!",
          description: "החיבור ל-PayPal הושלם בהצלחה",
        })
      } else {
        console.error('PayPal connection failed:', data)
        toast({
          title: "שגיאה בהתחברות",
          description: data.error || data.details || "לא הצלחנו להתחבר ל-PayPal. אנא בדוק את פרטי ההתחברות.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בחיבור ל-PayPal",
        variant: "destructive",
      })
    } finally {
      setPaypalLoading(false)
    }
  }

  const disconnectPayPal = async () => {
    try {
      const res = await fetch('/api/integrations/paypal', {
        method: 'DELETE',
      })

      if (res.ok) {
        setPaypalConnected(false)
        setPaypalClientId("")
        setPaypalSecret("")
        toast({
          title: "התנתקות הצליחה",
          description: "החיבור ל-PayPal נותק",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו להתנתק",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהתנתקות",
        variant: "destructive",
      })
    }
  }

  const saveBankTransfer = async () => {
    if (!selectedShop?.id) return

    if (!bankTransferInstructions.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הזן הנחיות להעברה בנקאית",
        variant: "destructive",
      })
      return
    }

    setBankTransferLoading(true)
    try {
      const res = await fetch(`/api/shops/${selectedShop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethods: {
            bankTransfer: {
              enabled: true,
              instructions: bankTransferInstructions,
            },
          },
        }),
      })

      if (res.ok) {
        setBankTransferEnabled(true)
        toast({
          title: "הצלחה!",
          description: "העברה בנקאית הופעלה בהצלחה",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לשמור את ההגדרות",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת ההגדרות",
        variant: "destructive",
      })
    } finally {
      setBankTransferLoading(false)
    }
  }

  const disableBankTransfer = async () => {
    if (!selectedShop?.id) return

    setBankTransferLoading(true)
    try {
      const res = await fetch(`/api/shops/${selectedShop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethods: {
            bankTransfer: {
              enabled: false,
            },
          },
        }),
      })

      if (res.ok) {
        setBankTransferEnabled(false)
        setBankTransferInstructions("")
        toast({
          title: "הצלחה!",
          description: "העברה בנקאית בוטלה",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לשמור את ההגדרות",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת ההגדרות",
        variant: "destructive",
      })
    } finally {
      setBankTransferLoading(false)
    }
  }

  const saveCash = async () => {
    if (!selectedShop?.id) return

    if (cashMinOrderEnabled && (!cashMinOrderAmount || parseFloat(cashMinOrderAmount) <= 0)) {
      toast({
        title: "שגיאה",
        description: "אנא הזן סכום מינימום תקין",
        variant: "destructive",
      })
      return
    }

    setCashLoading(true)
    try {
      const res = await fetch(`/api/shops/${selectedShop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethods: {
            cash: {
              enabled: true,
              minOrderEnabled: cashMinOrderEnabled,
              minOrderAmount: cashMinOrderEnabled ? parseFloat(cashMinOrderAmount) : null,
            },
          },
        }),
      })

      if (res.ok) {
        setCashEnabled(true)
        toast({
          title: "הצלחה!",
          description: "מזומן בהזמנה הופעל בהצלחה",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לשמור את ההגדרות",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת ההגדרות",
        variant: "destructive",
      })
    } finally {
      setCashLoading(false)
    }
  }

  const connectFocus = async () => {
    if (!focusHost || !focusCustomerNumber) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות הנדרשים",
        variant: "destructive",
      })
      return
    }

    setFocusLoading(true)
    try {
      const res = await fetch('/api/integrations/focus-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: focusHost,
          customerNumber: focusCustomerNumber,
          apiKey: focusApiKey || undefined,
          name: 'פוקוס',
          autoSend: focusAutoSend,
          autoSendOn: focusAutoSendOn,
          shippingMethods: focusShippingMethods,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setFocusConnected(true)
        toast({
          title: "הצלחה!",
          description: "החיבור לפוקוס הושלם בהצלחה",
        })
      } else {
        toast({
          title: "שגיאה בהתחברות",
          description: data.error || "לא הצלחנו להתחבר לפוקוס",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בחיבור לפוקוס",
        variant: "destructive",
      })
    } finally {
      setFocusLoading(false)
    }
  }

  const disconnectFocus = async () => {
    try {
      const res = await fetch('/api/integrations/focus-shipping', {
        method: 'DELETE',
      })

      if (res.ok) {
        setFocusConnected(false)
        setFocusHost("")
        setFocusCustomerNumber("")
        setFocusApiKey("")
        setFocusAutoSend(false)
        toast({
          title: "התנתקות הצליחה",
          description: "החיבור לפוקוס נותק",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו להתנתק",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהתנתקות",
        variant: "destructive",
      })
    }
  }

  const disableCash = async () => {
    if (!selectedShop?.id) return

    setCashLoading(true)
    try {
      const res = await fetch(`/api/shops/${selectedShop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethods: {
            cash: {
              enabled: false,
            },
          },
        }),
      })

      if (res.ok) {
        setCashEnabled(false)
        setCashMinOrderEnabled(false)
        setCashMinOrderAmount("")
        toast({
          title: "הצלחה!",
          description: "מזומן בהזמנה בוטל",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לשמור את ההגדרות",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת ההגדרות",
        variant: "destructive",
      })
    } finally {
      setCashLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm sticky top-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">אינטגרציות</h2>
              <p className="text-sm text-gray-500 mt-1">{selectedShop?.name || "בחר חנות"}</p>
            </div>
            <nav className="p-2">
              {integrationCategories.map((category) => {
                const Icon = category.icon
                const isActive = activeCategory === category.key
                return (
                  <div key={category.key}>
                    <button
                      onClick={() => setActiveCategory(category.key as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-colors mb-1 ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 font-medium border-r-2 border-emerald-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-emerald-600" : "text-gray-500"}`} />
                      <span className="text-sm">{category.label}</span>
                    </button>
                    {category.divider && <div className="border-t border-gray-200 my-2 mx-2" />}
                  </div>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">אינטגרציות</h1>
              <p className="text-gray-500 mt-1">חבר את החנות שלך עם שירותי תשלום, משלוחים ואוטומציות</p>
            </div>

            {/* Payment Category */}
            {activeCategory === "payment" && (
              <div className="space-y-3">
                {/* העברה בנקאית */}
                <Card className="shadow-sm">
                  <div
                    className="bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => toggleProvider("bank-transfer")}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 flex items-center justify-center bg-white rounded-lg border border-gray-200 p-2">
                          <CreditCard className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">העברה בנקאית</h3>
                            <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                              שיטת תשלום
                            </Badge>
                            {bankTransferEnabled && (
                              <Badge className="text-xs bg-green-100 text-green-700 border-green-200 hover:bg-green-100 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                מופעל
                              </Badge>
                            )}
                            {!bankTransferEnabled && (
                              <span className="text-xs text-gray-500">לא מוגדר</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedProvider === "bank-transfer" ? "transform rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {expandedProvider === "bank-transfer" && (
                    <CardContent className="p-6 border-t">
                      {!bankTransferEnabled ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="bank-transfer-instructions">הנחיות להעברה בנקאית</Label>
                            <Textarea
                              id="bank-transfer-instructions"
                              placeholder="לדוגמה: העבר לחשבון בנק 12, סניף 345, חשבון 678901, שם: שם החנות"
                              value={bankTransferInstructions}
                              onChange={(e) => setBankTransferInstructions(e.target.value)}
                              className="mt-2"
                              rows={4}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              הזן את פרטי החשבון וההנחיות שיוצגו ללקוחות
                            </p>
                          </div>

                          <Button
                            onClick={saveBankTransfer}
                            disabled={bankTransferLoading}
                            className="w-full prodify-gradient text-white border-0"
                          >
                            {bankTransferLoading ? "שומר..." : "הפעל העברה בנקאית"}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-green-900 font-medium">
                              ✅ העברה בנקאית מופעלת!
                            </p>
                            <p className="text-sm text-green-700 mt-1">
                              הלקוחות יראו את ההנחיות להעברה בנקאית בצ'ק אאוט
                            </p>
                          </div>

                          <div className="space-y-4 mt-4">
                            <div>
                              <Label htmlFor="bank-transfer-instructions-edit">הנחיות להעברה בנקאית</Label>
                              <Textarea
                                id="bank-transfer-instructions-edit"
                                placeholder="לדוגמה: העבר לחשבון בנק 12, סניף 345, חשבון 678901, שם: שם החנות"
                                value={bankTransferInstructions}
                                onChange={(e) => setBankTransferInstructions(e.target.value)}
                                className="mt-2"
                                rows={4}
                              />
                            </div>

                            <Button
                              onClick={saveBankTransfer}
                              disabled={bankTransferLoading}
                              className="w-full prodify-gradient text-white border-0"
                            >
                              {bankTransferLoading ? "שומר..." : "עדכן הנחיות"}
                            </Button>
                          </div>

                          <Button
                            onClick={disableBankTransfer}
                            disabled={bankTransferLoading}
                            variant="outline"
                            className="w-full mt-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {bankTransferLoading ? "שומר..." : "בטל העברה בנקאית"}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  )}
                </Card>

                {/* מזומן בהזמנה */}
                <Card className="shadow-sm">
                  <div
                    className="bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => toggleProvider("cash")}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 flex items-center justify-center bg-white rounded-lg border border-gray-200 p-2">
                          <CreditCard className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">מזומן בהזמנה</h3>
                            <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                              שיטת תשלום
                            </Badge>
                            {cashEnabled && (
                              <Badge className="text-xs bg-green-100 text-green-700 border-green-200 hover:bg-green-100 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                מופעל
                              </Badge>
                            )}
                            {!cashEnabled && (
                              <span className="text-xs text-gray-500">לא מוגדר</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedProvider === "cash" ? "transform rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {expandedProvider === "cash" && (
                    <CardContent className="p-6 border-t">
                      {!cashEnabled ? (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <input
                              type="checkbox"
                              id="cash-min-order"
                              checked={cashMinOrderEnabled}
                              onChange={(e) => setCashMinOrderEnabled(e.target.checked)}
                              className="rounded"
                            />
                            <Label htmlFor="cash-min-order" className="font-normal cursor-pointer">
                              מינימום הזמנה בקנייה מעל
                            </Label>
                          </div>

                          {cashMinOrderEnabled && (
                            <div>
                              <Label htmlFor="cash-min-order-amount">סכום מינימום (₪)</Label>
                              <Input
                                id="cash-min-order-amount"
                                type="number"
                                placeholder="לדוגמה: 100"
                                value={cashMinOrderAmount}
                                onChange={(e) => setCashMinOrderAmount(e.target.value)}
                                className="mt-2"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          )}

                          <Button
                            onClick={saveCash}
                            disabled={cashLoading}
                            className="w-full prodify-gradient text-white border-0"
                          >
                            {cashLoading ? "שומר..." : "הפעל מזומן בהזמנה"}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-green-900 font-medium">
                              ✅ מזומן בהזמנה מופעל!
                            </p>
                            <p className="text-sm text-green-700 mt-1">
                              הלקוחות יוכלו לבחור בתשלום במזומן בעת המשלוח
                            </p>
                          </div>

                          <div className="space-y-4 mt-4">
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <input
                                type="checkbox"
                                id="cash-min-order-edit"
                                checked={cashMinOrderEnabled}
                                onChange={(e) => setCashMinOrderEnabled(e.target.checked)}
                                className="rounded"
                              />
                              <Label htmlFor="cash-min-order-edit" className="font-normal cursor-pointer">
                                מינימום הזמנה בקנייה מעל
                              </Label>
                            </div>

                            {cashMinOrderEnabled && (
                              <div>
                                <Label htmlFor="cash-min-order-amount-edit">סכום מינימום (₪)</Label>
                                <Input
                                  id="cash-min-order-amount-edit"
                                  type="number"
                                  placeholder="לדוגמה: 100"
                                  value={cashMinOrderAmount}
                                  onChange={(e) => setCashMinOrderAmount(e.target.value)}
                                  className="mt-2"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            )}

                            <Button
                              onClick={saveCash}
                              disabled={cashLoading}
                              className="w-full prodify-gradient text-white border-0"
                            >
                              {cashLoading ? "שומר..." : "עדכן הגדרות"}
                            </Button>
                          </div>

                          <Button
                            onClick={disableCash}
                            disabled={cashLoading}
                            variant="outline"
                            className="w-full mt-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {cashLoading ? "שומר..." : "בטל מזומן בהזמנה"}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  )}
                </Card>

                {/* ספקי תשלום */}
                {paymentProviders.map((provider) => {
                  const isExpanded = expandedProvider === provider.id
                  const isPayPlus = provider.id === "payplus"
                  const isPayPal = provider.id === "paypal"
                  const isConnected = isPayPlus ? payplusConnected : paypalConnected

                  return (
                    <Card key={provider.id} className="shadow-sm">
                      <div
                        className="bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => toggleProvider(provider.id)}
                      >
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 flex items-center justify-center bg-white rounded-lg border border-gray-200 p-2">
                              <Image
                                src={provider.logo}
                                alt={provider.nameEn}
                                width={40}
                                height={40}
                                className="object-contain"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                                <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                                  {provider.type}
                                </Badge>
                                {isConnected && (
                                  <Badge className="text-xs bg-green-100 text-green-700 border-green-200 hover:bg-green-100 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    מופעל
                                  </Badge>
                                )}
                                {!isConnected && (
                                  <span className="text-xs text-gray-500">לא מוגדר</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {provider.registrationUrl && !isConnected && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(provider.registrationUrl, "_blank")
                                }}
                              >
                                <ExternalLink className="w-4 h-4 ml-2" />
                                הרשמה
                              </Button>
                            )}
                            <ChevronDown
                              className={`w-5 h-5 text-gray-400 transition-transform ${
                                isExpanded ? "transform rotate-180" : ""
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <CardContent className="p-6 border-t">
                          {isPayPlus && (
                            <div className="space-y-4">
                              {!payplusConnected ? (
                                <>
                                  <div>
                                    <Label htmlFor="payplus-api-key">API Key</Label>
                                    <Input
                                      id="payplus-api-key"
                                      type="text"
                                      placeholder="הזן את ה-API Key מ-PayPlus"
                                      value={payplusApiKey}
                                      onChange={(e) => setPayplusApiKey(e.target.value)}
                                      className="mt-2"
                                      dir="ltr"
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor="payplus-secret-key">Secret Key</Label>
                                    <div className="flex gap-2 mt-2">
                                      <div className="flex-1 relative">
                                        <Input
                                          id="payplus-secret-key"
                                          type={showPayplusSecretKey ? "text" : "password"}
                                          placeholder="הזן את ה-Secret Key מ-PayPlus"
                                          value={payplusSecretKey}
                                          onChange={(e) => setPayplusSecretKey(e.target.value)}
                                          className="pr-10"
                                          dir="ltr"
                                        />
                                        <button
                                          onClick={() => setShowPayplusSecretKey(!showPayplusSecretKey)}
                                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                          {showPayplusSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <Label htmlFor="payplus-payment-page-uid">Payment Page UID</Label>
                                    <Input
                                      id="payplus-payment-page-uid"
                                      type="text"
                                      placeholder="הזן את ה-Payment Page UID מ-PayPlus"
                                      value={payplusPaymentPageUid}
                                      onChange={(e) => setPayplusPaymentPageUid(e.target.value)}
                                      className="mt-2"
                                      dir="ltr"
                                    />
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id="payplus-use-production"
                                      checked={payplusUseProduction}
                                      onChange={(e) => setPayplusUseProduction(e.target.checked)}
                                      className="rounded"
                                    />
                                    <Label htmlFor="payplus-use-production" className="font-normal cursor-pointer">
                                      שימוש בסביבת ייצור (Production)
                                    </Label>
                                  </div>

                                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                                    <p className="text-sm text-orange-900">
                                      💡 <strong>איפה למצוא את הפרטים?</strong>
                                    </p>
                                    <p className="text-sm text-orange-700">
                                      התחבר ל-<a href="https://www.payplus.co.il" target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-800">PayPlus</a> ונווט ל-API Settings
                                    </p>
                                    <ul className="text-xs text-orange-600 mr-4 space-y-1">
                                      <li>• API Key ו-Secret Key נמצאים תחת API Credentials</li>
                                      <li>• Payment Page UID נמצא תחת Payment Pages</li>
                                      <li>• בחר "Production" אם זה חשבון ייצור</li>
                                      <li>• ודא שיש לך הרשאות מתכנת (Developer) בחשבון</li>
                                    </ul>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      onClick={testPayPlusConnection}
                                      disabled={payplusTesting || payplusLoading}
                                      variant="outline"
                                      className="flex-1"
                                    >
                                      {payplusTesting ? "בודק..." : "🔍 בדוק חיבור"}
                                    </Button>
                                    <Button
                                      onClick={connectPayPlus}
                                      disabled={payplusLoading || payplusTesting}
                                      className="flex-1 prodify-gradient text-white border-0"
                                    >
                                      {payplusLoading ? "מתחבר..." : "התחבר ל-PayPlus"}
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-sm text-green-900 font-medium">
                                      ✅ החשבון מחובר בהצלחה!
                                    </p>
                                    <p className="text-sm text-green-700 mt-1">
                                      כעת הלקוחות יועברו לדף תשלום מאובטח של PayPlus לאחר הצ'ק אאוט
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <h4 className="font-medium text-sm">תכונות זמינות:</h4>
                                    <ul className="text-sm text-gray-600 space-y-1 mr-4">
                                      <li>• יצירת קישורי תשלום מאובטחים</li>
                                      <li>• עיבוד תשלומי כרטיס אשראי</li>
                                      <li>• תשלומים בתשלומים</li>
                                      <li>• קבלת עדכונים אוטומטיים על תשלומים</li>
                                      <li>• דף תודה מותאם אישית לאחר התשלום</li>
                                    </ul>
                                  </div>

                                  <Button
                                    onClick={disconnectPayPlus}
                                    variant="outline"
                                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    נתק חיבור
                                  </Button>
                                </>
                              )}
                            </div>
                          )}

                          {isPayPal && (
                            <div className="space-y-4">
                              {!paypalConnected ? (
                                <>
                                  <div>
                                    <Label htmlFor="paypal-client-id">Client ID</Label>
                                    <Input
                                      id="paypal-client-id"
                                      type="text"
                                      placeholder="הזן את ה-Client ID מ-PayPal"
                                      value={paypalClientId}
                                      onChange={(e) => setPaypalClientId(e.target.value)}
                                      className="mt-2"
                                      dir="ltr"
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor="paypal-secret">Client Secret</Label>
                                    <div className="flex gap-2 mt-2">
                                      <div className="flex-1 relative">
                                        <Input
                                          id="paypal-secret"
                                          type={showPaypalSecret ? "text" : "password"}
                                          placeholder="הזן את ה-Client Secret מ-PayPal"
                                          value={paypalSecret}
                                          onChange={(e) => setPaypalSecret(e.target.value)}
                                          className="pr-10"
                                          dir="ltr"
                                        />
                                        <button
                                          onClick={() => setShowPaypalSecret(!showPaypalSecret)}
                                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                          {showPaypalSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id="paypal-use-production"
                                      checked={paypalUseProduction}
                                      onChange={(e) => setPaypalUseProduction(e.target.checked)}
                                      className="rounded"
                                    />
                                    <Label htmlFor="paypal-use-production" className="font-normal cursor-pointer">
                                      שימוש בסביבת ייצור (Production)
                                    </Label>
                                  </div>

                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                                    <p className="text-sm text-blue-900">
                                      💡 <strong>איפה למצוא את הפרטים?</strong>
                                    </p>
                                    <p className="text-sm text-blue-700">
                                      התחבר ל-<a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">PayPal Developer</a> ונווט ל-Apps & Credentials
                                    </p>
                                    <ul className="text-xs text-blue-600 mr-4 space-y-1">
                                      <li>• צור App חדש או בחר App קיים</li>
                                      <li>• Client ID ו-Client Secret נמצאים תחת REST API apps</li>
                                      <li>• בחר "Production" אם זה חשבון ייצור</li>
                                      <li>• ודא שיש לך הרשאות מתאימות בחשבון</li>
                                    </ul>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      onClick={testPayPalConnection}
                                      disabled={paypalLoading}
                                      variant="outline"
                                      className="flex-1"
                                    >
                                      {paypalLoading ? "בודק..." : "🔍 בדוק חיבור"}
                                    </Button>
                                    <Button
                                      onClick={connectPayPal}
                                      disabled={paypalLoading}
                                      className="flex-1 prodify-gradient text-white border-0"
                                    >
                                      {paypalLoading ? "מתחבר..." : "התחבר ל-PayPal"}
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-sm text-green-900 font-medium">
                                      ✅ החשבון מחובר בהצלחה!
                                    </p>
                                    <p className="text-sm text-green-700 mt-1">
                                      כעת הלקוחות יועברו לדף תשלום מאובטח של PayPal לאחר הצ'ק אאוט
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <h4 className="font-medium text-sm">תכונות זמינות:</h4>
                                    <ul className="text-sm text-gray-600 space-y-1 mr-4">
                                      <li>• יצירת הזמנות תשלום מאובטחות</li>
                                      <li>• עיבוד תשלומי PayPal</li>
                                      <li>• תשלומים בכרטיסי אשראי</li>
                                      <li>• קבלת עדכונים אוטומטיים על תשלומים</li>
                                      <li>• דף תודה מותאם אישית לאחר התשלום</li>
                                    </ul>
                                  </div>

                                  <Button
                                    onClick={disconnectPayPal}
                                    variant="outline"
                                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    נתק חיבור
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Shipping Category */}
            {activeCategory === "shipping" && (
              <div className="space-y-6">
                {shippingProviders.map((provider) => {
                  const isExpanded = expandedProvider === provider.id
                  const isFocus = provider.id === "focus"
                  const isConnected = isFocus ? focusConnected : false

                  return (
                    <Card key={provider.id} className="shadow-sm">
                      <div
                        className="bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => toggleProvider(provider.id)}
                      >
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 flex items-center justify-center bg-white rounded-lg border border-gray-200 p-2">
                              {provider.logo ? (
                                <Image
                                  src={provider.logo}
                                  alt={provider.nameEn}
                                  width={40}
                                  height={40}
                                  className="object-contain"
                                />
                              ) : (
                                <Truck className="w-6 h-6 text-gray-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                                <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                                  {provider.type}
                                </Badge>
                                {isConnected && (
                                  <Badge className="text-xs bg-green-100 text-green-700 border-green-200 hover:bg-green-100 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    מופעל
                                  </Badge>
                                )}
                                {!isConnected && (
                                  <span className="text-xs text-gray-500">לא מוגדר</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {provider.registrationUrl && !isConnected && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(provider.registrationUrl!, "_blank")
                                }}
                              >
                                <ExternalLink className="w-4 h-4 ml-2" />
                                הרשמה
                              </Button>
                            )}
                            <ChevronDown
                              className={`w-5 h-5 text-gray-400 transition-transform ${
                                isExpanded ? "transform rotate-180" : ""
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <CardContent className="p-6 border-t">
                          {isFocus && (
                            <div className="space-y-4">
                              {!focusConnected ? (
                                <>
                                  <div>
                                    <Label htmlFor="focus-host">כתובת שרת (Host)</Label>
                                    <Input
                                      id="focus-host"
                                      type="text"
                                      placeholder="https://example.com"
                                      value={focusHost}
                                      onChange={(e) => setFocusHost(e.target.value)}
                                      className="mt-2"
                                      dir="ltr"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">כתובת השרת של חברת פוקוס</p>
                                  </div>

                                  <div>
                                    <Label htmlFor="focus-customer-number">מספר לקוח</Label>
                                    <Input
                                      id="focus-customer-number"
                                      type="text"
                                      placeholder="מספר לקוח בפוקוס"
                                      value={focusCustomerNumber}
                                      onChange={(e) => setFocusCustomerNumber(e.target.value)}
                                      className="mt-2"
                                      dir="ltr"
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor="focus-api-key">API Key (אופציונלי)</Label>
                                    <div className="flex gap-2 mt-2">
                                      <div className="flex-1 relative">
                                        <Input
                                          id="focus-api-key"
                                          type={showFocusApiKey ? "text" : "password"}
                                          placeholder="הזן את ה-API Key (אם נדרש)"
                                          value={focusApiKey}
                                          onChange={(e) => setFocusApiKey(e.target.value)}
                                          className="pr-10"
                                          dir="ltr"
                                        />
                                        <button
                                          onClick={() => setShowFocusApiKey(!showFocusApiKey)}
                                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                          {showFocusApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">אם חברת פוקוס דורשת API Key לאימות</p>
                                  </div>

                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                                    <p className="text-sm text-blue-900">
                                      💡 <strong>איפה למצוא את הפרטים?</strong>
                                    </p>
                                    <p className="text-sm text-blue-700">
                                      פנה לחברת פוקוס לקבלת:
                                    </p>
                                    <ul className="text-xs text-blue-600 mr-4 space-y-1">
                                      <li>• כתובת השרת (Host) - כתובת ה-API של פוקוס</li>
                                      <li>• מספר לקוח - מספר הלקוח שלך בפוקוס</li>
                                      <li>• API Key - אם נדרש לאימות</li>
                                    </ul>
                                  </div>

                                  <div className="border-t pt-4 space-y-3">
                                    <h4 className="font-medium text-sm">שליחה אוטומטית</h4>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id="focus-auto-send"
                                        checked={focusAutoSend}
                                        onChange={(e) => setFocusAutoSend(e.target.checked)}
                                        className="rounded"
                                      />
                                      <Label htmlFor="focus-auto-send" className="font-normal cursor-pointer">
                                        שלח הזמנות אוטומטית לחברת המשלוחים
                                      </Label>
                                    </div>
                                    {focusAutoSend && (
                                      <div className="mr-6 space-y-3">
                                        <div>
                                          <Label htmlFor="focus-auto-send-on">שלח כאשר:</Label>
                                          <select
                                            id="focus-auto-send-on"
                                            value={focusAutoSendOn}
                                            onChange={(e) => setFocusAutoSendOn(e.target.value as "order.created" | "order.paid")}
                                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                          >
                                            <option value="order.created">הזמנה נוצרה</option>
                                            <option value="order.paid">הזמנה שולמה</option>
                                          </select>
                                        </div>
                                        <div>
                                          <Label>הפעל על שיטות משלוח:</Label>
                                          <p className="text-xs text-gray-500 mb-2">בחר על אילו שיטות משלוח להפעיל את השליחה האוטומטית</p>
                                          <div className="space-y-2 mt-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={focusShippingMethods.includes("shipping")}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    setFocusShippingMethods([...focusShippingMethods, "shipping"])
                                                  } else {
                                                    setFocusShippingMethods(focusShippingMethods.filter(m => m !== "shipping"))
                                                  }
                                                }}
                                                className="rounded"
                                              />
                                              <span className="text-sm">משלוח לבית (Shipping)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={focusShippingMethods.includes("pickup")}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    setFocusShippingMethods([...focusShippingMethods, "pickup"])
                                                  } else {
                                                    setFocusShippingMethods(focusShippingMethods.filter(m => m !== "pickup"))
                                                  }
                                                }}
                                                className="rounded"
                                              />
                                              <span className="text-sm">איסוף עצמי (Pickup)</span>
                                            </label>
                                          </div>
                                          {focusShippingMethods.length === 0 && (
                                            <p className="text-xs text-orange-600 mt-1">⚠️ אם לא תבחר כלום, השליחה האוטומטית תופעל על כל ההזמנות</p>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500">הזמנות יישלחו אוטומטית רק פעם אחת</p>
                                      </div>
                                    )}
                                  </div>

                                  <Button
                                    onClick={connectFocus}
                                    disabled={focusLoading}
                                    className="w-full prodify-gradient text-white border-0"
                                  >
                                    {focusLoading ? "מתחבר..." : "התחבר לפוקוס"}
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-sm text-green-900 font-medium">
                                      ✅ החשבון מחובר בהצלחה!
                                    </p>
                                    <p className="text-sm text-green-700 mt-1">
                                      כעת תוכל לשלוח הזמנות לפוקוס ידנית או אוטומטית
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <h4 className="font-medium text-sm">תכונות זמינות:</h4>
                                    <ul className="text-sm text-gray-600 space-y-1 mr-4">
                                      <li>• שליחת הזמנות אוטומטית (אם מופעל)</li>
                                      <li>• שליחה ידנית מעמוד הזמנות</li>
                                      <li>• מעקב אחר סטטוס משלוחים</li>
                                      <li>• הורדת תוויות משלוח</li>
                                      <li>• ביטול משלוחים</li>
                                    </ul>
                                  </div>

                                  {focusAutoSend && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                                      <p className="text-sm text-blue-900">
                                        <strong>שליחה אוטומטית מופעלת:</strong> הזמנות יישלחו אוטומטית כאשר {focusAutoSendOn === "order.created" ? "הזמנה נוצרת" : "הזמנה משולמת"}
                                      </p>
                                      {focusShippingMethods.length > 0 && (
                                        <p className="text-xs text-blue-700">
                                          שיטות משלוח: {focusShippingMethods.map(m => m === "shipping" ? "משלוח לבית" : "איסוף עצמי").join(", ")}
                                        </p>
                                      )}
                                      {focusShippingMethods.length === 0 && (
                                        <p className="text-xs text-blue-700">
                                          מופעל על כל שיטות המשלוח
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  <Button
                                    onClick={disconnectFocus}
                                    variant="outline"
                                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    נתק חיבור
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Automation Category */}
            {activeCategory === "automation" && (
              <div className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>אוטומציות</CardTitle>
                    <CardDescription>
                      אינטגרציות אוטומציות יהיו זמינות בקרוב
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-gray-400">
                      <Zap className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">בפיתוח</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
