"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Mail,
  Phone,
  Building,
  Calendar,
  ShoppingBag,
  TrendingUp,
  Edit,
  Save,
  X,
  CheckCircle2,
  XCircle,
  UserCheck,
  MessageSquare,
} from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface Contact {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  company: string | null
  notes: string | null
  tags: string[]
  emailMarketingConsent: boolean
  emailMarketingConsentAt: string | null
  emailMarketingConsentSource: string | null
  createdAt: string
  updatedAt: string
  categoryAssignments: Array<{
    id: string
    category: {
      id: string
      type: string
      name: string
      color: string | null
    }
  }>
  customer: {
    id: string
    totalSpent: number
    orderCount: number
    tier: string
    orders: Array<{
      id: string
      orderNumber: string
      total: number
      status: string
      createdAt: string
    }>
  } | null
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  CUSTOMER: { label: "לקוחות", icon: ShoppingBag, color: "bg-green-500" },
  CLUB_MEMBER: { label: "חברי מועדון", icon: UserCheck, color: "bg-blue-500" },
  NEWSLETTER: { label: "ניוזלטר", icon: Mail, color: "bg-orange-500" },
  CONTACT_FORM: { label: "יצירת קשר", icon: MessageSquare, color: "bg-purple-500" },
}

export default function ContactDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const contactId = params.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [emailConsentDialogOpen, setEmailConsentDialogOpen] = useState(false)
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    company: "",
    notes: "",
    tags: [] as string[],
  })

  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  useEffect(() => {
    if (contactId) {
      fetchContact()
    }
  }, [contactId])

  const fetchContact = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/contacts/${contactId}`)
      if (response.ok) {
        const data = await response.json()
        setContact(data)
        setFormData({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          phone: data.phone || "",
          company: data.company || "",
          notes: data.notes || "",
          tags: data.tags || [],
        })
        setSelectedCategories(
          data.categoryAssignments.map((ca: any) => ca.category.type)
        )
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את פרטי איש הקשר",
          variant: "destructive",
        })
        router.push("/contacts")
      }
    } catch (error) {
      console.error("Error fetching contact:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת איש הקשר",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!contact) return

    setSaving(true)
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "פרטי איש הקשר עודכנו בהצלחה",
        })
        setEditing(false)
        fetchContact()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לעדכן את איש הקשר",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating contact:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון איש הקשר",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateEmailConsent = async (consent: boolean) => {
    if (!contact) return

    try {
      const response = await fetch(`/api/contacts/${contactId}/email-consent`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailMarketingConsent: consent,
          source: "manual",
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: consent ? "אישור דיוור עודכן" : "אישור דיוור בוטל",
        })
        setEmailConsentDialogOpen(false)
        fetchContact()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לעדכן את אישור הדיוור",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating email consent:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון אישור הדיוור",
        variant: "destructive",
      })
    }
  }

  const handleUpdateCategories = async () => {
    if (!contact) return

    try {
      const response = await fetch(`/api/contacts/${contactId}/categories`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryTypes: selectedCategories,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "קטגוריות עודכנו בהצלחה",
        })
        setCategoriesDialogOpen(false)
        fetchContact()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לעדכן את הקטגוריות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating categories:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון הקטגוריות",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <AppLayout title="פרטי איש קשר">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">טוען...</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  if (!contact) {
    return (
      <AppLayout title="פרטי איש קשר">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">איש קשר לא נמצא</p>
            <Button onClick={() => router.push("/contacts")} className="mt-4">
              חזרה לאנשי קשר
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  const getContactName = () => {
    if (contact.firstName || contact.lastName) {
      return `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
    }
    return contact.email.split("@")[0]
  }

  return (
    <AppLayout title="פרטי איש קשר">
      <div className={`space-y-6 ${isMobile ? "pb-20" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push("/contacts")}
              className="mb-4"
            >
              ← חזרה לאנשי קשר
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">{getContactName()}</h1>
            <p className="text-gray-600 mt-1">{contact.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <Button onClick={() => setEditing(true)} variant="outline">
                <Edit className="w-4 h-4 ml-2" />
                ערוך
              </Button>
            ) : (
              <>
                <Button onClick={() => {
                  setEditing(false)
                  fetchContact()
                }} variant="outline">
                  <X className="w-4 h-4 ml-2" />
                  ביטול
                </Button>
                <Button onClick={handleSave} disabled={saving} className="prodify-gradient text-white">
                  <Save className="w-4 h-4 ml-2" />
                  {saving ? "שומר..." : "שמור"}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>פרטים אישיים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>שם פרטי</Label>
                    {editing ? (
                      <Input
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 font-medium">
                        {contact.firstName || "-"}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>שם משפחה</Label>
                    {editing ? (
                      <Input
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 font-medium">
                        {contact.lastName || "-"}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>אימייל</Label>
                  <p className="mt-1 font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {contact.email}
                  </p>
                </div>

                <div>
                  <Label>טלפון</Label>
                  {editing ? (
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {contact.phone || "-"}
                    </p>
                  )}
                </div>

                <div>
                  <Label>חברה</Label>
                  {editing ? (
                    <Input
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      {contact.company || "-"}
                    </p>
                  )}
                </div>

                <div>
                  <Label>הערות</Label>
                  {editing ? (
                    <Textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={4}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-gray-700 whitespace-pre-wrap">
                      {contact.notes || "-"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>קטגוריות</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCategories(
                        contact.categoryAssignments.map((ca) => ca.category.type)
                      )
                      setCategoriesDialogOpen(true)
                    }}
                  >
                    <Edit className="w-4 h-4 ml-2" />
                    ערוך קטגוריות
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {contact.categoryAssignments.map((assignment) => {
                    const category = assignment.category
                    const config = CATEGORY_CONFIG[category.type] || CATEGORY_CONFIG.CUSTOMER
                    const Icon = config.icon
                    return (
                      <Badge
                        key={assignment.id}
                        variant="outline"
                        className="text-sm py-1 px-3"
                        style={{
                          backgroundColor: category.color ? `${category.color}15` : undefined,
                          borderColor: category.color || undefined,
                          color: category.color || undefined,
                        }}
                      >
                        <Icon className="w-3 h-3 ml-1" />
                        {category.name}
                      </Badge>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Customer Info (if exists) */}
            {contact.customer && (
              <Card>
                <CardHeader>
                  <CardTitle>מידע לקוח</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">הזמנות</Label>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {contact.customer.orderCount}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">סכום כולל</Label>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">
                        ₪{contact.customer.totalSpent.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">רמה</Label>
                      <Badge className="mt-1">{contact.customer.tier}</Badge>
                    </div>
                  </div>

                  {contact.customer.orders.length > 0 && (
                    <div className="mt-6">
                      <Label className="text-sm font-medium mb-3 block">הזמנות אחרונות</Label>
                      <div className="space-y-2">
                        {contact.customer.orders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`/orders/${order.id}`)}
                          >
                            <div>
                              <p className="font-medium">הזמנה #{order.orderNumber}</p>
                              <p className="text-sm text-gray-600">
                                {format(new Date(order.createdAt), "dd/MM/yyyy", { locale: he })}
                              </p>
                            </div>
                            <div className="text-left">
                              <p className="font-semibold">₪{order.total.toFixed(2)}</p>
                              <Badge variant="outline" className="text-xs">
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Email Marketing Consent */}
            <Card>
              <CardHeader>
                <CardTitle>אישור דיוור</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {contact.emailMarketingConsent ? "מאושר" : "לא מאושר"}
                    </p>
                    {contact.emailMarketingConsentAt && (
                      <p className="text-sm text-gray-600">
                        עודכן: {format(new Date(contact.emailMarketingConsentAt), "dd/MM/yyyy", { locale: he })}
                      </p>
                    )}
                  </div>
                  {contact.emailMarketingConsent ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEmailConsentDialogOpen(true)}
                >
                  {contact.emailMarketingConsent ? "בטל אישור" : "אשר דיוור"}
                </Button>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>מידע נוסף</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-600">תאריך יצירה</Label>
                  <p className="text-sm font-medium mt-1">
                    {format(new Date(contact.createdAt), "dd/MM/yyyy HH:mm", { locale: he })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">תאריך עדכון אחרון</Label>
                  <p className="text-sm font-medium mt-1">
                    {format(new Date(contact.updatedAt), "dd/MM/yyyy HH:mm", { locale: he })}
                  </p>
                </div>
                {contact.tags.length > 0 && (
                  <div>
                    <Label className="text-sm text-gray-600">תגיות</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {contact.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Email Consent Dialog */}
        <Dialog open={emailConsentDialogOpen} onOpenChange={setEmailConsentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {contact.emailMarketingConsent ? "ביטול אישור דיוור" : "אישור דיוור"}
              </DialogTitle>
              <DialogDescription>
                {contact.emailMarketingConsent
                  ? "האם אתה בטוח שברצונך לבטל את אישור הדיוור?"
                  : "האם אתה בטוח שברצונך לאשר דיוור לאיש קשר זה?"}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setEmailConsentDialogOpen(false)}
              >
                ביטול
              </Button>
              <Button
                onClick={() => handleUpdateEmailConsent(!contact.emailMarketingConsent)}
                className={contact.emailMarketingConsent ? "bg-red-600 hover:bg-red-700" : "prodify-gradient text-white"}
              >
                {contact.emailMarketingConsent ? "בטל אישור" : "אשר דיוור"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Categories Dialog */}
        <Dialog open={categoriesDialogOpen} onOpenChange={setCategoriesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ערוך קטגוריות</DialogTitle>
              <DialogDescription>
                בחר את הקטגוריות המתאימות לאיש קשר זה
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {Object.entries(CATEGORY_CONFIG)
                .filter(([key]) => key !== "all")
                .map(([key, config]) => {
                  const Icon = config.icon
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={`category-${key}`}
                        checked={selectedCategories.includes(key)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCategories([...selectedCategories, key])
                          } else {
                            setSelectedCategories(
                              selectedCategories.filter((t) => t !== key)
                            )
                          }
                        }}
                      />
                      <Label
                        htmlFor={`category-${key}`}
                        className="cursor-pointer flex items-center gap-2 flex-1"
                      >
                        <Icon className="w-4 h-4" />
                        {config.label}
                      </Label>
                    </div>
                  )
                })}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setCategoriesDialogOpen(false)}
              >
                ביטול
              </Button>
              <Button
                onClick={handleUpdateCategories}
                className="prodify-gradient text-white"
              >
                שמור שינויים
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

