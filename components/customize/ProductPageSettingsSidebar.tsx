"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ChevronRight, X } from "lucide-react"
import { ProductPageElement, ProductPageElementType } from "@/components/storefront/ProductPageLayoutDesigner"
import { ElementSettingsContent } from "@/components/storefront/ElementSettingsContent"

interface CustomField {
  definition: {
    id: string
    label: string
    type: string
  }
  value: string | null
  valueId: string | null
}

interface ProductPageSettingsSidebarProps {
  open: boolean
  onClose: () => void
  elementId: string
  elements: ProductPageElement[]
  onElementsChange: (elements: ProductPageElement[]) => void
  shopSlug: string
  viewMode?: "desktop" | "mobile"
  onViewModeChange?: (mode: "desktop" | "mobile") => void
  productId?: string
  customFields?: CustomField[]
}

const elementLabels: Record<ProductPageElementType, string> = {
  "product-name": "שם מוצר",
  "product-price": "מחיר",
  "product-description": "תיאור מוצר",
  "product-gallery": "גלריה",
  "product-variants": "וריאציות",
  "product-quantity": "כמות",
  "product-buttons": "כפתורים",
  "product-reviews": "ביקורות",
  "product-related": "מוצרים קשורים",
  "custom-text": "טקסט מותאם",
  "custom-accordion": "אקורדיון",
  "custom-html": "HTML מותאם",
}

export function ProductPageSettingsSidebar({
  open,
  onClose,
  elementId,
  elements,
  onElementsChange,
  shopSlug,
  viewMode = "desktop",
  onViewModeChange,
  productId,
  customFields = [],
}: ProductPageSettingsSidebarProps) {
  const [selectedElement, setSelectedElement] = useState<ProductPageElement | null>(null)

  useEffect(() => {
    const element = elements.find((el) => el.id === elementId)
    setSelectedElement(element || null)
  }, [elementId, elements])

  const handleSaveStyle = (styleConfig: any) => {
    if (!selectedElement) return

    const updatedElements = elements.map((el) =>
      el.id === elementId
        ? { 
            ...el, 
            config: { 
              ...el.config, 
              style: styleConfig,
              content: styleConfig.content !== undefined ? styleConfig.content : el.config?.content,
              title: styleConfig.title !== undefined ? styleConfig.title : el.config?.title,
            } 
          }
        : el
    )
    onElementsChange(updatedElements)
  }

  const handleStyleChange = (styleConfig: any) => {
    // עדכון בזמן אמת ללא שמירה
    handleSaveStyle(styleConfig)
  }

  if (!selectedElement) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onClose} side="right">
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto sidebar-scroll" dir="rtl">
        <div className="px-4 pt-3 pb-3 border-b">
          <div className="flex items-center gap-4 flex-row-reverse">
            <SheetTitle className="text-xl font-bold text-right flex-1">
              הגדרות {elementLabels[selectedElement.type]}
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex items-center gap-1.5 h-8 text-sm"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              חזור
            </Button>
          </div>
          <SheetDescription className="text-right text-xs text-gray-600 mt-2">
            התאם את העיצוב והסגנון של האלמנט
          </SheetDescription>
        </div>

        <div className="mt-4 px-4 pb-4">
          <ElementSettingsContent
            elementType={selectedElement.type}
            elementName={elementLabels[selectedElement.type]}
            currentConfig={{
              ...selectedElement.config?.style,
              content: selectedElement.config?.content,
              title: selectedElement.config?.title,
            }}
            onSave={(styleConfig) => {
              handleSaveStyle(styleConfig)
              onClose()
            }}
            onStyleChange={handleStyleChange}
            onCancel={onClose}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            productId={productId}
            customFields={customFields}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

