"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
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
  Edit,
} from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

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
    taxEnabled: boolean
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
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [order, setOrder] = useState<Order | null>(null)
  const [statuses, setStatuses] = useState<OrderStatusDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const isPrintMode = searchParams.get('print') === 'true'
  
  // Form state
  const [status, setStatus] = useState("")
  const [fulfillmentStatus, setFulfillmentStatus] = useState("")
  const [shippingMethod, setShippingMethod] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [notes, setNotes] = useState("")
  
  // Customer info state
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  
  // Shipping address state
  const [shippingAddress, setShippingAddress] = useState<any>(null)
  
  // Payment info state
  const [paymentMethod, setPaymentMethod] = useState("")
  const [transactionId, setTransactionId] = useState("")
  
  // Order summary state
  const [subtotal, setSubtotal] = useState(0)
  const [shipping, setShipping] = useState(0)
  const [tax, setTax] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [couponCode, setCouponCode] = useState("")
  
  // Items state
  const [items, setItems] = useState<OrderItem[]>([])

  useEffect(() => {
    fetchStatuses()
  }, [])

  useEffect(() => {
    if (params.id) {
      fetchOrder()
    }
  }, [params.id])

  useEffect(() => {
    // אם במצב הדפסה, להדפיס אוטומטית
    if (isPrintMode && order) {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [isPrintMode, order])

  useEffect(() => {
    // אם יש פרמטר edit, להפעיל מצב עריכה
    if (searchParams.get('edit') === 'true') {
      setEditing(true)
    }
  }, [searchParams])

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

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
        setStatus(data.status)
        setFulfillmentStatus(data.fulfillmentStatus)
        setShippingMethod(data.shippingMethod || "")
        setTrackingNumber(data.trackingNumber || "")
        setNotes(data.notes || "")
        setCustomerName(data.customerName || "")
        setCustomerEmail(data.customerEmail || "")
        setCustomerPhone(data.customerPhone || "")
        setShippingAddress(data.shippingAddress || null)
        setPaymentMethod(data.paymentMethod || "")
        setTransactionId(data.transactionId || "")
        setSubtotal(data.subtotal || 0)
        setShipping(data.shipping || 0)
        setTax(data.tax || 0)
        setDiscount(data.discount || 0)
        setCouponCode(data.couponCode || "")
        setItems(data.items || [])
      } else if (response.status === 404) {
        // ההזמנה לא נמצאה - חזרה לדף ההזמנות
        toast({
          title: "הזמנה לא נמצאה",
          description: "ההזמנה שחיפשת אינה קיימת במערכת",
          variant: "destructive",
        })
        router.push("/orders")
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

  const handleSaveSection = async (section: string) => {
    try {
      setSaving(true)
      let updateData: any = {}

      switch (section) {
        case 'status':
          updateData = {
            status,
            fulfillmentStatus,
            shippingMethod: shippingMethod || undefined,
            trackingNumber: trackingNumber || undefined,
            notes: notes || undefined,
          }
          break
        case 'customer':
          updateData = {
            customerName,
            customerEmail,
            customerPhone: customerPhone || undefined,
          }
          break
        case 'shipping':
          updateData = {
            shippingAddress,
          }
          break
        case 'payment':
          updateData = {
            paymentMethod: paymentMethod || undefined,
            transactionId: transactionId || undefined,
          }
          break
        case 'summary':
          updateData = {
            subtotal,
            shipping,
            tax,
            discount,
            couponCode: couponCode || undefined,
          }
          break
        case 'items':
          updateData = {
            items: items.map(item => ({
              id: item.id,
              quantity: item.quantity,
              price: item.price,
            })),
          }
          break
      }

      const response = await fetch(`/api/orders/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "ההזמנה עודכנה בהצלחה",
        })
        setEditingSection(null)
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

  const handleSave = async () => {
    await handleSaveSection('status')
  }

  const getStatusInfo = (statusKey: string) => {
    const statusDef = statuses.find(s => s.key === statusKey)
    if (statusDef) {
      return {
        label: statusDef.label,
        color: statusDef.color,
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
    return (
      <Badge 
        variant="outline" 
        style={{ 
          backgroundColor: statusInfo.color + "20",
          color: statusInfo.color,
          borderColor: statusInfo.color + "40"
        }}
      >
        {statusInfo.label}
      </Badge>
    )
  }

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return ""
    const paymentMethods: Record<string, string> = {
      credit_card: "כרטיס אשראי",
      bank_transfer: "העברה בנקאית",
      cash: "מזומן",
    }
    return paymentMethods[method.toLowerCase()] || method
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
              <div>
                <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-32 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!order) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">הזמנה לא נמצאה</h3>
          <Button onClick={() => router.push("/orders")}>
            חזור להזמנות
          </Button>
        </div>
      </AppLayout>
    )
  }

  // אם במצב הדפסה, להציג גרסה פשוטה
  if (isPrintMode) {
    // בדיקה אם להציג מעמ לפי ההגדרות
    const shopSettings = order.shop?.settings as any
    const showTaxInCart = shopSettings?.showTaxInCart ?? false
    
    const printStyles = `
      @media print {
        @page {
          size: A4;
          margin: 1cm;
        }
        body * {
          visibility: hidden;
        }
        .print-container, .print-container * {
          visibility: visible;
        }
        .print-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .no-print {
          display: none !important;
        }
      }
      @media screen {
        body {
          background: #f5f5f5;
        }
      }
      .print-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 40px;
        background: white;
      }
      .print-header {
        text-align: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #000;
      }
      .print-title {
        font-size: 28px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      .print-section {
        margin-bottom: 25px;
        page-break-inside: avoid;
      }
      .print-section-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 10px;
        padding-bottom: 5px;
        border-bottom: 1px solid #ddd;
      }
      .print-table {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0;
      }
      .print-table th {
        text-align: right;
        padding: 10px;
        background: #f5f5f5;
        border: 1px solid #ddd;
        font-weight: bold;
      }
      .print-table td {
        text-align: right;
        padding: 10px;
        border: 1px solid #ddd;
      }
      .print-summary {
        margin-top: 20px;
        text-align: left;
      }
      .print-summary-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
      }
      .print-total {
        font-size: 18px;
        font-weight: bold;
        padding-top: 10px;
        border-top: 2px solid #000;
      }
      .print-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-top: 15px;
      }
      .print-info-item {
        margin-bottom: 10px;
      }
      .print-label {
        font-weight: bold;
        color: #666;
        font-size: 11px;
        margin-bottom: 3px;
      }
      .print-value {
        font-size: 13px;
      }
    `;
    
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: printStyles }} />
        <div className="print-container" dir="rtl">
          <div className="print-header">
          <div className="print-title">הזמנה #{order.orderNumber}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            נוצרה ב-{format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: he })}
          </div>
        </div>

        <div className="print-section">
          <div className="print-section-title">פריטים בהזמנה</div>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>פריט</th>
                <th style={{ width: '15%' }}>כמות</th>
                <th style={{ width: '17.5%' }}>מחיר יחידה</th>
                <th style={{ width: '17.5%' }}>סה"כ</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    {item.variant && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        <strong>וריאציה:</strong> {item.variant.name}
                      </div>
                    )}
                    {item.sku && (
                      <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>מקט: {item.sku}</div>
                    )}
                    {item.product && item.product.name && item.product.name !== item.name && (
                      <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                        מוצר: {item.product.name}
                      </div>
                    )}
                  </td>
                  <td>{item.quantity}</td>
                  <td>₪{item.price.toFixed(2)}</td>
                  <td style={{ fontWeight: 'bold' }}>₪{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="print-summary">
            <div className="print-summary-row">
              <span>סכום ביניים:</span>
              <span>₪{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="print-summary-row">
              <span>משלוח:</span>
              <span>₪{order.shipping.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="print-summary-row" style={{ color: '#16a34a' }}>
                <span>הנחה:</span>
                <span>-₪{order.discount.toFixed(2)}</span>
              </div>
            )}
            {order.couponCode && (
              <div className="print-summary-row">
                <span>קוד קופון:</span>
                <span style={{ fontWeight: 'bold' }}>{order.couponCode}</span>
              </div>
            )}
            {showTaxInCart && order.tax > 0 && (
              <div className="print-summary-row">
                <span>מע"מ:</span>
                <span>₪{order.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="print-summary-row print-total">
              <span>סה"כ:</span>
              <span>₪{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="print-info-grid">
          <div className="print-section">
            <div className="print-section-title">פרטי לקוח</div>
            <div className="print-info-item">
              <div className="print-label">שם</div>
              <div className="print-value">{order.customerName}</div>
            </div>
            <div className="print-info-item">
              <div className="print-label">אימייל</div>
              <div className="print-value">{order.customerEmail}</div>
            </div>
            {order.customerPhone && (
              <div className="print-info-item">
                <div className="print-label">טלפון</div>
                <div className="print-value">{order.customerPhone}</div>
              </div>
            )}
          </div>

          <div className="print-section">
            <div className="print-section-title">כתובת משלוח</div>
            {order.shippingAddress && (() => {
              let address: any
              try {
                address = typeof order.shippingAddress === 'string' 
                  ? JSON.parse(order.shippingAddress) 
                  : order.shippingAddress
              } catch (e) {
                // אם יש שגיאה בפרסור, נשתמש בכתובת כמו שהיא
                address = order.shippingAddress
              }
              return (
                <>
                  {(address.firstName || address.lastName) && (
                    <div className="print-info-item">
                      <div className="print-value">
                        {address.firstName || ''} {address.lastName || ''}
                      </div>
                    </div>
                  )}
                  {(address.address || address.street) && (
                    <div className="print-info-item">
                      <div className="print-value">
                        {address.address || address.street}
                        {address.houseNumber ? ` ${address.houseNumber}` : ''}
                      </div>
                    </div>
                  )}
                  {(address.apartment || address.floor) && (
                    <div className="print-info-item">
                      <div className="print-value">
                        {address.apartment ? `דירה ${address.apartment}` : ''}
                        {address.apartment && address.floor ? ', ' : ''}
                        {address.floor ? `קומה ${address.floor}` : ''}
                      </div>
                    </div>
                  )}
                  {address.city && (
                    <div className="print-info-item">
                      <div className="print-value">
                        {address.city}
                        {address.zipCode && `, ${address.zipCode}`}
                        {address.zip && !address.zipCode && `, ${address.zip}`}
                      </div>
                    </div>
                  )}
                  {address.country && (
                    <div className="print-info-item">
                      <div className="print-value">{address.country}</div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        <div className="print-info-grid">
          <div className="print-section">
            <div className="print-section-title">פרטי תשלום</div>
            {order.paymentMethod && (
              <div className="print-info-item">
                <div className="print-label">שיטת תשלום</div>
                <div className="print-value">{order.paymentMethod}</div>
              </div>
            )}
            {order.transactionId && (
              <div className="print-info-item">
                <div className="print-label">מזהה עסקה</div>
                <div className="print-value" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                  {order.transactionId}
                </div>
              </div>
            )}
            {order.paidAt && (
              <div className="print-info-item">
                <div className="print-label">תאריך תשלום</div>
                <div className="print-value">
                  {format(new Date(order.paidAt), "dd/MM/yyyy HH:mm", { locale: he })}
                </div>
              </div>
            )}
          </div>

          <div className="print-section">
            <div className="print-section-title">מצב הזמנה</div>
            <div className="print-info-item">
              <div className="print-label">סטטוס</div>
              <div className="print-value">{getStatusInfo(order.status).label}</div>
            </div>
            <div className="print-info-item">
              <div className="print-label">סטטוס משלוח</div>
              <div className="print-value">
                {order.fulfillmentStatus === "UNFULFILLED" && "לא נשלח"}
                {order.fulfillmentStatus === "PARTIAL" && "חלקי"}
                {order.fulfillmentStatus === "FULFILLED" && "נשלח"}
              </div>
            </div>
            {order.shippingMethod && (
              <div className="print-info-item">
                <div className="print-label">שיטת משלוח</div>
                <div className="print-value">{order.shippingMethod}</div>
              </div>
            )}
            {order.trackingNumber && (
              <div className="print-info-item">
                <div className="print-label">מספר מעקב</div>
                <div className="print-value">{order.trackingNumber}</div>
              </div>
            )}
          </div>
        </div>

        {order.notes && (
          <div className="print-section">
            <div className="print-section-title">הערות</div>
            <div style={{ padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
              {order.notes}
            </div>
          </div>
        )}
        </div>
      </>
    )
  }

  return (
    <AppLayout>
      <div className={cn("space-y-6", isMobile && "pb-20")}>
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/orders")}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                הזמנה #{order.orderNumber}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                נוצרה ב-{format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: he })}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {editing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false)
                    setStatus(order.status)
                    setFulfillmentStatus(order.fulfillmentStatus)
                    setShippingMethod(order.shippingMethod || "")
                    setTrackingNumber(order.trackingNumber || "")
                    setNotes(order.notes || "")
                  }}
                  disabled={saving}
                >
                  <X className="ml-2 h-4 w-4" />
                  ביטול
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="ml-2 h-4 w-4" />
                  {saving ? "שומר..." : "שמור"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)}>
                <Edit className="ml-2 h-4 w-4" />
                ערוך
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Order Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    פריטים בהזמנה
                  </div>
                  {editingSection !== 'items' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingSection('items')}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editingSection === 'items' ? (
                  <>
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 border rounded-lg"
                        >
                          {item.product?.images?.[0] && (
                            <img
                              src={item.product.images[0]}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            {item.variant && (
                              <p className="text-sm text-gray-500">{item.variant.name}</p>
                            )}
                            {item.sku && (
                              <p className="text-xs text-gray-400">מקט: {item.sku}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-left">
                              <Label className="text-xs">מחיר</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0
                                  const updatedItems = items.map(i => 
                                    i.id === item.id 
                                      ? { ...i, price: newPrice, total: newPrice * i.quantity }
                                      : i
                                  )
                                  setItems(updatedItems)
                                }}
                                className="w-24"
                              />
                            </div>
                            <div className="text-left">
                              <Label className="text-xs">כמות</Label>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 0
                                  const updatedItems = items.map(i => 
                                    i.id === item.id 
                                      ? { ...i, quantity: newQuantity, total: i.price * newQuantity }
                                      : i
                                  )
                                  setItems(updatedItems)
                                }}
                                className="w-20"
                              />
                            </div>
                            <div className="font-semibold w-20 text-left">
                              ₪{item.total.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingSection(null)
                          setItems(order.items)
                        }}
                        disabled={saving}
                      >
                        <X className="ml-2 h-4 w-4" />
                        ביטול
                      </Button>
                      <Button onClick={() => handleSaveSection('items')} disabled={saving}>
                        <Save className="ml-2 h-4 w-4" />
                        {saving ? "שומר..." : "שמור"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                      {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 border rounded-lg"
                      >
                        {item.product?.images?.[0] && (
                          <img
                            src={item.product.images[0]}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          {item.variant && (
                            <p className="text-sm text-gray-500 mt-1">
                              <span className="font-semibold">וריאציה:</span> {item.variant.name}
                            </p>
                          )}
                          {item.sku && (
                            <p className="text-xs text-gray-400 mt-1">מקט: {item.sku}</p>
                          )}
                          {item.product && item.product.name && item.product.name !== item.name && (
                            <p className="text-xs text-gray-400 mt-1">
                              מוצר: {item.product.name}
                            </p>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-gray-500">כמות: {item.quantity}</p>
                          <p className="text-xs text-gray-400 mt-1">₪{item.price.toFixed(2)} ליחידה</p>
                        </div>
                        <div className="font-semibold text-right">
                          ₪{item.total.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Order Summary */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">סיכום הזמנה</h3>
                    {editingSection !== 'summary' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingSection('summary')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {editingSection === 'summary' ? (
                    <>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label>סכום ביניים</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={subtotal}
                            onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
                            className="w-32"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <Label>משלוח</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={shipping}
                            onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                            className="w-32"
                          />
                        </div>
                        {order.shop?.taxEnabled && (
                          <div className="flex justify-between items-center">
                            <Label>מע"מ</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={tax}
                              onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                              className="w-32"
                            />
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <Label>הנחה</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={discount}
                            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                            className="w-32"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <Label>קוד קופון</Label>
                          <Input
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            className="w-32"
                          />
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                          <span>סה"כ</span>
                          <span>₪{(subtotal + shipping + tax - discount).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingSection(null)
                            setSubtotal(order.subtotal)
                            setShipping(order.shipping)
                            setTax(order.tax)
                            setDiscount(order.discount)
                            setCouponCode(order.couponCode || "")
                          }}
                          disabled={saving}
                        >
                          <X className="ml-2 h-4 w-4" />
                          ביטול
                        </Button>
                        <Button onClick={() => handleSaveSection('summary')} disabled={saving}>
                          <Save className="ml-2 h-4 w-4" />
                          {saving ? "שומר..." : "שמור"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">סכום ביניים</span>
                        <span>₪{order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">משלוח</span>
                        <span>₪{order.shipping.toFixed(2)}</span>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>הנחה</span>
                          <span>-₪{order.discount.toFixed(2)}</span>
                        </div>
                      )}
                      {order.couponCode && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">קוד קופון</span>
                          <Badge variant="secondary">{order.couponCode}</Badge>
                        </div>
                      )}
                      {(() => {
                        const shopSettings = order.shop?.settings as any
                        const showTaxInCart = shopSettings?.showTaxInCart ?? false
                        return showTaxInCart && order.shop?.taxEnabled && order.tax > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">מע"מ</span>
                            <span>₪{order.tax.toFixed(2)}</span>
                          </div>
                        )
                      })()}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>סה"כ</span>
                        <span>₪{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    פרטי לקוח
                  </div>
                  {editingSection !== 'customer' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingSection('customer')}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingSection === 'customer' ? (
                  <>
                    <div>
                      <Label>שם</Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        אימייל
                      </Label>
                      <Input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        טלפון
                      </Label>
                      <Input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingSection(null)
                          setCustomerName(order.customerName)
                          setCustomerEmail(order.customerEmail)
                          setCustomerPhone(order.customerPhone || "")
                        }}
                        disabled={saving}
                      >
                        <X className="ml-2 h-4 w-4" />
                        ביטול
                      </Button>
                      <Button onClick={() => handleSaveSection('customer')} disabled={saving}>
                        <Save className="ml-2 h-4 w-4" />
                        {saving ? "שומר..." : "שמור"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-gray-500">שם</Label>
                      <p className="font-medium">{order.customerName}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        אימייל
                      </Label>
                      <p className="font-medium">{order.customerEmail}</p>
                    </div>
                    {order.customerPhone && (
                      <div>
                        <Label className="text-gray-500 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          טלפון
                        </Label>
                        <p className="font-medium">{order.customerPhone}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    כתובת משלוח
                  </div>
                  {editingSection !== 'shipping' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingSection('shipping')}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editingSection === 'shipping' ? (
                  <>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>שם פרטי</Label>
                          <Input
                            value={shippingAddress?.firstName || ""}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, firstName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>שם משפחה</Label>
                          <Input
                            value={shippingAddress?.lastName || ""}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, lastName: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>רחוב</Label>
                        <Input
                          value={shippingAddress?.address || shippingAddress?.street || ""}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value, street: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>מספר בית</Label>
                          <Input
                            value={shippingAddress?.houseNumber || ""}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, houseNumber: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>דירה</Label>
                          <Input
                            value={shippingAddress?.apartment || ""}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, apartment: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>קומה</Label>
                          <Input
                            value={shippingAddress?.floor || ""}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, floor: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>עיר</Label>
                          <Input
                            value={shippingAddress?.city || ""}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>מיקוד</Label>
                          <Input
                            value={shippingAddress?.zip || shippingAddress?.zipCode || ""}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value, zipCode: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>מדינה</Label>
                        <Input
                          value={shippingAddress?.country || ""}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingSection(null)
                          setShippingAddress(order.shippingAddress)
                        }}
                        disabled={saving}
                      >
                        <X className="ml-2 h-4 w-4" />
                        ביטול
                      </Button>
                      <Button onClick={() => handleSaveSection('shipping')} disabled={saving}>
                        <Save className="ml-2 h-4 w-4" />
                        {saving ? "שומר..." : "שמור"}
                      </Button>
                    </div>
                  </>
                ) : (
                  order.shippingAddress && (
                    <div className="space-y-1">
                      {(() => {
                        let address: any
                        try {
                          address = typeof order.shippingAddress === 'string' 
                            ? JSON.parse(order.shippingAddress) 
                            : order.shippingAddress
                        } catch (e) {
                          // אם יש שגיאה בפרסור, נשתמש בכתובת כמו שהיא
                          address = order.shippingAddress
                        }
                        return (
                          <>
                            {(address.firstName || address.lastName) && (
                              <p className="font-medium">
                                {address.firstName || ''} {address.lastName || ''}
                              </p>
                            )}
                            {(address.address || address.street) && (
                              <p className="text-gray-700">
                                {address.address || address.street}
                                {address.houseNumber ? ` ${address.houseNumber}` : ''}
                              </p>
                            )}
                            {(address.apartment || address.floor) && (
                              <p className="text-gray-700">
                                {address.apartment ? `דירה ${address.apartment}` : ''}
                                {address.apartment && address.floor ? ', ' : ''}
                                {address.floor ? `קומה ${address.floor}` : ''}
                              </p>
                            )}
                            {address.city && (
                              <p className="text-gray-700">
                                {address.city}
                                {address.zipCode ? `, ${address.zipCode}` : ''}
                                {address.zip && !address.zipCode ? `, ${address.zip}` : ''}
                              </p>
                            )}
                            {address.country && (
                              <p className="text-gray-700">{address.country}</p>
                            )}
                            {/* תמיכה במבנה הישן */}
                            {!address.firstName && !address.lastName && !address.address && !address.street && address.street && (
                              <p>{address.street}</p>
                            )}
                            {!address.city && address.city && address.zipCode && (
                              <p>
                                {address.city}, {address.zipCode}
                              </p>
                            )}
                            {!address.country && address.country && (
                              <p>{address.country}</p>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>מצב הזמנה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div>
                      <Label>סטטוס</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s.id} value={s.key}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: s.color }}
                                />
                                {s.label}
                              </div>
                            </SelectItem>
                          ))}
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
                        placeholder="הזן מספר מעקב"
                      />
                    </div>

                    <div>
                      <Label>הערות</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="הערות נוספות"
                        rows={3}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-gray-500">סטטוס</Label>
                      <div className="mt-1">{getStatusBadge(order.status)}</div>
                    </div>

                    <div>
                      <Label className="text-gray-500">סטטוס משלוח</Label>
                      <div className="mt-1">
                        <Badge variant="outline">
                          {order.fulfillmentStatus === "UNFULFILLED" && "לא נשלח"}
                          {order.fulfillmentStatus === "PARTIAL" && "חלקי"}
                          {order.fulfillmentStatus === "FULFILLED" && "נשלח"}
                        </Badge>
                      </div>
                    </div>

                    {order.shippingMethod && (
                      <div>
                        <Label className="text-gray-500">שיטת משלוח</Label>
                        <p className="font-medium">{order.shippingMethod}</p>
                      </div>
                    )}

                    {order.trackingNumber && (
                      <div>
                        <Label className="text-gray-500">מספר מעקב</Label>
                        <p className="font-medium">{order.trackingNumber}</p>
                      </div>
                    )}

                    {order.notes && (
                      <div>
                        <Label className="text-gray-500">הערות</Label>
                        <p className="text-sm">{order.notes}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    פרטי תשלום
                  </div>
                  {editingSection !== 'payment' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingSection('payment')}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingSection === 'payment' ? (
                  <>
                    <div>
                      <Label>שיטת תשלום</Label>
                      <Input
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        placeholder="כרטיס אשראי, העברה בנקאית, וכו'"
                      />
                    </div>
                    <div>
                      <Label>מזהה עסקה</Label>
                      <Input
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="מספר עסקה"
                      />
                    </div>
                    {order.paidAt && (
                      <div>
                        <Label className="text-gray-500 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          תאריך תשלום
                        </Label>
                        <p className="text-sm">
                          {format(new Date(order.paidAt), "dd/MM/yyyy HH:mm", { locale: he })}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingSection(null)
                          setPaymentMethod(order.paymentMethod || "")
                          setTransactionId(order.transactionId || "")
                        }}
                        disabled={saving}
                      >
                        <X className="ml-2 h-4 w-4" />
                        ביטול
                      </Button>
                      <Button onClick={() => handleSaveSection('payment')} disabled={saving}>
                        <Save className="ml-2 h-4 w-4" />
                        {saving ? "שומר..." : "שמור"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {order.paymentMethod && (
                      <div>
                        <Label className="text-gray-500">שיטת תשלום</Label>
                        <p className="font-medium">{getPaymentMethodLabel(order.paymentMethod)}</p>
                      </div>
                    )}
                    {order.transactionId && (
                      <div>
                        <Label className="text-gray-500">מזהה עסקה</Label>
                        <p className="font-mono text-sm">{order.transactionId}</p>
                      </div>
                    )}
                    {order.paidAt && (
                      <div>
                        <Label className="text-gray-500 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          תאריך תשלום
                        </Label>
                        <p className="text-sm">
                          {format(new Date(order.paidAt), "dd/MM/yyyy HH:mm", { locale: he })}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
