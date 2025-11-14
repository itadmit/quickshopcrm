"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, CheckCircle2, ChevronDown, ExternalLink, CreditCard, Truck, Zap } from "lucide-react"
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
                          ? "bg-purple-50 text-purple-700 font-medium border-r-2 border-purple-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-purple-600" : "text-gray-500"}`} />
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
                                <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
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
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>משלוחים</CardTitle>
                    <CardDescription>
                      אינטגרציות משלוחים יהיו זמינות בקרוב
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-gray-400">
                      <Truck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">בפיתוח</p>
                    </div>
                  </CardContent>
                </Card>
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
