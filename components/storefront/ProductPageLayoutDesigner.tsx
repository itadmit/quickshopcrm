"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ChevronRight, Save, Plus, ChevronUp, ChevronDown, Eye, EyeOff, X, FileText, List, Type, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ElementStyleConfig } from "./ElementSettingsDialog"
import { ElementSettingsContent } from "./ElementSettingsContent"

export type ProductPageElementType =
  | "product-name"
  | "product-price"
  | "product-description"
  | "product-gallery"
  | "product-variants"
  | "product-quantity"
  | "product-buttons"
  | "product-reviews"
  | "product-related"
  | "custom-text"
  | "custom-accordion"
  | "custom-html"

export interface ProductPageElement {
  id: string
  type: ProductPageElementType
  visible: boolean
  position: number
  config?: Record<string, any>
}

interface ProductPageLayoutDesignerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (elements: ProductPageElement[]) => void
  currentLayout?: { elements: ProductPageElement[] }
  hasUnsavedChanges?: boolean
  shopSlug: string
  initialElementId?: string // אלמנט לפתיחה ישירה של הגדרות
}

const defaultElements: ProductPageElement[] = [
  { id: "name", type: "product-name", visible: true, position: 0 },
  { id: "price", type: "product-price", visible: true, position: 1 },
  { id: "description", type: "product-description", visible: true, position: 2 },
  { id: "variants", type: "product-variants", visible: true, position: 3 },
  { id: "quantity", type: "product-quantity", visible: true, position: 4 },
  { id: "buttons", type: "product-buttons", visible: true, position: 5 },
  { id: "reviews", type: "product-reviews", visible: true, position: 6 },
  { id: "related", type: "product-related", visible: true, position: 7 },
]

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

const addableElementTypes: ProductPageElementType[] = [
  "custom-text",
  "custom-accordion",
  "custom-html",
  "product-description", // אפשר להוסיף תיאור נוסף
]

export function ProductPageLayoutDesigner({
  open,
  onOpenChange,
  onSave,
  currentLayout,
  hasUnsavedChanges = false,
  shopSlug,
  initialElementId,
}: ProductPageLayoutDesignerProps) {
  const [elements, setElements] = useState<ProductPageElement[]>(defaultElements)
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null)
  const [showAddElementDialog, setShowAddElementDialog] = useState(false)
  const [newElementType, setNewElementType] = useState<ProductPageElementType>("custom-text")
  const [newElementConfig, setNewElementConfig] = useState<Record<string, any>>({})
  const [editingElementId, setEditingElementId] = useState<string | null>(null)
  const [settingsElementId, setSettingsElementId] = useState<string | null>(initialElementId || null)

  // פתיחת הגדרות אלמנט אם יש initialElementId
  useEffect(() => {
    if (open && initialElementId) {
      // מציאת אלמנט הגלריה אם זה מה שביקשו
      const galleryElement = elements.find((el) => el.type === "product-gallery" || el.id === initialElementId)
      if (galleryElement) {
        // פתיחה ישירה של הגדרות הגלריה
        setTimeout(() => {
          setSettingsElementId(galleryElement.id)
        }, 100) // קצת delay כדי שה-Sheet הראשי ייפתח קודם
      } else if (initialElementId) {
        setTimeout(() => {
          setSettingsElementId(initialElementId)
        }, 100)
      }
    } else if (!open) {
      // איפוס כשסוגרים
      setSettingsElementId(null)
    }
  }, [open, initialElementId, elements])

  useEffect(() => {
    if (open && currentLayout?.elements) {
      setElements([...currentLayout.elements].sort((a, b) => a.position - b.position))
    } else if (open) {
      setElements(defaultElements)
    }
  }, [open, currentLayout])

  const moveElement = (elementId: string, direction: "up" | "down") => {
    setElements((prev) => {
      const newElements = [...prev]
      const index = newElements.findIndex((el) => el.id === elementId)
      if (index === -1) return prev

      const newIndex = direction === "up" ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= newElements.length) return prev

      // החלפת מיקומים
      const temp = newElements[index].position
      newElements[index].position = newElements[newIndex].position
      newElements[newIndex].position = temp

      // מיון מחדש
      return newElements.sort((a, b) => a.position - b.position)
    })
  }

  const toggleVisibility = (elementId: string) => {
    setElements((prev) =>
      prev.map((el) => (el.id === elementId ? { ...el, visible: !el.visible } : el))
    )
  }

  const removeElement = (elementId: string) => {
    setElements((prev) => prev.filter((el) => el.id !== elementId))
  }

  const updateElementStyle = (elementId: string, styleConfig: ElementStyleConfig) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === elementId
          ? { ...el, config: { ...el.config, style: styleConfig } }
          : el
      )
    )
  }

  const handleAddElement = () => {
    const newElement: ProductPageElement = {
      id: `custom-${Date.now()}`,
      type: newElementType,
      visible: true,
      position: elements.length,
      config: newElementConfig,
    }
    setElements((prev) => [...prev, newElement])
    setShowAddElementDialog(false)
    setNewElementType("custom-text")
    setNewElementConfig({})
  }

  const handleSave = async () => {
    if (onSave) {
      onSave(elements)
    } else {
      // שמירה ישירה ל-API
      try {
        await fetch(`/api/storefront/${shopSlug}/product-page-layout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ elements }),
        })
      } catch (error) {
        console.error("Error saving layout:", error)
      }
    }
  }

  const getElementIcon = (type: ProductPageElementType) => {
    switch (type) {
      case "product-name":
      case "product-price":
      case "product-description":
        return <Type className="w-4 h-4" />
      case "product-gallery":
        return <FileText className="w-4 h-4" />
      case "product-variants":
      case "product-quantity":
      case "product-buttons":
        return <List className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const selectedElement = settingsElementId ? elements.find((el) => el.id === settingsElementId) : null

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          onOpenChange(false)
          setSettingsElementId(null)
        }
      }} side="right">
        <SheetContent onClose={() => {
          onOpenChange(false)
          setSettingsElementId(null)
        }} className="w-full sm:max-w-2xl overflow-y-auto">
          {settingsElementId && selectedElement ? (
            // מצב הגדרות אלמנט
            <>
              <SheetHeader>
                <SheetTitle>הגדרות {elementLabels[selectedElement.type]}</SheetTitle>
                <SheetDescription>
                  התאם את העיצוב והסגנון של האלמנט
                </SheetDescription>
              </SheetHeader>
              <SheetBody>
                <ElementSettingsContent
                  elementType={selectedElement.type}
                  elementName={elementLabels[selectedElement.type]}
                  currentConfig={selectedElement.config?.style}
                  onSave={(styleConfig) => {
                    updateElementStyle(settingsElementId, styleConfig)
                    setSettingsElementId(null)
                  }}
                  onCancel={() => setSettingsElementId(null)}
                />
              </SheetBody>
            </>
          ) : (
            // מצב רשימת אלמנטים
            <>
              <SheetHeader>
                <SheetTitle>עיצוב אלמנטי עמוד מוצר</SheetTitle>
                <SheetDescription>
                  גרור או השתמש בכפתורים כדי לשנות את הסדר, הסתר/הצג אלמנטים והוסף אלמנטים חדשים
                </SheetDescription>
              </SheetHeader>

              <SheetBody>
            <div className="space-y-2 mt-6">
              {elements
                .filter((element) => element.type !== "product-gallery") // הסרת גלריה מהרשימה
                .map((element, index) => {
                  // חישוב מחדש של האינדקס אחרי הסרת הגלריה
                  const filteredElements = elements.filter((el) => el.type !== "product-gallery")
                  const actualIndex = filteredElements.findIndex((el) => el.id === element.id)
                  return (
                <div
                  key={element.id}
                  className={cn(
                    "relative group border-2 rounded-lg p-4 transition-all duration-300 ease-in-out",
                    hoveredElementId === element.id
                      ? "border-emerald-500 bg-emerald-50"
                      : element.visible
                      ? "border-gray-200 bg-white"
                      : "border-gray-200 bg-gray-50 opacity-60"
                  )}
                  onMouseEnter={() => setHoveredElementId(element.id)}
                  onMouseLeave={() => setHoveredElementId(null)}
                >
                  {/* כפתורי בקרה - מופיעים רק ב-hover */}
                  {hoveredElementId === element.id && (
                    <div className="absolute top-2 left-2 flex gap-1 bg-white rounded shadow-lg p-1 z-10">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSettingsElementId(element.id)
                        }}
                        className="h-8 w-8 p-0"
                        title="הגדרות"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveElement(element.id, "up")
                        }}
                        disabled={actualIndex === 0}
                        className="h-8 w-8 p-0 transition-transform hover:scale-110 active:scale-95"
                        title="העבר למעלה"
                      >
                        <ChevronUp className="w-4 h-4 transition-transform" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveElement(element.id, "down")
                        }}
                        disabled={actualIndex === filteredElements.length - 1}
                        className="h-8 w-8 p-0 transition-transform hover:scale-110 active:scale-95"
                        title="העבר למטה"
                      >
                        <ChevronDown className="w-4 h-4 transition-transform" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleVisibility(element.id)}
                        className="h-8 w-8 p-0"
                        title={element.visible ? "הסתר" : "הצג"}
                      >
                        {element.visible ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                      {(element.type.startsWith("custom-") || element.type === "product-description") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingElementId(element.id)
                            setNewElementType(element.type)
                            setNewElementConfig(element.config || {})
                            setShowAddElementDialog(true)
                          }}
                          className="h-8 w-8 p-0"
                          title="ערוך"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                      {element.type.startsWith("custom-") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeElement(element.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          title="מחק"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* תוכן האלמנט - לחיצה על שם האלמנט פותחת הגדרות */}
                  <div className="flex items-center gap-3 pr-12">
                    <div className="flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSettingsElementId(element.id)
                        }}
                        className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer"
                      >
                        {getElementIcon(element.type)}
                        <span className="font-medium text-sm">
                          {elementLabels[element.type]}
                        </span>
                        {!element.visible && (
                          <span className="text-xs text-gray-500">(מוסתר)</span>
                        )}
                      </button>
                      {element.config?.title && (
                        <p className="text-xs text-gray-500 mt-1">{element.config.title}</p>
                      )}
                    </div>
                  </div>
                </div>
                  )
                })}
            </div>

            {/* כפתור הוספת אלמנט */}
            <div className="mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingElementId(null)
                  setNewElementType("custom-text")
                  setNewElementConfig({})
                  setShowAddElementDialog(true)
                }}
                className="w-full"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף אלמנט
              </Button>
            </div>
          </SheetBody>

          <SheetFooter>
            {hasUnsavedChanges && (
              <Button onClick={handleSave} className="ml-2">
                <Save className="w-4 h-4 ml-2" />
                שמור שינויים
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              סגור
            </Button>
          </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* דיאלוג הוספת/עריכת אלמנט */}
      <Dialog open={showAddElementDialog} onOpenChange={setShowAddElementDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingElementId ? "ערוך אלמנט" : "הוסף אלמנט חדש"}
            </DialogTitle>
            <DialogDescription>
              בחר סוג אלמנט והגדר את התוכן שלו
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>סוג אלמנט</Label>
              <Select
                value={newElementType}
                onValueChange={(value) => {
                  setNewElementType(value as ProductPageElementType)
                  setNewElementConfig({})
                }}
                disabled={!!editingElementId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {addableElementTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {elementLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newElementType === "custom-text" && (
              <div className="space-y-2">
                <Label>כותרת (אופציונלי)</Label>
                <Input
                  value={newElementConfig.title || ""}
                  onChange={(e) =>
                    setNewElementConfig({ ...newElementConfig, title: e.target.value })
                  }
                  placeholder="כותרת"
                />
                <Label>תוכן</Label>
                <Textarea
                  value={newElementConfig.content || ""}
                  onChange={(e) =>
                    setNewElementConfig({ ...newElementConfig, content: e.target.value })
                  }
                  placeholder="הזן טקסט..."
                  rows={4}
                />
              </div>
            )}

            {newElementType === "custom-accordion" && (
              <div className="space-y-2">
                <Label>כותרת אקורדיון</Label>
                <Input
                  value={newElementConfig.title || ""}
                  onChange={(e) =>
                    setNewElementConfig({ ...newElementConfig, title: e.target.value })
                  }
                  placeholder="כותרת"
                />
                <Label>תוכן</Label>
                <Textarea
                  value={newElementConfig.content || ""}
                  onChange={(e) =>
                    setNewElementConfig({ ...newElementConfig, content: e.target.value })
                  }
                  placeholder="תוכן האקורדיון..."
                  rows={4}
                />
              </div>
            )}

            {newElementType === "custom-html" && (
              <div className="space-y-2">
                <Label>כותרת (אופציונלי)</Label>
                <Input
                  value={newElementConfig.title || ""}
                  onChange={(e) =>
                    setNewElementConfig({ ...newElementConfig, title: e.target.value })
                  }
                  placeholder="כותרת"
                />
                <Label>HTML</Label>
                <Textarea
                  value={newElementConfig.html || ""}
                  onChange={(e) =>
                    setNewElementConfig({ ...newElementConfig, html: e.target.value })
                  }
                  placeholder="הזן HTML..."
                  rows={6}
                />
              </div>
            )}

            {newElementType === "product-description" && (
              <div className="space-y-2">
                <Label>כותרת (אופציונלי)</Label>
                <Input
                  value={newElementConfig.title || ""}
                  onChange={(e) =>
                    setNewElementConfig({ ...newElementConfig, title: e.target.value })
                  }
                  placeholder="כותרת (למשל: פרטים נוספים)"
                />
                <p className="text-sm text-gray-500">
                  תיאור המוצר יוצג כאן. ניתן להוסיף תיאור נוסף עם כותרת מותאמת.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddElementDialog(false)}>
              ביטול
            </Button>
            <Button
              onClick={() => {
                if (editingElementId) {
                  // עדכון אלמנט קיים
                  setElements((prev) =>
                    prev.map((el) =>
                      el.id === editingElementId
                        ? { ...el, config: newElementConfig }
                        : el
                    )
                  )
                  setEditingElementId(null)
                } else {
                  handleAddElement()
                }
                setShowAddElementDialog(false)
              }}
            >
              {editingElementId ? "עדכן" : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

