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
  User,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  TrendingUp,
  Calendar,
  Save,
  X,
  Tag,
  FileText,
} from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
}

interface Customer {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  addresses: any
  totalSpent: number
  orderCount: number
  tier: string
  tags: string[]
  notes: string | null
  isSubscribed: boolean
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  shop: {
    id: string
    name: string
  }
  orders: Order[]
  _count: {
    orders: number
    carts: number
    reviews: number
  }
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  
  // Form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [tier, setTier] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchCustomer()
    }
  }, [params.id])

  const fetchCustomer = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setCustomer(data)
        setFirstName(data.firstName || "")
        setLastName(data.lastName || "")
        setPhone(data.phone || "")
        setTier(data.tier)
        setTags(data.tags || [])
        setNotes(data.notes || "")
        setIsSubscribed(data.isSubscribed || false)
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את פרטי הלקוח",
          variant: "destructive",
        })
        router.push("/customers")
      }
    } catch (error) {
      console.error("Error fetching customer:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הלקוח",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/customers/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone: phone || undefined,
          tier,
          tags,
          notes: notes || undefined,
          isSubscribed,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "פרטי הלקוח עודכנו בהצלחה",
        })
        setEditing(false)
        fetchCustomer()
      } else {
        const data = await response.json()
        toast({
          title: "שגיאה",
          description: data.error || "לא ניתן לעדכן את הלקוח",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating customer:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון הלקוח",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag: any) => tag !== tagToRemove))
  }

  const getTierBadge = (tier: string) => {
    const tierMap: Record<string, { label: string; className: string }> = {
      REGULAR: { label: "רגיל", className: "bg-gray-100 text-gray-800 border-gray-300" },
      VIP: { label: "VIP", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
      PREMIUM: { label: "Premium", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    }
    const tierInfo = tierMap[tier] || { label: tier, className: "bg-gray-100 text-gray-800" }
    return (
      <Badge variant="outline" className={tierInfo.className}>
        {tierInfo.label}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: "ממתין", className: "bg-yellow-100 text-yellow-800" },
      CONFIRMED: { label: "מאושר", className: "bg-blue-100 text-blue-800" },
      PROCESSING: { label: "מעובד", className: "bg-emerald-100 text-emerald-800" },
      SHIPPED: { label: "נשלח", className: "bg-cyan-100 text-cyan-800" },
      DELIVERED: { label: "נמסר", className: "bg-green-100 text-green-800" },
      CANCELLED: { label: "בוטל", className: "bg-red-100 text-red-800" },
    }
    const statusInfo = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" }
    return (
      <Badge variant="outline" className={statusInfo.className}>
        {statusInfo.label}
      </Badge>
    )
  }

  const getCustomerName = () => {
    if (customer) {
      if (customer.firstName || customer.lastName) {
        return `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
      }
      return customer.email.split("@")[0]
    }
    return ""
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

  if (!customer) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">לקוח לא נמצא</h3>
          <Button onClick={() => router.push("/customers")}>חזור לרשימת לקוחות</Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className={cn("space-y-6", isMobile && "pb-20")}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/customers")}
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              חזור
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{getCustomerName()}</h1>
              <p className="text-gray-600 mt-1">{customer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getTierBadge(customer.tier)}
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
                    fetchCustomer()
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
          {/* Left Column - Customer Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>פרטים אישיים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>שם פרטי</Label>
                        <Input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="שם פרטי"
                        />
                      </div>
                      <div>
                        <Label>שם משפחה</Label>
                        <Input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="שם משפחה"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>טלפון</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="טלפון"
                      />
                    </div>
                    <div>
                      <Label>רמת לקוח</Label>
                      <Select value={tier} onValueChange={setTier}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REGULAR">רגיל</SelectItem>
                          <SelectItem value="VIP">VIP</SelectItem>
                          <SelectItem value="PREMIUM">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>מנוי לניוזלטר</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={isSubscribed}
                          onChange={(e) => setIsSubscribed(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-600">לקוח מנוי לניוזלטר</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">שם פרטי</p>
                        <p className="font-medium">{customer.firstName || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">שם משפחה</p>
                        <p className="font-medium">{customer.lastName || "-"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">טלפון</p>
                      <p className="font-medium">{customer.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">מנוי לניוזלטר</p>
                      <Badge variant="outline" className={customer.isSubscribed ? "bg-green-50 text-green-700 border-green-300" : ""}>
                        {customer.isSubscribed ? "מנוי" : "לא מנוי"}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  תגיות
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="הוסף תגית חדשה"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                      />
                      <Button onClick={handleAddTag} size="sm">
                        הוסף
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag: any) => (
                        <Badge key={tag} variant="outline" className="flex items-center gap-1">
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {customer.tags.length > 0 ? (
                      customer.tags.map((tag: any) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">אין תגיות</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  הערות
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="הערות על הלקוח..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {customer.notes || "אין הערות"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Orders History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  היסטוריית הזמנות
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customer.orders.length === 0 ? (
                  <p className="text-sm text-gray-500">אין הזמנות</p>
                ) : (
                  <div className="space-y-3">
                    {customer.orders.map((order: any) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/orders/${order.orderNumber}`)}
                      >
                        <div className="flex items-center gap-3">
                          <ShoppingBag className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                            <p className="text-sm text-gray-500">
                              {format(new Date(order.createdAt), "dd/MM/yyyy", { locale: he })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(order.status)}
                          <span className="font-semibold text-gray-900">
                            ₪{order.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats & Info */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>סטטיסטיקות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm text-gray-600">מספר הזמנות</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">
                    {customer.orderCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-600">סכום כולל הוצא</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    ₪{customer.totalSpent.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-600">תאריך הצטרפות</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {format(new Date(customer.createdAt), "dd/MM/yyyy", { locale: he })}
                  </span>
                </div>
                {customer.lastLoginAt && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <span className="text-sm text-gray-600">כניסה אחרונה</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {format(new Date(customer.lastLoginAt), "dd/MM/yyyy", { locale: he })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shop Info */}
            <Card>
              <CardHeader>
                <CardTitle>חנות</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-gray-900">{customer.shop.name}</p>
              </CardContent>
            </Card>

            {/* Addresses */}
            {customer.addresses && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    כתובות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(customer.addresses) && customer.addresses.length > 0 ? (
                    <div className="space-y-3">
                      {customer.addresses.map((address: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg text-sm">
                          {address.street && <p>{address.street}</p>}
                          {address.city && address.postalCode && (
                            <p>{address.city} {address.postalCode}</p>
                          )}
                          {address.country && <p>{address.country}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">אין כתובות שמורות</p>
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

