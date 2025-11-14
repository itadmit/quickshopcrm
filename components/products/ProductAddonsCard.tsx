"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Plus, AlertCircle, Settings } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ProductAddon {
  id: string
  name: string
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT_INPUT" | "CHECKBOX"
  required: boolean
  scope: "GLOBAL" | "PRODUCT" | "CATEGORY"
  productIds: string[]
  categoryIds: string[]
  values: {
    id: string
    label: string
    price: number
  }[]
}

interface ProductAddonsCardProps {
  productId?: string // עבור עריכה
  shopId: string
  categoryIds?: string[] // עבור יצירה חדשה
  onChange?: (addonIds: string[]) => void
}

const ADDON_TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "בחירה אחת",
  MULTIPLE_CHOICE: "בחירה מרובה",
  TEXT_INPUT: "קלט טקסט",
  CHECKBOX: "תיבת סימון",
}

export function ProductAddonsCard({
  productId,
  shopId,
  categoryIds = [],
  onChange,
}: ProductAddonsCardProps) {
  const [loading, setLoading] = useState(true)
  const [availableAddons, setAvailableAddons] = useState<ProductAddon[]>([])
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])

  // Memoize categoryIds to prevent unnecessary re-renders
  const categoryIdsKey = useMemo(() => categoryIds.sort().join(','), [categoryIds])

  useEffect(() => {
    if (shopId) {
      loadAddons()
    }
  }, [shopId, productId, categoryIdsKey])

  const loadAddons = async () => {
    try {
      setLoading(true)

      // טען את כל ה-addons של החנות
      const response = await fetch(`/api/product-addons?shopId=${shopId}`)
      if (!response.ok) {
        console.error("Failed to load addons")
        return
      }

      const allAddons: ProductAddon[] = await response.json()

      // סינון addons רלוונטיים
      const relevant = allAddons.filter((addon) => {
        // Global - תמיד רלוונטי
        if (addon.scope === "GLOBAL") {
          return true
        }

        // Product scope - רלוונטי אם המוצר נמצא ברשימה
        if (addon.scope === "PRODUCT" && productId) {
          return addon.productIds.includes(productId)
        }

        // Category scope - רלוונטי אם אחת מהקטגוריות נמצאת ברשימה
        if (addon.scope === "CATEGORY" && categoryIds.length > 0) {
          return addon.categoryIds.some((catId) => categoryIds.includes(catId))
        }

        return false
      })

      setAvailableAddons(relevant)

      // אם זה עריכה, הכל כבר בחור (כי ה-addons מסוננים לפי הרלוונטיות)
      if (productId) {
        setSelectedAddonIds(relevant.map((a) => a.id))
      }
    } catch (error) {
      console.error("Error loading addons:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAddon = (addonId: string, checked: boolean) => {
    const newSelectedIds = checked
      ? [...selectedAddonIds, addonId]
      : selectedAddonIds.filter((id) => id !== addonId)

    setSelectedAddonIds(newSelectedIds)
    onChange?.(newSelectedIds)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            תוספות למוצר
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">טוען...</div>
        </CardContent>
      </Card>
    )
  }

  if (availableAddons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            תוספות למוצר
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                לא הוגדרו תוספות רלוונטיות למוצר זה.
              </p>
              <Link href="/settings/product-addons">
                <Button variant="link" className="p-0 h-auto text-blue-600 text-sm">
                  ליצירת תוספות חדשות, לחץ כאן
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            תוספות למוצר
          </div>
          <Link href="/settings/product-addons">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 ml-2" />
              ניהול תוספות
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            תוספות אלו יוצגו ללקוחות בעת הצפייה במוצר ויאפשרו להם להוסיף שירותים
            נוספים בתשלום.
          </p>

          <div className="space-y-3">
            {availableAddons.map((addon) => (
              <div
                key={addon.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <Checkbox
                  id={`addon-${addon.id}`}
                  checked={selectedAddonIds.includes(addon.id)}
                  onCheckedChange={(checked) =>
                    handleToggleAddon(addon.id, checked as boolean)
                  }
                  disabled={addon.scope === "GLOBAL"}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={`addon-${addon.id}`}
                    className="cursor-pointer font-medium"
                  >
                    {addon.name}
                    {addon.required && (
                      <Badge variant="destructive" className="mr-2 text-xs">
                        חובה
                      </Badge>
                    )}
                    {addon.scope === "GLOBAL" && (
                      <Badge variant="secondary" className="mr-2 text-xs">
                        גלובלי
                      </Badge>
                    )}
                  </Label>
                  <div className="text-sm text-gray-600 mt-1">
                    {ADDON_TYPE_LABELS[addon.type]}
                    {addon.values.length > 0 && (
                      <span className="mr-2">• {addon.values.length} אפשרויות</span>
                    )}
                  </div>
                  {addon.values.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
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
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

