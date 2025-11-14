"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  ArrowRight,
  Package,
  User,
  MapPin,
  CreditCard,
  Truck,
  Mail,
  Phone,
  Calendar,
  Save,
  X,
} from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"

interface OrderItem {
  id: string
  name: string
  sku: string | null
  quantity: number
  price: number
  total: number
  product: {
    id: string
    name: string
    images: string[]
  } | null
  variant: {
    id: string
    name: string
  } | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  fulfillmentStatus: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  shippingAddress: any
  billingAddress: any | null
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  paymentMethod: string | null
  transactionId: string | null
  paidAt: string | null
  shippingMethod: string | null
  trackingNumber: string | null
  shippedAt: string | null
  deliveredAt: string | null
  notes: string | null
  couponCode: string | null
  customFields: any | null
  createdAt: string
  updatedAt: string
  shop: {
    id: string
    name: string
    settings: any | null
  }
  customer: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    phone: string | null
  } | null
  items: OrderItem[]
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  
  // Form state
  const [status, setStatus] = useState("")
  const [paymentStatus, setPaymentStatus] = useState("")
  const [fulfillmentStatus, setFulfillmentStatus] = useState("")
  const [shippingMethod, setShippingMethod] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (params.id) {
      fetchOrder()
    }
  }, [params.id])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
        setStatus(data.status)
        setPaymentStatus(data.paymentStatus)
        setFulfillmentStatus(data.fulfillmentStatus)
        setShippingMethod(data.shippingMethod || "")
        setTrackingNumber(data.trackingNumber || "")
        setNotes(data.notes || "")
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את פרטי ההזמנה",
          variant: "destructive",
        })
        router.push("/orders")
      }
    } catch (error) {
      console.error("Error fetching order:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת ההזמנה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/orders/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          paymentStatus,
          fulfillmentStatus,
          shippingMethod: shippingMethod || undefined,
          trackingNumber: trackingNumber || undefined,
          notes: notes || undefined,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "ההזמנה עודכנה בהצלחה",
        })
        setEditing(false)
        fetchOrder()
      } else {
        const data = await response.json()
        toast({
          title: "שגיאה",
          description: data.error || "לא ניתן לעדכן את ההזמנה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating order:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון ההזמנה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
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

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </AppLayout>
    )
  }

  if (!order) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">הזמנה לא נמצאה</h3>
          <Button onClick={() => router.push("/orders")}>חזור לרשימת הזמנות</Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/orders")}
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              חזור
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">הזמנה #{order.orderNumber}</h1>
              <p className="text-gray-600 mt-1">
                {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: he })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(order.status)}
            {getPaymentStatusBadge(order.paymentStatus)}
            {!editing ? (
              <Button onClick={() => setEditing(true)} className="prodify-gradient text-white">
                ערוך
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false)
                    fetchOrder()
                  }}
                >
                  <X className="w-4 h-4 ml-1" />
                  ביטול
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="prodify-gradient text-white"
                >
                  <Save className="w-4 h-4 ml-1" />
                  שמור
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>פריטים בהזמנה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      {item.product?.images?.[0] && (
                        <img
                          src={item.product.images[0]}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        {item.variant && (
                          <p className="text-sm text-gray-500">{item.variant.name}</p>
                        )}
                        {item.sku && (
                          <p className="text-xs text-gray-400">SKU: {item.sku}</p>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-gray-600">כמות: {item.quantity}</p>
                        <p className="font-semibold text-gray-900">₪{item.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>סיכום הזמנה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">סכום ביניים</span>
                    <span className="font-medium">₪{order.subtotal.toFixed(2)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>הנחה</span>
                      <span>-₪{order.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">משלוח</span>
                    <span className="font-medium">₪{order.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">מע"מ</span>
                    <span className="font-medium">₪{order.tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="text-lg font-bold">סה"כ</span>
                    <span className="text-lg font-bold">₪{order.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Customer & Shipping Info */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  פרטי לקוח
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">שם</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">אימייל</p>
                  <p className="font-medium">{order.customerEmail}</p>
                </div>
                {order.customerPhone && (
                  <div>
                    <p className="text-sm text-gray-600">טלפון</p>
                    <p className="font-medium">{order.customerPhone}</p>
                  </div>
                )}
                {order.customer && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push(`/customers/${order.customer!.id}`)}
                  >
                    צפה בפרופיל לקוח
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  כתובת משלוח
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.shippingAddress && typeof order.shippingAddress === 'object' ? (
                  <div className="space-y-1 text-sm">
                    {order.shippingAddress.street && <p>{order.shippingAddress.street}</p>}
                    {order.shippingAddress.city && order.shippingAddress.postalCode && (
                      <p>{order.shippingAddress.city} {order.shippingAddress.postalCode}</p>
                    )}
                    {order.shippingAddress.country && <p>{order.shippingAddress.country}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">{String(order.shippingAddress)}</p>
                )}
              </CardContent>
            </Card>

            {/* Custom Fields */}
            {order.customFields && typeof order.customFields === 'object' && Object.keys(order.customFields).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    פרטים נוספים
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(order.customFields).map(([key, value]) => {
                    // נסה למצוא את התווית של השדה מה-shop settings
                    let fieldLabel = key
                    const shopSettings = order.shop?.settings as any
                    const checkoutSettings = shopSettings?.checkoutPage
                    const customFieldsConfig = checkoutSettings?.customFields || []
                    const fieldConfig = customFieldsConfig.find((f: any) => f.id === key)
                    
                    if (fieldConfig && fieldConfig.label) {
                      fieldLabel = fieldConfig.label
                    }
                    
                    const displayValue = value === true ? "כן" : value === false ? "לא" : String(value || "")
                    
                    if (!displayValue || displayValue === "false" || displayValue === "") {
                      return null
                    }
                    
                    return (
                      <div key={key}>
                        <p className="text-sm text-gray-600">{fieldLabel}</p>
                        <p className="font-medium">{displayValue}</p>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Order Status (Editable) */}
            {editing && (
              <Card>
                <CardHeader>
                  <CardTitle>עדכון סטטוס</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>סטטוס הזמנה</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
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

                  <div>
                    <Label>סטטוס תשלום</Label>
                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">ממתין לתשלום</SelectItem>
                        <SelectItem value="PAID">שולם</SelectItem>
                        <SelectItem value="FAILED">נכשל</SelectItem>
                        <SelectItem value="REFUNDED">הוחזר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>סטטוס משלוח</Label>
                    <Select value={fulfillmentStatus} onValueChange={setFulfillmentStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNFULFILLED">לא נשלח</SelectItem>
                        <SelectItem value="PARTIAL">חלקי</SelectItem>
                        <SelectItem value="FULFILLED">נשלח</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>שיטת משלוח</Label>
                    <Input
                      value={shippingMethod}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      placeholder="דואר ישראל, שליח, וכו'"
                    />
                  </div>

                  <div>
                    <Label>מספר מעקב</Label>
                    <Input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="מספר מעקב משלוח"
                    />
                  </div>

                  <div>
                    <Label>הערות</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="הערות פנימיות..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Info */}
            {order.paymentMethod && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    פרטי תשלום
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">שיטת תשלום</p>
                    <p className="font-medium">{order.paymentMethod}</p>
                  </div>
                  {order.transactionId && (
                    <div>
                      <p className="text-sm text-gray-600">מספר עסקה</p>
                      <p className="font-medium">{order.transactionId}</p>
                    </div>
                  )}
                  {order.paidAt && (
                    <div>
                      <p className="text-sm text-gray-600">תאריך תשלום</p>
                      <p className="font-medium">
                        {format(new Date(order.paidAt), "dd/MM/yyyy HH:mm", { locale: he })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

