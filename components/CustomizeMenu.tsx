"use client"

import { useState, useEffect } from "react"
import { useShop } from "@/components/providers/ShopProvider"
import { ProductPageDesigner } from "@/components/storefront/ProductPageDesigner"
import { CategoryPageDesigner } from "@/components/storefront/CategoryPageDesigner"
import { Palette, Home, Package, FolderOpen, ChevronDown, ChevronRight, Layout, Image as ImageIcon, Settings, Plus, Eye, EyeOff, ChevronUp, X, FileText, List, Type } from "lucide-react"
import { cn } from "@/lib/utils"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ProductPageElement, ProductPageElementType } from "@/components/storefront/ProductPageLayoutDesigner"
import { ElementSettingsContent } from "@/components/storefront/ElementSettingsContent"
import { ElementStyleConfig } from "@/components/storefront/ElementSettingsDialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Product {
  id: string
  name: string
  slug: string
  images?: string[]
}

interface Category {
  id: string
  name: string
  slug: string
}

type GalleryLayout = "standard" | "right-side" | "left-side" | "masonry" | "fixed"

const defaultElements: ProductPageElement[] = [
  { id: "gallery", type: "product-gallery", visible: true, position: 0 },
  { id: "name", type: "product-name", visible: true, position: 1 },
  { id: "price", type: "product-price", visible: true, position: 2 },
  { id: "description", type: "product-description", visible: true, position: 3 },
  { id: "variants", type: "product-variants", visible: true, position: 4 },
  { id: "quantity", type: "product-quantity", visible: true, position: 5 },
  { id: "buttons", type: "product-buttons", visible: true, position: 6 },
  { id: "reviews", type: "product-reviews", visible: true, position: 7 },
  { id: "related", type: "product-related", visible: true, position: 8 },
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
  "product-description",
]

export function CustomizeMenu() {
  const { selectedShop } = useShop()
  const [isOpen, setIsOpen] = useState(false)
  const [showProductPage, setShowProductPage] = useState(false)
  const [showCategoryDesigner, setShowCategoryDesigner] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [galleryLayout, setGalleryLayout] = useState<GalleryLayout>("standard")
  const [categoryLayout, setCategoryLayout] = useState<"grid" | "list" | "compact-grid" | "large-grid">("grid")
  const [pendingGalleryLayout, setPendingGalleryLayout] = useState<GalleryLayout | null>(null)
  const [pendingCategoryLayout, setPendingCategoryLayout] = useState<"grid" | "list" | "compact-grid" | "large-grid" | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [elements, setElements] = useState<ProductPageElement[]>(defaultElements)
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set())
  const [settingsElementId, setSettingsElementId] = useState<string | null>(null)
  const [showAddElementDialog, setShowAddElementDialog] = useState(false)
  const [newElementType, setNewElementType] = useState<ProductPageElementType>("custom-text")
  const [newElementConfig, setNewElementConfig] = useState<Record<string, any>>({})
  const [editingElementId, setEditingElementId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedShop?.slug) {
      fetchProducts()
      fetchCategories()
      fetchGalleryLayout()
      fetchCategoryLayout()
      fetchProductPageLayout()
    }
  }, [selectedShop?.slug])

  // בחירה אוטומטית של המוצר הראשון עם תמונות כשפותחים את דף המוצר
  useEffect(() => {
    if (showProductPage && products.length > 0 && !selectedProductId) {
      const productWithImages = products.find(
        (product) => product.images && Array.isArray(product.images) && product.images.length > 0
      )
      if (productWithImages) {
        setSelectedProductId(productWithImages.id)
      }
    }
  }, [showProductPage, products, selectedProductId])

  const fetchProducts = async () => {
    if (!selectedShop?.slug) return
    try {
      const response = await fetch(`/api/storefront/${selectedShop?.slug || ""}/products?limit=50`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const fetchCategories = async () => {
    if (!selectedShop?.slug) return
    try {
      const response = await fetch(`/api/storefront/${selectedShop?.slug || ""}/categories`)
      if (response.ok) {
        const data = await response.json()
        const categoriesList = Array.isArray(data) ? data : (data.categories || [])
        setCategories(categoriesList)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchGalleryLayout = async () => {
    if (!selectedShop?.slug) return
    try {
      const response = await fetch(`/api/storefront/${selectedShop?.slug || ""}/product-gallery-layout`)
      if (response.ok) {
        const data = await response.json()
        if (data.layout) {
          setGalleryLayout(data.layout)
        }
      }
    } catch (error) {
      console.error("Error fetching gallery layout:", error)
    }
  }

  const fetchCategoryLayout = async () => {
    if (!selectedShop?.slug) return
    try {
      const response = await fetch(`/api/storefront/${selectedShop?.slug || ""}/category-layout`)
      if (response.ok) {
        const data = await response.json()
        if (data.layout) {
          setCategoryLayout(data.layout)
        }
      }
    } catch (error) {
      console.error("Error fetching category layout:", error)
    }
  }

  const fetchProductPageLayout = async () => {
    if (!selectedShop?.slug) return
    try {
      const response = await fetch(`/api/storefront/${selectedShop?.slug || ""}/product-page-layout`)
      if (response.ok) {
        const data = await response.json()
        if (data.layout?.elements && data.layout.elements.length > 0) {
          setElements([...data.layout.elements].sort((a, b) => a.position - b.position))
        } else {
          // אם אין אלמנטים ב-API, נשתמש ב-defaultElements
          setElements(defaultElements)
        }
      } else {
        // אם יש שגיאה, נשתמש ב-defaultElements
        setElements(defaultElements)
      }
    } catch (error) {
      console.error("Error fetching product page layout:", error)
      // במקרה של שגיאה, נשתמש ב-defaultElements
      setElements(defaultElements)
    }
  }

  const saveGalleryLayout = async (layout: "standard" | "right-side" | "left-side" | "masonry" | "fixed") => {
    if (!selectedShop?.slug) return
    try {
      await fetch(`/api/storefront/${selectedShop?.slug || ""}/product-gallery-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      })
      setGalleryLayout(layout)
      setPendingGalleryLayout(null)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error("Error saving gallery layout:", error)
    }
  }

  const handleGalleryLayoutChange = (layout: "standard" | "right-side" | "left-side" | "masonry" | "fixed") => {
    setPendingGalleryLayout(layout)
    setHasUnsavedChanges(true)
  }

  const handleSaveGalleryLayout = async () => {
    if (pendingGalleryLayout) {
      await saveGalleryLayout(pendingGalleryLayout)
    }
  }

  const saveCategoryLayout = async (layout: "grid" | "list" | "compact-grid" | "large-grid") => {
    if (!selectedShop?.slug) return
    try {
      await fetch(`/api/storefront/${selectedShop?.slug || ""}/category-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      })
      setCategoryLayout(layout)
      setPendingCategoryLayout(null)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error("Error saving category layout:", error)
    }
  }

  const handleCategoryLayoutChange = (layout: "grid" | "list" | "compact-grid" | "large-grid") => {
    setPendingCategoryLayout(layout)
    setHasUnsavedChanges(true)
  }

  const handleSaveCategoryLayout = async () => {
    if (pendingCategoryLayout) {
      await saveCategoryLayout(pendingCategoryLayout)
    }
  }

  const handleProductPageClick = () => {
    // מציאת המוצר הראשון שיש לו תמונות
    const productWithImages = products.find(
      (product) => product.images && Array.isArray(product.images) && product.images.length > 0
    )
    if (productWithImages) {
      setSelectedProductId(productWithImages.id)
    }
    const newShowState = !showProductPage
    setShowProductPage(newShowState)
    // אם פותחים את התפריט, נטען את האלמנטים מחדש
    if (newShowState && selectedShop?.slug) {
      fetchProductPageLayout()
    }
  }

  const toggleElementExpanded = (elementId: string) => {
    setExpandedElements((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(elementId)) {
        newSet.delete(elementId)
      } else {
        newSet.add(elementId)
      }
      return newSet
    })
  }

  const moveElement = (elementId: string, direction: "up" | "down") => {
    setElements((prev) => {
      const newElements = [...prev]
      const index = newElements.findIndex((el) => el.id === elementId)
      if (index === -1) return prev

      const newIndex = direction === "up" ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= newElements.length) return prev

      const temp = newElements[index].position
      newElements[index].position = newElements[newIndex].position
      newElements[newIndex].position = temp

      return newElements.sort((a, b) => a.position - b.position)
    })
    setHasUnsavedChanges(true)
  }

  const toggleElementVisibility = (elementId: string) => {
    setElements((prev) =>
      prev.map((el: any) => (el.id === elementId ? { ...el, visible: !el.visible } : el))
    )
    setHasUnsavedChanges(true)
  }

  const removeElement = (elementId: string) => {
    setElements((prev) => prev.filter((el: any) => el.id !== elementId))
    setHasUnsavedChanges(true)
  }

  const updateElementStyle = (elementId: string, styleConfig: ElementStyleConfig) => {
    const updatedElements = elements.map((el: any) =>
      el.id === elementId
        ? { ...el, config: { ...el.config, style: styleConfig } }
        : el
    )
    
    setElements(updatedElements)
    setHasUnsavedChanges(true)
    
    // שמירה ב-localStorage לעדכון בזמן אמת
    if (selectedShop?.slug) {
      const storageKey = `productPageLayout_${selectedShop?.slug || ""}`
      localStorage.setItem(storageKey, JSON.stringify({ elements: updatedElements, timestamp: Date.now() }))
    }
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
    setHasUnsavedChanges(true)
  }

  const handleSaveProductPageLayout = async () => {
    if (!selectedShop?.slug) return
    try {
      // שמירת פריסת הגלריה אם יש שינויים
      if (pendingGalleryLayout) {
        await saveGalleryLayout(pendingGalleryLayout)
      }
      // שמירת אלמנטי העמוד
      await fetch(`/api/storefront/${selectedShop?.slug || ""}/product-page-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements }),
      })
      setHasUnsavedChanges(false)
      
      // רענון האייפרם כדי להציג את השינויים השמורים
      // שליחת event לעדכון האייפרם ב-customize/page.tsx
      window.dispatchEvent(new CustomEvent('productPageLayoutSaved', {
        detail: { shopSlug: selectedShop?.slug || "" }
      }))
      
      // גם רענון ישיר של האייפרם אם הוא קיים בדף
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      if (iframe) {
        const currentSrc = iframe.src
        iframe.src = currentSrc.split('?')[0] + '?t=' + Date.now()
      }
    } catch (error) {
      console.error("Error saving product page layout:", error)
    }
  }

  const getElementIcon = (type: ProductPageElementType) => {
    switch (type) {
      case "product-name":
      case "product-price":
      case "product-description":
        return <Type className="w-4 h-4" />
      case "product-gallery":
        return <ImageIcon className="w-4 h-4" />
      case "product-variants":
      case "product-quantity":
      case "product-buttons":
        return <List className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const handleHomePageClick = () => {
    // פתיחת דף הבית בחלון חדש לעריכה
    if (selectedShop?.slug) {
      window.open(`/shop/${selectedShop?.slug || ""}`, '_blank')
    }
    setIsOpen(false) // סגירת ה-accordion
  }

  const handleCategoryPageClick = () => {
    setShowCategoryDesigner(true)
    setIsOpen(false) // סגירת ה-accordion
  }

  const selectedElement = settingsElementId ? elements.find((el: any) => el.id === settingsElementId) : null
  const currentLayout = pendingGalleryLayout || galleryLayout

  return (
    <>
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-200"
          )}
        >
          <Palette className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 text-right">התאמה אישית</span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform" />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform" />
          )}
        </button>
        {isOpen && (
          <div className="mt-1 space-y-1 pr-8">
            <button
              onClick={handleHomePageClick}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Home className="w-4 h-4 flex-shrink-0" />
              <span className="text-right">דף הבית</span>
            </button>
            <div>
              <button
                onClick={handleProductPageClick}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <Package className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-right">דף מוצר</span>
                {showProductPage ? (
                  <ChevronDown className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                )}
              </button>
              {showProductPage && (
                <div className="mt-2 pr-8 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {/* בחירת פריסה */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">בחר פריסה</Label>
                    <RadioGroup 
                      value={currentLayout} 
                      onValueChange={(value) => handleGalleryLayoutChange(value as GalleryLayout)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 space-x-reverse p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="standard" id="standard" />
                          <Label htmlFor="standard" className="flex-1 cursor-pointer text-sm">
                            <div className="flex items-center gap-2">
                              <Layout className="w-4 h-4" />
                              <span>סטנדרט</span>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="right-side" id="right-side" />
                          <Label htmlFor="right-side" className="flex-1 cursor-pointer text-sm">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              <span>צידי שמאל</span>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="left-side" id="left-side" />
                          <Label htmlFor="left-side" className="flex-1 cursor-pointer text-sm">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              <span>צידי ימין</span>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="masonry" id="masonry" />
                          <Label htmlFor="masonry" className="flex-1 cursor-pointer text-sm">
                            <div className="flex items-center gap-2">
                              <Layout className="w-4 h-4" />
                              <span>תפזורת</span>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="fixed" id="fixed" />
                          <Label htmlFor="fixed" className="flex-1 cursor-pointer text-sm">
                            <div className="flex items-center gap-2">
                              <Layout className="w-4 h-4" />
                              <span>קבוע</span>
                            </div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* עץ האלמנטים */}
                  <div className="space-y-1 border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold">אלמנטים</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingElementId(null)
                          setNewElementType("custom-text")
                          setNewElementConfig({})
                          setShowAddElementDialog(true)
                        }}
                        className="h-7 px-2"
                      >
                        <Plus className="w-3 h-3 ml-1" />
                        הוסף
                      </Button>
                    </div>
                    <div className="space-y-1 transition-all duration-300 ease-in-out">
                      {elements && elements.length > 0 ? (
                        elements
                          .sort((a, b) => a.position - b.position)
                          .map((element: any) => {
                          const isExpanded = expandedElements.has(element.id)
                          const canMoveUp = elements.findIndex((el) => el.id === element.id) > 0
                          const canMoveDown = elements.findIndex((el) => el.id === element.id) < elements.length - 1
                          
                          return (
                            <div key={element.id} className="space-y-1">
                              <div
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-lg text-sm transition-all duration-300 ease-in-out",
                                  element.visible
                                    ? "bg-white border border-gray-200"
                                    : "bg-gray-50 border border-gray-200 opacity-60"
                                )}
                              >
                                <button
                                  onClick={() => toggleElementExpanded(element.id)}
                                  className="flex items-center gap-2 flex-1 text-right hover:opacity-70"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3 h-3 flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                  )}
                                  {getElementIcon(element.type)}
                                  <span className={cn(!element.visible && "text-gray-500")}>
                                    {elementLabels[element.type as keyof typeof elementLabels]}
                                  </span>
                                  {!element.visible && (
                                    <EyeOff className="w-3 h-3 text-gray-400" />
                                  )}
                                </button>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (settingsElementId === element.id) {
                                        setSettingsElementId(null)
                                      } else {
                                        setSettingsElementId(element.id)
                                        if (!isExpanded) {
                                          toggleElementExpanded(element.id)
                                        }
                                      }
                                    }}
                                    className={cn("h-6 w-6 p-0", settingsElementId === element.id && "bg-gray-200")}
                                    title="הגדרות"
                                  >
                                    <Settings className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleElementVisibility(element.id)}
                                    className="h-6 w-6 p-0"
                                    title={element.visible ? "הסתר" : "הצג"}
                                  >
                                    {element.visible ? (
                                      <Eye className="w-3 h-3" />
                                    ) : (
                                      <EyeOff className="w-3 h-3" />
                                    )}
                                  </Button>
                                  {canMoveUp && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveElement(element.id, "up")}
                                      className="h-6 w-6 p-0 transition-transform hover:scale-110 active:scale-95"
                                      title="העבר למעלה"
                                    >
                                      <ChevronUp className="w-3 h-3 transition-transform" />
                                    </Button>
                                  )}
                                  {canMoveDown && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveElement(element.id, "down")}
                                      className="h-6 w-6 p-0 transition-transform hover:scale-110 active:scale-95"
                                      title="העבר למטה"
                                    >
                                      <ChevronDown className="w-3 h-3 transition-transform" />
                                    </Button>
                                  )}
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
                                      className="h-6 w-6 p-0"
                                      title="ערוך"
                                    >
                                      <FileText className="w-3 h-3" />
                                    </Button>
                                  )}
                                  {element.type.startsWith("custom-") && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeElement(element.id)}
                                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                      title="מחק"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {isExpanded && settingsElementId === element.id && selectedElement && (
                                <div className="pr-4 pb-2 border-r-2 border-gray-200 mt-2">
                                  <ElementSettingsContent
                                    elementType={selectedElement.type}
                                    elementName={elementLabels[selectedElement.type as keyof typeof elementLabels]}
                                    currentConfig={selectedElement.config?.style}
                                    onSave={(styleConfig) => {
                                      updateElementStyle(element.id, styleConfig)
                                      setSettingsElementId(null)
                                    }}
                                    onCancel={() => {
                                      setSettingsElementId(null)
                                      toggleElementExpanded(element.id)
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-sm text-gray-500 text-center py-4">
                          אין אלמנטים להצגה
                        </div>
                      )}
                    </div>
                    {hasUnsavedChanges && (
                      <Button 
                        size="sm" 
                        onClick={handleSaveProductPageLayout}
                        className="w-full mt-2"
                      >
                        שמור שינויים
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleCategoryPageClick}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <FolderOpen className="w-4 h-4 flex-shrink-0" />
              <span className="text-right">דף קטגוריות</span>
            </button>
          </div>
        )}
      </div>

      {/* Category Page Designer */}
      <CategoryPageDesigner
        open={showCategoryDesigner}
        onOpenChange={setShowCategoryDesigner}
        onLayoutChange={handleCategoryLayoutChange}
        onSave={handleSaveCategoryLayout}
        currentLayout={pendingCategoryLayout || categoryLayout}
        hasUnsavedChanges={hasUnsavedChanges && !!pendingCategoryLayout}
      />

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
                  {addableElementTypes.map((type: any) => (
                    <SelectItem key={type} value={type}>
                          {elementLabels[type as keyof typeof elementLabels]}
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
                  setElements((prev) =>
                    prev.map((el: any) =>
                      el.id === editingElementId
                        ? { ...el, config: newElementConfig }
                        : el
                    )
                  )
                  setEditingElementId(null)
                  setHasUnsavedChanges(true)
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

