"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
import { Save, Tag, Percent, DollarSign, Calendar, Users, UserCheck } from "lucide-react"

export default function EditCouponPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const couponId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [influencers, setInfluencers] = useState<Array<{ id: string; name: string; email: string }>>([])
  
  const [formData, setFormData] = useState({
    code: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    value: "",
    minOrder: "",
    maxDiscount: "",
    maxUses: "",
    usesPerCustomer: "1",
    startDate: "",
    endDate: "",
    isActive: true,
    canCombine: false,
    influencerId: "",
  })

  useEffect(() => {
    if (couponId) {
      fetchCoupon()
    }
    fetchInfluencers()
  }, [couponId])

  const fetchInfluencers = async () => {
    try {
      const response = await fetch("/api/users?role=INFLUENCER")
      if (response.ok) {
        const data = await response.json()
        setInfluencers(data)
      }
    } catch (error) {
      console.error("Error fetching influencers:", error)
    }
  }

  const fetchCoupon = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/coupons/${couponId}`)
      if (response.ok) {
        const coupon = await response.json()
        
        let startDateFormatted = ""
        if (coupon.startDate) {
          const date = new Date(coupon.startDate)
          startDateFormatted = date.toISOString().slice(0, 16)
        }

        let endDateFormatted = ""
        if (coupon.endDate) {
          const date = new Date(coupon.endDate)
          endDateFormatted = date.toISOString().slice(0, 16)
        }

        setFormData({
          code: coupon.code || "",
          type: coupon.type || "PERCENTAGE",
          value: coupon.value?.toString() || "",
          minOrder: coupon.minOrder?.toString() || "",
          maxDiscount: coupon.maxDiscount?.toString() || "",
          maxUses: coupon.maxUses?.toString() || "",
          usesPerCustomer: coupon.usesPerCustomer?.toString() || "1",
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          isActive: coupon.isActive ?? true,
          canCombine: coupon.canCombine ?? false,
          influencerId: coupon.influencerId || "",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את הקופון",
          variant: "destructive",
        })
        router.push("/coupons")
      }
    } catch (error) {
      console.error("Error fetching coupon:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הקופון",
        variant: "destructive",
      })
      router.push("/coupons")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedShop) {
      toast({
        title: "שגיאה",
        description: "יש לבחור חנות מההדר",
        variant: "destructive",
      })
      return
    }

    if (!formData.value || parseFloat(formData.value) <= 0) {
      toast({
        title: "שגיאה",
        description: "ערך הנחה חייב להיות חיובי",
        variant: "destructive",
      })
      return
    }

    if (formData.type === "PERCENTAGE" && parseFloat(formData.value) > 100) {
      toast({
        title: "שגיאה",
        description: "אחוז הנחה לא יכול להיות יותר מ-100%",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload: any = {
        shopId: selectedShop.id,
        code: formData.code || undefined,
        type: formData.type,
        value: parseFloat(formData.value),
        minOrder: formData.minOrder ? parseFloat(formData.minOrder) : undefined,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
        usesPerCustomer: parseInt(formData.usesPerCustomer),
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        isActive: formData.isActive,
        applicableProducts: [],
        applicableCategories: [],
        applicableCustomers: [],
        canCombine: formData.canCombine,
        influencerId: formData.influencerId || undefined,
      }

      const response = await fetch(`/api/coupons/${couponId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הקופון עודכן בהצלחה",
        })
        fetchCoupon()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת הקופון",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating coupon:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת הקופון",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!selectedShop) {
    return (
      <AppLayout title="קופון חדש">
        <div className="text-center py-12">
          <Tag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני יצירת קופון
          </p>
          <Button onClick={() => router.push("/coupons")}>
            חזור לרשימת קופונים
          </Button>
        </div>
      </AppLayout>
    )
  }

  if (loading) {
    return (
      <AppLayout title="עריכת קופון">
        <FormSkeleton />
      </AppLayout>
    )
  }

  if (!selectedShop) {
    return (
      <AppLayout title="עריכת קופון">
        <div className="text-center py-12">
          <Tag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני עריכת קופון
          </p>
          <Button onClick={() => router.push("/coupons")}>
            חזור לרשימת קופונים
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="עריכת קופון">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">עריכת קופון</h1>
            <p className="text-gray-600 mt-1">
              ערוך קופון לחנות: <span className="font-semibold">{selectedShop.name}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/coupons")}
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
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  מידע בסיסי
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">קוד קופון</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="השאר ריק ליצירה אוטומטית"
                  />
                  <p className="text-sm text-gray-500">
                    אם לא תזין קוד, יווצר קוד אוטומטי
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">סוג הנחה *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "PERCENTAGE" | "FIXED") =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">אחוז (%)</SelectItem>
                      <SelectItem value="FIXED">סכום קבוע (₪)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">
                    {formData.type === "PERCENTAGE" ? "אחוז הנחה *" : "סכום הנחה *"}
                  </Label>
                  <div className="relative">
                    {formData.type === "PERCENTAGE" ? (
                      <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    ) : (
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">₪</span>
                    )}
                    <Input
                      id="value"
                      type="number"
                      step={formData.type === "PERCENTAGE" ? "1" : "0.01"}
                      value={formData.value}
                      onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                      placeholder={formData.type === "PERCENTAGE" ? "10" : "50.00"}
                      className={formData.type === "PERCENTAGE" ? "pr-10" : "pr-10"}
                    />
                  </div>
                </div>

                {formData.type === "PERCENTAGE" && (
                  <div className="space-y-2">
                    <Label htmlFor="maxDiscount">מקסימום הנחה (₪)</Label>
                    <Input
                      id="maxDiscount"
                      type="number"
                      step="0.01"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, maxDiscount: e.target.value }))}
                      placeholder="לדוגמה: 100"
                    />
                    <p className="text-sm text-gray-500">
                      הגבלת סכום הנחה מקסימלי (אופציונלי)
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="minOrder">מינימום הזמנה (₪)</Label>
                  <Input
                    id="minOrder"
                    type="number"
                    step="0.01"
                    value={formData.minOrder}
                    onChange={(e) => setFormData((prev) => ({ ...prev, minOrder: e.target.value }))}
                    placeholder="לדוגמה: 100"
                  />
                  <p className="text-sm text-gray-500">
                    סכום מינימלי להזמנה כדי שהקופון יהיה תקף
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Usage Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  הגבלות שימוש
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUses">מספר שימושים מקסימלי</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    value={formData.maxUses}
                    onChange={(e) => setFormData((prev) => ({ ...prev, maxUses: e.target.value }))}
                    placeholder="ללא הגבלה"
                  />
                  <p className="text-sm text-gray-500">
                    השאר ריק ללא הגבלה
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usesPerCustomer">שימושים לכל לקוח</Label>
                  <Input
                    id="usesPerCustomer"
                    type="number"
                    value={formData.usesPerCustomer}
                    onChange={(e) => setFormData((prev) => ({ ...prev, usesPerCustomer: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  תאריכים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">תאריך התחלה</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">תאריך סיום</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Influencer Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  שיוך למשפיען
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="influencerId">משפיען (אופציונלי)</Label>
                  <Select
                    value={formData.influencerId || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, influencerId: value === "none" ? "" : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר משפיען..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא משפיען</SelectItem>
                      {influencers.map((influencer) => (
                        <SelectItem key={influencer.id} value={influencer.id}>
                          {influencer.name} ({influencer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    שייך קופון זה למשפיען לצורך מעקב וניתוח
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>סטטוס</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked as boolean }))
                    }
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    קופון פעיל
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="canCombine"
                    checked={formData.canCombine}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, canCombine: checked as boolean }))
                    }
                  />
                  <Label htmlFor="canCombine" className="cursor-pointer">
                    ניתן לשילוב עם הנחות אחרות
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

