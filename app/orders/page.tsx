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
import { ShoppingBag, Search, Filter, MoreVertical, Eye, Package, Calendar, Trash2, RefreshCw, CreditCard, User, MapPin, Mail, Phone } from "lucide-react"
import { OrdersSkeleton } from "@/components/skeletons/OrdersSkeleton"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { MobileListView, MobileListItem } from "@/components/MobileListView"
import { MobileFilters, FilterConfig } from "@/components/MobileFilters"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<string>("")
  const [isDeleting, setIsDeleting] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  useEffect(() => {
    // טעינת הנתונים מיד
    fetchOrders()
  }, [page, statusFilter, paymentStatusFilter, search])

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
      if (paymentStatusFilter !== "all") {
        params.append("paymentStatus", paymentStatusFilter)
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
        method: 'PUT',
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: "ממתין", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
      CONFIRMED: { label: "מאושר", className: "bg-blue-50 text-blue-700 border-blue-200" },
      PROCESSING: { label: "מעובד", className: "bg-purple-50 text-purple-700 border-purple-200" },
      SHIPPED: { label: "נשלח", className: "bg-cyan-50 text-cyan-700 border-cyan-200" },
      DELIVERED: { label: "נמסר", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      CANCELLED: { label: "בוטל", className: "bg-red-50 text-red-700 border-red-200" },
      REFUNDED: { label: "הוחזר", className: "bg-gray-50 text-gray-700 border-gray-200" },
    }
    const statusInfo = statusMap[status] || { label: status, className: "bg-gray-50 text-gray-700 border-gray-200" }
    return (
      <Badge variant="outline" className={statusInfo.className}>
        {statusInfo.label}
      </Badge>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: "ממתין לתשלום", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
      PAID: { label: "שולם", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      FAILED: { label: "נכשל", className: "bg-red-50 text-red-700 border-red-200" },
      REFUNDED: { label: "הוחזר", className: "bg-gray-50 text-gray-700 border-gray-200" },
    }
    const statusInfo = statusMap[status] || { label: status, className: "bg-gray-50 text-gray-700 border-gray-200" }
    return (
      <Badge variant="outline" className={statusInfo.className}>
        {statusInfo.label}
      </Badge>
    )
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "blue" | "purple" | "cyan" => {
    const statusMap: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "blue" | "purple" | "cyan"> = {
      PENDING: "warning",
      CONFIRMED: "blue",
      PROCESSING: "purple",
      SHIPPED: "cyan",
      DELIVERED: "success",
      CANCELLED: "destructive",
      REFUNDED: "secondary",
    }
    return statusMap[status] || "default"
  }

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: "ממתין",
      CONFIRMED: "מאושר",
      PROCESSING: "מעובד",
      SHIPPED: "נשלח",
      DELIVERED: "נמסר",
      CANCELLED: "בוטל",
      REFUNDED: "הוחזר",
    }
    return statusMap[status] || status
  }

  // Convert orders to mobile list format
  const convertToMobileList = (): MobileListItem[] => {
    return orders.map((order) => {
      const metadata = [
        {
          label: "",
          value: format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: he }),
          icon: <Calendar className="w-3 h-3 text-gray-400" />,
        },
      ]

      // Add phone if available
      if (order.customerPhone) {
        metadata.push({
          label: "",
          value: order.customerPhone,
          icon: <Phone className="w-3 h-3 text-gray-400" />,
        })
      }

      return {
        id: order.id,
        title: `הזמנה #${order.orderNumber}`,
        subtitle: order.customerName,
        badge: {
          text: getStatusLabel(order.status),
          variant: getStatusVariant(order.status),
        },
        price: `₪${order.total.toFixed(2)}`,
        couponCode: order.couponCode,
        metadata,
        badges: [
          {
            text: getStatusLabel(order.paymentStatus),
            variant: order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FAILED" ? "destructive" : "warning",
          },
        ],
        actions: [
          {
            label: "צפה",
            icon: <Eye className="w-4 h-4" />,
            onClick: () => router.push(`/orders/${order.id}`),
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
          {
            label: "מחק",
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => handleDeleteOrder(order.id),
            variant: "destructive",
          },
        ],
      }
    })
  }

  // הצגת skeleton רק בזמן טעינה ראשונית
  if (loading) {
    return (
      <AppLayout title="הזמנות">
        <OrdersSkeleton />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="הזמנות">
      <div className={cn("space-y-0", isMobile && "pb-20")}>
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">הזמנות</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">נהל ועקוב אחר כל ההזמנות שלך</p>
          </div>
          {selectedOrders.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="w-full md:w-auto"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              מחק {selectedOrders.length} נבחרו
            </Button>
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
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="סטטוס הזמנה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל ההזמנות</SelectItem>
                    <SelectItem value="PENDING">ממתין</SelectItem>
                    <SelectItem value="CONFIRMED">מאושר</SelectItem>
                    <SelectItem value="PROCESSING">מעובד</SelectItem>
                    <SelectItem value="SHIPPED">נשלח</SelectItem>
                    <SelectItem value="DELIVERED">נמסר</SelectItem>
                    <SelectItem value="CANCELLED">בוטל</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="סטטוס תשלום" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל התשלומים</SelectItem>
                    <SelectItem value="PENDING">ממתין לתשלום</SelectItem>
                    <SelectItem value="PAID">שולם</SelectItem>
                    <SelectItem value="FAILED">נכשל</SelectItem>
                    <SelectItem value="REFUNDED">הוחזר</SelectItem>
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
                label: "סטטוס הזמנה",
                value: statusFilter,
                options: [
                  { value: "all", label: "הכל" },
                  { value: "PENDING", label: "ממתין" },
                  { value: "CONFIRMED", label: "מאושר" },
                  { value: "PROCESSING", label: "מעובד" },
                  { value: "SHIPPED", label: "נשלח" },
                  { value: "DELIVERED", label: "נמסר" },
                  { value: "CANCELLED", label: "בוטל" },
                ],
                onChange: setStatusFilter,
              },
              {
                label: "סטטוס תשלום",
                value: paymentStatusFilter,
                options: [
                  { value: "all", label: "הכל" },
                  { value: "PENDING", label: "ממתין" },
                  { value: "PAID", label: "שולם" },
                  { value: "FAILED", label: "נכשל" },
                  { value: "REFUNDED", label: "הוחזר" },
                ],
                onChange: setPaymentStatusFilter,
              },
            ]}
          />
          
          {/* Status Filter Pills */}
          <div className="pt-4 pb-4">
            <div className="flex gap-2 overflow-x-auto pl-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {/* All Filter */}
              <Badge
                variant="outline"
                className={cn(
                  "cursor-pointer whitespace-nowrap transition-all",
                  statusFilter === "all" && paymentStatusFilter === "all" ? "bg-gray-900 text-white border-gray-900" : "hover:bg-gray-50"
                )}
                onClick={() => {
                  setStatusFilter("all")
                  setPaymentStatusFilter("all")
                }}
              >
                הכל
              </Badge>

              {/* Order Status Section */}
              <div className="h-6 w-px bg-gray-300 mx-1" />
              <span className="text-xs text-gray-500 self-center whitespace-nowrap px-1">סטטוס הזמנה:</span>
              
              <Badge
                variant="warning"
                className="cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                onClick={() => setStatusFilter("PENDING")}
              >
                ממתין
              </Badge>
              <Badge
                variant="blue"
                className="cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                onClick={() => setStatusFilter("CONFIRMED")}
              >
                מאושר
              </Badge>
              <Badge
                variant="purple"
                className="cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                onClick={() => setStatusFilter("PROCESSING")}
              >
                מעובד
              </Badge>
              <Badge
                variant="cyan"
                className="cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                onClick={() => setStatusFilter("SHIPPED")}
              >
                נשלח
              </Badge>
              <Badge
                variant="success"
                className="cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                onClick={() => setStatusFilter("DELIVERED")}
              >
                נמסר
              </Badge>
              <Badge
                variant="destructive"
                className="cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                onClick={() => setStatusFilter("CANCELLED")}
              >
                בוטל
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                onClick={() => setStatusFilter("REFUNDED")}
              >
                הוחזר
              </Badge>

              {/* Payment Status Section */}
              <div className="h-6 w-px bg-gray-300 mx-1" />
              <span className="text-xs text-gray-500 self-center whitespace-nowrap px-1">סטטוס תשלום:</span>
              
              <Badge
                variant="warning"
                className="cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                onClick={() => setPaymentStatusFilter("PENDING")}
              >
                ממתין לתשלום
              </Badge>
              <Badge
                variant="success"
                className="cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                onClick={() => setPaymentStatusFilter("PAID")}
              >
                שולם
              </Badge>
              <Badge
                variant="destructive"
                className="cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                onClick={() => setPaymentStatusFilter("FAILED")}
              >
                נכשל
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                onClick={() => setPaymentStatusFilter("REFUNDED")}
              >
                הוחזר
              </Badge>
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
                          תשלום
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
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <Checkbox
                              checked={selectedOrders.includes(order.id)}
                              onCheckedChange={() => toggleSelectOrder(order.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">{order.orderNumber}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                              <div className="text-sm text-gray-500">{order.customerEmail}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: he })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getPaymentStatusBadge(order.paymentStatus)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-gray-900">
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
                                <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>
                                  <Eye className="w-4 h-4 ml-2" />
                                  צפה בהזמנה
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedOrderForStatus(order.id)
                                    setNewStatus(order.status)
                                    setIsStatusDialogOpen(true)
                                  }}
                                >
                                  <RefreshCw className="w-4 h-4 ml-2" />
                                  החלף סטטוס
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 ml-2" />
                                  מחיקה
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
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
                onItemClick={(item) => router.push(`/orders/${item.id}`)}
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
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="בחר סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">ממתין</SelectItem>
                <SelectItem value="CONFIRMED">מאושר</SelectItem>
                <SelectItem value="PROCESSING">מעובד</SelectItem>
                <SelectItem value="SHIPPED">נשלח</SelectItem>
                <SelectItem value="DELIVERED">נמסר</SelectItem>
                <SelectItem value="CANCELLED">בוטל</SelectItem>
                <SelectItem value="REFUNDED">הוחזר</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleStatusChange} className="prodify-gradient text-white">
              עדכן סטטוס
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

