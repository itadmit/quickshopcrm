"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ChevronLeft, 
  ChevronRight,
  Home, 
  Package, 
  FolderOpen,
  Layout,
  Image as ImageIcon,
  Grid3x3,
  List,
  Palette,
  Type,
  Settings,
  X,
  Monitor,
  Smartphone,
  Save,
  Plus,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  FileText
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProductPageLayoutDesigner, ProductPageElement, ProductPageElementType } from "@/components/storefront/ProductPageLayoutDesigner"
import { ElementSettingsContent } from "@/components/storefront/ElementSettingsContent"
import { ElementStyleConfig } from "@/components/storefront/ElementSettingsDialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { HomePageCustomizer, HomePageSection } from "@/components/customize/HomePageCustomizer"

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

type PageType = "home" | "category" | "product"
type GalleryLayout = "standard" | "right-side" | "left-side" | "masonry" | "fixed"
type CategoryLayout = "grid" | "list" | "compact-grid" | "large-grid"

interface CustomizerSection {
  id: string
  title: string
  icon: any
  children?: CustomizerSection[]
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
  const [currentSection, setCurrentSection] = useState<string | null>(null)
  const [galleryLayout, setGalleryLayout] = useState<GalleryLayout>("standard")
  const [categoryLayout, setCategoryLayout] = useState<CategoryLayout>("grid")
  // הגדרות מקומיות שלא נשמרו עדיין
  const [pendingGalleryLayout, setPendingGalleryLayout] = useState<GalleryLayout | null>(null)
  const [pendingCategoryLayout, setPendingCategoryLayout] = useState<CategoryLayout | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [homePageSections, setHomePageSections] = useState<any[]>([])
  const [selectedHomeSection, setSelectedHomeSection] = useState<string | null>(null)

  // תפריט Customizer
  const customizerSections: CustomizerSection[] = [
    {
      id: "layouts",
      title: "פריסות",
      icon: Layout,
      children: [
        {
          id: "home-layout",
          title: "דף בית",
          icon: Home,
        },
        {
          id: "product-layout",
          title: "דף מוצר",
          icon: Package,
        },
        {
          id: "category-layout",
          title: "דף קטגוריה",
          icon: FolderOpen,
        },
      ],
    },
    {
      id: "design",
      title: "עיצוב",
      icon: Palette,
      children: [
        {
          id: "colors",
          title: "צבעים",
          icon: Palette,
        },
        {
          id: "typography",
          title: "טיפוגרפיה",
          icon: Type,
        },
      ],
    },
    {
      id: "settings",
      title: "הגדרות",
      icon: Settings,
    },
  ]

  useEffect(() => {
    if (selectedShop?.slug) {
      fetchProducts()
      fetchCategories()
      fetchGalleryLayout()
      fetchCategoryLayout()
      fetchProductPageLayout()
      fetchHomePageLayout()
    } else {
      setLoading(false)
    }
  }, [selectedShop?.slug])

  const fetchHomePageLayout = async () => {
    if (!selectedShop?.slug) return
    try {
      const response = await fetch(`/api/storefront/${selectedShop.slug}/home-page-layout`)
      if (response.ok) {
        const data = await response.json()
        if (data.sections && Array.isArray(data.sections)) {
          setHomePageSections(data.sections)
        }
      }
    } catch (error) {
      console.error("Error fetching home page layout:", error)
    }
  }

  const fetchProductPageLayout = async () => {
    if (!selectedShop?.slug) return
    try {
      const response = await fetch(`/api/storefront/${selectedShop.slug}/product-page-layout`)
      if (response.ok) {
        const data = await response.json()
        setProductPageLayout(data.layout)
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

  // זיהוי אוטומטי של הדף הנוכחי כשנכנסים ל-customize
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

  // בחירה אוטומטית של מוצר/קטגוריה וכניסה להגדרות כשמשנים סוג דף
  useEffect(() => {
    if (!pageType) return // אם לא נבחר pageType, לא עושים כלום
    
    if (pageType === "home") {
      // פתיחת הגדרות דף בית אוטומטית
      setCurrentSection("home-layout")
    } else if (pageType === "product") {
      // פתיחת הגדרות דף מוצר אוטומטית
      setCurrentSection("product-layout")
      
      // בחירת מוצר אם אין אחד נבחר - קודם מוצר עם תמונה, אחרת הראשון
      if (products.length > 0 && !selectedProduct) {
        const productWithImages = products.find(
          (product) => product.images && Array.isArray(product.images) && product.images.length > 0
        )
        if (productWithImages) {
          setSelectedProduct(productWithImages.id)
        } else if (products[0]) {
          setSelectedProduct(products[0].id)
        }
      }
    } else if (pageType === "category") {
      // פתיחת הגדרות דף קטגוריה אוטומטית
      setCurrentSection("category-layout")
      
      // בחירת קטגוריה אם אין אחת נבחרת
      if (categories.length > 0 && !selectedCategory) {
        setSelectedCategory(categories[0].id)
      }
    }
  }, [pageType, products, categories, selectedProduct, selectedCategory])
  
  // פונקציה לבחירת סוג דף
  const handlePageTypeSelect = (type: PageType) => {
    // אם זה אותו pageType, לא עושים כלום
    if (pageType === type) return
    
    setPageType(type)
    
    if (type === "home") {
      setCurrentSection("home-layout")
      // עדכון URL
      router.push(`/customize?page=home`, { scroll: false })
    } else if (type === "product") {
      setCurrentSection("product-layout")
      // בחירת מוצר - קודם עם תמונה, אחרת הראשון
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
      setCurrentSection("category-layout")
      // בחירת קטגוריה ראשונה
      if (categories.length > 0) {
        setSelectedCategory(categories[0].id)
        router.push(`/customize?page=category&id=${categories[0].id}`, { scroll: false })
      } else {
        router.push(`/customize?page=category`, { scroll: false })
      }
    }
  }

  const fetchProducts = async () => {
    if (!selectedShop?.slug) return
    try {
      const response = await fetch(`/api/storefront/${selectedShop.slug}/products?limit=50`)
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
      const response = await fetch(`/api/storefront/${selectedShop.slug}/categories`)
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
      const response = await fetch(`/api/storefront/${selectedShop.slug}/product-gallery-layout`)
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
      const response = await fetch(`/api/storefront/${selectedShop.slug}/category-layout`)
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

  // עדכון מקומי (לא נשמר) - משנה את התצוגה המקדימה בזמן אמת
  const updateGalleryLayoutPreview = (layout: GalleryLayout) => {
    setPendingGalleryLayout(layout)
    setHasUnsavedChanges(true)
    setPreviewRefreshKey(prev => prev + 1) // כפיית רענון iframe
  }

  const updateCategoryLayoutPreview = (layout: CategoryLayout) => {
    setPendingCategoryLayout(layout)
    setHasUnsavedChanges(true)
    setPreviewRefreshKey(prev => prev + 1) // כפיית רענון iframe
  }

  // שמירה סופית של כל השינויים
  const saveAllChanges = async () => {
    if (!selectedShop?.slug) return
    
    setSaving(true)
    try {
      // שמירת פריסת גלריה אם יש שינויים
      if (pendingGalleryLayout && pendingGalleryLayout !== galleryLayout) {
        await fetch(`/api/storefront/${selectedShop.slug}/product-gallery-layout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout: pendingGalleryLayout }),
        })
        setGalleryLayout(pendingGalleryLayout)
      }

      // שמירת פריסת קטגוריה אם יש שינויים
      if (pendingCategoryLayout && pendingCategoryLayout !== categoryLayout) {
        await fetch(`/api/storefront/${selectedShop.slug}/category-layout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout: pendingCategoryLayout }),
        })
        setCategoryLayout(pendingCategoryLayout)
      }

      // שמירת אלמנטי דף המוצר אם יש שינויים
      if (elements.length > 0) {
        await fetch(`/api/storefront/${selectedShop.slug}/product-page-layout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ elements }),
        })
      }

      // איפוס השינויים הממתינים
      setPendingGalleryLayout(null)
      setPendingCategoryLayout(null)
      setHasUnsavedChanges(false)
      
      // רענון ה-iframe כדי להציג את השינויים השמורים
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      if (iframe) {
        const currentSrc = iframe.src
        iframe.src = currentSrc.split('?')[0] + '?t=' + Date.now()
      }
    } catch (error) {
      console.error("Error saving changes:", error)
    } finally {
      setSaving(false)
    }
  }

  // בניית URL לתצוגה מקדימה עם query params לעדכון בזמן אמת
  const getPreviewUrl = () => {
    if (!selectedShop?.slug || !pageType) return ""
    
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    const params = new URLSearchParams()
    
    // הוספת הגדרות מקדימות ל-query params - משתמשים ב-pending אם יש, אחרת בערכים השמורים
    if (pageType === "home") {
      // במצב customize של דף בית
      params.set("customize", "true")
    } else if (pageType === "product") {
      const layoutToUse = pendingGalleryLayout || galleryLayout
      params.set("preview_layout", layoutToUse)
      // הוספת edit_layout=true כשאנחנו ב-product-layout section
      if (currentSection === "product-layout") {
        params.set("edit_layout", "true")
      }
      // הוספת preview_mode כדי שהאייפרם יקרא מ-localStorage
      params.set("preview_mode", "true")
    } else if (pageType === "category") {
      const layoutToUse = pendingCategoryLayout || categoryLayout
      params.set("preview_layout", layoutToUse)
    }
    
    // הוספת timestamp כדי לכפות רענון כשמשנים פריסה
    params.set("_t", Date.now().toString())
    
    const queryString = params.toString()
    const queryPrefix = queryString ? `?${queryString}` : ""
    
    switch (pageType) {
      case "home":
        return `${baseUrl}/shop/${selectedShop.slug}${queryPrefix}`
      case "category":
        if (selectedCategory) {
          return `${baseUrl}/shop/${selectedShop.slug}/categories/${selectedCategory}${queryPrefix}`
        }
        return ""
      case "product":
        if (selectedProduct) {
          const product = products.find(p => p.id === selectedProduct)
          return product ? `${baseUrl}/shop/${selectedShop.slug}/products/${product.slug}${queryPrefix}` : ""
        }
        return ""
      default:
        return ""
    }
  }

  const [showProductPageLayoutDesigner, setShowProductPageLayoutDesigner] = useState(false)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [productPageLayout, setProductPageLayout] = useState<any>(null)
  const [elements, setElements] = useState<ProductPageElement[]>([])
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set())
  const [settingsElementId, setSettingsElementId] = useState<string | null>(null)
  const [showAddElementDialog, setShowAddElementDialog] = useState(false)
  const [newElementType, setNewElementType] = useState<ProductPageElementType>("custom-text")
  const [newElementConfig, setNewElementConfig] = useState<Record<string, any>>({})
  const [editingElementId, setEditingElementId] = useState<string | null>(null)
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false)
  const [templateName, setTemplateName] = useState("")

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
  
  // שמירת elements ב-localStorage לעדכון בזמן אמת (אחרי ש-elements מוגדר)
  useEffect(() => {
    if (selectedShop?.slug && elements.length > 0) {
      const storageKey = `productPageLayout_${selectedShop.slug}`
      const layoutData = {
        elements,
        timestamp: Date.now()
      }
      localStorage.setItem(storageKey, JSON.stringify(layoutData))
    }
  }, [elements, selectedShop?.slug])

  // בדיקה אם יש פרמטר element ב-URL
  useEffect(() => {
    const elementId = searchParams.get("element")
    if (elementId && pageType === "product") {
      setSelectedElementId(elementId)
      setShowProductPageLayoutDesigner(true)
      // פתיחת הגדרות האלמנט
      setSettingsElementId(elementId)
    }
  }, [searchParams, pageType])

  // האזנה להודעות מה-iframe (כשלוחצים על הגדרות בדף המוצר)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // בדיקת אבטחה - רק הודעות מאותו origin
      if (event.origin !== window.location.origin) return
      
      if (event.data.type === "openElementSettings" && event.data.elementId) {
        setSettingsElementId(event.data.elementId)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [])

  // האזנה לעדכון layout כשנשמר מ-CustomizeMenu
  useEffect(() => {
    const handleLayoutSaved = (event: CustomEvent) => {
      // בדיקה שהחנות תואמת
      if (event.detail?.shopSlug === selectedShop?.slug) {
        // רענון הנתונים מהשרת
        if (selectedShop?.slug) {
          fetchProductPageLayout().then(() => {
            // אחרי טעינת הנתונים, עדכון האייפרם
            setPreviewRefreshKey(prev => prev + 1)
          })
          fetchGalleryLayout()
        }
      }
    }

    window.addEventListener('productPageLayoutSaved', handleLayoutSaved as EventListener)
    return () => {
      window.removeEventListener('productPageLayoutSaved', handleLayoutSaved as EventListener)
    }
  }, [selectedShop?.slug])

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case "home-layout":
        return (
          <HomePageCustomizer
            shopSlug={selectedShop?.slug || ""}
            shopId={selectedShop?.id}
            initialSections={homePageSections}
            onSave={async (sections) => {
              if (!selectedShop?.slug) return
              
              const response = await fetch(`/api/storefront/${selectedShop.slug}/home-page-layout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sections }),
              })
              
              if (response.ok) {
                setHomePageSections(sections)
                // רענון התצוגה המקדימה
                setPreviewRefreshKey(prev => prev + 1)
              }
            }}
          />
        )
      
      case "product-layout":
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">בחר פריסת גלריה</h3>
            <div className="space-y-2">
              {[
                { value: "standard", label: "סטנדרטית", desc: "תמונה גדולה למעלה ותמונות קטנות למטה" },
                { value: "right-side", label: "תמונה משמאל", desc: "תמונה גדולה משמאל ותמונות קטנות משמאל" },
                { value: "left-side", label: "תמונה מימין", desc: "תמונה גדולה מימין ותמונות קטנות מימין" },
                { value: "masonry", label: "תפזורת", desc: "תמונות בגדלים שונים והטקסט נשאר במקום" },
                { value: "fixed", label: "קבועה", desc: "תמונות אחת אחרי השנייה והטקסט נשאר במקום" },
              ].map((option) => {
                const currentValue = pendingGalleryLayout || galleryLayout
                const isSelected = currentValue === option.value
                const isPending = pendingGalleryLayout === option.value && pendingGalleryLayout !== galleryLayout
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      updateGalleryLayoutPreview(option.value as GalleryLayout)
                    }}
                    className={cn(
                      "w-full text-right p-3 border rounded-lg transition-all",
                      isSelected
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300",
                      isPending && "ring-2 ring-emerald-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-600 mt-1">{option.desc}</div>
                      </div>
                      {isPending && (
                        <Badge variant="outline" className="text-xs">
                          לא נשמר
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
            
            {/* עץ האלמנטים */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">אלמנטים</h3>
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
                      {elements && elements.length > 0 ? (() => {
                        const filteredElements = elements
                          .filter((element) => element.type !== "product-gallery") // הסרת גלריה מהרשימה
                          .sort((a, b) => a.position - b.position)
                  return filteredElements.map((element, index) => {
                      const isExpanded = expandedElements.has(element.id)
                      const canMoveUp = index > 0
                      const canMoveDown = index < filteredElements.length - 1
                      const selectedElement = settingsElementId === element.id ? element : null
                      
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
                              onClick={(e) => {
                                e.stopPropagation()
                                const newSet = new Set(expandedElements)
                                if (newSet.has(element.id)) {
                                  newSet.delete(element.id)
                                  setSettingsElementId(null) // סגירת הגדרות כשסוגרים
                                } else {
                                  newSet.add(element.id)
                                }
                                setExpandedElements(newSet)
                              }}
                              className="flex items-center gap-2 flex-1 text-right hover:opacity-70"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3 h-3 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                              )}
                              {element.type === "product-gallery" ? (
                                <ImageIcon className="w-4 h-4" />
                              ) : element.type === "product-name" || element.type === "product-price" || element.type === "product-description" ? (
                                <Type className="w-4 h-4" />
                              ) : (
                                <List className="w-4 h-4" />
                              )}
                              <span className={cn(!element.visible && "text-gray-500")}>
                                {elementLabels[element.type]}
                              </span>
                              {!element.visible && (
                                <EyeOff className="w-3 h-3 text-gray-400" />
                              )}
                            </button>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSettingsElementId(element.id)
                                }}
                                className={cn("h-6 w-6 p-0", settingsElementId === element.id && "bg-gray-200")}
                                title="הגדרות"
                              >
                                <Settings className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setElements((prev) =>
                                    prev.map((el) => (el.id === element.id ? { ...el, visible: !el.visible } : el))
                                  )
                                  setHasUnsavedChanges(true)
                                }}
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
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setElements((prev) => {
                                      const newElements = [...prev]
                                      const index = newElements.findIndex((el) => el.id === element.id)
                                      if (index === -1) return prev
                                      const newIndex = index - 1
                                      const temp = newElements[index].position
                                      newElements[index].position = newElements[newIndex].position
                                      newElements[newIndex].position = temp
                                      return newElements.sort((a, b) => a.position - b.position)
                                    })
                                    setHasUnsavedChanges(true)
                                  }}
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
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setElements((prev) => {
                                      const newElements = [...prev]
                                      const index = newElements.findIndex((el) => el.id === element.id)
                                      if (index === -1) return prev
                                      const newIndex = index + 1
                                      const temp = newElements[index].position
                                      newElements[index].position = newElements[newIndex].position
                                      newElements[newIndex].position = temp
                                      return newElements.sort((a, b) => a.position - b.position)
                                    })
                                    setHasUnsavedChanges(true)
                                  }}
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
                                  onClick={() => {
                                    setElements((prev) => prev.filter((el) => el.id !== element.id))
                                    setHasUnsavedChanges(true)
                                  }}
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                  title="מחק"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                })() : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    אין אלמנטים להצגה
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case "category-layout":
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">בחר פריסת קטגוריה</h3>
            <div className="space-y-2">
              {[
                { value: "grid", label: "רשת", desc: "תצוגת רשת עם 4 עמודות" },
                { value: "list", label: "רשימה", desc: "תצוגת רשימה עם תמונה משמאל" },
                { value: "compact-grid", label: "רשת צפופה", desc: "תצוגת רשת צפופה עם 6 עמודות" },
                { value: "large-grid", label: "רשת גדולה", desc: "תצוגת רשת גדולה עם 3 עמודות" },
              ].map((option) => {
                const currentValue = pendingCategoryLayout || categoryLayout
                const isSelected = currentValue === option.value
                const isPending = pendingCategoryLayout === option.value && pendingCategoryLayout !== categoryLayout
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      updateCategoryLayoutPreview(option.value as CategoryLayout)
                    }}
                    className={cn(
                      "w-full text-right p-3 border rounded-lg transition-all",
                      isSelected
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300",
                      isPending && "ring-2 ring-emerald-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-600 mt-1">{option.desc}</div>
                      </div>
                      {isPending && (
                        <Badge variant="outline" className="text-xs">
                          לא נשמר
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )

      case "colors":
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">צבעים</h3>
            <p className="text-sm text-gray-600">
              עריכת צבעים זמינה בהגדרות החנות
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/settings')}
            >
              פתח הגדרות עיצוב
            </Button>
          </div>
        )

      case "typography":
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">טיפוגרפיה</h3>
            <p className="text-sm text-gray-600">
              עריכת טיפוגרפיה זמינה בהגדרות החנות
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/settings')}
            >
              פתח הגדרות עיצוב
            </Button>
          </div>
        )

      case "settings":
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">הגדרות כלליות</h3>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/settings')}
            >
              פתח הגדרות חנות
            </Button>
          </div>
        )

      default:
        return null
    }
  }

  // חישוב previewUrl עם useMemo כדי שיתעדכן כשהשינויים משתנים
  // חייב להיות לפני כל return statements
  const previewUrl = useMemo(() => getPreviewUrl(), [
    selectedShop?.slug,
    pageType,
    selectedCategory,
    selectedProduct,
    products,
    pendingGalleryLayout,
    pendingCategoryLayout,
    galleryLayout, // גם הערכים השמורים
    categoryLayout, // גם הערכים השמורים
    currentSection, // כדי לעדכן כשמשנים section (למשל product-layout)
    previewRefreshKey // כפיית רענון כשמשנים פריסה
  ])
  
  const currentSectionData = currentSection 
    ? customizerSections.flatMap(s => s.children || []).find(s => s.id === currentSection)
    : null

  // הצגת מסך טעינה בזמן שהנתונים נטענים מהשרת
  if (shopLoading) {
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header עם דרופדאון */}
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
              {selectedShop.name}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              תבנית: New York
            </Badge>
          </div>
        </div>
        
        {pageType && (
          <div className="flex items-center gap-4">
            {/* כפתור חזרה למסך הראשי */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPageType(null)
                setCurrentSection(null)
                router.push('/customize')
              }}
              className="flex items-center gap-2"
            >
              <ChevronRight className="w-4 h-4" />
              חזור
            </Button>
            
            {/* בחירת סוג דף */}
            <Select 
              value={pageType || ""} 
              onValueChange={(value) => {
                if (value) {
                  handlePageTypeSelect(value as PageType)
                }
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="בחר דף" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="home">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    <span>דף בית</span>
                  </div>
                </SelectItem>
                <SelectItem value="category">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    <span>דף קטגוריה</span>
                  </div>
                </SelectItem>
                <SelectItem value="product">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>דף מוצר</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* בחירת קטגוריה/מוצר */}
            {pageType === "category" && (
              <Select value={selectedCategory} onValueChange={(value) => {
                setSelectedCategory(value)
                router.push(`/customize?page=category&id=${value}`)
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
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
                  {products.map((prod) => (
                    <SelectItem key={prod.id} value={prod.id}>
                      {prod.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* תצוגה מקדימה */}
            <div className="flex items-center gap-2 border rounded-lg p-1">
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
          </div>
        )}
      </div>

      {/* Main Content - Sidebar + Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          {currentSection ? (
            <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentSection(null)
                  // אם אין pageType, חזור למסך הראשי
                  if (!pageType) {
                    setPageType(null)
                    router.push('/customize', { scroll: false })
                  }
                }}
                className="flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                חזור
              </Button>
              <span className="font-semibold text-gray-900">{currentSectionData?.title}</span>
              <div className="w-10" /> {/* Spacer */}
            </div>
          ) : (
            <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
              {pageType && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPageType(null)
                    setCurrentSection(null)
                    router.push('/customize', { scroll: false })
                  }}
                  className="flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  חזור
                </Button>
              )}
              <span className="font-semibold text-gray-900 flex-1 text-center">התאמה אישית</span>
              {pageType && <div className="w-20" />} {/* Spacer */}
            </div>
          )}

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {currentSection ? (
              <>
                {renderSectionContent(currentSection)}
                {/* כפתורי שמירה */}
                {currentSection === "product-layout" && (
                  <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                    {hasUnsavedChanges && (
                      <Button 
                        onClick={saveAllChanges}
                        disabled={saving}
                        className="w-full"
                      >
                        {saving ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            שומר...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 ml-2" />
                            שמור שינויים
                          </>
                        )}
                      </Button>
                    )}
                    <Button 
                      onClick={() => setShowSaveTemplateDialog(true)}
                      variant="outline"
                      className="w-full"
                    >
                      <FileText className="w-4 h-4 ml-2" />
                      שמור תבנית בשם
                    </Button>
                  </div>
                )}
                {currentSection !== "product-layout" && hasUnsavedChanges && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <Button 
                      onClick={saveAllChanges}
                      disabled={saving}
                      className="w-full"
                    >
                      {saving ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          שומר...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 ml-2" />
                          שמור שינויים
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : !pageType ? (
              // מסך בחירה ראשי
              <div className="space-y-6 p-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">בחר דף לעריכה</h2>
                  <p className="text-sm text-gray-500">בחר איזה דף תרצה להתאים אישית</p>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handlePageTypeSelect("home")}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-right"
                  >
                    <div className="p-3 bg-emerald-100 rounded-lg">
                      <Home className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">דף בית</h3>
                      <p className="text-sm text-gray-500">ערוך את עמוד הבית של החנות</p>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  <button
                    onClick={() => handlePageTypeSelect("product")}
                    disabled={products.length === 0}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-right disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">דף מוצר</h3>
                      <p className="text-sm text-gray-500">
                        {products.length > 0 
                          ? `ערוך את עמוד המוצר (${products.length} מוצרים זמינים)`
                          : "אין מוצרים עדיין"}
                      </p>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  <button
                    onClick={() => handlePageTypeSelect("category")}
                    disabled={categories.length === 0}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-right disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="p-3 bg-green-100 rounded-lg">
                      <FolderOpen className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">דף קטגוריה</h3>
                      <p className="text-sm text-gray-500">
                        {categories.length > 0
                          ? `ערוך את עמוד הקטגוריה (${categories.length} קטגוריות זמינות)`
                          : "אין עדיין קטגוריות"}
                      </p>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {customizerSections.map((section) => (
                  <div key={section.id}>
                    {section.children ? (
                      <div className="space-y-1">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {section.title}
                        </div>
                        {section.children.map((child) => {
                          const Icon = child.icon
                          return (
                            <button
                              key={child.id}
                              onClick={() => setCurrentSection(child.id)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <Icon className="w-5 h-5 flex-shrink-0" />
                              <span className="flex-1 text-right">{child.title}</span>
                              <ChevronLeft className="w-4 h-4 text-gray-400" />
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <button
                        onClick={() => setCurrentSection(section.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <section.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1 text-right">{section.title}</span>
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex flex-col bg-gray-100">
          {!pageType ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">בחר דף לעריכה</h3>
                <p className="text-gray-500">בחר דף מהסיידבר כדי להתחיל בעריכה</p>
              </div>
            </div>
          ) : previewUrl ? (
            <iframe
              key={`${previewUrl}-${previewRefreshKey}`} // key משתנה כדי לכפות רענון כשהשינויים משתנים
              src={previewUrl}
              className={cn(
                "w-full h-full border-0",
                previewMode === "mobile" && "max-w-md mx-auto"
              )}
              style={{
                width: previewMode === "mobile" ? "375px" : "100%",
                height: "100%",
              }}
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
      </div>

      {/* מודל הגדרות אלמנט */}
      <Dialog open={!!settingsElementId} onOpenChange={(open) => {
        if (!open) {
          setSettingsElementId(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              הגדרות {settingsElementId ? elementLabels[elements.find(el => el.id === settingsElementId)?.type || "product-name"] : ""}
            </DialogTitle>
            <DialogDescription>
              התאם את העיצוב והסגנון של האלמנט
            </DialogDescription>
          </DialogHeader>
          {settingsElementId && (() => {
            const selectedElement = elements.find(el => el.id === settingsElementId)
            if (!selectedElement) return null
            return (
              <ElementSettingsContent
                elementType={selectedElement.type}
                elementName={elementLabels[selectedElement.type]}
                currentConfig={selectedElement.config?.style}
                onSave={(styleConfig) => {
                  const updatedElements = elements.map((el) =>
                    el.id === settingsElementId
                      ? { ...el, config: { ...el.config, style: styleConfig } }
                      : el
                  )
                  setElements(updatedElements)
                  setSettingsElementId(null)
                  setHasUnsavedChanges(true)
                  // עדכון מידי של האייפרם - ה-localStorage יתעדכן אוטומטית דרך ה-useEffect
                  setPreviewRefreshKey(prev => prev + 1)
                }}
                onCancel={() => {
                  setSettingsElementId(null)
                }}
              />
            )
          })()}
        </DialogContent>
      </Dialog>

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
                  setElements((prev) =>
                    prev.map((el) =>
                      el.id === editingElementId
                        ? { ...el, config: newElementConfig }
                        : el
                    )
                  )
                  setEditingElementId(null)
                  setHasUnsavedChanges(true)
                } else {
                  const newElement: ProductPageElement = {
                    id: `custom-${Date.now()}`,
                    type: newElementType,
                    visible: true,
                    position: elements.length,
                    config: newElementConfig,
                  }
                  setElements((prev) => [...prev, newElement])
                  setHasUnsavedChanges(true)
                }
                setShowAddElementDialog(false)
                setNewElementType("custom-text")
                setNewElementConfig({})
              }}
            >
              {editingElementId ? "עדכן" : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog לשמירת תבנית */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>שמור תבנית בשם</DialogTitle>
            <DialogDescription>
              שמור את עיצוב עמוד המוצר הנוכחי כתבנית שתוכל להשתמש בה במוצרים אחרים
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="template-name">שם התבנית *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="למשל: ראייבן"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSaveTemplateDialog(false)
              setTemplateName("")
            }}>
              ביטול
            </Button>
            <Button 
              onClick={async () => {
                if (!templateName.trim() || !selectedShop?.slug) return
                if (elements.length === 0) {
                  alert("יש להוסיף לפחות אלמנט אחד לתבנית")
                  return
                }
                
                try {
                  const response = await fetch(`/api/storefront/${selectedShop.slug}/product-page-templates`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: templateName.trim(),
                      elements: elements.sort((a, b) => a.position - b.position),
                      isActive: true,
                    }),
                  })
                  
                  if (response.ok) {
                    setShowSaveTemplateDialog(false)
                    setTemplateName("")
                    // אפשר להוסיף toast כאן
                  } else {
                    alert("שגיאה בשמירת התבנית")
                  }
                } catch (error) {
                  console.error("Error saving template:", error)
                  alert("שגיאה בשמירת התבנית")
                }
              }}
              disabled={!templateName.trim()}
            >
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
