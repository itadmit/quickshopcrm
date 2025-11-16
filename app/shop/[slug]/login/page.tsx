"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Mail, KeyRound, User, Phone } from "lucide-react"
import Link from "next/link"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackPageView, trackLogin } from "@/lib/tracking-events"
import { useShopTheme } from "@/hooks/useShopTheme"

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
  isPublished: boolean
}

export default function StorefrontLoginPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const slug = params.slug as string

  const [otpLoading, setOtpLoading] = useState(false)
  const [shop, setShop] = useState<Shop | null>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [emailOrPhone, setEmailOrPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("") // האימייל של החשבון (אם מזינים טלפון)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const { trackEvent } = useTracking()
  const { theme } = useShopTheme(slug)
  
  // קבלת הצבע הראשי מה-theme
  const primaryColor = theme?.primaryColor || "#000000"

  useEffect(() => {
    fetchShopInfo()
    fetchCartCount()
    trackPageView(trackEvent, `/shop/${slug}/login`, "התחברות")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const fetchShopInfo = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/info?t=${Date.now()}`, {
        cache: 'no-store'
      })
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

  // פונקציה לזיהוי אם זה אימייל או טלפון
  const isEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailOrPhone) {
      toast({
        title: "שגיאה",
        description: "אנא הזן טלפון או אימייל",
        variant: "destructive",
      })
      return
    }

    const isEmailValue = isEmail(emailOrPhone)
    const requestBody = isEmailValue 
      ? { email: emailOrPhone.toLowerCase() }
      : { phone: emailOrPhone }

    setOtpLoading(true)
    try {
      const response = await fetch(`/api/storefront/${slug}/auth/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      // קריאת ה-response - גם אם יש שגיאה, ננסה לקרוא את ה-JSON
      let responseData: any = {}
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        try {
          responseData = await response.json()
        } catch (parseError) {
          // אם לא ניתן לפרסר את ה-response, נשתמש בהודעת שגיאה ברירת מחדל
          responseData = { error: "אירעה שגיאה בשליחת הקוד" }
        }
      } else {
        responseData = { error: "אירעה שגיאה בשליחת הקוד" }
      }

      if (response.ok && responseData.success !== false) {
        setOtpSent(true)
        // אם יש אימייל ב-response, נשתמש בו (למקרה של טלפון)
        if (responseData.email) {
          setCustomerEmail(responseData.email)
        } else {
          setCustomerEmail(emailOrPhone)
        }
        toast({
          title: "הצלחה",
          description: "נשלח קוד התחברות לאימייל שלך. אנא בדוק את תיבת הדואר הנכנס",
        })
      } else {
        // טיפול בשגיאות - מציג הודעת שגיאה למשתמש
        toast({
          title: "שגיאה",
          description: responseData.error || "אירעה שגיאה בשליחת הקוד",
          variant: "destructive",
        })
      }
    } catch (error) {
      // טיפול בשגיאות רשת בלבד - רק שגיאות אמיתיות, לא 404
      // 404 לא יגיע לכאן כי fetch לא זורק שגיאה על 404
      if (error instanceof TypeError) {
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בחיבור לשרת. אנא נסה שוב",
          variant: "destructive",
        })
      }
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode || otpCode.length !== 6) {
      toast({
        title: "שגיאה",
        description: "אנא הזן קוד בן 6 ספרות",
        variant: "destructive",
      })
      return
    }

    setVerifying(true)
    try {
      const isEmailValue = isEmail(emailOrPhone)
      const requestBody = isEmailValue
        ? { email: emailOrPhone.toLowerCase(), code: otpCode }
        : { phone: emailOrPhone, code: otpCode }

      const response = await fetch(`/api/storefront/${slug}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const data = await response.json()
        // שמירת token ב-localStorage
        localStorage.setItem(`storefront_token_${slug}`, data.token)
        localStorage.setItem(`storefront_customer_${slug}`, JSON.stringify(data.customer))
        
        // עדכון ההדר מיד
        window.dispatchEvent(new Event('customerDataChanged'))
        
        // Login event
        trackLogin(trackEvent, "otp")
        
        toast({
          title: "הצלחה",
          description: "התחברת בהצלחה",
        })
        router.push(`/shop/${slug}/account`)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "קוד לא תקין. אנא נסה שוב",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error verifying OTP:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה באימות הקוד",
        variant: "destructive",
      })
    } finally {
      setVerifying(false)
    }
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
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-2 border-black rounded-full flex items-center justify-center">
              <User className="w-9 h-9 text-black" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">התחברות</h1>
            <p className="text-gray-600">התחבר לחשבון שלך</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailOrPhone">טלפון/מייל</Label>
                    <div className="relative">
                      {isEmail(emailOrPhone) ? (
                        <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      ) : (
                        <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      )}
                      <Input
                        id="emailOrPhone"
                        type="text"
                        value={emailOrPhone}
                        onChange={(e) => setEmailOrPhone(e.target.value)}
                        placeholder="your@email.com או 050-1234567"
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-white !bg-transparent"
                    style={{ background: primaryColor }}
                    disabled={otpLoading}
                  >
                    <User className="w-4 h-4 ml-2" />
                    {otpLoading ? "שולח..." : "התחברות"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      נשלח קוד התחברות לאימייל:
                    </p>
                    <p className="font-medium text-gray-900">{customerEmail || emailOrPhone}</p>
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">קוד התחברות (6 ספרות)</Label>
                      <div className="relative">
                        <KeyRound className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="otp"
                          type="text"
                          value={otpCode}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                            setOtpCode(value)
                          }}
                          placeholder="000000"
                          className="pr-10 text-center text-2xl tracking-widest"
                          maxLength={6}
                          required
                          autoFocus
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        הקוד תקף למשך 10 דקות
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full text-white !bg-transparent"
                      style={{ background: primaryColor }}
                      disabled={verifying || otpCode.length !== 6}
                    >
                      {verifying ? "מאמת..." : "אמת והתחבר"}
                    </Button>
                  </form>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false)
                        setOtpCode("")
                        setCustomerEmail("")
                      }}
                      className="text-sm hover:underline"
                      style={{ color: primaryColor }}
                    >
                      שלוח קוד חדש
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  אין לך חשבון?{" "}
                  <Link
                    href={`/shop/${slug}/register`}
                    className="hover:underline"
                    style={{ color: primaryColor }}
                  >
                    הירשם כאן
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
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
