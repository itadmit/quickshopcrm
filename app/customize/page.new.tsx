"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  ArrowRight,
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
  const [isEditing, setIsEditing] = useState(false)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [elements, setElements] = useState<ProductPageElement[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saving, setSaving] = useState(false)

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

  const fetchProductPageLayout = async () => {
    if (!selectedShop?.slug) return
    try {
      const response = await fetch(`/api/storefront/${selectedShop.slug}/product-page-layout`)
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
    setIsEditing(false)
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
    if (!isEditing) return
    setSelectedElementId(elementId)
    setShowSettingsSidebar(true)
  }

  const handleElementHover = (elementId: string | null) => {
    if (!isEditing) return
    // רק אם לא לחצנו על אלמנט
    if (!selectedElementId) {
      // אפשר להוסיף כאן אפקט hover אם צריך
    }
  }

  const handleSaveLayout = async () => {
    if (!selectedShop?.slug) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/storefront/${selectedShop.slug}/product-page-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements }),
      })
      
      if (response.ok) {
        setHasUnsavedChanges(false)
        // רענון התצוגה המקדימה
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        if (iframe) {
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
    if (isEditing) {
      params.set("edit_layout", "true")
    }
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

  const previewUrl = useMemo(() => getPreviewUrl(), [
    selectedShop?.slug,
    pageType,
    selectedCategory,
    selectedProduct,
    products,
    isEditing,
  ])

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
              {selectedShop.name}
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
                setIsEditing(false)
                setSelectedElementId(null)
                setShowSettingsSidebar(false)
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

            {/* כפתור עריכה */}
            {pageType === "product" && (
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsEditing(!isEditing)
                  if (!isEditing) {
                    setSelectedElementId(null)
                    setShowSettingsSidebar(false)
                  }
                }}
              >
                {isEditing ? "סיים עריכה" : "ערוך דף"}
              </Button>
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
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview Area */}
        <div className="flex-1 flex flex-col bg-gray-100 relative">
          {!pageType ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">בחר דף לעריכה</h3>
                <p className="text-gray-500 mb-6">בחר דף מהתפריט כדי להתחיל בעריכה</p>
                
                <div className="space-y-3 max-w-md mx-auto">
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
            </div>
          ) : previewUrl ? (
            <>
              <ProductPagePreview
                previewUrl={previewUrl}
                previewMode={previewMode}
                isEditing={isEditing}
                selectedElementId={selectedElementId}
                onElementClick={handleElementClick}
                onElementHover={handleElementHover}
                elements={elements}
              />
            </>
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

        {/* Settings Sidebar */}
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
          />
        )}
      </div>
    </div>
  )
}

