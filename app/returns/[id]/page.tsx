"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  ArrowLeft,
  Package,
  User,
  Calendar,
  DollarSign,
  FileText,
  Save,
} from "lucide-react"
import Link from "next/link"

interface Return {
  id: string
  orderId: string
  order: {
    id: string
    orderNumber: string
    total?: number
    transactionId?: string | null
    items?: Array<{
      id: string
      name: string
      product?: {
        id: string
        name: string
        images: string[]
      }
      variant?: {
        id: string
        name: string
      }
    }>
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
  items: Array<{
    orderItemId: string
    quantity: number
    reason: string
  }>
  refundAmount: number | null
  refundMethod: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export default function ReturnDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const returnId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [returnItem, setReturnItem] = useState<Return | null>(null)
  
  const [formData, setFormData] = useState({
    status: "PENDING" as Return["status"],
    refundAmount: "",
    refundMethod: "",
    notes: "",
  })

  useEffect(() => {
    if (returnId) {
      fetchReturn()
    }
  }, [returnId])

  const fetchReturn = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/returns/${returnId}`)
      if (response.ok) {
        const data = await response.json()
        setReturnItem(data)
        
        // ברירת מחדל: אם אין סכום החזר, נציב את מחיר ההזמנה
        const defaultRefundAmount = data.refundAmount || (data.order?.total || 0)
        
        setFormData({
          status: data.status,
          refundAmount: defaultRefundAmount.toString(),
          refundMethod: data.refundMethod || "",
          notes: data.notes || "",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את ההחזרה",
          variant: "destructive",
        })
        router.push("/returns")
      }
    } catch (error) {
      console.error("Error fetching return:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת ההחזרה",
        variant: "destructive",
      })
      router.push("/returns")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!returnItem) return

    setSaving(true)
    try {
      const payload: any = {
        status: formData.status,
        refundAmount: formData.refundAmount ? parseFloat(formData.refundAmount) : undefined,
        refundMethod: formData.refundMethod || undefined,
        notes: formData.notes || undefined,
      }

      const response = await fetch(`/api/returns/${returnId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "ההחזרה עודכנה בהצלחה",
        })
        fetchReturn()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בעדכון ההחזרה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating return:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון ההחזרה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      PENDING: { label: "ממתין", className: "bg-yellow-100 text-yellow-800" },
      APPROVED: { label: "אושר", className: "bg-blue-100 text-blue-800" },
      REJECTED: { label: "נדחה", className: "bg-red-100 text-red-800" },
      PROCESSING: { label: "בטיפול", className: "bg-emerald-100 text-emerald-800" },
      COMPLETED: { label: "הושלם", className: "bg-green-100 text-green-800" },
      CANCELLED: { label: "בוטל", className: "bg-gray-100 text-gray-800" },
    }
    const variant = variants[status] || variants.PENDING
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  if (loading) {
    return (
      <AppLayout title="פרטי החזר">
        <FormSkeleton />
      </AppLayout>
    )
  }

  if (!returnItem) {
    return null
  }

  return (
    <AppLayout title={`החזרה #${returnItem.id.slice(-6)}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/returns")}
              >
                <ArrowLeft className="w-4 h-4 ml-2" />
                חזרה לרשימה
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              החזרה #{returnItem.id.slice(-6)}
            </h1>
            <p className="text-gray-600 mt-1">פרטי בקשת ההחזרה</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/returns")}
              disabled={saving}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="prodify-gradient text-white"
            >
              <Save className="w-4 h-4 ml-2" />
              {saving ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  פרטי הזמנה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">מספר הזמנה</span>
                  <Link
                    href={`/orders/${returnItem.order.orderNumber}`}
                    className="text-emerald-600 hover:underline font-medium"
                  >
                    #{returnItem.order.orderNumber}
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">תאריך יצירה</span>
                  <span className="text-sm">
                    {new Date(returnItem.createdAt).toLocaleDateString("he-IL")}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  פרטי לקוח
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm text-gray-600">שם</span>
                  <p className="font-medium">
                    {returnItem.customer.firstName} {returnItem.customer.lastName}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">אימייל</span>
                  <p className="font-medium">{returnItem.customer.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Return Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  פרטי החזרה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>סיבה</Label>
                  <p className="mt-1">{returnItem.reason}</p>
                </div>
                <div>
                  <Label>פריטים להחזרה</Label>
                  <div className="mt-2 space-y-2">
                    {Array.isArray(returnItem.items) && returnItem.items.length > 0 ? (
                      returnItem.items.map((item: any, index: number) => {
                        // מציאת הפריט בהזמנה לפי orderItemId
                        const orderItem = returnItem.order?.items?.find(
                          (oi: any) => oi.id === item.orderItemId
                        )
                        
                        return (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start gap-3">
                              {orderItem?.product?.images?.[0] && (
                                <img
                                  src={orderItem.product.images[0]}
                                  alt={orderItem.product.name || "מוצר"}
                                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {orderItem?.product?.name || "מוצר לא נמצא"}
                                </p>
                                {orderItem?.variant && (
                                  <p className="text-sm text-gray-600 mt-0.5">
                                    {orderItem.variant.name}
                                  </p>
                                )}
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-gray-700">
                                    <span className="font-medium">כמות:</span> {item.quantity}
                                  </p>
                                  {item.reason && (
                                    <p className="text-sm text-gray-700">
                                      <span className="font-medium">סיבה:</span> {item.reason}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-gray-500">אין פרטי פריטים</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>סטטוס</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>סטטוס נוכחי</Label>
                  <div>{getStatusBadge(returnItem.status)}</div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">עדכן סטטוס</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">ממתין</SelectItem>
                      <SelectItem value="APPROVED">אושר</SelectItem>
                      <SelectItem value="REJECTED">נדחה</SelectItem>
                      <SelectItem value="PROCESSING">בטיפול</SelectItem>
                      <SelectItem value="COMPLETED">הושלם</SelectItem>
                      <SelectItem value="CANCELLED">בוטל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Refund */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  החזר כספי
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="refundAmount">סכום החזר</Label>
                  <Input
                    id="refundAmount"
                    type="number"
                    step="0.01"
                    value={formData.refundAmount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, refundAmount: e.target.value }))}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500">
                    ברירת מחדל: ₪{returnItem.order?.total?.toFixed(2) || "0.00"} (מחיר ההזמנה)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refundMethod">שיטת החזר</Label>
                  <Select
                    value={formData.refundMethod}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, refundMethod: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר שיטה" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ORIGINAL_PAYMENT">שיטת תשלום מקורית</SelectItem>
                      <SelectItem value="STORE_CREDIT">קרדיט בחנות</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {formData.refundMethod === "ORIGINAL_PAYMENT" && returnItem.order?.transactionId
                      ? "הזיכוי יבוצע אוטומטית דרך PayPlus (אם מוגדר)"
                      : formData.refundMethod === "STORE_CREDIT"
                      ? "הזיכוי יועבר לקרדיט בחנות"
                      : ""}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>הערות</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="הערות פנימיות..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

