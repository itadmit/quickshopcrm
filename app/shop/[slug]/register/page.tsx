"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { UserPlus, Mail, Lock, User, Phone } from "lucide-react"
import Link from "next/link"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackPageView, trackSignUp } from "@/lib/tracking-events"

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

  const [loading, setLoading] = useState(false)
  const [shop, setShop] = useState<Shop | null>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
  })
  const { trackEvent } = useTracking()

  useEffect(() => {
    fetchShopInfo()
    fetchCartCount()
    // PageView event - רק פעם אחת כשהעמוד נטען
    trackPageView(trackEvent, `/shop/${slug}/register`, "הרשמה")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]) // רק כשהעמוד משתנה, לא trackEvent

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
      if (!token) {
        setCartItemCount(0)
        return
      }
      // TODO: Implement cart count API
      setCartItemCount(0)
    } catch (error) {
      console.error("Error fetching cart count:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "שגיאה",
        description: "הסיסמאות לא תואמות",
        variant: "destructive",
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "שגיאה",
        description: "סיסמה חייבת להכיל לפחות 6 תווים",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/storefront/${slug}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        }),
      })

      if (response.ok) {
        // SignUp event
        trackSignUp(trackEvent, "email")
        
        toast({
          title: "הצלחה",
          description: "נרשמת בהצלחה! אנא התחבר",
        })
        router.push(`/shop/${slug}/login`)
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
      setLoading(false)
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">הרשמה</h1>
            <p className="text-gray-600">צור חשבון חדש</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">שם פרטי</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                        placeholder="שם פרטי"
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">שם משפחה</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                      placeholder="שם משפחה"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">אימייל *</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="pr-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">טלפון</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="050-1234567"
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">סיסמה *</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="לפחות 6 תווים"
                      className="pr-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">אימות סיסמה *</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="הזן סיסמה שוב"
                      className="pr-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full prodify-gradient text-white"
                  disabled={loading}
                >
                  <UserPlus className="w-4 h-4 ml-2" />
                  {loading ? "נרשם..." : "הירשם"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  כבר יש לך חשבון?{" "}
                  <Link
                    href={`/shop/${slug}/login`}
                    className="text-purple-600 hover:underline"
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

