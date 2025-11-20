"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  Plus,
  Edit2,
  Trash2,
  Settings,
  FileText,
  Calendar,
  Hash,
  Link as LinkIcon,
  Palette,
  CheckSquare,
  FileImage,
  AlertCircle,
} from "lucide-react"
import { DataListTable, DataListItem } from "@/components/ui/DataListTable"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface CustomFieldDefinition {
  id: string
  namespace: string
  key: string
  label: string
  type: string
  description: string | null
  required: boolean
  validations: any
  scope: "GLOBAL" | "CATEGORY"
  categoryIds: string[]
  showInStorefront: boolean
  position: number
  createdAt: string
  updatedAt: string
}

interface Category {
  id: string
  name: string
}

const FIELD_TYPE_ICONS: Record<string, any> = {
  TEXT: FileText,
  RICH_TEXT: FileText,
  DATE: Calendar,
  COLOR: Palette,
  CHECKBOX: CheckSquare,
  NUMBER: Hash,
  URL: LinkIcon,
  FILE: FileImage,
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: "טקסט",
  RICH_TEXT: "טקסט עשיר",
  DATE: "תאריך",
  COLOR: "צבע",
  CHECKBOX: "תיבת סימון",
  NUMBER: "מספר",
  URL: "קישור",
  FILE: "קובץ",
}

export default function CustomFieldsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDefinition, setEditingDefinition] = useState<CustomFieldDefinition | null>(null)
  
  const [formData, setFormData] = useState({
    namespace: "custom",
    key: "",
    label: "",
    type: "TEXT" as string,
    description: "",
    required: false,
    scope: "GLOBAL" as "GLOBAL" | "CATEGORY",
    categoryIds: [] as string[],
    showInStorefront: false,
    position: 0,
  })

  useEffect(() => {
    if (selectedShop) {
      loadData()
    }
  }, [selectedShop])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load custom fields
      const fieldsRes = await fetch(`/api/custom-fields?shopId=${selectedShop?.id}`)
      if (fieldsRes.ok) {
        const data = await fieldsRes.json()
        setDefinitions(data)
      }
      
      // Load categories
      const categoriesRes = await fetch(`/api/categories?shopId=${selectedShop?.id}`)
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data)
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
    setEditingDefinition(null)
    setFormData({
      namespace: "custom",
      key: "",
      label: "",
      type: "TEXT",
      description: "",
      required: false,
      scope: "GLOBAL",
      categoryIds: [],
      showInStorefront: false,
      position: definitions.length,
    })
    setDialogOpen(true)
  }

  const handleEdit = (definition: CustomFieldDefinition) => {
    setEditingDefinition(definition)
    setFormData({
      namespace: definition.namespace,
      key: definition.key,
      label: definition.label,
      type: definition.type,
      description: definition.description || "",
      required: definition.required,
      scope: definition.scope,
      categoryIds: definition.categoryIds,
      showInStorefront: definition.showInStorefront,
      position: definition.position,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/custom-fields/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "השדה נמחק בהצלחה",
        })
        loadData()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה במחיקת השדה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting field:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת השדה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!selectedShop) return

    // Validation
    if (!formData.label.trim()) {
      toast({
        title: "שגיאה",
        description: "יש למלא את שם השדה",
        variant: "destructive",
      })
      return
    }

    if (!formData.key.trim()) {
      toast({
        title: "שגיאה",
        description: "יש למלא את מזהה השדה",
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
        editingDefinition
          ? `/api/custom-fields/${editingDefinition.id}`
          : "/api/custom-fields",
        {
          method: editingDefinition ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: editingDefinition
            ? "השדה עודכן בהצלחה"
            : "השדה נוצר בהצלחה",
        })
        setDialogOpen(false)
        loadData()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בשמירת השדה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving field:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת השדה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="שדות מותאמים אישית">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="שדות מותאמים אישית">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">שדות מותאמים אישית</h1>
            <p className="text-gray-600 mt-1">
              הוסף שדות נוספים למוצרים שלך
            </p>
          </div>
          <Button
            onClick={handleCreateNew}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            שדה חדש
          </Button>
        </div>

        {/* Help Card */}
        {definitions.length === 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    מה הם שדות מותאמים אישית?
                  </h3>
                  <p className="text-gray-700 text-sm">
                    שדות מותאמים אישית מאפשרים לך להוסיף מידע נוסף למוצרים שלך, כמו רכיבים,
                    הוראות כביסה, מקור, ועוד. השדות יופיעו בכל מוצר ותוכל להציג אותם
                    בחנות הווירטואלית.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fields List */}
        {definitions.length > 0 && (
          <DataListTable
            title={`שדות קיימים (${definitions.length})`}
            items={definitions.map((definition): DataListItem => {
              const Icon = FIELD_TYPE_ICONS[definition.type]
              const subtitle = (
                <>
                  <span>
                    {definition.namespace}.{definition.key}
                  </span>
                  <span>•</span>
                  <span>{FIELD_TYPE_LABELS[definition.type]}</span>
                  <span>•</span>
                  <span>
                    {definition.scope === "GLOBAL"
                      ? "גלובלי"
                      : `${definition.categoryIds.length} קטגוריות`}
                  </span>
                </>
              )

              const badges = []
              if (definition.required) {
                badges.push({ label: "חובה", variant: "destructive" as const })
              }
              if (definition.showInStorefront) {
                badges.push({ label: "מוצג בחנות", variant: "default" as const })
              }

              return {
                id: definition.id,
                title: definition.label,
                subtitle,
                meta: definition.description,
                icon: Icon,
                iconBgColor: "bg-emerald-100",
                iconColor: "text-emerald-600",
                badges: badges.length > 0 ? badges : undefined,
                originalData: definition,
              }
            })}
            searchPlaceholder="חפש שדות..."
            onEdit={(item) => handleEdit(item.originalData as CustomFieldDefinition)}
            onDelete={(item) => handleDelete(item.id)}
            deleteConfirmMessage="האם אתה בטוח שברצונך למחוק שדה זה? כל הערכים במוצרים ימחקו גם כן."
          />
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDefinition ? "עריכת שדה" : "שדה חדש"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Label */}
              <div className="space-y-2">
                <Label htmlFor="label">שם השדה *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, label: e.target.value }))
                  }
                  placeholder="לדוגמה: מרכיבים"
                />
              </div>

              {/* Key */}
              <div className="space-y-2">
                <Label htmlFor="key">מזהה ייחודי *</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                    }))
                  }
                  placeholder="לדוגמה: ingredients"
                  disabled={!!editingDefinition}
                />
                <p className="text-xs text-gray-500">
                  רק אותיות אנגליות קטנות, מספרים וקו תחתון. לא ניתן לשנות לאחר היצירה.
                </p>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">סוג שדה *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                  disabled={!!editingDefinition}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">הסבר (אופציונלי)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="הסבר קצר על מה השדה הזה"
                  rows={2}
                />
              </div>

              {/* Namespace */}
              <div className="space-y-2">
                <Label htmlFor="namespace">Namespace</Label>
                <Input
                  id="namespace"
                  value={formData.namespace}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      namespace: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                    }))
                  }
                  placeholder="custom"
                  disabled={!!editingDefinition}
                />
                <p className="text-xs text-gray-500">
                  מאפשר ארגון של שדות לקבוצות (לדוגמה: custom, product, shipping)
                </p>
              </div>

              {/* Scope */}
              <div className="space-y-2">
                <Label htmlFor="scope">תחום *</Label>
                <Select
                  value={formData.scope}
                  onValueChange={(value: "GLOBAL" | "CATEGORY") =>
                    setFormData((prev) => ({ ...prev, scope: value, categoryIds: [] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLOBAL">גלובלי - לכל המוצרים</SelectItem>
                    <SelectItem value="CATEGORY">קטגוריה - למוצרים בקטגוריות ספציפיות</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

              {/* Required */}
              <div className="flex items-center justify-between">
                <Label htmlFor="required">שדה חובה</Label>
                <Switch
                  id="required"
                  checked={formData.required}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, required: checked }))
                  }
                />
              </div>

              {/* Show in Storefront */}
              <div className="flex items-center justify-between">
                <Label htmlFor="showInStorefront">הצג בחנות</Label>
                <Switch
                  id="showInStorefront"
                  checked={formData.showInStorefront}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, showInStorefront: checked }))
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

