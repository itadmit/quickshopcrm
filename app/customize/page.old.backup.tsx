"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { 
  ChevronLeft, 
  ChevronRight,
  Home, 
  Package, 
  FolderOpen,
  Palette,
  Settings,
  X,
  Monitor,
  Smartphone,
  Save,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProductPageElement, ProductPageElementType } from "@/components/storefront/ProductPageLayoutDesigner"
import { ProductPageSettingsSidebar } from "@/components/customize/ProductPageSettingsSidebar"
import { ProductPagePreview } from "@/components/customize/ProductPagePreview"

type PageType = "home" | "category" | "product"

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

const elementIcons: Record<ProductPageElementType, any> = {
  "product-name": Package,
  "product-price": Package,
  "product-description": Package,
  "product-gallery": Package,
  "product-variants": Package,
  "product-quantity": Package,
  "product-buttons": Package,
  "product-reviews": Package,
  "product-related": Package,
  "custom-text": Package,
  "custom-accordion": Package,
  "custom-html": Package,
}

export default function CustomizePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedShop, loading: shopLoading } = useShop()
  
  // זיהוי אוטומטי של הדף הנוכחי מ-query params
  const initialPageType = searchParams.get("page") as PageType | null
  const initialPageId = searchParams.get("id") || ""
  
  const [pageType, setPageType] = useState<PageType | null>(initialPageType || null)
  const [selectedCategory, setSelectedCategory] = useState<string>(initialPageType === "category" ? initialPageId : "")
  const [selectedProduct, setSelectedProduct] = useState<string>(initialPageType === "product" ? initialPageId : "")
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false)
  const [customFields, setCustomFields] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [elements, setElements] = useState<ProductPageElement[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["template"]))

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

  useEffect(() => {
    if (selectedShop?.slug) {
      fetchProducts()
      fetchCategories()
      fetchProductPageLayout()
    } else {
      setLoading(false)
    }
  }, [selectedShop?.slug])

  // טעינת קאסטום פילדס כשנבחר מוצר
  useEffect(() => {
    if (selectedProduct && pageType === "product") {
      fetchCustomFields(selectedProduct)
    } else {
      setCustomFields([])
    }
  }, [selectedProduct, pageType])

  const fetchCustomFields = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}/custom-fields`)
      if (response.ok) {
        const data = await response.json()
        setCustomFields(data || [])
      }
    } catch (error) {
      console.error("Error fetching custom fields:", error)
      setCustomFields([])
    }
  }

  useEffect(() => {
    const pageParam = searchParams.get("page")
    const idParam = searchParams.get("id")
    
    if (pageParam && ["home", "category", "product"].includes(pageParam)) {
      setPageType(pageParam as PageType)
      
      if (pageParam === "category" && idParam) {
        setSelectedCategory(idParam)
      } else if (pageParam === "product" && idParam) {
        setSelectedProduct(idParam)
      }
    }
  }, [searchParams, selectedShop?.slug])

  // בחירה אוטומטית של מוצר/קטגוריה כשמשנים סוג דף
  useEffect(() => {
    if (!pageType) return
    
    if (pageType === "product" && products.length > 0 && !selectedProduct) {
      const productWithImages = products.find(
        (product) => product.images && Array.isArray(product.images) && product.images.length > 0
      )
      if (productWithImages) {
        setSelectedProduct(productWithImages.id)
      } else if (products[0]) {
        setSelectedProduct(products[0].id)
      }
    } else if (pageType === "category" && categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id)
    }
  }, [pageType, products, categories, selectedProduct, selectedCategory])

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
    } finally {
      setLoading(false)
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

  const fetchProductPageLayout = async () => {
    if (!selectedShop?.slug) return
    try {
      const response = await fetch(`/api/storefront/${selectedShop?.slug || ""}/product-page-layout`)
      if (response.ok) {
        const data = await response.json()
        if (data.layout?.elements && data.layout.elements.length > 0) {
          setElements([...data.layout.elements].sort((a, b) => a.position - b.position))
        } else {
          setElements(defaultElements)
        }
      } else {
        setElements(defaultElements)
      }
    } catch (error) {
      console.error("Error fetching product page layout:", error)
      setElements(defaultElements)
    }
  }

  const handlePageTypeSelect = (type: PageType) => {
    if (pageType === type) return
    
    setPageType(type)
    setSelectedElementId(null)
    setShowSettingsSidebar(false)
    
    if (type === "home") {
      router.push(`/customize?page=home`, { scroll: false })
    } else if (type === "product") {
      if (products.length > 0) {
        const productWithImages = products.find(
          (product) => product.images && Array.isArray(product.images) && product.images.length > 0
        )
        const productToSelect = productWithImages || products[0]
        if (productToSelect) {
          setSelectedProduct(productToSelect.id)
          router.push(`/customize?page=product&id=${productToSelect.id}`, { scroll: false })
        } else {
          router.push(`/customize?page=product`, { scroll: false })
        }
      } else {
        router.push(`/customize?page=product`, { scroll: false })
      }
    } else if (type === "category") {
      if (categories.length > 0) {
        setSelectedCategory(categories[0].id)
        router.push(`/customize?page=category&id=${categories[0].id}`, { scroll: false })
      } else {
        router.push(`/customize?page=category`, { scroll: false })
      }
    }
  }

  const handleElementClick = (elementId: string) => {
    setSelectedElementId(elementId)
    setShowSettingsSidebar(true)
  }

  const handleElementHover = (elementId: string | null) => {
    // אפשר להוסיף כאן אפקט hover אם צריך
  }

  // שמירת elements ב-localStorage לעדכון בזמן אמת (לא לשרת - רק כששומרים)
  useEffect(() => {
    if (selectedShop?.slug && elements.length > 0 && pageType === "product") {
      const storageKey = `productPageLayout_${selectedShop?.slug || ""}`
      const timestamp = Date.now()
      const layoutData = {
        elements: elements.map(el => ({
          ...el,
          // וידוא שה-config נשמר נכון
          config: el.config || {}
        })),
        timestamp
      }
      
      // שמירה ב-localStorage לעדכון בזמן אמת בלבד (לא לשרת)
      localStorage.setItem(storageKey, JSON.stringify(layoutData))
      
      // שליחת הודעה ל-iframe לעדכון מידי
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "updateProductPageLayout",
            elements: layoutData.elements,
            timestamp
          },
          window.location.origin
        )
        
        // גם עם delay למקרה שה-iframe עדיין לא מוכן
        setTimeout(() => {
          iframe.contentWindow?.postMessage(
            {
              type: "updateProductPageLayout",
              elements: layoutData.elements,
              timestamp
            },
            window.location.origin
          )
        }, 100)
      }
    }
  }, [elements, selectedShop?.slug, pageType])

  const handleSaveLayout = async () => {
    if (!selectedShop?.slug) return
    
    setSaving(true)
    try {
      // שמירה לשרת
      const response = await fetch(`/api/storefront/${selectedShop?.slug || ""}/product-page-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements }),
      })
      
      if (response.ok) {
        setHasUnsavedChanges(false)
        
        // עדכון localStorage עם הערכים מה-DB
        const storageKey = `productPageLayout_${selectedShop?.slug || ""}`
        const layoutData = {
          elements: elements.map(el => ({
            ...el,
            config: el.config || {}
          })),
          timestamp: Date.now()
        }
        localStorage.setItem(storageKey, JSON.stringify(layoutData))
        
        // רענון התצוגה המקדימה
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        if (iframe && iframe.contentWindow) {
          // שליחת הודעה עם הערכים המעודכנים
          iframe.contentWindow.postMessage(
            {
              type: "updateProductPageLayout",
              elements: layoutData.elements,
              timestamp: layoutData.timestamp
            },
            window.location.origin
          )
          
          // גם רענון ה-iframe
          const currentSrc = iframe.src
          iframe.src = currentSrc.split('?')[0] + '?t=' + Date.now()
        }
      }
    } catch (error) {
      console.error("Error saving layout:", error)
    } finally {
      setSaving(false)
    }
  }

  const getPreviewUrl = () => {
    if (!selectedShop?.slug || !pageType) return ""
    
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    const params = new URLSearchParams()
    params.set("customize", "true")
    params.set("edit_layout", "true")
    params.set("_t", Date.now().toString())
    
    const queryString = params.toString()
    const queryPrefix = queryString ? `?${queryString}` : ""
    
    switch (pageType) {
      case "home":
        return `${baseUrl}/shop/${selectedShop?.slug || ""}${queryPrefix}`
      case "category":
        if (selectedCategory) {
          return `${baseUrl}/shop/${selectedShop?.slug || ""}/categories/${selectedCategory}${queryPrefix}`
        }
        return ""
      case "product":
        if (selectedProduct) {
          const product = products.find(p => p.id === selectedProduct)
          return product ? `${baseUrl}/shop/${selectedShop?.slug || ""}/products/${product.slug}${queryPrefix}` : ""
        }
        return ""
      default:
        return ""
    }
  }

  const previewUrl = useMemo(() => getPreviewUrl(), [
    selectedShop?.slug,
    pageType,
    selectedCategory,
    selectedProduct,
    products,
  ])

  const filteredElements = useMemo(() => {
    if (!searchQuery) return elements
    const query = searchQuery.toLowerCase()
    return elements.filter(el => 
      elementLabels[el.type].toLowerCase().includes(query)
    )
  }, [elements, searchQuery])

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
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

      setHasUnsavedChanges(true)
      return newElements.sort((a, b) => a.position - b.position)
    })
  }

  const toggleElementVisibility = (elementId: string) => {
    setElements((prev) =>
      prev.map((el: any) => {
        if (el.id === elementId) {
          setHasUnsavedChanges(true)
          return { ...el, visible: !el.visible }
        }
        return el
      })
    )
  }

  const addNewBlock = (blockType: ProductPageElementType) => {
    const newElement: ProductPageElement = {
      id: `custom-${Date.now()}`,
      type: blockType,
      visible: true,
      position: elements.length,
      config: {},
    }
    setElements((prev) => [...prev, newElement])
    setHasUnsavedChanges(true)
    // פתיחת ההגדרות ישירות
    setSelectedElementId(newElement.id)
    setShowSettingsSidebar(true)
  }

  const addableBlockTypes: ProductPageElementType[] = [
    "custom-text",
    "custom-accordion",
    "custom-html",
  ]

  if (shopLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Palette className="w-16 h-16 text-gray-400 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">טוען נתונים...</h2>
        <p className="text-gray-600 mb-4">אנא המתן</p>
      </div>
    )
  }

  if (!selectedShop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Palette className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">אין חנות נבחרת</h2>
        <p className="text-gray-600 mb-4">אנא בחרו חנות כדי להתחיל בהתאמה אישית</p>
        <Button onClick={() => router.push('/shops')}>
          בחר חנות
        </Button>
      </div>
    )
  }

  if (!pageType) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2"
            >
              <ChevronRight className="w-4 h-4" />
              חזור לדשבורד
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-gray-900">התאמה אישית</span>
              <Badge variant="outline" className="text-xs">
                {selectedShop?.name || ""}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content - Page Selection */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full space-y-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">בחר דף לעריכה</h2>
              <p className="text-gray-600">בחר איזה דף תרצה להתאים אישית</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handlePageTypeSelect("home")}
                className="w-full flex items-center gap-4 p-6 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-right"
              >
                <div className="p-4 bg-emerald-100 rounded-lg">
                  <Home className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">דף בית</h3>
                  <p className="text-sm text-gray-500">ערוך את עמוד הבית של החנות</p>
                </div>
                <ChevronLeft className="w-6 h-6 text-gray-400" />
              </button>
              
              <button
                onClick={() => handlePageTypeSelect("product")}
                disabled={products.length === 0}
                className="w-full flex items-center gap-4 p-6 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-right disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-4 bg-blue-100 rounded-lg">
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">דף מוצר</h3>
                  <p className="text-sm text-gray-500">
                    {products.length > 0 
                      ? `ערוך את עמוד המוצר (${products.length} מוצרים זמינים)`
                      : "אין מוצרים עדיין"}
                  </p>
                </div>
                <ChevronLeft className="w-6 h-6 text-gray-400" />
              </button>
              
              <button
                onClick={() => handlePageTypeSelect("category")}
                disabled={categories.length === 0}
                className="w-full flex items-center gap-4 p-6 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-right disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-4 bg-green-100 rounded-lg">
                  <FolderOpen className="w-8 h-8 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">דף קטגוריה</h3>
                  <p className="text-sm text-gray-500">
                    {categories.length > 0
                      ? `ערוך את עמוד הקטגוריה (${categories.length} קטגוריות זמינות)`
                      : "אין עדיין קטגוריות"}
                  </p>
                </div>
                <ChevronLeft className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {selectedShop?.name || ""}
            </Badge>
            {pageType === "product" && selectedProduct && (
              <>
                <span className="text-gray-400">/</span>
                <span className="text-sm text-gray-600">
                  {products.find(p => p.id === selectedProduct)?.name || "מוצר"}
                </span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* בחירת מוצר/קטגוריה */}
          {pageType === "category" && (
            <Select value={selectedCategory} onValueChange={(value) => {
              setSelectedCategory(value)
              router.push(`/customize?page=category&id=${value}`)
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="בחר קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {pageType === "product" && (
            <Select value={selectedProduct} onValueChange={(value) => {
              setSelectedProduct(value)
              router.push(`/customize?page=product&id=${value}`)
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="בחר מוצר" />
              </SelectTrigger>
              <SelectContent>
                {products.map((prod: any) => (
                  <SelectItem key={prod.id} value={prod.id}>
                    {prod.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* תצוגה מקדימה */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={previewMode === "desktop" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreviewMode("desktop")}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant={previewMode === "mobile" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreviewMode("mobile")}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>

          {/* כפתור שמירה */}
          {hasUnsavedChanges && (
            <Button
              onClick={handleSaveLayout}
              disabled={saving}
              size="sm"
            >
              {saving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  שמור
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Elements List */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col sidebar-scroll">
          <div className="p-4 border-b border-gray-200">
            <div className="mb-3">
              <h2 className="font-semibold text-gray-900 mb-1">
                {pageType === "product" ? "דף מוצר" : pageType === "category" ? "דף קטגוריה" : "דף בית"}
              </h2>
              {pageType === "product" && selectedProduct && (
                <p className="text-xs text-gray-500">
                  {products.find(p => p.id === selectedProduct)?.name || "מוצר"}
                </p>
              )}
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="חפש בלוקים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {/* Header Section */}
            <div className="mb-2">
              <button
                onClick={() => toggleSection("header")}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <span>Header</span>
                {expandedSections.has("header") ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {expandedSections.has("header") && (
                <div className="mr-4 mt-1 space-y-1">
                  <div className="px-3 py-1.5 text-xs text-gray-500">Announcement bar</div>
                  <div className="px-3 py-1.5 text-xs text-gray-500">Header</div>
                </div>
              )}
            </div>

            {/* Template Section */}
            <div className="mb-2">
              <button
                onClick={() => toggleSection("template")}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <span>Template</span>
                {expandedSections.has("template") ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {expandedSections.has("template") && pageType === "product" && (
                <div className="mr-4 mt-1 space-y-1">
                  {filteredElements
                    .sort((a, b) => a.position - b.position)
                    .map((element, index) => {
                      const Icon = elementIcons[element.type] || Package
                      const isSelected = selectedElementId === element.id
                      const canMoveUp = index > 0
                      const canMoveDown = index < filteredElements.length - 1
                      
                      return (
                        <div
                          key={element.id}
                          className={cn(
                            "group flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                            isSelected
                              ? "bg-emerald-50 border border-emerald-200"
                              : "hover:bg-gray-50"
                          )}
                        >
                          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 cursor-move" />
                          <button
                            onClick={() => handleElementClick(element.id)}
                            className="flex-1 flex items-center gap-2 text-right"
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className={cn(!element.visible && "text-gray-400 line-through")}>
                              {elementLabels[element.type]}
                            </span>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                moveElement(element.id, "up")
                              }}
                              disabled={!canMoveUp}
                              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              title="העבר למעלה"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                moveElement(element.id, "down")
                              }}
                              disabled={!canMoveDown}
                              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              title="העבר למטה"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleElementVisibility(element.id)
                              }}
                              className="p-1 hover:bg-gray-200 rounded"
                              title={element.visible ? "הסתר" : "הצג"}
                            >
                              {element.visible ? (
                                <Eye className="w-3 h-3" />
                              ) : (
                                <EyeOff className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  <Select
                    onValueChange={(value) => {
                      addNewBlock(value as ProductPageElementType)
                    }}
                  >
                    <SelectTrigger className="w-full border-dashed border-gray-300 hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        <span>הוסף בלוק</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {addableBlockTypes.map((type: any) => (
                        <SelectItem key={type} value={type}>
                          {elementLabels[type as keyof typeof elementLabels]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Footer Section */}
            <div className="mb-2">
              <button
                onClick={() => toggleSection("footer")}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <span>Footer</span>
                {expandedSections.has("footer") ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {expandedSections.has("footer") && (
                <div className="mr-4 mt-1 space-y-1">
                  <div className="px-3 py-1.5 text-xs text-gray-500">Footer</div>
                  <div className="px-3 py-1.5 text-xs text-gray-500">Mobile sticky bar</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center - Preview */}
        <div className="flex-1 flex flex-col bg-gray-100 relative">
          {previewUrl ? (
            <ProductPagePreview
              previewUrl={previewUrl}
              previewMode={previewMode}
              isEditing={true}
              selectedElementId={selectedElementId}
              onElementClick={handleElementClick}
              onElementHover={handleElementHover}
              onMoveElement={moveElement}
              onToggleVisibility={toggleElementVisibility}
              elements={elements}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {pageType === "category" && categories.length === 0
                    ? "אין עדיין קטגוריות"
                    : pageType === "product" && products.length === 0
                    ? "אין מוצרים עדיין"
                    : "טוען תצוגה מקדימה..."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Settings (opens when element is selected) */}
        {showSettingsSidebar && selectedElementId && pageType === "product" && (
          <ProductPageSettingsSidebar
            open={showSettingsSidebar}
            onClose={() => {
              setShowSettingsSidebar(false)
              setSelectedElementId(null)
            }}
            elementId={selectedElementId}
            elements={elements}
            onElementsChange={(newElements) => {
              setElements(newElements)
              setHasUnsavedChanges(true)
            }}
            shopSlug={selectedShop?.slug || ""}
            viewMode={previewMode}
            onViewModeChange={setPreviewMode}
            productId={selectedProduct}
            customFields={customFields}
          />
        )}
      </div>

    </div>
  )
}
