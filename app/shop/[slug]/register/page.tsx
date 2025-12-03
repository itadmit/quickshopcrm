"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Mail, UserPlus, Phone, Calendar, User } from "lucide-react"
import Link from "next/link"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackPageView, trackSignUp } from "@/lib/tracking-events"
import { useShopTheme } from "@/hooks/useShopTheme"

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
  isPublished: boolean
}

export default function StorefrontRegisterPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const slug = params.slug as string

  const [registering, setRegistering] = useState(false)
  const [shop, setShop] = useState<Shop | null>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const { trackEvent } = useTracking()
  const { theme } = useShopTheme(slug)
  
  // קבלת הצבע הראשי מה-theme
  const primaryColor = theme?.primaryColor || "#000000"

  useEffect(() => {
    fetchShopInfo()
    fetchCartCount()
    trackPageView(trackEvent, `/shop/${slug}/register`, "הרשמה")
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName) {
      toast({
        title: "שגיאה",
        description: "אנא הזן שם פרטי",
        variant: "destructive",
      })
      return
    }

    if (!email) {
      toast({
        title: "שגיאה",
        description: "אנא הזן אימייל",
        variant: "destructive",
      })
      return
    }

    if (!phone) {
      toast({
        title: "שגיאה",
        description: "אנא הזן טלפון",
        variant: "destructive",
      })
      return
    }

    if (!termsAccepted) {
      toast({
        title: "שגיאה",
        description: "אנא אשר את תקנון האתר",
        variant: "destructive",
      })
      return
    }

    setRegistering(true)
    try {
      const response = await fetch(`/api/storefront/${slug}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          phone,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // שמירת token ב-localStorage
        localStorage.setItem(`storefront_token_${slug}`, data.token)
        localStorage.setItem(`storefront_customer_${slug}`, JSON.stringify(data.customer))
        
        // עדכון ההדר מיד
        window.dispatchEvent(new Event('customerDataChanged'))
        
        // SignUp event
        trackSignUp(trackEvent, "direct")
        
        toast({
          title: "הצלחה",
          description: "נרשמת בהצלחה",
        })
        router.push(`/shop/${slug}/account`)
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
      setRegistering(false)
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
              <UserPlus className="w-9 h-9 text-black" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">הרשמה</h1>
            <p className="text-gray-600">צור חשבון חדש</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">שם פרטי *</Label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="שם פרטי"
                          className="pr-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">שם משפחה</Label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="שם משפחה"
                          className="pr-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">אימייל *</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">טלפון *</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="050-1234567"
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">תאריך לידה (אופציונלי)</Label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    />
                    <Label
                      htmlFor="terms"
                      className="text-sm font-normal cursor-pointer"
                    >
                      אני מאשר את{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="hover:underline"
                        style={{ color: primaryColor }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        תקנון האתר
                      </Link>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-white !bg-transparent"
                    style={{ background: primaryColor }}
                    disabled={registering || !termsAccepted}
                  >
                    <UserPlus className="w-4 h-4 ml-2" />
                    {registering ? "נרשם..." : "הרשמה"}
                  </Button>
                </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  יש לך כבר חשבון?{" "}
                  <Link
                    href={`/shop/${slug}/login`}
                    className="hover:underline"
                    style={{ color: primaryColor }}
                  >
                    התחבר כאן
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
