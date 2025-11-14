"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Search, ArrowLeft, Package, Calendar } from "lucide-react"

interface Return {
  id: string
  orderId: string
  order: {
    id: string
    orderNumber: string
  }
  customerId: string
  customer: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
  status: "PENDING" | "APPROVED" | "REJECTED" | "PROCESSING" | "COMPLETED" | "CANCELLED"
  reason: string
  refundAmount: number | null
  refundMethod: string | null
  createdAt: string
}

export default function ReturnsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    if (selectedShop) {
      fetchReturns()
    }
  }, [selectedShop, statusFilter])

  const fetchReturns = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        shopId: selectedShop.id,
        ...(statusFilter !== "all" && { status: statusFilter }),
      })

      const response = await fetch(`/api/returns?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReturns(data)
      }
    } catch (error) {
      console.error("Error fetching returns:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את ההחזרות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      PENDING: { label: "ממתין", className: "bg-yellow-100 text-yellow-800" },
      APPROVED: { label: "אושר", className: "bg-blue-100 text-blue-800" },
      REJECTED: { label: "נדחה", className: "bg-red-100 text-red-800" },
      PROCESSING: { label: "בטיפול", className: "bg-purple-100 text-purple-800" },
      COMPLETED: { label: "הושלם", className: "bg-green-100 text-green-800" },
      CANCELLED: { label: "בוטל", className: "bg-gray-100 text-gray-800" },
    }
    const variant = variants[status] || variants.PENDING
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  const filteredReturns = returns.filter(
    (returnItem) =>
      returnItem.order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      returnItem.customer.email.toLowerCase().includes(search.toLowerCase())
  )

  if (!selectedShop) {
    return (
      <AppLayout title="החזרות">
        <div className="text-center py-12">
          <ArrowLeft className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">יש לבחור חנות מההדר לפני ניהול החזרות</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="החזרות">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">החזרות</h1>
            <p className="text-gray-600 mt-1">נהל את כל בקשת ההחזרות</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="חיפוש לפי מספר הזמנה או לקוח..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל ההחזרות</SelectItem>
                  <SelectItem value="PENDING">ממתין</SelectItem>
                  <SelectItem value="APPROVED">אושר</SelectItem>
                  <SelectItem value="REJECTED">נדחה</SelectItem>
                  <SelectItem value="PROCESSING">בטיפול</SelectItem>
                  <SelectItem value="COMPLETED">הושלם</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">טוען החזרות...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <ArrowLeft className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">אין החזרות</h3>
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
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        מספר הזמנה
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        לקוח
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        סיבה
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        סכום החזר
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        סטטוס
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        תאריך
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        פעולות
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredReturns.map((returnItem) => (
                      <tr key={returnItem.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <button
                            onClick={() => router.push(`/orders/${returnItem.orderId}`)}
                            className="text-purple-600 hover:underline"
                          >
                            #{returnItem.order.orderNumber}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div>
                              {returnItem.customer.firstName} {returnItem.customer.lastName}
                            </div>
                            <div className="text-gray-500">{returnItem.customer.email}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{returnItem.reason}</span>
                        </td>
                        <td className="p-4">
                          {returnItem.refundAmount ? (
                            <span className="text-sm font-medium">
                              ₪{returnItem.refundAmount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4">{getStatusBadge(returnItem.status)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(returnItem.createdAt).toLocaleDateString("he-IL")}
                          </div>
                        </td>
                        <td className="p-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/returns/${returnItem.id}`)}
                          >
                            צפה
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

