"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { LogIn, Mail, Lock } from "lucide-react"
import Link from "next/link"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackPageView, trackLogin } from "@/lib/tracking-events"

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

  const [loading, setLoading] = useState(false)
  const [shop, setShop] = useState<Shop | null>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const { trackEvent } = useTracking()

  useEffect(() => {
    fetchShopInfo()
    fetchCartCount()
    // PageView event - רק פעם אחת כשהעמוד נטען
    trackPageView(trackEvent, `/shop/${slug}/login`, "התחברות")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/storefront/${slug}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        // Save token to localStorage
        localStorage.setItem(`storefront_token_${slug}`, data.token)
        localStorage.setItem(`storefront_customer_${slug}`, JSON.stringify(data.customer))
        
        // Login event
        trackLogin(trackEvent, "email")
        
        toast({
          title: "הצלחה",
          description: "התחברת בהצלחה",
        })
        router.push(`/shop/${slug}/account`)
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">התחברות</h1>
            <p className="text-gray-600">התחבר לחשבון שלך</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">אימייל</Label>
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
                  <Label htmlFor="password">סיסמה</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
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
                  <LogIn className="w-4 h-4 ml-2" />
                  {loading ? "מתחבר..." : "התחבר"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  אין לך חשבון?{" "}
                  <Link
                    href={`/shop/${slug}/register`}
                    className="text-purple-600 hover:underline"
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

