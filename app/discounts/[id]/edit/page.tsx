"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/components/ui/use-toast"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
import { Save, Tag, Zap, Percent, DollarSign, Package, Users, Calendar } from "lucide-react"

export default function EditDiscountPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const discountId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED" | "BUY_X_GET_Y" | "VOLUME_DISCOUNT" | "NTH_ITEM_DISCOUNT",
    value: "",
    buyQuantity: "",
    getQuantity: "",
    getDiscount: "",
    nthItem: "",
    minOrderAmount: "",
    maxDiscount: "",
    maxUses: "",
    usesPerCustomer: "1",
    startDate: "",
    endDate: "",
    isActive: true,
    isAutomatic: false,
    canCombine: false,
    priority: "0",
    target: "ALL_PRODUCTS" as string,
    customerTarget: "ALL_CUSTOMERS" as string,
  })

  useEffect(() => {
    if (discountId) {
      fetchDiscount()
    }
  }, [discountId])

  const fetchDiscount = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/discounts/${discountId}`)
      if (response.ok) {
        const discount = await response.json()
        
        let startDateFormatted = ""
        if (discount.startDate) {
          const date = new Date(discount.startDate)
          startDateFormatted = date.toISOString().slice(0, 16)
        }

        let endDateFormatted = ""
        if (discount.endDate) {
          const date = new Date(discount.endDate)
          endDateFormatted = date.toISOString().slice(0, 16)
        }

        setFormData({
          title: discount.title || "",
          description: discount.description || "",
          type: discount.type || "PERCENTAGE",
          value: discount.value?.toString() || "",
          buyQuantity: discount.buyQuantity?.toString() || "",
          getQuantity: discount.getQuantity?.toString() || "",
          getDiscount: discount.getDiscount?.toString() || "",
          nthItem: discount.nthItem?.toString() || "",
          minOrderAmount: discount.minOrderAmount?.toString() || "",
          maxDiscount: discount.maxDiscount?.toString() || "",
          maxUses: discount.maxUses?.toString() || "",
          usesPerCustomer: discount.usesPerCustomer?.toString() || "1",
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          isActive: discount.isActive ?? true,
          isAutomatic: discount.isAutomatic ?? false,
          canCombine: discount.canCombine ?? false,
          priority: discount.priority?.toString() || "0",
          target: discount.target || "ALL_PRODUCTS",
          customerTarget: discount.customerTarget || "ALL_CUSTOMERS",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את ההנחה",
          variant: "destructive",
        })
        router.push("/discounts")
      }
    } catch (error) {
      console.error("Error fetching discount:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת ההנחה",
        variant: "destructive",
      })
      router.push("/discounts")
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

    if (!formData.title.trim()) {
      toast({
        title: "שגיאה",
        description: "כותרת ההנחה היא חובה",
        variant: "destructive",
      })
      return
    }

    if (!formData.value || parseFloat(formData.value) < 0) {
      toast({
        title: "שגיאה",
        description: "ערך ההנחה חייב להיות מספר חיובי",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload: any = {
        shopId: selectedShop.id,
        title: formData.title.trim(),
        description: formData.description || undefined,
        type: formData.type,
        value: parseFloat(formData.value),
        buyQuantity: formData.buyQuantity ? parseInt(formData.buyQuantity) : undefined,
        getQuantity: formData.getQuantity ? parseInt(formData.getQuantity) : undefined,
        getDiscount: formData.getDiscount ? parseFloat(formData.getDiscount) : undefined,
        nthItem: formData.nthItem ? parseInt(formData.nthItem) : undefined,
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : undefined,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
        usesPerCustomer: parseInt(formData.usesPerCustomer),
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        isActive: formData.isActive,
        isAutomatic: formData.isAutomatic,
        canCombine: formData.canCombine,
        priority: parseInt(formData.priority),
        target: formData.target,
        customerTarget: formData.customerTarget,
        applicableProducts: [],
        applicableCategories: [],
        applicableCollections: [],
        excludedProducts: [],
        excludedCategories: [],
        excludedCollections: [],
        customerTiers: [],
        specificCustomers: [],
      }

      const response = await fetch(`/api/discounts/${discountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "ההנחה עודכנה בהצלחה",
        })
        fetchDiscount()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת ההנחה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating discount:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת ההנחה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="עריכת הנחה">
        <FormSkeleton />
      </AppLayout>
    )
  }

  if (!selectedShop) {
    return (
      <AppLayout title="עריכת הנחה">
        <div className="text-center py-12">
          <Tag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני עריכת הנחה
          </p>
          <Button onClick={() => router.push("/discounts")}>
            חזור לרשימת הנחות
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="עריכת הנחה">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">עריכת הנחה</h1>
            <p className="text-gray-600 mt-1">
              ערוך הנחה אוטומטית או קופון
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/discounts")}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" dir="rtl">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  פרטי הנחה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">כותרת *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="לדוגמה: הנחה 20% על כל המוצרים"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="תיאור ההנחה..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>סוג הנחה *</Label>
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
              </CardContent>
            </Card>

            {/* Target Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  החלה על
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ההנחה תחול על:</Label>
                  <RadioGroup
                    value={formData.target}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, target: value }))}
                  >
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="all" className="cursor-pointer flex-1 text-right">כל המוצרים</Label>
                      <RadioGroupItem value="ALL_PRODUCTS" id="all" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="products" className="cursor-pointer flex-1 text-right">מוצרים ספציפיים</Label>
                      <RadioGroupItem value="SPECIFIC_PRODUCTS" id="products" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="categories" className="cursor-pointer flex-1 text-right">קטגוריות ספציפיות</Label>
                      <RadioGroupItem value="SPECIFIC_CATEGORIES" id="categories" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="exclude-products" className="cursor-pointer flex-1 text-right">כל המוצרים חוץ מ-</Label>
                      <RadioGroupItem value="EXCLUDE_PRODUCTS" id="exclude-products" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="exclude-categories" className="cursor-pointer flex-1 text-right">כל המוצרים חוץ מקטגוריות</Label>
                      <RadioGroupItem value="EXCLUDE_CATEGORIES" id="exclude-categories" />
                    </div>
                  </RadioGroup>
                </div>

                {(formData.target === "SPECIFIC_PRODUCTS" ||
                  formData.target === "EXCLUDE_PRODUCTS" ||
                  formData.target === "SPECIFIC_CATEGORIES" ||
                  formData.target === "EXCLUDE_CATEGORIES") && (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      בחירת מוצרים/קטגוריות תתווסף בקרוב
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Target */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  החלה על לקוחות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ההנחה תחול על:</Label>
                  <RadioGroup
                    value={formData.customerTarget}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, customerTarget: value }))}
                  >
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="all-customers" className="cursor-pointer flex-1 text-right">כל הלקוחות</Label>
                      <RadioGroupItem value="ALL_CUSTOMERS" id="all-customers" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="registered" className="cursor-pointer flex-1 text-right">לקוחות רשומים בלבד</Label>
                      <RadioGroupItem value="REGISTERED_CUSTOMERS" id="registered" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="tiers" className="cursor-pointer flex-1 text-right">רמות לקוחות מסוימות</Label>
                      <RadioGroupItem value="CUSTOMER_TIERS" id="tiers" />
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Dates & Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  תוקף ושימושים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minOrderAmount">מינימום הזמנה (₪)</Label>
                    <Input
                      id="minOrderAmount"
                      type="number"
                      step="0.01"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
                      placeholder="0.00"
                    />
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
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxUses">מספר שימושים מקסימלי</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      value={formData.maxUses}
                      onChange={(e) => setFormData((prev) => ({ ...prev, maxUses: e.target.value }))}
                      placeholder="ללא הגבלה"
                    />
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
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>הגדרות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <Label htmlFor="isActive" className="cursor-pointer">
                    הנחה פעילה
                  </Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked as boolean }))
                    }
                  />
                </div>

                <div className="flex items-center justify-center gap-3">
                  <Label htmlFor="isAutomatic" className="cursor-pointer flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    הנחה אוטומטית (מוחלת ללא קוד)
                  </Label>
                  <Switch
                    id="isAutomatic"
                    checked={formData.isAutomatic}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isAutomatic: checked as boolean }))
                    }
                  />
                </div>

                <div className="flex items-center justify-center gap-3">
                  <Label htmlFor="canCombine" className="cursor-pointer">
                    ניתן לשלב עם הנחות אחרות
                  </Label>
                  <Switch
                    id="canCombine"
                    checked={formData.canCombine}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, canCombine: checked as boolean }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">עדיפות</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500">
                    הנחות עם עדיפות גבוהה יותר מוחלות קודם
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

