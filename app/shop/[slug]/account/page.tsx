"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  LogOut,
  Package,
  Calendar,
  DollarSign,
  RotateCcw,
  Trash2,
  Plus,
  Edit,
  X,
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
  const [returns, setReturns] = useState<any[]>([])
  const [shop, setShop] = useState<Shop | null>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "addresses" | "wishlist" | "returns">("profile")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addresses, setAddresses] = useState<any[]>([])
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<any | null>(null)
  const [addressForm, setAddressForm] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    zip: "",
  })
  const [savingAddress, setSavingAddress] = useState(false)

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
      fetchReturns(parsed.id)
      fetchAddresses(parsed.id)
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

  const fetchOrders = async (customerId: string) => {
    try {
      const response = await fetch(`/api/storefront/${slug}/orders?customerId=${customerId}`, {
        headers: {
          "x-customer-id": customerId,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    }
  }

  const fetchReturns = async (customerId: string) => {
    try {
      const response = await fetch(`/api/storefront/${slug}/returns?customerId=${customerId}`, {
        headers: {
          "x-customer-id": customerId,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setReturns(data.returns || [])
      }
    } catch (error) {
      console.error("Error fetching returns:", error)
    }
  }

  const fetchAddresses = async (customerId: string) => {
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
        setAddresses(data.addresses || [])
      }
    } catch (error) {
      console.error("Error fetching addresses:", error)
    }
  }

  const handleAddAddress = () => {
    setEditingAddress(null)
    setAddressForm({
      firstName: customer?.firstName || "",
      lastName: customer?.lastName || "",
      address: "",
      city: "",
      zip: "",
    })
    setAddressDialogOpen(true)
  }

  const handleEditAddress = (address: any) => {
    setEditingAddress(address)
    setAddressForm({
      firstName: address.firstName || "",
      lastName: address.lastName || "",
      address: address.address || "",
      city: address.city || "",
      zip: address.zip || "",
    })
    setAddressDialogOpen(true)
  }

  const handleSaveAddress = async () => {
    if (!addressForm.firstName || !addressForm.address || !addressForm.city || !addressForm.zip) {
      toast({
        title: "שגיאה",
        description: "אנא מלא את כל השדות הנדרשים",
        variant: "destructive",
      })
      return
    }

    setSavingAddress(true)
    try {
      const token = localStorage.getItem(`storefront_token_${slug}`)
      if (!token) {
        toast({
          title: "שגיאה",
          description: "אימות נדרש",
          variant: "destructive",
        })
        return
      }

      if (editingAddress) {
        // עדכון כתובת קיימת - נמחק את הישנה ונוסיף את החדשה
        await fetch(`/api/storefront/${slug}/account/addresses?addressId=${editingAddress.id}`, {
          method: "DELETE",
          headers: {
            "x-customer-token": token,
          },
        })
      }

      const response = await fetch(`/api/storefront/${slug}/account/addresses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-customer-token": token,
        },
        body: JSON.stringify(addressForm),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: editingAddress ? "כתובת עודכנה בהצלחה" : "כתובת נוספה בהצלחה",
        })
        setAddressDialogOpen(false)
        fetchAddresses(customer?.id || "")
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בשמירת הכתובת",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving address:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת הכתובת",
        variant: "destructive",
      })
    } finally {
      setSavingAddress(false)
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const token = localStorage.getItem(`storefront_token_${slug}`)
      if (!token) {
        toast({
          title: "שגיאה",
          description: "אימות נדרש",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/storefront/${slug}/account/addresses?addressId=${addressId}`, {
        method: "DELETE",
        headers: {
          "x-customer-token": token,
        },
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "כתובת נמחקה בהצלחה",
        })
        fetchAddresses(customer?.id || "")
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה במחיקת הכתובת",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting address:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הכתובת",
        variant: "destructive",
      })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(`storefront_token_${slug}`)
    localStorage.removeItem(`storefront_customer_${slug}`)
    // מחיקת cookie
    document.cookie = `storefront_customer_${slug}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    // עדכון ההדר מיד
    window.dispatchEvent(new Event('customerDataChanged'))
    router.push(`/shop/${slug}`)
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const token = localStorage.getItem(`storefront_token_${slug}`)
      
      if (!token) {
        toast({
          title: "שגיאה",
          description: "אימות נדרש",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/storefront/${slug}/account/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-customer-token": token,
        },
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "החשבון נמחק בהצלחה",
        })
        
        // מחיקת נתונים מ-localStorage
        localStorage.removeItem(`storefront_token_${slug}`)
        localStorage.removeItem(`storefront_customer_${slug}`)
        // מחיקת cookie
        document.cookie = `storefront_customer_${slug}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        
        // עדכון ההדר מיד
        window.dispatchEvent(new Event('customerDataChanged'))
        
        // הפניה לעמוד הבית
        router.push(`/shop/${slug}`)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה במחיקת החשבון",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting account:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת החשבון",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
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
                  <button
                    onClick={() => setActiveTab("returns")}
                    className={`w-full text-right px-4 py-3 rounded-lg transition-colors ${
                      activeTab === "returns"
                        ? "bg-purple-100 text-purple-900"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <RotateCcw className="w-4 h-4 inline ml-2" />
                    החזרות והחלפות
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
                  
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 ml-2" />
                      מחק חשבון
                    </Button>
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
                  <div className="flex items-center justify-between">
                    <CardTitle>כתובות משלוח</CardTitle>
                    <Button onClick={handleAddAddress} size="sm" variant="outline">
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף כתובת
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {addresses.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600">אין כתובות שמורות</p>
                      <Button className="mt-4" variant="outline" onClick={handleAddAddress}>
                        הוסף כתובת
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {addresses.map((address: any) => (
                        <div
                          key={address.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold">
                                  {address.firstName} {address.lastName}
                                </span>
                              </div>
                              <p className="text-gray-700">{address.address}</p>
                              <p className="text-gray-600 text-sm">
                                {address.city} {address.zip}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAddress(address)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAddress(address.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

            {activeTab === "returns" && (
              <Card>
                <CardHeader>
                  <CardTitle>החזרות והחלפות</CardTitle>
                </CardHeader>
                <CardContent>
                  {returns.length === 0 ? (
                    <div className="text-center py-12">
                      <RotateCcw className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600">אין החזרות או החלפות</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {returns.map((returnItem) => (
                        <div
                          key={returnItem.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <RotateCcw className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold">
                                  החזרה #{returnItem.id.slice(-6)}
                                </span>
                                <Badge
                                  className={
                                    returnItem.status === "APPROVED" || returnItem.status === "COMPLETED"
                                      ? "bg-green-100 text-green-800"
                                      : returnItem.status === "REJECTED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }
                                >
                                  {returnItem.status === "PENDING"
                                    ? "ממתין"
                                    : returnItem.status === "APPROVED"
                                    ? "אושר"
                                    : returnItem.status === "REJECTED"
                                    ? "נדחה"
                                    : returnItem.status === "PROCESSING"
                                    ? "בטיפול"
                                    : returnItem.status === "COMPLETED"
                                    ? "הושלם"
                                    : "בוטל"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Package className="w-4 h-4" />
                                  הזמנה #{returnItem.order?.orderNumber || "N/A"}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(returnItem.createdAt).toLocaleDateString("he-IL")}
                                </div>
                                {returnItem.refundAmount && (
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-4 h-4" />
                                    ₪{returnItem.refundAmount.toFixed(2)}
                                  </div>
                                )}
                              </div>
                              {returnItem.reason && (
                                <p className="text-sm text-gray-500 mt-2">
                                  סיבה: {returnItem.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Address Dialog */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddress ? "ערוך כתובת" : "הוסף כתובת"}</DialogTitle>
            <DialogDescription>
              הזן את פרטי הכתובת למשלוח
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressFirstName">שם פרטי *</Label>
                <Input
                  id="addressFirstName"
                  value={addressForm.firstName}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLastName">שם משפחה</Label>
                <Input
                  id="addressLastName"
                  value={addressForm.lastName}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressStreet">כתובת *</Label>
              <Textarea
                id="addressStreet"
                value={addressForm.address}
                onChange={(e) => setAddressForm((prev) => ({ ...prev, address: e.target.value }))}
                required
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressCity">עיר *</Label>
                <Input
                  id="addressCity"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressZip">מיקוד *</Label>
                <Input
                  id="addressZip"
                  value={addressForm.zip}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, zip: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAddressDialogOpen(false)}
              disabled={savingAddress}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSaveAddress}
              disabled={savingAddress}
            >
              {savingAddress ? "שומר..." : editingAddress ? "עדכן" : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת חשבון</DialogTitle>
            <DialogDescription>
              האם אתה בטוח שברצונך למחוק את החשבון שלך? פעולה זו אינה ניתנת לביטול.
              כל הנתונים שלך, כולל הזמנות והיסטוריית רכישות, יימחקו לצמיתות.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? "מוחק..." : "מחק חשבון"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

