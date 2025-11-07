"use client"

import { useState, useEffect } from "react"
import { useShop } from "@/components/providers/ShopProvider"
import { ProductPageDesigner } from "@/components/storefront/ProductPageDesigner"
import { CategoryPageDesigner } from "@/components/storefront/CategoryPageDesigner"
import { Palette, Home, Package, FolderOpen, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

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

export function CustomizeMenu() {
  const { selectedShop } = useShop()
  const [isOpen, setIsOpen] = useState(false)
  const [showProductDesigner, setShowProductDesigner] = useState(false)
  const [showCategoryDesigner, setShowCategoryDesigner] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [galleryLayout, setGalleryLayout] = useState<"standard" | "right-side" | "left-side" | "masonry" | "fixed">("standard")
  const [categoryLayout, setCategoryLayout] = useState<"grid" | "list" | "compact-grid" | "large-grid">("grid")

  useEffect(() => {
    if (selectedShop?.slug) {
      fetchProducts()
      fetchCategories()
      fetchGalleryLayout()
      fetchCategoryLayout()
    }
  }, [selectedShop?.slug])

  // בחירה אוטומטית של המוצר הראשון עם תמונות כשפותחים את ProductPageDesigner
  useEffect(() => {
    if (showProductDesigner && products.length > 0 && !selectedProductId) {
      const productWithImages = products.find(
        (product) => product.images && Array.isArray(product.images) && product.images.length > 0
      )
      if (productWithImages) {
        setSelectedProductId(productWithImages.id)
      }
    }
  }, [showProductDesigner, products, selectedProductId])

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

  const saveGalleryLayout = async (layout: "standard" | "right-side" | "left-side" | "masonry" | "fixed") => {
    if (!selectedShop?.slug) return
    try {
      await fetch(`/api/storefront/${selectedShop.slug}/product-gallery-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      })
      setGalleryLayout(layout)
    } catch (error) {
      console.error("Error saving gallery layout:", error)
    }
  }

  const saveCategoryLayout = async (layout: "grid" | "list" | "compact-grid" | "large-grid") => {
    if (!selectedShop?.slug) return
    try {
      await fetch(`/api/storefront/${selectedShop.slug}/category-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      })
      setCategoryLayout(layout)
    } catch (error) {
      console.error("Error saving category layout:", error)
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
    setShowProductDesigner(true)
    setIsOpen(false) // סגירת ה-accordion
  }

  const handleHomePageClick = () => {
    // TODO: פתיחת עיצוב דף הבית
    window.open(`/shop/${selectedShop?.slug}`, '_blank')
    setIsOpen(false) // סגירת ה-accordion
  }

  const handleCategoryPageClick = () => {
    setShowCategoryDesigner(true)
    setIsOpen(false) // סגירת ה-accordion
  }

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
            <button
              onClick={handleProductPageClick}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Package className="w-4 h-4 flex-shrink-0" />
              <span className="text-right">דף מוצר</span>
            </button>
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

      {/* Product Page Designer */}
      <ProductPageDesigner
        open={showProductDesigner}
        onOpenChange={setShowProductDesigner}
        onLayoutChange={(layout) => {
          saveGalleryLayout(layout)
        }}
        currentLayout={galleryLayout}
        products={products}
        selectedProductId={selectedProductId}
        onProductChange={(productId) => {
          setSelectedProductId(productId)
        }}
      />

      {/* Category Page Designer */}
      <CategoryPageDesigner
        open={showCategoryDesigner}
        onOpenChange={setShowCategoryDesigner}
        onLayoutChange={(layout) => {
          saveCategoryLayout(layout)
        }}
        currentLayout={categoryLayout}
      />
    </>
  )
}

