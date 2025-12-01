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
  Coins,
  RotateCcw,
  Trash2,
  Plus,
  Edit,
  X,
  Truck,
  RefreshCw,
  Crown,
  Gift,
} from "lucide-react"
import Link from "next/link"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { Autocomplete } from "@/components/ui/autocomplete"
import { useCitySearch, useStreetSearch } from "@/hooks/useIsraelAddress"

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
  premiumClubTier?: string | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus?: string
  total: number
  createdAt: string
  trackingNumber?: string | null
  shippingTrackingNumber?: string | null
  shippingProvider?: string | null
  shippingStatus?: string | null
  items?: Array<{
    id: string
    quantity: number
  }>
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
  const [storeCredit, setStoreCredit] = useState<any>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "addresses" | "wishlist" | "returns" | "credits">("profile")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addresses, setAddresses] = useState<any[]>([])
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<any | null>(null)
  const [addressForm, setAddressForm] = useState({
    firstName: "",
    lastName: "",
    address: "",
    houseNumber: "",
    apartment: "",
    floor: "",
    city: "",
    zip: "",
  })
  const [savingAddress, setSavingAddress] = useState(false)
  
  // Autocomplete hooks לערים ורחובות
  const citySearch = useCitySearch(slug)
  const [selectedCityForStreets, setSelectedCityForStreets] = useState("")
  const streetSearch = useStreetSearch(slug, selectedCityForStreets)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<Order | null>(null)
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [returnForm, setReturnForm] = useState({
    reason: "",
    notes: "",
    items: [] as Array<{ orderItemId: string; quantity: number; reason?: string }>,
  })
  const [creatingReturn, setCreatingReturn] = useState(false)
  const [trackingStatuses, setTrackingStatuses] = useState<Record<string, any>>({})
  const [loadingTracking, setLoadingTracking] = useState<Record<string, boolean>>({})
  const [monthlyGift, setMonthlyGift] = useState<any>(null)
  const [loadingMonthlyGift, setLoadingMonthlyGift] = useState(false)
  const [claimingGift, setClaimingGift] = useState(false)
  const [premiumProgress, setPremiumProgress] = useState<any>(null)
  const [loadingPremiumProgress, setLoadingPremiumProgress] = useState(false)

  // פונקציה לבדיקת שגיאות אימות (לקוח נמחק)
  const handleAuthError = (response: Response) => {
    if (response.status === 401) {
      // לקוח נמחק או אימות נכשל
      localStorage.removeItem(`storefront_token_${slug}`)
      localStorage.removeItem(`storefront_customer_${slug}`)
      toast({
        title: "החשבון לא נמצא",
        description: "החשבון נמחק או לא קיים יותר במערכת",
        variant: "destructive",
      })
      router.push(`/shop/${slug}/login`)
      return true
    }
    return false
  }

  // פונקציה לתרגום סטטוס לעברית
  const getStatusText = (status: string, paymentStatus?: string) => {
    // אם התשלום שולם, נציג "שולם" במקום "ממתין"
    if (paymentStatus === "PAID" && status === "PENDING") {
      return "שולם"
    }
    
    const statusMap: Record<string, string> = {
      PENDING: "ממתין לתשלום",
      CONFIRMED: "מאושר",
      PAID: "שולם",
      PROCESSING: "מעובד",
      SHIPPED: "נשלח",
      DELIVERED: "נמסר",
      CANCELLED: "בוטל",
      REFUNDED: "הוחזר",
    }
    return statusMap[status.toUpperCase()] || status
  }

  // פונקציה לקביעת צבע סטטוס
  const getStatusColor = (status: string, paymentStatus?: string) => {
    // אם הוזמן ביקרוק ובוטל - אדום
    if (status === "CANCELLED" || status === "REFUNDED") {
      return "bg-red-100 text-red-700 border-red-200"
    }
    // אם הוזמן ביקרוק - ירוק
    if (paymentStatus === "PAID" && status !== "CANCELLED") {
      return "bg-green-100 text-green-700 border-green-200"
    }
    // פנדינג - צהוב
    if (status === "PENDING") {
      return "bg-yellow-100 text-yellow-700 border-yellow-200"
    }
    // סטטוסים אחרים - כחול פסטל
    return "bg-blue-100 text-blue-700 border-blue-200"
  }

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
      fetchStoreCredit(parsed.id)
    } catch (error) {
      console.error("Error parsing customer data:", error)
      router.push(`/shop/${slug}/login`)
    } finally {
      setLoading(false)
    }
  }, [slug, router])

  // רענון קרדיט בחנות כשעוברים לטאב פרטים אישיים או קרדיט
  useEffect(() => {
    if ((activeTab === "profile" || activeTab === "credits") && customer) {
      fetchStoreCredit(customer.id)
    }
  }, [activeTab, customer])

  useEffect(() => {
    console.log('[Account Page] useEffect triggered', { 
      hasCustomer: !!customer?.id, 
      hasShop: !!shop?.id,
      hasTier: !!customer?.premiumClubTier 
    })
    
    if (customer?.id && shop?.id) {
      console.log('[Account Page] Calling fetchPremiumProgress')
      fetchPremiumProgress()
      if (customer?.premiumClubTier) {
        console.log('[Account Page] Calling fetchMonthlyGift')
        fetchMonthlyGift()
      }
    }
  }, [customer?.id, shop?.id, customer?.premiumClubTier])

  const fetchPremiumProgress = async () => {
    if (!customer?.id || !shop?.id) return
    
    setLoadingPremiumProgress(true)
    try {
      console.log('[Premium Progress] Fetching for customer:', customer.id, 'shop:', shop.id)
      const response = await fetch(
        `/api/premium-club/progress?shopId=${shop.id}&customerId=${customer.id}`
      )
      console.log('[Premium Progress] Response status:', response.status)
      
      // בדיקה אם הלקוח נמחק
      if (handleAuthError(response)) {
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        console.log('[Premium Progress] Data received:', data)
        setPremiumProgress(data)
      } else {
        const error = await response.json()
        console.error('[Premium Progress] Error response:', error)
      }
    } catch (error) {
      console.error("Error fetching premium progress:", error)
    } finally {
      setLoadingPremiumProgress(false)
    }
  }

  const fetchMonthlyGift = async () => {
    if (!customer?.id || !shop?.id) return
    
    setLoadingMonthlyGift(true)
    try {
      const response = await fetch(
        `/api/premium-club/monthly-gift?shopId=${shop.id}&customerId=${customer.id}`
      )
      if (response.ok) {
        const data = await response.json()
        setMonthlyGift(data)
      }
    } catch (error) {
      console.error("Error fetching monthly gift:", error)
    } finally {
      setLoadingMonthlyGift(false)
    }
  }

  const claimMonthlyGift = async () => {
    if (!customer?.id || !shop?.id) return
    
    setClaimingGift(true)
    try {
      const response = await fetch(`/api/premium-club/monthly-gift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop.id,
          customerId: customer.id,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        toast({
          title: "מצוין!",
          description: data.couponCode 
            ? `קיבלת מתנה חודשית! קוד ההנחה שלך: ${data.couponCode}`
            : "קיבלת מתנה חודשית!",
        })
        fetchMonthlyGift()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בקבלת המתנה",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בקבלת המתנה",
        variant: "destructive",
      })
    } finally {
      setClaimingGift(false)
    }
  }

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

  const fetchTrackingStatus = async (orderId: string) => {
    if (loadingTracking[orderId]) return
    
    setLoadingTracking(prev => ({ ...prev, [orderId]: true }))
    try {
      const token = localStorage.getItem(`storefront_token_${slug}`)
      const response = await fetch(`/api/storefront/${slug}/orders/${orderId}/tracking`, {
        headers: {
          "x-customer-id": token || "",
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setTrackingStatuses(prev => ({ ...prev, [orderId]: data }))
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא הצלחנו לקבל את סטטוס המעקב",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching tracking status:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בקבלת סטטוס המעקב",
        variant: "destructive",
      })
    } finally {
      setLoadingTracking(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const getTrackingStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "ממתין",
      sent: "נשלח",
      in_transit: "בדרך",
      delivered: "נמסר",
      cancelled: "בוטל",
      failed: "נכשל",
      returned: "הוחזר",
    }
    return statusMap[status] || status
  }

  const getTrackingStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      sent: "bg-blue-100 text-blue-700 border-blue-200",
      in_transit: "bg-purple-100 text-purple-700 border-purple-200",
      delivered: "bg-green-100 text-green-700 border-green-200",
      cancelled: "bg-red-100 text-red-700 border-red-200",
      failed: "bg-red-100 text-red-700 border-red-200",
      returned: "bg-orange-100 text-orange-700 border-orange-200",
    }
    return colorMap[status] || "bg-gray-100 text-gray-700 border-gray-200"
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
      
      // בדיקה אם הלקוח נמחק
      if (handleAuthError(response)) {
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        setAddresses(data.addresses || [])
      }
    } catch (error) {
      console.error("Error fetching addresses:", error)
    }
  }

  const fetchStoreCredit = async (customerId: string) => {
    try {
      const token = localStorage.getItem(`storefront_token_${slug}`)
      if (!token) {
        console.log("No token found for store credit")
        return
      }

      const response = await fetch(`/api/storefront/${slug}/store-credit`, {
        headers: {
          "x-customer-id": token,
        },
      })
      
      // בדיקה אם הלקוח נמחק
      if (handleAuthError(response)) {
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        console.log("Store credit data:", data)
        setStoreCredit(data)
      } else {
        const errorData = await response.json()
        console.error("Error fetching store credit:", errorData)
      }
    } catch (error) {
      console.error("Error fetching store credit:", error)
    }
  }

  const handleAddAddress = () => {
    setEditingAddress(null)
    setAddressForm({
      firstName: customer?.firstName || "",
      lastName: customer?.lastName || "",
      address: "",
      houseNumber: "",
      apartment: "",
      floor: "",
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
      houseNumber: address.houseNumber || "",
      apartment: address.apartment || "",
      floor: address.floor || "",
      city: address.city || "",
      zip: address.zip || "",
    })
    setSelectedCityForStreets(address.city || "")
    setAddressDialogOpen(true)
  }

  const handleSaveAddress = async () => {
    if (!addressForm.firstName || !addressForm.address || !addressForm.houseNumber || !addressForm.city) {
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
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <User className="w-4 h-4 inline ml-2" />
                    פרטים אישיים
                  </button>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className={`w-full text-right px-4 py-3 rounded-lg transition-colors ${
                      activeTab === "orders"
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 inline ml-2" />
                    הזמנות שלי
                  </button>
                  <button
                    onClick={() => setActiveTab("addresses")}
                    className={`w-full text-right px-4 py-3 rounded-lg transition-colors ${
                      activeTab === "addresses"
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <MapPin className="w-4 h-4 inline ml-2" />
                    כתובות
                  </button>
                  <button
                    onClick={() => setActiveTab("wishlist")}
                    className={`w-full text-right px-4 py-3 rounded-lg transition-colors ${
                      activeTab === "wishlist"
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <Heart className="w-4 h-4 inline ml-2" />
                    רשימת משאלות
                  </button>
                  <button
                    onClick={() => setActiveTab("returns")}
                    className={`w-full text-right px-4 py-3 rounded-lg transition-colors ${
                      activeTab === "returns"
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <RotateCcw className="w-4 h-4 inline ml-2" />
                    החזרות והחלפות
                  </button>
                  <button
                    onClick={() => setActiveTab("credits")}
                    className={`w-full text-right px-4 py-3 rounded-lg transition-colors ${
                      activeTab === "credits"
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <Coins className="w-4 h-4 inline ml-2" />
                    קרדיט בחנות
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeTab === "profile" && (
              <>
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
                  
                  {/* רמת מועדון פרימיום עם פרוגרס בר */}
                  {loadingPremiumProgress ? (
                    <div className="mt-4 pt-4 border-t">
                      <div className="rounded-lg p-4 border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
                        {/* Skeleton - כותרת */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-3 w-32" />
                              <Skeleton className="h-5 w-24" />
                            </div>
                          </div>
                          <Skeleton className="h-8 w-20 rounded-full" />
                        </div>
                        
                        {/* Skeleton - סטטיסטיקות */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-white/50 rounded-lg p-2">
                            <Skeleton className="h-8 w-24 mx-auto mb-1" />
                            <Skeleton className="h-3 w-16 mx-auto" />
                          </div>
                          <div className="bg-white/50 rounded-lg p-2">
                            <Skeleton className="h-8 w-12 mx-auto mb-1" />
                            <Skeleton className="h-3 w-16 mx-auto" />
                          </div>
                        </div>
                        
                        {/* Skeleton - פרוגרס בר */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-8" />
                          </div>
                          <Skeleton className="h-3 w-full rounded-full" />
                          <div className="mt-3 flex gap-2">
                            <Skeleton className="h-6 w-32 rounded-full" />
                            <Skeleton className="h-6 w-28 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : premiumProgress?.enabled ? (
                    <div className="mt-4 pt-4 border-t">
                      <div 
                        className="rounded-lg p-4 border-2"
                        style={{
                          background: premiumProgress.currentTier 
                            ? `linear-gradient(135deg, ${premiumProgress.currentTier.color}15, ${premiumProgress.currentTier.color}30)`
                            : 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                          borderColor: premiumProgress.currentTier?.color || '#d1d5db'
                        }}
                      >
                        {/* כותרת ורמה נוכחית */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Crown 
                              className="w-8 h-8" 
                              style={{ color: premiumProgress.currentTier?.color || '#d1d5db' }}
                            />
                            <div>
                              <Label className="text-sm text-gray-600">רמת מועדון פרימיום</Label>
                              <p 
                                className="text-xl font-bold"
                                style={{ color: premiumProgress.currentTier?.color || '#374151' }}
                              >
                                {premiumProgress.currentTier?.name || 'אין רמה'}
                              </p>
                            </div>
                          </div>
                          {premiumProgress.currentTier?.discount && (
                            <div className="text-center px-3 py-1 rounded-full bg-white/50">
                              <span className="text-lg font-bold" style={{ color: premiumProgress.currentTier.color }}>
                                {premiumProgress.currentTier.discount.type === 'PERCENTAGE' 
                                  ? `${premiumProgress.currentTier.discount.value}%`
                                  : `₪${premiumProgress.currentTier.discount.value}`
                                }
                              </span>
                              <span className="text-xs text-gray-600 mr-1">הנחה</span>
                            </div>
                          )}
                        </div>

                        {/* סטטיסטיקות */}
                        <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                          <div className="bg-white/50 rounded-lg p-2">
                            <p className="text-2xl font-bold text-gray-800">₪{premiumProgress.totalSpent?.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">סה"כ רכישות</p>
                          </div>
                          <div className="bg-white/50 rounded-lg p-2">
                            <p className="text-2xl font-bold text-gray-800">{premiumProgress.totalOrders}</p>
                            <p className="text-xs text-gray-500">הזמנות</p>
                          </div>
                        </div>

                        {/* פרוגרס לרמה הבאה */}
                        {premiumProgress.nextTier && (
                          <div className="mt-4 pt-4 border-t border-white/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">
                                התקדמות לרמת <strong style={{ color: premiumProgress.nextTier.color }}>{premiumProgress.nextTier.name}</strong>
                              </span>
                              <span className="text-sm font-bold">{premiumProgress.progress}%</span>
                            </div>
                            
                            {/* פרוגרס בר */}
                            <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${premiumProgress.progress}%`,
                                  backgroundColor: premiumProgress.nextTier.color 
                                }}
                              />
                            </div>

                            {/* מה נותר */}
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              {premiumProgress.spentToNext > 0 && (
                                <span className="bg-white/50 px-2 py-1 rounded-full">
                                  חסרים עוד ₪{premiumProgress.spentToNext.toLocaleString()}
                                </span>
                              )}
                              {premiumProgress.ordersToNext > 0 && (
                                <span className="bg-white/50 px-2 py-1 rounded-full">
                                  חסרות עוד {premiumProgress.ordersToNext} הזמנות
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* אם הגיע לרמה הגבוהה ביותר */}
                        {!premiumProgress.nextTier && premiumProgress.currentTier && (
                          <div className="mt-4 pt-4 border-t border-white/30 text-center">
                            <p className="text-sm text-gray-600">
                              🎉 הגעת לרמה הגבוהה ביותר!
                            </p>
                          </div>
                        )}

                        {/* הטבות הרמה */}
                        {premiumProgress.currentTier?.benefits && (
                          <div className="mt-4 pt-4 border-t border-white/30">
                            <p className="text-xs text-gray-500 mb-2">הטבות הרמה שלך:</p>
                            <div className="flex flex-wrap gap-1">
                              {premiumProgress.currentTier.benefits.freeShipping && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">משלוח חינם</span>
                              )}
                              {premiumProgress.currentTier.benefits.earlyAccess && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">גישה מוקדמת</span>
                              )}
                              {premiumProgress.currentTier.benefits.exclusiveProducts && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">מוצרים בלעדיים</span>
                              )}
                              {premiumProgress.currentTier.benefits.birthdayGift && (
                                <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">מתנת יום הולדת</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                  
                  {/* קרדיט בחנות */}
                  {storeCredit && (
                    <div className="mt-6 pt-6 border-t">
                      <div className={`rounded-lg p-4 ${
                        storeCredit.balance > 0 
                          ? "bg-gradient-to-r from-blue-50 to-cyan-50" 
                          : "bg-gray-50"
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm text-gray-600">קרדיט בחנות</Label>
                            <p className={`text-2xl font-bold mt-1 ${
                              storeCredit.balance > 0 
                                ? "text-blue-700" 
                                : "text-gray-500"
                            }`}>
                              ₪{storeCredit.balance.toFixed(2)}
                            </p>
                            {storeCredit.expiresAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                תאריך תפוגה: {new Date(storeCredit.expiresAt).toLocaleDateString("he-IL")}
                              </p>
                            )}
                            {storeCredit.reason && (
                              <p className="text-xs text-gray-500 mt-1">
                                {storeCredit.reason}
                              </p>
                            )}
                          </div>
                          <Coins className={`w-12 h-12 ${
                            storeCredit.balance > 0 
                              ? "text-blue-500" 
                              : "text-gray-400"
                          }`} />
                        </div>
                      </div>
                    </div>
                  )}
                  
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

              {/* מתנה חודשית - רק אם יש מתנה זמינה */}
              {customer?.premiumClubTier && monthlyGift?.available && (
                <Card className="mt-6 border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-yellow-600" />
                      מתנה חודשית זמינה!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-yellow-200">
                      <Gift className="w-8 h-8 text-yellow-600" />
                      <div className="flex-1">
                        <p className="font-semibold text-lg">יש לך מתנה חודשית!</p>
                        <p className="text-sm text-gray-600">
                          כחבר מועדון פרימיום ברמה {premiumProgress?.currentTier?.name || customer.premiumClubTier}, אתה זכאי למתנה חודשית
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={claimMonthlyGift}
                      disabled={claimingGift}
                      className="w-full bg-yellow-600 hover:bg-yellow-700"
                    >
                      {claimingGift ? "מקבל מתנה..." : "🎁 קבל מתנה חודשית"}
                    </Button>
                  </CardContent>
                </Card>
              )}
              </>
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
                      {orders.map((order) => {
                        const hasTracking = order.shippingTrackingNumber || order.trackingNumber
                        const trackingStatus = trackingStatuses[order.id]
                        const isLoadingTracking = loadingTracking[order.id]
                        
                        return (
                          <div
                            key={order.id}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Package className="w-4 h-4 text-gray-400" />
                                  <span className="font-semibold">
                                    הזמנה #{order.orderNumber}
                                  </span>
                                  <Badge className={getStatusColor(order.status, order.paymentStatus)}>
                                    {getStatusText(order.status, order.paymentStatus)}
                                  </Badge>
                                  {trackingStatus && (
                                    <Badge className={getTrackingStatusColor(trackingStatus.status)}>
                                      {getTrackingStatusText(trackingStatus.status)}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(order.createdAt).toLocaleDateString("he-IL")}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Coins className="w-4 h-4" />
                                    ₪{order.total.toFixed(2)}
                                  </div>
                                  {hasTracking && (
                                    <div className="flex items-center gap-1">
                                      <Truck className="w-4 h-4" />
                                      <span className="text-xs">
                                        {order.shippingTrackingNumber || order.trackingNumber}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {trackingStatus?.events && trackingStatus.events.length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="text-xs text-gray-600 mb-2">היסטוריית מעקב:</div>
                                    <div className="space-y-1">
                                      {trackingStatus.events.slice(0, 2).map((event: any, idx: number) => {
                                        // בדיקה שהתאריך תקין
                                        let eventDate: Date
                                        try {
                                          eventDate = event.date instanceof Date ? event.date : new Date(event.date)
                                          if (isNaN(eventDate.getTime())) {
                                            eventDate = new Date()
                                          }
                                        } catch {
                                          eventDate = new Date()
                                        }
                                        
                                        return (
                                          <div key={idx} className="text-xs text-gray-500 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                            <span>
                                              {eventDate.toLocaleDateString("he-IL")} {eventDate.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                            <span>-</span>
                                            <span>{event.description || "אירוע מעקב"}</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {hasTracking && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchTrackingStatus(order.id)}
                                    disabled={isLoadingTracking}
                                  >
                                    <RefreshCw className={`w-4 h-4 ml-2 ${isLoadingTracking ? "animate-spin" : ""}`} />
                                    רענון מעקב
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => router.push(`/shop/${slug}/orders/${order.id}`)}
                                >
                                  צפה בהזמנה
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
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
                  <div className="flex items-center justify-between">
                    <CardTitle>החזרות והחלפות</CardTitle>
                    <Button
                      onClick={() => {
                        // נציג רק הזמנות ששולמו
                        const paidOrders = orders.filter(o => o.paymentStatus === "PAID")
                        if (paidOrders.length === 0) {
                          toast({
                            title: "אין הזמנות זמינות",
                            description: "רק הזמנות ששולמו יכולות להיות מוחזרות",
                            variant: "destructive",
                          })
                          return
                        }
                        setReturnDialogOpen(true)
                      }}
                      className="prodify-gradient text-white"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      צור החזרה חדשה
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {returns.length === 0 ? (
                    <div className="text-center py-12">
                      <RotateCcw className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 mb-4">אין החזרות או החלפות</p>
                      <Button
                        onClick={() => {
                          const paidOrders = orders.filter(o => o.paymentStatus === "PAID")
                          if (paidOrders.length === 0) {
                            toast({
                              title: "אין הזמנות זמינות",
                              description: "רק הזמנות ששולמו יכולות להיות מוחזרות",
                              variant: "destructive",
                            })
                            return
                          }
                          setReturnDialogOpen(true)
                        }}
                        className="prodify-gradient text-white"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        צור החזרה חדשה
                      </Button>
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
                                    <Coins className="w-4 h-4" />
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

            {activeTab === "credits" && (
              <Card>
                <CardHeader>
                  <CardTitle>קרדיט בחנות</CardTitle>
                </CardHeader>
                <CardContent>
                  {storeCredit ? (
                    <div className="space-y-6">
                      {/* יתרה נוכחית */}
                      <div className={`rounded-lg p-6 ${
                        storeCredit.balance > 0 
                          ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200" 
                          : "bg-gray-50 border-2 border-gray-200"
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm text-gray-600 mb-2 block">יתרה נוכחית</Label>
                            <p className={`text-4xl font-bold ${
                              storeCredit.balance > 0 
                                ? "text-blue-700" 
                                : "text-gray-500"
                            }`}>
                              ₪{storeCredit.balance.toFixed(2)}
                            </p>
                          </div>
                          <Coins className={`w-16 h-16 ${
                            storeCredit.balance > 0 
                              ? "text-blue-500" 
                              : "text-gray-400"
                          }`} />
                        </div>
                        {storeCredit.expiresAt && (
                          <p className="text-sm text-gray-600 mt-4">
                            <Calendar className="w-4 h-4 inline ml-1" />
                            תאריך תפוגה: {new Date(storeCredit.expiresAt).toLocaleDateString("he-IL")}
                          </p>
                        )}
                        {storeCredit.reason && (
                          <p className="text-sm text-gray-600 mt-2">
                            סיבה: {storeCredit.reason}
                          </p>
                        )}
                      </div>

                      {/* היסטוריית קרדיט */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">היסטוריית קרדיט</h3>
                        <div className="space-y-3">
                          {/* נציג החזרות שהקרדיט נוצר מהן */}
                          {returns
                            .filter((r: any) => r.refundMethod === "STORE_CREDIT" && (r.status === "APPROVED" || r.status === "COMPLETED"))
                            .map((returnItem: any) => (
                              <div
                                key={returnItem.id}
                                className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Coins className="w-4 h-4 text-green-600" />
                                      <span className="font-semibold text-green-700">
                                        קרדיט מהחזרה #{returnItem.id.slice(-6)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(returnItem.createdAt).toLocaleDateString("he-IL")}
                                      </div>
                                      {returnItem.refundAmount && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-green-700 font-semibold">
                                            +₪{returnItem.refundAmount.toFixed(2)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    {returnItem.order?.orderNumber && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        מהזמנה #{returnItem.order.orderNumber}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          
                          {returns.filter((r: any) => r.refundMethod === "STORE_CREDIT" && (r.status === "APPROVED" || r.status === "COMPLETED")).length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <Coins className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                              <p>אין היסטוריית קרדיט עדיין</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Coins className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600">אין קרדיט בחנות זמין</p>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressCity">עיר *</Label>
                <Autocomplete
                  id="addressCity"
                  value={addressForm.city}
                  onChange={(value) => {
                    setAddressForm((prev) => ({ ...prev, city: value }))
                    citySearch.setQuery(value)
                  }}
                  onSelect={(option) => {
                    setAddressForm((prev) => ({ ...prev, city: option.value }))
                    setSelectedCityForStreets(option.value)
                  }}
                  options={citySearch.cities.map((city) => ({
                    value: city.cityName,
                    label: city.cityName,
                  }))}
                  loading={citySearch.loading}
                  placeholder="התחל להקליד עיר..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressZip">מיקוד</Label>
                <Input
                  id="addressZip"
                  value={addressForm.zip}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, zip: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressStreet">רחוב *</Label>
              <Autocomplete
                id="addressStreet"
                value={addressForm.address}
                onChange={(value) => {
                  setAddressForm((prev) => ({ ...prev, address: value }))
                  streetSearch.setQuery(value)
                }}
                onSelect={(option) => {
                  setAddressForm((prev) => ({ ...prev, address: option.value }))
                }}
                options={streetSearch.streets.map((street) => ({
                  value: street.streetName,
                  label: street.streetName,
                }))}
                loading={streetSearch.loading}
                placeholder={addressForm.city ? "התחל להקליד רחוב..." : "בחר עיר תחילה..."}
                required
                disabled={!addressForm.city}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="houseNumber">מספר בית *</Label>
                <Input
                  id="houseNumber"
                  value={addressForm.houseNumber}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, houseNumber: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apartment">דירה</Label>
                <Input
                  id="apartment"
                  value={addressForm.apartment}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, apartment: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">קומה</Label>
                <Input
                  id="floor"
                  value={addressForm.floor}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, floor: e.target.value }))}
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

      {/* Create Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>צור החזרה חדשה</DialogTitle>
            <DialogDescription>
              בחר הזמנה ופריטים להחזרה
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* בחירת הזמנה */}
            {!selectedOrderForReturn ? (
              <div className="space-y-2">
                <Label>בחר הזמנה</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {orders
                    .filter(o => o.paymentStatus === "PAID")
                    .map((order) => {
                      // בדיקה אם יש החזרות מאושרות/הושלמות להזמנה הזו
                      const approvedReturns = returns.filter(
                        (r: any) => r.orderId === order.id && 
                        (r.status === "APPROVED" || r.status === "COMPLETED")
                      )
                      
                      // חישוב כמה כבר הוחזר מכל פריט
                      let allItemsFullyReturned = false
                      const orderItems = (order as any).items || []
                      
                      if (approvedReturns.length > 0) {
                        if (orderItems.length > 0) {
                          // יש items בהזמנה - נבדוק אם כל הפריטים הוחזרו במלואם
                          const returnedQuantities = new Map<string, number>()
                          for (const ret of approvedReturns) {
                            const retItems = (ret.items as Array<{ orderItemId: string; quantity: number }>) || []
                            for (const retItem of retItems) {
                              const currentQty = returnedQuantities.get(retItem.orderItemId) || 0
                              returnedQuantities.set(retItem.orderItemId, currentQty + retItem.quantity)
                            }
                          }
                          
                          // בדיקה אם כל הפריטים כבר הוחזרו במלואם
                          allItemsFullyReturned = orderItems.every((item: any) => {
                            const returnedQty = returnedQuantities.get(item.id) || 0
                            return returnedQty >= item.quantity
                          })
                        } else {
                          // אין items בהזמנה אבל יש החזרה מאושרת - נניח שהכל הוחזר
                          // (למקרה שההזמנה לא נטענה עם items)
                          allItemsFullyReturned = true
                        }
                      }
                      
                      return (
                        <div
                          key={order.id}
                          className={`border rounded-lg p-3 ${
                            allItemsFullyReturned 
                              ? "opacity-50 cursor-not-allowed bg-gray-100" 
                              : "cursor-pointer hover:bg-gray-50"
                          }`}
                          onClick={async () => {
                            if (allItemsFullyReturned) {
                              toast({
                                title: "לא ניתן להחזיר",
                                description: "כל הפריטים בהזמנה זו כבר הוחזרו במלואם",
                                variant: "destructive",
                              })
                              return
                            }
                            
                            setSelectedOrderForReturn(order)
                            // טעינת פרטי ההזמנה
                            try {
                              const token = localStorage.getItem(`storefront_token_${slug}`)
                              const response = await fetch(`/api/storefront/${slug}/orders/${order.id}`, {
                                headers: {
                                  "x-customer-id": token || "",
                                },
                              })
                              if (response.ok) {
                                const data = await response.json()
                                setOrderDetails(data)
                                // איפוס הטופס
                                setReturnForm({
                                  reason: "",
                                  notes: "",
                                  items: [],
                                })
                              }
                            } catch (error) {
                              console.error("Error fetching order details:", error)
                              toast({
                                title: "שגיאה",
                                description: "לא הצלחנו לטעון את פרטי ההזמנה",
                                variant: "destructive",
                              })
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">הזמנה #{order.orderNumber}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(order.createdAt).toLocaleDateString("he-IL")} - ₪{order.total.toFixed(2)}
                              </p>
                              {allItemsFullyReturned && (
                                <p className="text-xs text-red-600 mt-1">
                                  כל הפריטים בהזמנה זו כבר הוחזרו במלואם
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ) : (
              <>
                {/* פרטי ההזמנה */}
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">הזמנה #{selectedOrderForReturn.orderNumber}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedOrderForReturn.createdAt).toLocaleDateString("he-IL")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedOrderForReturn(null)
                        setOrderDetails(null)
                        setReturnForm({ reason: "", notes: "", items: [] })
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* בחירת פריטים */}
                {orderDetails && (() => {
                  // חישוב כמה כבר הוחזר מכל פריט (מהחזרות מאושרות/הושלמות)
                  const returnedQuantities = new Map<string, number>()
                  const approvedReturns = returns.filter(
                    (r: any) => r.orderId === selectedOrderForReturn.id && 
                    (r.status === "APPROVED" || r.status === "COMPLETED")
                  )
                  
                  for (const ret of approvedReturns) {
                    const retItems = (ret.items as Array<{ orderItemId: string; quantity: number }>) || []
                    for (const retItem of retItems) {
                      const currentQty = returnedQuantities.get(retItem.orderItemId) || 0
                      returnedQuantities.set(retItem.orderItemId, currentQty + retItem.quantity)
                    }
                  }

                  // בדיקה אילו פריטים יש להם החזרה ממתינה (PENDING)
                  const pendingReturns = returns.filter(
                    (r: any) => r.orderId === selectedOrderForReturn.id && 
                    r.status === "PENDING"
                  )
                  
                  const pendingItemIds = new Set<string>()
                  for (const ret of pendingReturns) {
                    const retItems = (ret.items as Array<{ orderItemId: string; quantity: number }>) || []
                    for (const retItem of retItems) {
                      pendingItemIds.add(retItem.orderItemId)
                    }
                  }

                  return (
                    <div className="space-y-2">
                      <Label>בחר פריטים להחזרה</Label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {orderDetails.items.map((item: any) => {
                          const selectedItem = returnForm.items.find(i => i.orderItemId === item.id)
                          const selectedQty = selectedItem?.quantity || 0
                          const alreadyReturnedQty = returnedQuantities.get(item.id) || 0
                          const availableQty = item.quantity - alreadyReturnedQty
                          const isFullyReturned = alreadyReturnedQty >= item.quantity
                          const hasPendingReturn = pendingItemIds.has(item.id)
                          const isDisabled = isFullyReturned || hasPendingReturn
                          
                          return (
                            <div 
                              key={item.id} 
                              className={`border rounded-lg p-3 ${
                                isDisabled ? "opacity-50 bg-gray-50" : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedQty > 0}
                                  disabled={isDisabled}
                                  onChange={(e) => {
                                    if (e.target.checked && !isDisabled) {
                                      setReturnForm(prev => ({
                                        ...prev,
                                        items: [...prev.items, { orderItemId: item.id, quantity: 1 }],
                                      }))
                                    } else {
                                      setReturnForm(prev => ({
                                        ...prev,
                                        items: prev.items.filter(i => i.orderItemId !== item.id),
                                      }))
                                    }
                                  }}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <p className="font-medium">{item.name}</p>
                                  {item.variant && (
                                    <p className="text-sm text-gray-600">{item.variant.name}</p>
                                  )}
                                  <p className="text-sm text-gray-600">
                                    כמות שהוזמנה: {item.quantity}
                                    {alreadyReturnedQty > 0 && (
                                      <span className="text-red-600"> (הוחזר: {alreadyReturnedQty})</span>
                                    )}
                                  </p>
                                  {hasPendingReturn && (
                                    <p className="text-xs text-orange-600 mt-1">
                                      יש בקשת החזרה ממתינה לפריט זה
                                    </p>
                                  )}
                                  {isFullyReturned && !hasPendingReturn && (
                                    <p className="text-xs text-red-600 mt-1">
                                      פריט זה כבר הוחזר במלואו
                                    </p>
                                  )}
                                  {selectedQty > 0 && !isDisabled && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <Label className="text-sm">כמות להחזרה:</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        max={availableQty}
                                        value={selectedQty}
                                        onChange={(e) => {
                                          const inputValue = e.target.value
                                          if (inputValue === "") {
                                            // אפשר למחוק את הערך
                                            setReturnForm(prev => ({
                                              ...prev,
                                              items: prev.items.filter(i => i.orderItemId !== item.id),
                                            }))
                                            return
                                          }
                                          const qty = parseInt(inputValue)
                                          if (!isNaN(qty) && qty > 0 && qty <= availableQty) {
                                            setReturnForm(prev => ({
                                              ...prev,
                                              items: prev.items.map(i =>
                                                i.orderItemId === item.id ? { ...i, quantity: qty } : i
                                              ),
                                            }))
                                          }
                                        }}
                                        className="w-20"
                                      />
                                      {availableQty < item.quantity && (
                                        <span className="text-xs text-gray-500">
                                          (זמין: {availableQty})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* סיבת ההחזרה */}
                <div className="space-y-2">
                  <Label htmlFor="returnReason">סיבת ההחזרה *</Label>
                  <select
                    id="returnReason"
                    value={returnForm.reason}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">בחר סיבה</option>
                    <option value="לא מתאים">לא מתאים</option>
                    <option value="פגם במוצר">פגם במוצר</option>
                    <option value="שינוי דעה">שינוי דעה</option>
                    <option value="נשלח מוצר שגוי">נשלח מוצר שגוי</option>
                    <option value="אחר">אחר</option>
                  </select>
                </div>

                {/* הערות */}
                <div className="space-y-2">
                  <Label htmlFor="returnNotes">הערות (אופציונלי)</Label>
                  <Textarea
                    id="returnNotes"
                    value={returnForm.notes}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReturnDialogOpen(false)
                setSelectedOrderForReturn(null)
                setOrderDetails(null)
                setReturnForm({ reason: "", notes: "", items: [] })
              }}
              disabled={creatingReturn}
            >
              ביטול
            </Button>
            {selectedOrderForReturn && (
              <Button
                onClick={async () => {
                  if (!returnForm.reason || returnForm.items.length === 0) {
                    toast({
                      title: "שגיאה",
                      description: "אנא בחר סיבת החזרה ולפחות פריט אחד",
                      variant: "destructive",
                    })
                    return
                  }

                  setCreatingReturn(true)
                  try {
                    const token = localStorage.getItem(`storefront_token_${slug}`)
                    const response = await fetch(`/api/storefront/${slug}/returns`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "x-customer-id": token || "",
                      },
                      body: JSON.stringify({
                        orderId: selectedOrderForReturn.id,
                        reason: returnForm.reason,
                        items: returnForm.items,
                        notes: returnForm.notes || undefined,
                      }),
                    })

                    if (response.ok) {
                      toast({
                        title: "הצלחה",
                        description: "החזרה נוצרה בהצלחה",
                      })
                      setReturnDialogOpen(false)
                      setSelectedOrderForReturn(null)
                      setOrderDetails(null)
                      setReturnForm({ reason: "", notes: "", items: [] })
                      // רענון רשימת החזרות
                      if (customer) {
                        fetchReturns(customer.id)
                      }
                    } else {
                      const error = await response.json()
                      toast({
                        title: "שגיאה",
                        description: error.error || "אירעה שגיאה ביצירת החזרה",
                        variant: "destructive",
                      })
                    }
                  } catch (error) {
                    console.error("Error creating return:", error)
                    toast({
                      title: "שגיאה",
                      description: "אירעה שגיאה ביצירת החזרה",
                      variant: "destructive",
                    })
                  } finally {
                    setCreatingReturn(false)
                  }
                }}
                disabled={creatingReturn || !returnForm.reason || returnForm.items.length === 0}
                className="prodify-gradient text-white"
              >
                {creatingReturn ? "יוצר..." : "צור החזרה"}
              </Button>
            )}
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

