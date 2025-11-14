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
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  AlertCircle,
  ShoppingBag,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface ProductAddon {
  id: string
  name: string
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT_INPUT" | "CHECKBOX"
  required: boolean
  scope: "GLOBAL" | "PRODUCT" | "CATEGORY"
  productIds: string[]
  categoryIds: string[]
  position: number
  values: AddonValue[]
}

interface AddonValue {
  id: string
  label: string
  price: number
  position: number
}

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
}

const ADDON_TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "בחירה אחת",
  MULTIPLE_CHOICE: "בחירה מרובה",
  TEXT_INPUT: "קלט טקסט",
  CHECKBOX: "תיבת סימון",
}

export default function ProductAddonsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addons, setAddons] = useState<ProductAddon[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAddon, setEditingAddon] = useState<ProductAddon | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    type: "SINGLE_CHOICE" as ProductAddon["type"],
    required: false,
    scope: "GLOBAL" as ProductAddon["scope"],
    productIds: [] as string[],
    categoryIds: [] as string[],
    position: 0,
    values: [] as { label: string; price: number; position: number }[],
  })

  const [newValue, setNewValue] = useState({ label: "", price: "" })

  useEffect(() => {
    if (selectedShop) {
      loadData()
    }
  }, [selectedShop])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [addonsRes, categoriesRes, productsRes] = await Promise.all([
        fetch(`/api/product-addons?shopId=${selectedShop?.id}`),
        fetch(`/api/categories?shopId=${selectedShop?.id}`),
        fetch(`/api/products?shopId=${selectedShop?.id}`),
      ])
      
      if (addonsRes.ok) {
        const data = await addonsRes.json()
        setAddons(data)
      }
      
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data)
      }
      
      if (productsRes.ok) {
        const data = await productsRes.json()
        setProducts(data.products || data)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הנתונים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setEditingAddon(null)
    setFormData({
      name: "",
      type: "SINGLE_CHOICE",
      required: false,
      scope: "GLOBAL",
      productIds: [],
      categoryIds: [],
      position: addons.length,
      values: [],
    })
    setNewValue({ label: "", price: "" })
    setDialogOpen(true)
  }
  
  // עדכון values כאשר משנים את סוג התוספת
  const handleTypeChange = (newType: ProductAddon["type"]) => {
    setFormData(prev => {
      // אם זה TEXT_INPUT או CHECKBOX, אתחל values עם ערך ברירת מחדל
      if (newType === "TEXT_INPUT" || newType === "CHECKBOX") {
        return {
          ...prev,
          type: newType,
          values: [{ label: prev.name || newType, price: 0, position: 0 }]
        }
      }
      // אחרת, נקה את values
      return {
        ...prev,
        type: newType,
        values: []
      }
    })
  }

  const handleEdit = (addon: ProductAddon) => {
    setEditingAddon(addon)
    setFormData({
      name: addon.name,
      type: addon.type,
      required: addon.required,
      scope: addon.scope,
      productIds: addon.productIds,
      categoryIds: addon.categoryIds,
      position: addon.position,
      values: addon.values.map(v => ({ label: v.label, price: v.price, position: v.position })),
    })
    setNewValue({ label: "", price: "" })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק תוספת זו?")) {
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/product-addons/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "התוספת נמחקה בהצלחה",
        })
        loadData()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה במחיקת התוספת",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting addon:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת התוספת",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addValue = () => {
    if (!newValue.label.trim() || !newValue.price) {
      toast({
        title: "שגיאה",
        description: "יש למלא תווית ומחיר",
        variant: "destructive",
      })
      return
    }

    setFormData(prev => ({
      ...prev,
      values: [
        ...prev.values,
        {
          label: newValue.label,
          price: parseFloat(newValue.price),
          position: prev.values.length,
        },
      ],
    }))
    setNewValue({ label: "", price: "" })
  }

  const removeValue = (index: number) => {
    setFormData(prev => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    if (!selectedShop) return

    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "יש למלא את שם התוספת",
        variant: "destructive",
      })
      return
    }

    if (formData.type !== "TEXT_INPUT" && formData.type !== "CHECKBOX" && formData.values.length === 0) {
      toast({
        title: "שגיאה",
        description: "יש להוסיף לפחות ערך אחד",
        variant: "destructive",
      })
      return
    }

    if (formData.scope === "PRODUCT" && formData.productIds.length === 0) {
      toast({
        title: "שגיאה",
        description: "יש לבחור לפחות מוצר אחד",
        variant: "destructive",
      })
      return
    }

    if (formData.scope === "CATEGORY" && formData.categoryIds.length === 0) {
      toast({
        title: "שגיאה",
        description: "יש לבחור לפחות קטגוריה אחת",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      const payload = {
        ...formData,
        shopId: selectedShop.id,
      }

      const response = await fetch(
        editingAddon
          ? `/api/product-addons/${editingAddon.id}`
          : "/api/product-addons",
        {
          method: editingAddon ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: editingAddon
            ? "התוספת עודכנה בהצלחה"
            : "התוספת נוצרה בהצלחה",
        })
        setDialogOpen(false)
        loadData()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בשמירת התוספת",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving addon:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת התוספת",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="תוספות למוצרים">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="תוספות למוצרים">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">תוספות למוצרים</h1>
            <p className="text-gray-600 mt-1">
              תוספות בתשלום שלקוחות יכולים להוסיף למוצרים (רקמה, אריזת מתנה, וכו')
            </p>
          </div>
          <Button
            onClick={handleCreateNew}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            תוספת חדשה
          </Button>
        </div>

        {/* Help Card */}
        {addons.length === 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    מה הן תוספות למוצרים?
                  </h3>
                  <p className="text-gray-700 text-sm">
                    תוספות מאפשרות ללקוחות להוסיף שירותים או מוצרים נוספים בתשלום,
                    כמו רקמה על בגד, אריזת מתנה, משלוח מהיר, וכו'. התוספות משפיעות
                    על המחיר הסופי ונשמרות בהזמנה.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Addons List */}
        {addons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                תוספות קיימות ({addons.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {addons.map((addon) => (
                  <div
                    key={addon.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <ShoppingBag className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{addon.name}</h3>
                          {addon.required && (
                            <Badge variant="destructive" className="text-xs">
                              חובה
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          <span>{ADDON_TYPE_LABELS[addon.type]}</span>
                          <span>•</span>
                          <span>
                            {addon.scope === "GLOBAL"
                              ? "גלובלי"
                              : addon.scope === "PRODUCT"
                              ? `${addon.productIds.length} מוצרים`
                              : `${addon.categoryIds.length} קטגוריות`}
                          </span>
                          {addon.values.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{addon.values.length} אפשרויות</span>
                            </>
                          )}
                        </div>
                        {addon.values.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {addon.values.slice(0, 3).map((value) => (
                              <Badge key={value.id} variant="outline" className="text-xs">
                                {value.label} (+₪{value.price})
                              </Badge>
                            ))}
                            {addon.values.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{addon.values.length - 3} עוד
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(addon)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(addon.id)}
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAddon ? "עריכת תוספת" : "תוספת חדשה"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">שם התוספת *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="לדוגמה: רקמה על הבגד"
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">סוג תוספת *</Label>
                <Select
                  value={formData.type}
                  onValueChange={handleTypeChange}
                  disabled={!!editingAddon}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE_CHOICE">בחירה אחת (Radio)</SelectItem>
                    <SelectItem value="MULTIPLE_CHOICE">בחירה מרובה (Checkboxes)</SelectItem>
                    <SelectItem value="TEXT_INPUT">קלט טקסט חופשי</SelectItem>
                    <SelectItem value="CHECKBOX">תיבת סימון בודדת</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scope */}
              <div className="space-y-2">
                <Label htmlFor="scope">תחום *</Label>
                <Select
                  value={formData.scope}
                  onValueChange={(value: any) =>
                    setFormData((prev) => ({ ...prev, scope: value, productIds: [], categoryIds: [] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLOBAL">גלובלי - לכל המוצרים</SelectItem>
                    <SelectItem value="PRODUCT">מוצרים ספציפיים</SelectItem>
                    <SelectItem value="CATEGORY">קטגוריות ספציפיות</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Product Selection */}
              {formData.scope === "PRODUCT" && (
                <div className="space-y-2">
                  <Label>בחר מוצרים *</Label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    {products.slice(0, 50).map((product) => (
                      <label
                        key={product.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.productIds.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData((prev) => ({
                                ...prev,
                                productIds: [...prev.productIds, product.id],
                              }))
                            } else {
                              setFormData((prev) => ({
                                ...prev,
                                productIds: prev.productIds.filter(
                                  (id) => id !== product.id
                                ),
                              }))
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{product.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Selection */}
              {formData.scope === "CATEGORY" && (
                <div className="space-y-2">
                  <Label>בחר קטגוריות *</Label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.categoryIds.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData((prev) => ({
                                ...prev,
                                categoryIds: [...prev.categoryIds, category.id],
                              }))
                            } else {
                              setFormData((prev) => ({
                                ...prev,
                                categoryIds: prev.categoryIds.filter(
                                  (id) => id !== category.id
                                ),
                              }))
                            }
                          }}
                          className="rounded"
                        />
                        <span>{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Values (for SINGLE_CHOICE and MULTIPLE_CHOICE) */}
              {(formData.type === "SINGLE_CHOICE" || formData.type === "MULTIPLE_CHOICE") && (
                <div className="space-y-2">
                  <Label>אפשרויות *</Label>
                  
                  {/* Add Value */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="תווית (לדוגמה: רקמה שם)"
                      value={newValue.label}
                      onChange={(e) => setNewValue((prev) => ({ ...prev, label: e.target.value }))}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addValue()
                        }
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="מחיר"
                      value={newValue.price}
                      onChange={(e) => setNewValue((prev) => ({ ...prev, price: e.target.value }))}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addValue()
                        }
                      }}
                      className="w-32"
                    />
                    <Button onClick={addValue} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Values List */}
                  {formData.values.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {formData.values.map((value, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span>{value.label}</span>
                            <Badge variant="secondary">
                              <DollarSign className="w-3 h-3 ml-1" />
                              ₪{value.price}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeValue(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Price for TEXT_INPUT */}
              {formData.type === "TEXT_INPUT" && (
                <div className="space-y-2">
                  <Label htmlFor="textInputPrice">מחיר התוספת (אופציונלי)</Label>
                  <Input
                    id="textInputPrice"
                    type="number"
                    placeholder="0.00"
                    value={formData.values[0]?.price || ""}
                    onChange={(e) => {
                      const price = parseFloat(e.target.value) || 0
                      setFormData(prev => ({
                        ...prev,
                        values: [{ label: prev.name || "קלט טקסט", price, position: 0 }]
                      }))
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    אם המחיר 0, התוספת תהיה בחינם (למשל: הערות מיוחדות)
                  </p>
                </div>
              )}

              {/* Price for CHECKBOX */}
              {formData.type === "CHECKBOX" && (
                <div className="space-y-2">
                  <Label htmlFor="checkboxPrice">מחיר התוספת *</Label>
                  <Input
                    id="checkboxPrice"
                    type="number"
                    placeholder="0.00"
                    value={formData.values[0]?.price || ""}
                    onChange={(e) => {
                      const price = parseFloat(e.target.value) || 0
                      setFormData(prev => ({
                        ...prev,
                        values: [{ label: prev.name || "תיבת סימון", price, position: 0 }]
                      }))
                    }}
                  />
                </div>
              )}

              {/* Required */}
              <div className="flex items-center justify-between">
                <Label htmlFor="required">תוספת חובה</Label>
                <Switch
                  id="required"
                  checked={formData.required}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, required: checked }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                ביטול
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "שומר..." : "שמור"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

