"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ShoppingBag, Search, MoreVertical, Eye, Package, Calendar, Trash2, RefreshCw, Plus, Printer, CheckCircle, Truck, FileCheck } from "lucide-react"
import { OrdersSkeleton } from "@/components/skeletons/OrdersSkeleton"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { MobileListView, MobileListItem } from "@/components/MobileListView"
import { MobileFilters } from "@/components/MobileFilters"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import { ManualOrderDialog } from "@/components/ManualOrderDialog"

interface OrderStatusDefinition {
  id: string
  key: string
  label: string
  labelEn: string | null
  color: string
  icon: string | null
  isActive: boolean
}

interface Order {
  id: string
  orderNumber: string
  status: string
  fulfillmentStatus: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  couponCode?: string | null
  total: number
  createdAt: string
  shop: {
    id: string
    name: string
  }
  _count: {
    items: number
  }
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [statuses, setStatuses] = useState<OrderStatusDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<string>("")
  const [isDeleting, setIsDeleting] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [isManualOrderDialogOpen, setIsManualOrderDialogOpen] = useState(false)
  const [hasShippingIntegration, setHasShippingIntegration] = useState(false)
  const [readOrders, setReadOrders] = useState<Set<string>>(new Set())

  // טעינת הזמנות נקראות מ-localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('readOrders')
      if (stored) {
        try {
          const readOrdersArray = JSON.parse(stored)
          setReadOrders(new Set(readOrdersArray))
        } catch (error) {
          console.error('Error parsing readOrders from localStorage:', error)
        }
      }
    }
  }, [])

  useEffect(() => {
    fetchStatuses()
    checkShippingIntegrations()
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [page, statusFilter, search])

  const fetchStatuses = async () => {
    try {
      const response = await fetch("/api/order-statuses")
      if (response.ok) {
        const data = await response.json()
        setStatuses(data.filter((s: OrderStatusDefinition) => s.isActive))
      }
    } catch (error) {
      console.error("Error fetching statuses:", error)
    }
  }

  const checkShippingIntegrations = async () => {
    try {
      const response = await fetch("/api/integrations")
      if (response.ok) {
        const integrations = await response.json()
        // בדיקה אם יש אינטגרציה פעילה של משלוחים
        const hasShipping = integrations.some((i: any) => 
          i.type.includes("SHIPPING") && i.isActive
        )
        setHasShippingIntegration(hasShipping)
      }
    } catch (error) {
      console.error("Error checking shipping integrations:", error)
    }
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      })

      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (search) {
        params.append("search", search)
      }

      const response = await fetch(`/api/orders?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchOrders()
  }

  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(orders.map(o => o.id))
    }
  }

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleBulkDelete = async () => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedOrders.length} הזמנות?`)) {
      return
    }

    setIsDeleting(true)
    try {
      for (const orderId of selectedOrders) {
        await fetch(`/api/orders/${orderId}`, {
          method: 'DELETE',
        })
      }
      setSelectedOrders([])
      fetchOrders()
    } catch (error) {
      console.error('Error deleting orders:', error)
      alert('שגיאה במחיקת ההזמנות')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק הזמנה זו?')) {
      return
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchOrders()
      } else {
        alert('שגיאה במחיקת ההזמנה')
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      alert('שגיאה במחיקת ההזמנה')
    }
  }

  const handleStatusChange = async () => {
    if (!selectedOrderForStatus || !newStatus) return

    try {
      const response = await fetch(`/api/orders/${selectedOrderForStatus}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setIsStatusDialogOpen(false)
        setSelectedOrderForStatus(null)
        setNewStatus("")
        fetchOrders()
      } else {
        alert('שגיאה בעדכון הסטטוס')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('שגיאה בעדכון הסטטוס')
    }
  }

  const handlePrintOrder = async (orderNumber: string) => {
    try {
      // פתיחת דף ההזמנה בחלון חדש לצורך הדפסה - לפי מספר הזמנה
      window.open(`/orders/${orderNumber}?print=true`, '_blank')
    } catch (error) {
      console.error('Error printing order:', error)
      alert('שגיאה בהדפסת ההזמנה')
    }
  }

  const handlePrintMultipleOrders = async () => {
    if (selectedOrders.length === 0) {
      alert('אנא בחר לפחות הזמנה אחת להדפסה')
      return
    }

    try {
      // מציאת מספרי ההזמנות לפי ה-IDs הנבחרים
      const orderNumbers = orders
        .filter(order => selectedOrders.includes(order.id))
        .map(order => order.orderNumber)
        .join(',')

      // פתיחת דף הדפסה מרובה בחלון חדש
      window.open(`/orders/print-multiple?orders=${orderNumbers}`, '_blank')
    } catch (error) {
      console.error('Error printing multiple orders:', error)
      alert('שגיאה בהדפסת ההזמנות')
    }
  }

  const handleMarkAsRead = (orderId: string) => {
    try {
      // עדכון state
      const newReadOrders = new Set(readOrders)
      newReadOrders.add(orderId)
      setReadOrders(newReadOrders)

      // שמירה ב-localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('readOrders', JSON.stringify(Array.from(newReadOrders)))
      }
    } catch (error) {
      console.error('Error marking order as read:', error)
    }
  }

  const handleMarkAsUnread = (orderId: string) => {
    try {
      // עדכון state - הסרת ההזמנה מהרשימה
      const newReadOrders = new Set(readOrders)
      newReadOrders.delete(orderId)
      setReadOrders(newReadOrders)

      // שמירה ב-localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('readOrders', JSON.stringify(Array.from(newReadOrders)))
      }
    } catch (error) {
      console.error('Error marking order as unread:', error)
    }
  }

  const toggleReadStatus = (orderId: string) => {
    if (isOrderRead(orderId)) {
      handleMarkAsUnread(orderId)
    } else {
      handleMarkAsRead(orderId)
    }
  }

  const isOrderRead = (orderId: string) => {
    return readOrders.has(orderId)
  }

  const handleShippingTracking = async (orderId: string) => {
    try {
      const response = await fetch(`/api/shipping/tracking/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        // הצגת מידע על המעקב
        alert(`סטטוס משלוח: ${data.status || 'לא זמין'}\n${data.statusMessage || ''}`)
      } else {
        alert('שגיאה בקבלת מידע על המשלוח')
      }
    } catch (error) {
      console.error('Error fetching tracking:', error)
      alert('שגיאה בקבלת מידע על המשלוח')
    }
  }

  const handleCreateShipment = async (orderId: string) => {
    if (!confirm('האם ליצור משלוח להזמנה זו?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/shipping/send/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // שולח body ריק, ה-API ימצא את חברת המשלוחים המוטמעת
      })

      if (response.ok) {
        const data = await response.json()
        alert('המשלוח נוצר בהצלחה')
        fetchOrders()
      } else {
        let errorMessage = 'שגיאה לא ידועה'
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } catch (e) {
          errorMessage = `שגיאה ${response.status}: ${response.statusText}`
        }
        alert(`שגיאה ביצירת המשלוח: ${errorMessage}`)
      }
    } catch (error: any) {
      console.error('Error creating shipment:', error)
      alert(`שגיאה ביצירת המשלוח: ${error.message || 'שגיאה לא ידועה'}`)
    }
  }

  const getStatusInfo = (statusKey: string) => {
    const status = statuses.find(s => s.key === statusKey)
    if (status) {
      return {
        label: status.label,
        color: status.color,
      }
    }
    // Fallback לסטטוסים ישנים שעדיין לא עודכנו - תרגום לעברית
    const statusTranslations: Record<string, string> = {
      PENDING: "ממתין",
      CONFIRMED: "מאושר",
      PAID: "שולם",
      PROCESSING: "מעובד",
      SHIPPED: "נשלח",
      DELIVERED: "נמסר",
      CANCELLED: "בוטל",
      REFUNDED: "הוחזר",
    }
    return {
      label: statusTranslations[statusKey.toUpperCase()] || statusKey,
      color: "#6B7280",
    }
  }

  const getStatusBadge = (statusKey: string) => {
    const statusInfo = getStatusInfo(statusKey)
    // שימוש בצבעים מה-statuses - אם זה צהוב (PENDING) נשתמש בצהוב בוהק יותר
    const isPending = statusKey.toUpperCase() === 'PENDING' || statusInfo.label.includes('ממתין')
    
    // בדיקה אם הצבע הוא צהוב לפי hex code
    const colorHex = statusInfo.color.replace('#', '').toLowerCase()
    const isYellowColor = colorHex.startsWith('ff') || 
                         colorHex.startsWith('fbb') ||
                         colorHex.startsWith('fef') ||
                         colorHex.startsWith('fcd') ||
                         colorHex.includes('yellow')
    
    let backgroundColor = statusInfo.color + "15"
    let borderColor = statusInfo.color + "30"
    
    // אם זה סטטוס ממתין עם צבע צהוב - נשתמש בצהוב בוהק יותר (כמו שופיפיי)
    if (isPending && isYellowColor) {
      backgroundColor = "#FEF3C7" // צהוב בוהק כמו שופיפיי אבל טיפה פחות בוהק
      borderColor = "#FCD34D" // border צהוב בוהק יותר
    }
    
    return (
      <Badge 
        variant="outline" 
        className="text-xs font-normal px-2 py-0.5"
        style={{ 
          backgroundColor,
          color: "#374151",
          borderColor,
          borderWidth: "1px"
        }}
      >
        {statusInfo.label}
      </Badge>
    )
  }

  // Convert orders to mobile list format
  const convertToMobileList = (): MobileListItem[] => {
    return orders.map((order) => {
      const statusInfo = getStatusInfo(order.status)
      const isRead = isOrderRead(order.id)
      const metadata = [
        {
          label: "",
          value: format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: he }),
          icon: <Calendar className="w-3 h-3 text-gray-400" />,
        },
      ]

      if (order.customerPhone) {
        metadata.push({
          label: "",
          value: order.customerPhone,
          icon: <Package className="w-3 h-3 text-gray-400" />,
        })
      }

      const actions = [
        {
          label: "צפה",
          icon: <Eye className="w-4 h-4" />,
          onClick: () => {
            handleMarkAsRead(order.id)
            router.push(`/orders/${order.orderNumber}`)
          },
        },
        {
          label: "הדפס",
          icon: <Printer className="w-4 h-4" />,
          onClick: () => handlePrintOrder(order.orderNumber),
        },
        {
        },
        {
          label: isRead ? "סמן כלא נקרא" : "סמן כנקרא",
          icon: isRead ? <Eye className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />,
          onClick: () => toggleReadStatus(order.id),
        },
        {
          label: "סטטוס",
          icon: <RefreshCw className="w-4 h-4" />,
          onClick: () => {
            setSelectedOrderForStatus(order.id)
            setNewStatus(order.status)
            setIsStatusDialogOpen(true)
          },
        },
      ]

      // הוספת פעולות משלוח אם יש אינטגרציה
      if (hasShippingIntegration) {
        actions.push(
          {
            label: "שלח להפצה",
            icon: <Truck className="w-4 h-4" />,
            onClick: () => handleCreateShipment(order.orderNumber),
          },
          {
            label: "בדוק משלוח",
            icon: <FileCheck className="w-4 h-4" />,
            onClick: () => handleShippingTracking(order.orderNumber),
          }
        )
      }

      actions.push({
        label: "מחק",
        icon: <Trash2 className="w-4 h-4" />,
        onClick: () => handleDeleteOrder(order.orderNumber),
        variant: "destructive",
      })

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        title: `הזמנה #${order.orderNumber}`,
        subtitle: order.customerName,
        badge: {
          text: statusInfo.label,
          variant: "default",
        },
        price: `₪${order.total.toFixed(2)}`,
        couponCode: order.couponCode,
        metadata,
        badges: [],
        actions,
        className: isRead ? 'bg-gray-50 opacity-75' : 'bg-gray-100',
      }
    })
  }

  if (loading && orders.length === 0) {
    return (
      <AppLayout title="הזמנות">
        <OrdersSkeleton />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="הזמנות">
      <div className={cn("space-y-4", isMobile && "pb-20")}>
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">הזמנות</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">נהל ועקוב אחר כל ההזמנות שלך</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsManualOrderDialogOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              יצירת הזמנה ידנית
            </Button>
          </div>
          {selectedOrders.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={handlePrintMultipleOrders}
                className="w-full md:w-auto"
              >
                <Printer className="w-4 h-4 ml-2" />
                הדפס {selectedOrders.length} נבחרו
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="w-full md:w-auto"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחק {selectedOrders.length} נבחרו
              </Button>
            </div>
          )}
        </div>

        {/* Filters - Desktop */}
        <Card className="hidden md:block">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="חפש לפי מספר הזמנה, שם לקוח או אימייל..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Button type="submit" className="prodify-gradient text-white">
                  חפש
                </Button>
              </form>

              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="כל הסטטוסים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.key}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters - Mobile */}
        <div className="md:hidden">
          <MobileFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="חפש הזמנה..."
            isSearching={loading}
            filters={[
              {
                label: "סטטוס",
                value: statusFilter,
                options: [
                  { value: "all", label: "הכל" },
                  ...statuses.map((status) => ({
                    value: status.key,
                    label: status.label,
                  })),
                ],
                onChange: setStatusFilter,
              },
            ]}
          />
          
          {/* Status Filter Pills */}
          <div className="pt-4 pb-4">
            <div className="flex gap-2 overflow-x-auto pl-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <Badge
                variant="outline"
                className={cn(
                  "cursor-pointer whitespace-nowrap transition-all",
                  statusFilter === "all" ? "bg-gray-900 text-white border-gray-900" : "hover:bg-gray-50"
                )}
                onClick={() => setStatusFilter("all")}
              >
                הכל
              </Badge>

              <div className="h-6 w-px bg-gray-300 mx-1" />
              
              {statuses.map((status) => (
                <Badge
                  key={status.id}
                  variant="outline"
                  className="cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                  style={{
                    backgroundColor: statusFilter === status.key ? status.color : status.color + "20",
                    color: statusFilter === status.key ? "#fff" : status.color,
                    borderColor: status.color,
                  }}
                  onClick={() => setStatusFilter(status.key)}
                >
                  {status.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Orders - Desktop Table View */}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2 prodify-gradient-text">אין הזמנות</h3>
                <p className="text-gray-600 mb-4">עדיין לא התקבלו הזמנות בחנות שלך</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-right">
                          <Checkbox
                            checked={selectedOrders.length === orders.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          מספר הזמנה
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          לקוח
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          תאריך
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          סטטוס
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          סכום
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          פעולות
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => {
                        const isRead = isOrderRead(order.id)
                        return (
                        <tr key={order.id} className={`hover:bg-gray-200 transition-colors ${isRead ? 'bg-gray-50/50 border-r-4 border-r-gray-300' : 'bg-gray-100 border-r-4 border-r-blue-500'}`}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedOrders.includes(order.id)}
                                onCheckedChange={() => toggleSelectOrder(order.id)}
                              />
                              {isRead && (
                                <CheckCircle className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {!isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              )}
                              <Package className={`w-4 h-4 ${isRead ? 'text-gray-400' : 'text-gray-600'}`} />
                              <span className={`font-medium ${isRead ? 'text-gray-500' : 'text-gray-900 font-semibold'}`}>{order.orderNumber}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className={`text-sm font-medium ${isRead ? 'text-gray-500' : 'text-gray-900'}`}>{order.customerName}</div>
                              <div className={`text-sm ${isRead ? 'text-gray-400' : 'text-gray-500'}`}>{order.customerEmail}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`flex items-center gap-2 text-sm ${isRead ? 'text-gray-400' : 'text-gray-600'}`}>
                              <Calendar className="w-4 h-4" />
                              {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: he })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-semibold ${isRead ? 'text-gray-500' : 'text-gray-900'}`}>
                              ₪{order.total.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <DropdownMenu dir="rtl">
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  handleMarkAsRead(order.id)
                                  router.push(`/orders/${order.orderNumber}`)
                                }} className="cursor-pointer">
                                  <Eye className="w-4 h-4 ml-2" />
                                  צפה בהזמנה
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrintOrder(order.orderNumber)} className="cursor-pointer">
                                  <Printer className="w-4 h-4 ml-2" />
                                  הדפס הזמנה
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleReadStatus(order.id)} className="cursor-pointer">
                                  {isRead ? (
                                    <>
                                      <Eye className="w-4 h-4 ml-2" />
                                      סמן כלא נקרא
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 ml-2" />
                                      סמן כנקרא
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedOrderForStatus(order.id)
                                    setNewStatus(order.status)
                                    setIsStatusDialogOpen(true)
                                  }}
                                  className="cursor-pointer"
                                >
                                  <RefreshCw className="w-4 h-4 ml-2" />
                                  החלף סטטוס
                                </DropdownMenuItem>
                                {hasShippingIntegration && (
                                  <>
                                    <div className="h-px bg-gray-200 my-1" />
                                    <DropdownMenuItem onClick={() => handleCreateShipment(order.orderNumber)} className="cursor-pointer">
                                      <Truck className="w-4 h-4 ml-2" />
                                      שלח להפצה
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleShippingTracking(order.orderNumber)} className="cursor-pointer">
                                      <FileCheck className="w-4 h-4 ml-2" />
                                      בדוק סטטוס משלוח
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <div className="h-px bg-gray-200 my-1" />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteOrder(order.orderNumber)}
                                  className="text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 ml-2" />
                                  מחיקה
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {!loading && orders.length > 0 && totalPages > 1 && (
                  <div className="px-6 py-4 border-t flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      עמוד {page} מתוך {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        קודם
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        הבא
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mobile List View */}
            <div className="md:hidden">
              <MobileListView
                items={convertToMobileList()}
                onItemClick={(item) => router.push(`/orders/${item.orderNumber}`)}
                selectedItems={new Set(selectedOrders)}
                onSelectionChange={setSelectedOrders}
                showCheckbox={true}
                settingsType="orders"
                emptyState={
                  <div className="text-center py-12">
                    <ShoppingBag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">אין הזמנות</h3>
                    <p className="text-gray-600">עדיין לא התקבלו הזמנות בחנות שלך</p>
                  </div>
                }
              />
              
              {/* Mobile Pagination */}
              {!loading && orders.length > 0 && totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between px-4">
                  <div className="text-sm text-gray-600">
                    עמוד {page}/{totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      קודם
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      הבא
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Status Change Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>החלף סטטוס הזמנה</DialogTitle>
            <DialogDescription>
              בחר סטטוס חדש להזמנה
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {statuses.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                טוען סטטוסים...
              </div>
            ) : (
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.key}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleStatusChange} className="prodify-gradient text-white">
              עדכן סטטוס
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Order Dialog */}
      <ManualOrderDialog
        open={isManualOrderDialogOpen}
        onOpenChange={setIsManualOrderDialogOpen}
        onSuccess={() => {
          fetchOrders()
        }}
      />
    </AppLayout>
  )
}
