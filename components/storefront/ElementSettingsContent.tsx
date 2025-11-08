"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlignRight, AlignCenter, AlignLeft, ChevronRight, RotateCcw } from "lucide-react"
import { ProductPageElementType, ElementStyleConfig } from "./ElementSettingsDialog"

interface ElementSettingsContentProps {
  elementType: ProductPageElementType
  elementName: string
  currentConfig?: ElementStyleConfig
  onSave: (config: ElementStyleConfig) => void
  onCancel: () => void
}

const availableFonts = [
  { value: "var(--font-noto-sans-hebrew), sans-serif", label: "Noto Sans Hebrew" },
  { value: "Assistant, sans-serif", label: "Assistant" },
  { value: "Heebo, sans-serif", label: "Heebo" },
  { value: "Open Sans Hebrew, sans-serif", label: "Open Sans Hebrew" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Helvetica, sans-serif", label: "Helvetica" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Times New Roman, serif", label: "Times New Roman" },
]

const fontWeightOptions = [
  { value: "300", label: "דק (300)" },
  { value: "400", label: "רגיל (400)" },
  { value: "500", label: "בינוני (500)" },
  { value: "600", label: "חצי עבה (600)" },
  { value: "700", label: "עבה (700)" },
  { value: "800", label: "עבה מאוד (800)" },
  { value: "900", label: "עבה ביותר (900)" },
]

const defaultStyles: Record<ProductPageElementType, ElementStyleConfig> = {
  "product-name": {
    fontFamily: "var(--font-noto-sans-hebrew), sans-serif",
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.2,
    textAlign: "right",
    marginTop: 0,
    marginBottom: 16,
  },
  "product-price": {
    fontFamily: "var(--font-noto-sans-hebrew), sans-serif",
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.3,
    textAlign: "right",
    marginTop: 0,
    marginBottom: 24,
    priceColor: "#000000",
    comparePriceFontSize: 16,
    comparePriceColor: "#6b7280",
  },
  "product-description": {
    fontFamily: "var(--font-noto-sans-hebrew), sans-serif",
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.6,
    textAlign: "right",
    marginTop: 0,
    marginBottom: 24,
  },
  "product-gallery": {
    marginTop: 0,
    marginBottom: 0,
  },
  "product-variants": {
    fontFamily: "var(--font-noto-sans-hebrew), sans-serif",
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.5,
    textAlign: "right",
    marginTop: 0,
    marginBottom: 16,
  },
  "product-quantity": {
    fontFamily: "var(--font-noto-sans-hebrew), sans-serif",
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.5,
    textAlign: "right",
    marginTop: 0,
    marginBottom: 16,
  },
  "product-buttons": {
    marginTop: 0,
    marginBottom: 0,
  },
  "product-reviews": {
    fontFamily: "var(--font-noto-sans-hebrew), sans-serif",
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.6,
    textAlign: "right",
    marginTop: 0,
    marginBottom: 24,
  },
  "product-related": {
    fontFamily: "var(--font-noto-sans-hebrew), sans-serif",
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1.3,
    textAlign: "right",
    marginTop: 48,
    marginBottom: 32,
  },
  "custom-text": {
    fontFamily: "var(--font-noto-sans-hebrew), sans-serif",
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.6,
    textAlign: "right",
    marginTop: 0,
    marginBottom: 24,
  },
  "custom-accordion": {
    fontFamily: "var(--font-noto-sans-hebrew), sans-serif",
    fontSize: 16,
    fontWeight: 500,
    lineHeight: 1.6,
    textAlign: "right",
    marginTop: 0,
    marginBottom: 24,
  },
  "custom-html": {
    marginTop: 0,
    marginBottom: 24,
  },
}

export function ElementSettingsContent({
  elementType,
  elementName,
  currentConfig,
  onSave,
  onCancel,
}: ElementSettingsContentProps) {
  const [config, setConfig] = useState<ElementStyleConfig>(() => {
    return { ...defaultStyles[elementType], ...currentConfig }
  })

  useEffect(() => {
    setConfig({ ...defaultStyles[elementType], ...currentConfig })
  }, [elementType, currentConfig])

  const handleSave = () => {
    onSave(config)
  }

  const handleReset = () => {
    setConfig({ ...defaultStyles[elementType] })
  }

  const hasTextStyling = !["product-gallery", "product-buttons", "custom-html"].includes(elementType)

  return (
    <div className="space-y-4">
      <div className="mb-4 flex items-center gap-2 pb-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="p-2"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <h3 className="text-sm font-semibold">
          הגדרות {elementName}
        </h3>
      </div>

      {hasTextStyling && (
        <>
          {/* פונט */}
          <div>
            <Label>פונט</Label>
            <Select
              value={config.fontFamily || defaultStyles[elementType].fontFamily}
              onValueChange={(value) =>
                setConfig({ ...config, fontFamily: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFonts.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* גודל פונט */}
          <div>
            <Label>גודל פונט (px)</Label>
            <Input
              type="number"
              value={config.fontSize || defaultStyles[elementType].fontSize || 16}
              onChange={(e) =>
                setConfig({ ...config, fontSize: parseInt(e.target.value) || 16 })
              }
              min="8"
              max="120"
            />
          </div>

          {/* עובי פונט */}
          <div>
            <Label>עובי פונט</Label>
            <Select
              value={String(config.fontWeight || defaultStyles[elementType].fontWeight || 400)}
              onValueChange={(value) =>
                setConfig({ ...config, fontWeight: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontWeightOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* גובה שורה */}
          <div>
            <Label>גובה שורה</Label>
            <Input
              type="number"
              step="0.1"
              value={config.lineHeight || defaultStyles[elementType].lineHeight || 1.5}
              onChange={(e) =>
                setConfig({ ...config, lineHeight: parseFloat(e.target.value) || 1.5 })
              }
              min="0.5"
              max="3"
            />
            <p className="text-xs text-gray-500 mt-1">
              ערך מומלץ: 1.2-1.6
            </p>
          </div>

          {/* יישור */}
          <div>
            <Label>יישור טקסט</Label>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={config.textAlign === "right" ? "default" : "outline"}
                onClick={() => setConfig({ ...config, textAlign: "right" })}
                className="flex-1"
              >
                <AlignRight className="w-4 h-4 ml-2" />
                ימין
              </Button>
              <Button
                type="button"
                variant={config.textAlign === "center" ? "default" : "outline"}
                onClick={() => setConfig({ ...config, textAlign: "center" })}
                className="flex-1"
              >
                <AlignCenter className="w-4 h-4 ml-2" />
                מרכז
              </Button>
              <Button
                type="button"
                variant={config.textAlign === "left" ? "default" : "outline"}
                onClick={() => setConfig({ ...config, textAlign: "left" })}
                className="flex-1"
              >
                <AlignLeft className="w-4 h-4 ml-2" />
                שמאל
              </Button>
            </div>
          </div>
        </>
      )}

      {/* הגדרות מיוחדות למחיר */}
      {elementType === "product-price" && (
        <div className="pt-4 border-t">
          <h3 className="font-semibold text-sm mb-3">הגדרות מחיר</h3>
          
          {/* צבע מחיר רגיל */}
          <div className="mb-4">
            <Label>צבע מחיר רגיל</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="color"
                value={config.priceColor || "#000000"}
                onChange={(e) =>
                  setConfig({ ...config, priceColor: e.target.value })
                }
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={config.priceColor || "#000000"}
                onChange={(e) =>
                  setConfig({ ...config, priceColor: e.target.value })
                }
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>

          {/* גודל מחיר מחוק */}
          <div className="mb-4">
            <Label>גודל מחיר מחוק (px)</Label>
            <Input
              type="number"
              value={config.comparePriceFontSize || 16}
              onChange={(e) =>
                setConfig({ ...config, comparePriceFontSize: parseInt(e.target.value) || 16 })
              }
              min="8"
              max="120"
            />
          </div>

          {/* צבע מחיר מחוק */}
          <div>
            <Label>צבע מחיר מחוק</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="color"
                value={config.comparePriceColor || "#6b7280"}
                onChange={(e) =>
                  setConfig({ ...config, comparePriceColor: e.target.value })
                }
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={config.comparePriceColor || "#6b7280"}
                onChange={(e) =>
                  setConfig({ ...config, comparePriceColor: e.target.value })
                }
                placeholder="#6b7280"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* מרווחים */}
      <div className="pt-4 border-t">
        <h3 className="font-semibold text-sm mb-3">מרווחים</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>מרווח עליון (px)</Label>
            <Input
              type="number"
              value={config.marginTop ?? (defaultStyles[elementType].marginTop ?? 0)}
              onChange={(e) =>
                setConfig({ ...config, marginTop: parseInt(e.target.value) || 0 })
              }
              min="0"
            />
          </div>
          <div>
            <Label>מרווח תחתון (px)</Label>
            <Input
              type="number"
              value={config.marginBottom ?? (defaultStyles[elementType].marginBottom ?? 0)}
              onChange={(e) =>
                setConfig({ ...config, marginBottom: parseInt(e.target.value) || 0 })
              }
              min="0"
            />
          </div>
        </div>
      </div>

      {/* כפתורי שמירה */}
      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          ביטול
        </Button>
        <Button 
          variant="outline" 
          onClick={handleReset}
          className="px-3"
          title="איפוס הגדרות תבנית"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button onClick={handleSave} className="flex-1">
          שמור
        </Button>
      </div>
    </div>
  )
}

