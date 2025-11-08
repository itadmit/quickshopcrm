"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlignRight, AlignCenter, AlignLeft, ChevronRight } from "lucide-react"
import { ProductPageElementType } from "./ProductPageLayoutDesigner"

export interface ElementStyleConfig {
  fontFamily?: string
  fontSize?: number
  fontWeight?: number | string
  lineHeight?: number
  textAlign?: "right" | "center" | "left"
  color?: string
  marginTop?: number
  marginBottom?: number
  paddingTop?: number
  paddingBottom?: number
  // הגדרות מיוחדות למחיר
  comparePriceFontSize?: number // גודל מחיר מחוק
  priceColor?: string // צבע מחיר רגיל
  comparePriceColor?: string // צבע מחיר מחוק
}

interface ElementSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  elementType: ProductPageElementType
  elementName: string
  currentConfig?: ElementStyleConfig
  onSave: (config: ElementStyleConfig) => void
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

// הגדרות ברירת מחדל לכל סוג אלמנט
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

export function ElementSettingsDialog({
  open,
  onOpenChange,
  elementType,
  elementName,
  currentConfig,
  onSave,
}: ElementSettingsDialogProps) {
  const [config, setConfig] = useState<ElementStyleConfig>(() => {
    return { ...defaultStyles[elementType], ...currentConfig }
  })

  useEffect(() => {
    if (open) {
      setConfig({ ...defaultStyles[elementType], ...currentConfig })
    }
  }, [open, elementType, currentConfig])

  const handleSave = () => {
    onSave(config)
    onOpenChange(false)
  }

  const hasTextStyling = !["product-gallery", "product-buttons", "custom-html"].includes(elementType)

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="right">
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" dir="rtl">
        <SheetHeader>
          <SheetTitle>הגדרות {elementName}</SheetTitle>
          <SheetDescription>
            התאם את העיצוב והסגנון של האלמנט
          </SheetDescription>
        </SheetHeader>

        <SheetBody>

        <div className="space-y-4 mt-4">
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
        </div>
        </SheetBody>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={handleSave}>
            שמור
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

