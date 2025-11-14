"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Save, Tag, Percent, DollarSign, Calendar, Users, UserCheck } from "lucide-react"

export default function NewCouponPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [saving, setSaving] = useState(false)
  const [influencers, setInfluencers] = useState<Array<{ id: string; name: string; email: string }>>([])
  
  const [formData, setFormData] = useState({
    code: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED" | "BUY_X_GET_Y" | "VOLUME_DISCOUNT" | "NTH_ITEM_DISCOUNT",
    value: "",
    buyQuantity: "",
    getQuantity: "",
    getDiscount: "",
    nthItem: "",
    volumeRules: [] as Array<{ quantity: number; discount: number }>,
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

  // Fetch influencers on mount
  useEffect(() => {
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
    fetchInfluencers()
  }, [])

  const handleSubmit = async () => {
    if (!selectedShop) {
      toast({
        title: "שגיאה",
        description: "יש לבחור חנות מההדר",
        variant: "destructive",
      })
      return
    }

    // Validation based on type
    if (formData.type === "PERCENTAGE" || formData.type === "FIXED") {
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
    } else if (formData.type === "BUY_X_GET_Y") {
      if (!formData.buyQuantity || !formData.getQuantity) {
        toast({
          title: "שגיאה",
          description: "יש למלא את כל השדות הנדרשים",
          variant: "destructive",
        })
        return
      }
    } else if (formData.type === "NTH_ITEM_DISCOUNT") {
      if (!formData.nthItem || !formData.value) {
        toast({
          title: "שגיאה",
          description: "יש למלא את כל השדות הנדרשים",
          variant: "destructive",
        })
        return
      }
    }

    setSaving(true)

    try {
      const payload: any = {
        shopId: selectedShop.id,
        code: formData.code || undefined,
        type: formData.type,
        value: formData.value ? parseFloat(formData.value) : (formData.type === "BUY_X_GET_Y" ? parseFloat(formData.buyQuantity || "0") : 0),
        buyQuantity: formData.buyQuantity ? parseInt(formData.buyQuantity) : undefined,
        getQuantity: formData.getQuantity ? parseInt(formData.getQuantity) : undefined,
        getDiscount: formData.getDiscount ? parseFloat(formData.getDiscount) : undefined,
        nthItem: formData.nthItem ? parseInt(formData.nthItem) : undefined,
        volumeRules: formData.volumeRules && formData.volumeRules.length > 0 ? formData.volumeRules : undefined,
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

      const response = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const coupon = await response.json()
        toast({
          title: "הצלחה",
          description: "הקופון נוצר בהצלחה",
        })
        router.push(`/coupons/${coupon.id}/edit`)
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

  return (
    <AppLayout title="קופון חדש">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">קופון חדש</h1>
            <p className="text-gray-600 mt-1">
              צור קופון חדש לחנות: <span className="font-semibold">{selectedShop.name}</span>
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
              {saving ? "שומר..." : "שמור קופון"}
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
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">אחוז הנחה</SelectItem>
                      <SelectItem value="FIXED">סכום קבוע</SelectItem>
                      <SelectItem value="BUY_X_GET_Y">קנה X קבל Y</SelectItem>
                      <SelectItem value="VOLUME_DISCOUNT">הנחת כמות</SelectItem>
                      <SelectItem value="NTH_ITEM_DISCOUNT">הנחה על מוצר N</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* PERCENTAGE / FIXED */}
                {(formData.type === "PERCENTAGE" || formData.type === "FIXED") && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="value">
                        {formData.type === "PERCENTAGE" ? "אחוז הנחה *" : "סכום הנחה *"}
                      </Label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          {formData.type === "PERCENTAGE" ? "%" : "₪"}
                        </span>
                        <Input
                          id="value"
                          type="number"
                          step="0.01"
                          value={formData.value}
                          onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                          placeholder="0.00"
                          className="pr-10"
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
                  </>
                )}

                {/* BUY_X_GET_Y */}
                {formData.type === "BUY_X_GET_Y" && (
                  <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="buyQuantity">קנה (X) *</Label>
                        <Input
                          id="buyQuantity"
                          type="number"
                          value={formData.buyQuantity}
                          onChange={(e) => setFormData((prev) => ({ ...prev, buyQuantity: e.target.value }))}
                          placeholder="2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="getQuantity">קבל (Y) *</Label>
                        <Input
                          id="getQuantity"
                          type="number"
                          value={formData.getQuantity}
                          onChange={(e) => setFormData((prev) => ({ ...prev, getQuantity: e.target.value }))}
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="getDiscount">הנחה על Y (%)</Label>
                        <Input
                          id="getDiscount"
                          type="number"
                          step="0.01"
                          value={formData.getDiscount}
                          onChange={(e) => setFormData((prev) => ({ ...prev, getDiscount: e.target.value }))}
                          placeholder="100"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      לדוגמה: קנה 2 קבל 1 בחינם = קנה 2, קבל 1, הנחה 100%
                    </p>
                  </div>
                )}

                {/* NTH_ITEM_DISCOUNT */}
                {formData.type === "NTH_ITEM_DISCOUNT" && (
                  <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nthItem">מוצר מספר *</Label>
                        <Input
                          id="nthItem"
                          type="number"
                          value={formData.nthItem}
                          onChange={(e) => setFormData((prev) => ({ ...prev, nthItem: e.target.value }))}
                          placeholder="3"
                        />
                        <p className="text-xs text-gray-500">לדוגמה: 3 = המוצר השלישי</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="value">אחוז הנחה *</Label>
                        <div className="relative">
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                          <Input
                            id="value"
                            type="number"
                            step="0.01"
                            value={formData.value}
                            onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                            placeholder="15"
                            className="pr-10"
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      לדוגמה: 15% הנחה על המוצר השלישי
                    </p>
                  </div>
                )}

                {/* VOLUME_DISCOUNT */}
                {formData.type === "VOLUME_DISCOUNT" && (
                  <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                    <Label>הנחת כמות (בפיתוח)</Label>
                    <p className="text-sm text-gray-600">
                      תכונה זו תתווסף בקרוב. תוכל להגדיר הנחות לפי כמות (למשל: קנה 3+ קבל 10% הנחה, קנה 5+ קבל 15% הנחה)
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

