"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ShoppingBag, Search, Filter, MoreVertical, Eye, Package, Calendar } from "lucide-react"
import { OrdersSkeleton } from "@/components/skeletons/OrdersSkeleton"
import { format } from "date-fns"
import { he } from "date-fns/locale"

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  fulfillmentStatus: string
  customerName: string
  customerEmail: string
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

  useEffect(() => {
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: "ממתין", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      CONFIRMED: { label: "מאושר", className: "bg-blue-100 text-blue-800 border-blue-300" },
      PROCESSING: { label: "מעובד", className: "bg-purple-100 text-purple-800 border-purple-300" },
      SHIPPED: { label: "נשלח", className: "bg-cyan-100 text-cyan-800 border-cyan-300" },
      DELIVERED: { label: "נמסר", className: "bg-green-100 text-green-800 border-green-300" },
      CANCELLED: { label: "בוטל", className: "bg-red-100 text-red-800 border-red-300" },
      REFUNDED: { label: "הוחזר", className: "bg-gray-100 text-gray-800 border-gray-300" },
    }
    const statusInfo = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" }
    return (
      <Badge variant="outline" className={statusInfo.className}>
        {statusInfo.label}
      </Badge>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: "ממתין לתשלום", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      PAID: { label: "שולם", className: "bg-green-100 text-green-800 border-green-300" },
      FAILED: { label: "נכשל", className: "bg-red-100 text-red-800 border-red-300" },
      REFUNDED: { label: "הוחזר", className: "bg-gray-100 text-gray-800 border-gray-300" },
    }
    const statusInfo = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" }
    return (
      <Badge variant="outline" className={statusInfo.className}>
        {statusInfo.label}
      </Badge>
    )
  }

  return (
    <AppLayout title="הזמנות">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">הזמנות</h1>
            <p className="text-gray-600 mt-1">נהל ועקוב אחר כל ההזמנות שלך</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
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

        {/* Orders Table */}
        {loading ? (
          <OrdersSkeleton />
        ) : orders.length === 0 ? (
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
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/orders/${order.id}`)}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <Eye className="w-4 h-4 ml-1" />
                            צפה
                          </Button>
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
        )}
      </div>
    </AppLayout>
  )
}

