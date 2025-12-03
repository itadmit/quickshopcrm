"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlignRight, AlignCenter, AlignLeft, ChevronRight, RotateCcw, Monitor, Smartphone, Database } from "lucide-react"
import { ProductPageElementType } from "./ProductPageLayoutDesigner"
import { ElementStyleConfig } from "./ElementSettingsDialog"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { cn } from "@/lib/utils"

interface CustomField {
  definition: {
    id: string
    label: string
    type: string
  }
  value: string | null
  valueId: string | null
}

interface ElementSettingsContentProps {
  elementType: ProductPageElementType
  elementName: string
  currentConfig?: ElementStyleConfig & { content?: string; title?: string }
  onSave: (config: ElementStyleConfig & { content?: string; title?: string }) => void
  onStyleChange?: (config: ElementStyleConfig & { content?: string; title?: string }) => void
  onCancel: () => void
  viewMode?: "desktop" | "mobile"
  onViewModeChange?: (mode: "desktop" | "mobile") => void
  productId?: string
  customFields?: CustomField[]
}

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
    fontSizeDesktop: 32,
    fontSizeMobile: 24,
    fontWeight: 700,
    lineHeight: 1.2,
    textAlign: "right",
    textAlignDesktop: "right",
    textAlignMobile: "right",
    marginTop: 0,
    marginBottom: 16,
  },
  "product-price": {
    fontSizeDesktop: 28,
    fontSizeMobile: 22,
    fontWeight: 700,
    lineHeight: 1.3,
    textAlign: "right",
    textAlignDesktop: "right",
    textAlignMobile: "right",
    marginTop: 0,
    marginBottom: 24,
    priceColor: "#000000",
    comparePriceFontSize: 16,
    comparePriceColor: "#6b7280",
  },
  "product-description": {
    fontSizeDesktop: 16,
    fontSizeMobile: 14,
    fontWeight: 400,
    lineHeight: 1.6,
    textAlign: "right",
    textAlignDesktop: "right",
    textAlignMobile: "right",
    marginTop: 0,
    marginBottom: 24,
  },
  "product-gallery": {
    marginTop: 0,
    marginBottom: 0,
  },
  "product-variants": {
    fontSizeDesktop: 14,
    fontSizeMobile: 14,
    fontWeight: 500,
    lineHeight: 1.5,
    textAlign: "right",
    textAlignDesktop: "right",
    textAlignMobile: "right",
    marginTop: 0,
    marginBottom: 16,
    // הגדרות ברירת מחדל לוריאציות
    variantColorShape: "circle",
    variantColorSize: 40,
    variantColorBorderColor: "#10b981",
    variantButtonShape: "rounded",
    variantButtonSize: 40,
    variantButtonBgColor: "#10b981",
    variantButtonBorderColor: "#d1d5db",
    variantButtonTextColor: "#000000",
    variantButtonTextColorSelected: "#ffffff",
  },
  "product-quantity": {
    fontSizeDesktop: 14,
    fontSizeMobile: 14,
    fontWeight: 500,
    lineHeight: 1.5,
    textAlign: "right",
    textAlignDesktop: "right",
    textAlignMobile: "right",
    marginTop: 0,
    marginBottom: 16,
  },
  "product-buttons": {
    marginTop: 0,
    marginBottom: 0,
  },
  "product-reviews": {
    fontSizeDesktop: 16,
    fontSizeMobile: 14,
    fontWeight: 400,
    lineHeight: 1.6,
    textAlign: "right",
    textAlignDesktop: "right",
    textAlignMobile: "right",
    marginTop: 0,
    marginBottom: 24,
  },
  "product-related": {
    fontSizeDesktop: 24,
    fontSizeMobile: 20,
    fontWeight: 700,
    lineHeight: 1.3,
    textAlign: "right",
    textAlignDesktop: "right",
    textAlignMobile: "right",
    marginTop: 48,
    marginBottom: 32,
  },
  "custom-text": {
    fontSizeDesktop: 16,
    fontSizeMobile: 14,
    fontWeight: 400,
    lineHeight: 1.6,
    textAlign: "right",
    textAlignDesktop: "right",
    textAlignMobile: "right",
    marginTop: 0,
    marginBottom: 24,
  },
  "custom-accordion": {
    fontSizeDesktop: 16,
    fontSizeMobile: 14,
    fontWeight: 500,
    lineHeight: 1.6,
    textAlign: "right",
    textAlignDesktop: "right",
    textAlignMobile: "right",
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
  onStyleChange,
  onCancel,
  viewMode: externalViewMode,
  onViewModeChange,
  productId,
  customFields = [],
}: ElementSettingsContentProps) {
  const [internalViewMode, setInternalViewMode] = useState<"desktop" | "mobile">("desktop")
  const viewMode = externalViewMode ?? internalViewMode
  
  const setViewMode = (mode: "desktop" | "mobile") => {
    if (onViewModeChange) {
      onViewModeChange(mode)
    } else {
      setInternalViewMode(mode)
    }
  }
  const [config, setConfig] = useState<ElementStyleConfig & { content?: string; title?: string }>(() => {
    return { ...defaultStyles[elementType], ...currentConfig }
  })
  const [content, setContent] = useState<string>(currentConfig?.content || "")
  const [title, setTitle] = useState<string>(currentConfig?.title || "")

  useEffect(() => {
    const newConfig = { ...defaultStyles[elementType], ...currentConfig }
    setConfig(newConfig)
    setContent(currentConfig?.content || "")
    setTitle(currentConfig?.title || "")
  }, [elementType, currentConfig])

  // עדכון מצב התצוגה המקדימה
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const iframe = document.querySelector('iframe') as HTMLIFrameElement
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: "setViewMode",
          mode: viewMode
        },
        window.location.origin
      )
    }
  }, [viewMode])

  const handleSave = () => {
    const fullConfig = { ...config, content, title }
    onSave(fullConfig)
  }

  const handleReset = () => {
    const resetConfig = { ...defaultStyles[elementType] }
    setConfig(resetConfig)
    setContent("")
    setTitle("")
    onStyleChange?.(resetConfig)
  }

  const handleInsertCustomField = (fieldValue: string) => {
    // מצא את ה-editor element
    const editorElement = document.querySelector('[contenteditable="true"]') as HTMLDivElement
    if (editorElement) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        // יש בחירה - הכנס במקום הנבחר
        const range = selection.getRangeAt(0)
        range.deleteContents()
        const textNode = document.createTextNode(fieldValue)
        range.insertNode(textNode)
        range.setStartAfter(textNode)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        // עדכן את התוכן
        setContent(editorElement.innerHTML)
      } else {
        // אין בחירה - הוסף בסוף
        const textNode = document.createTextNode(fieldValue)
        editorElement.appendChild(textNode)
        setContent(editorElement.innerHTML)
      }
      // התמקד ב-editor
      editorElement.focus()
    } else {
      // אם אין editor, פשוט הוסף לטקסט
      setContent(prev => prev ? prev + " " + fieldValue : fieldValue)
    }
  }

  // עדכון בזמן אמת כשמשנים הגדרות (עם debounce קל)
  useEffect(() => {
    if (!onStyleChange) return
    
    const timeoutId = setTimeout(() => {
      const fullConfig = { ...config, content, title }
      onStyleChange(fullConfig)
    }, 300) // debounce של 300ms

    return () => clearTimeout(timeoutId)
  }, [config, content, title, onStyleChange])

  const hasTextStyling = !["product-gallery", "product-buttons", "custom-html"].includes(elementType)
  const hasContentEditing = ["custom-text", "custom-accordion"].includes(elementType)

  return (
    <div className="space-y-4" dir="rtl">
      {/* עריכת תוכן עבור custom-text ו-custom-accordion */}
      {hasContentEditing && (
        <div className="space-y-3 pb-4 border-b">
          
          {elementType === "custom-text" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">כותרת (אופציונלי)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="כותרת"
                className="h-9 text-sm"
              />
            </div>
          )}
          
          {elementType === "custom-accordion" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-700">כותרת אקורדיון</Label>
                {customFields.length > 0 ? (
                  <Select
                    onValueChange={(value) => {
                      const field = customFields.find(f => f.definition.id === value)
                      if (field && field.value) {
                        setTitle(field.value || "")
                        const fullConfig = { ...config, content, title: field.value || "" }
                        onStyleChange?.(fullConfig)
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-auto border-dashed">
                      <Database className="w-3 h-3 ml-1" />
                      <SelectValue placeholder="הוסף מקאסטום פילד" />
                    </SelectTrigger>
                    <SelectContent>
                      {customFields
                        .filter(f => f.value && (f.definition.type === "TEXT" || f.definition.type === "RICH_TEXT"))
                        .map((field: any) => (
                          <SelectItem key={field.definition.id} value={field.definition.id}>
                            {field.definition.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    onValueChange={() => {
                      if (productId) {
                        window.open(`/products/${productId}/edit?tab=custom-fields`, '_blank')
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-auto border-dashed">
                      <Database className="w-3 h-3 ml-1" />
                      <SelectValue placeholder="אין עדיין" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-3 text-center">
                        <p className="text-xs text-gray-600 mb-2">אין עדיין קאסטום פילדס</p>
                        {productId && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`/products/${productId}/edit?tab=custom-fields`, '_blank')
                            }}
                            className="w-full h-7 text-xs"
                          >
                            ליצור
                          </Button>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="כותרת"
                className="h-9 text-sm"
              />
            </div>
          )}
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-700">
                {elementType === "custom-text" ? "תוכן" : "תוכן האקורדיון"}
              </Label>
              {customFields.length > 0 ? (
                <Select
                  onValueChange={(value) => {
                    const field = customFields.find(f => f.definition.id === value)
                    if (field && field.value) {
                      setTimeout(() => {
                        handleInsertCustomField(field.value || "")
                      }, 100)
                    }
                  }}
                >
                  <SelectTrigger className="h-7 text-xs w-auto border-dashed">
                    <Database className="w-3 h-3 ml-1" />
                    <SelectValue placeholder="הוסף מקאסטום פילד" />
                  </SelectTrigger>
                  <SelectContent>
                    {customFields
                      .filter(f => f.value && (f.definition.type === "TEXT" || f.definition.type === "RICH_TEXT"))
                      .map((field: any) => (
                        <SelectItem key={field.definition.id} value={field.definition.id}>
                          {field.definition.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  onValueChange={() => {
                    if (productId) {
                      window.open(`/products/${productId}/edit?tab=custom-fields`, '_blank')
                    }
                  }}
                >
                  <SelectTrigger className="h-7 text-xs w-auto border-dashed">
                    <Database className="w-3 h-3 ml-1" />
                    <SelectValue placeholder="אין עדיין" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-3 text-center">
                      <p className="text-xs text-gray-600 mb-2">אין עדיין קאסטום פילדס</p>
                      {productId && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`/products/${productId}/edit?tab=custom-fields`, '_blank')
                          }}
                          className="w-full h-7 text-xs"
                        >
                          ליצור
                        </Button>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              )}
            </div>
            <RichTextEditor
              value={content}
              onChange={(value) => {
                setContent(value)
                const fullConfig = { ...config, content: value, title }
                onStyleChange?.(fullConfig)
              }}
              placeholder={elementType === "custom-text" ? "הזן טקסט..." : "תוכן האקורדיון..."}
              className="min-h-[200px]"
            />
          </div>
        </div>
      )}

      {/* מצב תצוגה - מחשב/מובייל */}
      <div className="flex items-center gap-2 pb-3 border-b">
        <Label className="text-xs font-medium text-gray-700 flex-1">מצב תצוגה:</Label>
        <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
          <Button
            type="button"
            variant={viewMode === "desktop" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("desktop")}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2 text-xs",
              viewMode === "desktop" && "bg-white shadow-sm"
            )}
          >
            <Monitor className="w-3.5 h-3.5" />
            מחשב
          </Button>
          <Button
            type="button"
            variant={viewMode === "mobile" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("mobile")}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2 text-xs",
              viewMode === "mobile" && "bg-white shadow-sm"
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            מובייל
          </Button>
        </div>
      </div>

      {hasTextStyling && (
        <>
          {/* גודל פונט */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-gray-700 flex-1">
                גודל פונט (px)
              </Label>
              {viewMode === "desktop" ? (
                <Monitor className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
            <Input
              type="number"
              value={
                viewMode === "desktop"
                  ? (config.fontSizeDesktop ?? (defaultStyles[elementType].fontSizeDesktop ?? 16))
                  : (config.fontSizeMobile ?? (defaultStyles[elementType].fontSizeMobile ?? 14))
              }
              onChange={(e) => {
                const value = parseInt(e.target.value) || (viewMode === "desktop" ? 16 : 14)
                if (viewMode === "desktop") {
                  setConfig({ ...config, fontSizeDesktop: value })
                } else {
                  setConfig({ ...config, fontSizeMobile: value })
                }
              }}
              min="8"
              max="120"
              className="h-9 text-sm"
            />
          </div>

          {/* עובי פונט */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">עובי פונט</Label>
            <Select
              value={String(config.fontWeight || defaultStyles[elementType].fontWeight || 400)}
              onValueChange={(value) =>
                setConfig({ ...config, fontWeight: parseInt(value) })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontWeightOptions.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* גובה שורה */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">גובה שורה</Label>
            <Input
              type="number"
              step="0.1"
              value={config.lineHeight || defaultStyles[elementType].lineHeight || 1.5}
              onChange={(e) =>
                setConfig({ ...config, lineHeight: parseFloat(e.target.value) || 1.5 })
              }
              min="0.5"
              max="3"
              className="text-right h-9 text-sm"
            />
            <p className="text-[10px] text-gray-500 text-right">
              ערך מומלץ: 1.2-1.6
            </p>
          </div>

          {/* יישור */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-gray-700 flex-1">יישור טקסט</Label>
              {viewMode === "desktop" ? (
                <Monitor className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant={
                  (viewMode === "desktop" 
                    ? (config.textAlignDesktop ?? config.textAlign) === "right"
                    : (config.textAlignMobile ?? config.textAlign) === "right")
                    ? "default" 
                    : "outline"
                }
                onClick={() => {
                  if (viewMode === "desktop") {
                    setConfig({ ...config, textAlignDesktop: "right" })
                  } else {
                    setConfig({ ...config, textAlignMobile: "right" })
                  }
                }}
                className="flex-1 h-8 text-xs"
              >
                <AlignRight className="w-3.5 h-3.5 ml-1.5" />
                ימין
              </Button>
              <Button
                type="button"
                variant={
                  (viewMode === "desktop" 
                    ? (config.textAlignDesktop ?? config.textAlign) === "center"
                    : (config.textAlignMobile ?? config.textAlign) === "center")
                    ? "default" 
                    : "outline"
                }
                onClick={() => {
                  if (viewMode === "desktop") {
                    setConfig({ ...config, textAlignDesktop: "center" })
                  } else {
                    setConfig({ ...config, textAlignMobile: "center" })
                  }
                }}
                className="flex-1 h-8 text-xs"
              >
                <AlignCenter className="w-3.5 h-3.5 ml-1.5" />
                מרכז
              </Button>
              <Button
                type="button"
                variant={
                  (viewMode === "desktop" 
                    ? (config.textAlignDesktop ?? config.textAlign) === "left"
                    : (config.textAlignMobile ?? config.textAlign) === "left")
                    ? "default" 
                    : "outline"
                }
                onClick={() => {
                  if (viewMode === "desktop") {
                    setConfig({ ...config, textAlignDesktop: "left" })
                  } else {
                    setConfig({ ...config, textAlignMobile: "left" })
                  }
                }}
                className="flex-1 h-8 text-xs"
              >
                <AlignLeft className="w-3.5 h-3.5 ml-1.5" />
                שמאל
              </Button>
            </div>
          </div>
        </>
      )}

      {/* הגדרות מיוחדות למחיר */}
      {elementType === "product-price" && (
        <div className="pt-4 border-t space-y-4">
          <h3 className="font-semibold text-sm text-gray-900">הגדרות מחיר</h3>
          
          {/* צבע מחיר רגיל */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">צבע מחיר רגיל</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={config.priceColor || "#000000"}
                onChange={(e) =>
                  setConfig({ ...config, priceColor: e.target.value })
                }
                className="w-12 h-9 p-1"
              />
              <Input
                type="text"
                value={config.priceColor || "#000000"}
                onChange={(e) =>
                  setConfig({ ...config, priceColor: e.target.value })
                }
                placeholder="#000000"
                className="flex-1 h-9 text-sm"
              />
            </div>
          </div>

          {/* גודל מחיר מחוק */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">גודל מחיר מחוק (px)</Label>
            <Input
              type="number"
              value={config.comparePriceFontSize || 16}
              onChange={(e) =>
                setConfig({ ...config, comparePriceFontSize: parseInt(e.target.value) || 16 })
              }
              min="8"
              max="120"
              className="h-9 text-sm"
            />
          </div>

          {/* צבע מחיר מחוק */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">צבע מחיר מחוק</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={config.comparePriceColor || "#6b7280"}
                onChange={(e) =>
                  setConfig({ ...config, comparePriceColor: e.target.value })
                }
                className="w-12 h-9 p-1"
              />
              <Input
                type="text"
                value={config.comparePriceColor || "#6b7280"}
                onChange={(e) =>
                  setConfig({ ...config, comparePriceColor: e.target.value })
                }
                placeholder="#6b7280"
                className="flex-1 h-9 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* הגדרות מיוחדות לוריאציות */}
      {elementType === "product-variants" && (
        <div className="pt-4 border-t space-y-4">
          <h3 className="font-semibold text-sm text-gray-900">הגדרות וריאציות</h3>
          
          {/* הגדרות צבע */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-800">וריאציות צבע</h4>
            
            {/* צורת צבע */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">צורה</Label>
              <Select
                value={config.variantColorShape || "circle"}
                onValueChange={(value: "circle" | "square" | "rounded-square") =>
                  setConfig({ ...config, variantColorShape: value })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="circle">עיגול</SelectItem>
                  <SelectItem value="square">ריבוע</SelectItem>
                  <SelectItem value="rounded-square">ריבוע מעוגל</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* גודל צבע */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">גודל (px)</Label>
              <Input
                type="number"
                value={config.variantColorSize || 40}
                onChange={(e) =>
                  setConfig({ ...config, variantColorSize: parseInt(e.target.value) || 40 })
                }
                min="20"
                max="100"
                className="h-9 text-sm"
              />
            </div>

            {/* צבע מסגרת בחירה */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">צבע מסגרת בעת בחירה</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.variantColorBorderColor || "#10b981"}
                  onChange={(e) =>
                    setConfig({ ...config, variantColorBorderColor: e.target.value })
                  }
                  className="w-12 h-9 p-1"
                />
                <Input
                  type="text"
                  value={config.variantColorBorderColor || "#10b981"}
                  onChange={(e) =>
                    setConfig({ ...config, variantColorBorderColor: e.target.value })
                  }
                  placeholder="#10b981"
                  className="flex-1 h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* הגדרות כפתור */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-800">וריאציות כפתור (מידה וכו')</h4>
            
            {/* צורת כפתור */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">צורה</Label>
              <Select
                value={config.variantButtonShape || "rounded"}
                onValueChange={(value: "square" | "rounded") =>
                  setConfig({ ...config, variantButtonShape: value })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rounded">עיגול</SelectItem>
                  <SelectItem value="square">ריבוע</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* גודל כפתור */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">גודל מינימום (px)</Label>
              <Input
                type="number"
                value={config.variantButtonSize || 40}
                onChange={(e) =>
                  setConfig({ ...config, variantButtonSize: parseInt(e.target.value) || 40 })
                }
                min="30"
                max="80"
                className="h-9 text-sm"
              />
            </div>

            {/* צבע רקע בעת בחירה */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">צבע רקע בעת בחירה</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.variantButtonBgColor || "#10b981"}
                  onChange={(e) =>
                    setConfig({ ...config, variantButtonBgColor: e.target.value })
                  }
                  className="w-12 h-9 p-1"
                />
                <Input
                  type="text"
                  value={config.variantButtonBgColor || "#10b981"}
                  onChange={(e) =>
                    setConfig({ ...config, variantButtonBgColor: e.target.value })
                  }
                  placeholder="#10b981"
                  className="flex-1 h-9 text-sm"
                />
              </div>
            </div>

            {/* צבע מסגרת */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">צבע מסגרת</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.variantButtonBorderColor || "#d1d5db"}
                  onChange={(e) =>
                    setConfig({ ...config, variantButtonBorderColor: e.target.value })
                  }
                  className="w-12 h-9 p-1"
                />
                <Input
                  type="text"
                  value={config.variantButtonBorderColor || "#d1d5db"}
                  onChange={(e) =>
                    setConfig({ ...config, variantButtonBorderColor: e.target.value })
                  }
                  placeholder="#d1d5db"
                  className="flex-1 h-9 text-sm"
                />
              </div>
            </div>

            {/* צבע פונט */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">צבע פונט</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.variantButtonTextColor || "#000000"}
                  onChange={(e) =>
                    setConfig({ ...config, variantButtonTextColor: e.target.value })
                  }
                  className="w-12 h-9 p-1"
                />
                <Input
                  type="text"
                  value={config.variantButtonTextColor || "#000000"}
                  onChange={(e) =>
                    setConfig({ ...config, variantButtonTextColor: e.target.value })
                  }
                  placeholder="#000000"
                  className="flex-1 h-9 text-sm"
                />
              </div>
            </div>

            {/* צבע פונט בעת בחירה */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">צבע פונט בעת בחירה</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.variantButtonTextColorSelected || "#ffffff"}
                  onChange={(e) =>
                    setConfig({ ...config, variantButtonTextColorSelected: e.target.value })
                  }
                  className="w-12 h-9 p-1"
                />
                <Input
                  type="text"
                  value={config.variantButtonTextColorSelected || "#ffffff"}
                  onChange={(e) =>
                    setConfig({ ...config, variantButtonTextColorSelected: e.target.value })
                  }
                  placeholder="#ffffff"
                  className="flex-1 h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* מרווחים */}
      <div className="pt-4 border-t space-y-3">
        <h3 className="font-semibold text-sm text-gray-900">מרווחים</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">מרווח עליון (px)</Label>
            <Input
              type="number"
              value={config.marginTop ?? (defaultStyles[elementType].marginTop ?? 0)}
              onChange={(e) =>
                setConfig({ ...config, marginTop: parseInt(e.target.value) || 0 })
              }
              min="0"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">מרווח תחתון (px)</Label>
            <Input
              type="number"
              value={config.marginBottom ?? (defaultStyles[elementType].marginBottom ?? 0)}
              onChange={(e) =>
                setConfig({ ...config, marginBottom: parseInt(e.target.value) || 0 })
              }
              min="0"
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* כפתורי שמירה */}
      <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white pb-4">
        <Button variant="outline" onClick={onCancel} className="flex-1 h-9 text-sm">
          ביטול
        </Button>
        <Button 
          variant="outline" 
          onClick={handleReset}
          className="px-3 h-9"
          title="איפוס הגדרות תבנית"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
        <Button onClick={handleSave} className="flex-1 h-9 text-sm bg-emerald-600 hover:bg-emerald-700">
          שמור
        </Button>
      </div>
    </div>
  )
}

