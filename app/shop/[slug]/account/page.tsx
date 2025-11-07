"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  LogOut,
  Package,
  Calendar,
  DollarSign,
} from "lucide-react"
import Link from "next/link"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
  isPublished: boolean
}

interface Customer {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
}

export default function StorefrontAccountPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const slug = params.slug as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [shop, setShop] = useState<Shop | null>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "addresses" | "wishlist">("profile")

  useEffect(() => {
    fetchShopInfo()
    fetchCartCount()
    
    const token = localStorage.getItem(`storefront_token_${slug}`)
    const customerData = localStorage.getItem(`storefront_customer_${slug}`)

    if (!token || !customerData) {
      router.push(`/shop/${slug}/login`)
      return
    }

    try {
      const parsed = JSON.parse(customerData)
      setCustomer(parsed)
      fetchOrders(parsed.id)
    } catch (error) {
      console.error("Error parsing customer data:", error)
      router.push(`/shop/${slug}/login`)
    } finally {
      setLoading(false)
    }
  }, [slug, router])

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

  const fetchOrders = async (customerId: string) => {
    try {
      // TODO: Implement storefront orders API
      // const response = await fetch(`/api/storefront/${slug}/orders?customerId=${customerId}`)
      // if (response.ok) {
      //   const data = await response.json()
      //   setOrders(data)
      // }
    } catch (error) {
      console.error("Error fetching orders:", error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(`storefront_token_${slug}`)
    localStorage.removeItem(`storefront_customer_${slug}`)
    router.push(`/shop/${slug}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
        <StorefrontHeader
          slug={slug}
          shop={shop}
          cartItemCount={cartItemCount}
          onCartUpdate={fetchCartCount}
        />
        <main className="flex-1">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <FormSkeleton />
          </div>
        </main>
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

  if (!customer) {
    return null
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
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">חשבון שלי</h1>
            <p className="text-gray-600 mt-1">
              שלום, {customer.firstName || customer.email}!
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 ml-2" />
            התנתק
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-0">
                <nav className="space-y-1 p-2">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`w-full text-right px-4 py-3 rounded-lg transition-colors ${
                      activeTab === "profile"
                        ? "bg-purple-100 text-purple-900"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <User className="w-4 h-4 inline ml-2" />
                    פרטים אישיים
                  </button>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className={`w-full text-right px-4 py-3 rounded-lg transition-colors ${
                      activeTab === "orders"
                        ? "bg-purple-100 text-purple-900"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 inline ml-2" />
                    הזמנות שלי
                  </button>
                  <button
                    onClick={() => setActiveTab("addresses")}
                    className={`w-full text-right px-4 py-3 rounded-lg transition-colors ${
                      activeTab === "addresses"
                        ? "bg-purple-100 text-purple-900"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <MapPin className="w-4 h-4 inline ml-2" />
                    כתובות
                  </button>
                  <button
                    onClick={() => setActiveTab("wishlist")}
                    className={`w-full text-right px-4 py-3 rounded-lg transition-colors ${
                      activeTab === "wishlist"
                        ? "bg-purple-100 text-purple-900"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <Heart className="w-4 h-4 inline ml-2" />
                    רשימת משאלות
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeTab === "profile" && (
              <Card>
                <CardHeader>
                  <CardTitle>פרטים אישיים</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>שם פרטי</Label>
                      <p className="font-medium">{customer.firstName || "-"}</p>
                    </div>
                    <div>
                      <Label>שם משפחה</Label>
                      <p className="font-medium">{customer.lastName || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <Label>אימייל</Label>
                    <p className="font-medium">{customer.email}</p>
                  </div>
                  <div>
                    <Label>טלפון</Label>
                    <p className="font-medium">{customer.phone || "-"}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "orders" && (
              <Card>
                <CardHeader>
                  <CardTitle>הזמנות שלי</CardTitle>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600">אין הזמנות עדיין</p>
                      <Link href={`/shop/${slug}`}>
                        <Button className="mt-4 prodify-gradient text-white">
                          התחל לקנות
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold">
                                  הזמנה #{order.orderNumber}
                                </span>
                                <Badge>{order.status}</Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(order.createdAt).toLocaleDateString("he-IL")}
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  ₪{order.total.toFixed(2)}
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              צפה בהזמנה
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "addresses" && (
              <Card>
                <CardHeader>
                  <CardTitle>כתובות משלוח</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">אין כתובות שמורות</p>
                    <Button className="mt-4" variant="outline">
                      הוסף כתובת
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "wishlist" && (
              <Card>
                <CardHeader>
                  <CardTitle>רשימת משאלות</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">רשימת המשאלות שלך ריקה</p>
                    <Link href={`/shop/${slug}`}>
                      <Button className="mt-4 prodify-gradient text-white">
                        המשך לקניות
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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

