"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ProductBadges } from "@/components/storefront/ProductBadges"
import {
  Search,
  Package,
  Filter,
  X,
} from "lucide-react"
import Link from "next/link"
import { ProductGridSkeleton } from "@/components/skeletons/ProductCardSkeleton"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackPageView, trackSearch } from "@/lib/tracking-events"
import { AdminBar } from "@/components/storefront/AdminBar"
import { getProductPrice, formatProductPrice, formatComparePrice } from "@/lib/product-price"

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
  isPublished: boolean
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  images: string[]
  availability: string
}

export default function SearchPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string

  const [products, setProducts] = useState<Product[]>([])
  const [shop, setShop] = useState<Shop | null>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    category: "",
    availability: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  })
  const [showFilters, setShowFilters] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const { trackEvent } = useTracking()

  useEffect(() => {
    fetchShopInfo()
    fetchCartCount()
    // PageView event - רק פעם אחת כשהעמוד נטען
    trackPageView(trackEvent, `/shop/${slug}/search`, "חיפוש")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]) // רק כשהעמוד משתנה, לא trackEvent

  useEffect(() => {
    if (searchQuery) {
      fetchProducts()
    }
    fetchCategories()
  }, [searchQuery, filters])

  const fetchShopInfo = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/info`)
      if (response.ok) {
        const data = await response.json()
        setShop(data)
      }
    } catch (error) {
      console.error("Error fetching shop info:", error)
    }
  }

  const fetchCartCount = async () => {
    try {
      const token = localStorage.getItem(`storefront_token_${slug}`)
      const headers: HeadersInit = {}
      if (token) {
        headers["x-customer-id"] = token
      }

      const response = await fetch(`/api/storefront/${slug}/cart/count`, {
        headers,
      })
      
      if (response.ok) {
        const data = await response.json()
        setCartItemCount(data.count || 0)
      } else {
        setCartItemCount(0)
      }
    } catch (error) {
      console.error("Error fetching cart count:", error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/categories`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      if (filters.category) params.append("category", filters.category)
      if (filters.minPrice) params.append("minPrice", filters.minPrice)
      if (filters.maxPrice) params.append("maxPrice", filters.maxPrice)
      if (filters.availability) params.append("availability", filters.availability)
      params.append("sortBy", filters.sortBy)
      params.append("sortOrder", filters.sortOrder)

      const response = await fetch(`/api/storefront/${slug}/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        const productsList = data.products || []
        setProducts(productsList)
        
        // Search event
        if (searchQuery) {
          trackSearch(trackEvent, searchQuery, productsList.length)
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProducts()
  }

  const clearFilters = () => {
    setFilters({
      minPrice: "",
      maxPrice: "",
      category: "",
      availability: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Header */}
      <StorefrontHeader
        slug={slug}
        shop={shop}
        cartItemCount={cartItemCount}
        onCartUpdate={fetchCartCount}
      />

      {/* Search Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="חיפוש מוצרים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="w-4 h-4 ml-2" />
              חפש
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 ml-2" />
              סינון
            </Button>
          </form>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  קטגוריה
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">כל הקטגוריות</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  מחיר מינימלי (₪)
                </label>
                <Input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  מחיר מקסימלי (₪)
                </label>
                <Input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  placeholder="9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  זמינות
                </label>
                <select
                  value={filters.availability}
                  onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">הכל</option>
                  <option value="IN_STOCK">במלאי</option>
                  <option value="OUT_OF_STOCK">אזל מהמלאי</option>
                  <option value="PRE_ORDER">הזמנה מראש</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  מיון לפי
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="createdAt">תאריך</option>
                  <option value="price">מחיר</option>
                  <option value="name">שם</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סדר
                </label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="desc">יורד</option>
                  <option value="asc">עולה</option>
                </select>
              </div>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="mt-6"
              >
                <X className="w-4 h-4 ml-2" />
                נקה סינון
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">לא נמצאו תוצאות</h2>
            <p className="text-gray-600">נסה לשנות את מילות החיפוש או הסינון</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                נמצאו {products.length} מוצרים
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/shop/${slug}/products/${product.slug || product.id}`}
                  className="group"
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="relative aspect-square overflow-hidden rounded-t-lg">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        <ProductBadges
                          badges={(product as any).badges || []}
                          isSoldOut={product.availability === "OUT_OF_STOCK"}
                          comparePrice={(() => {
                            const priceInfo = getProductPrice(product)
                            return priceInfo.comparePrice
                          })()}
                          price={(() => {
                            const priceInfo = getProductPrice(product)
                            return priceInfo.price
                          })()}
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-purple-600">
                            {formatProductPrice(product)}
                          </span>
                          {formatComparePrice(product) && (
                            <span className="text-sm text-gray-500 line-through">
                              {formatComparePrice(product)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-gray-600 text-sm">
              &copy; {new Date().getFullYear()} {shop?.name || "חנות"}. כל הזכויות שמורות.
            </p>
          </div>
        </div>
      </footer>

      {/* Admin Bar - רק למנהלים */}
      <AdminBar slug={slug} pageType="other" />
    </div>
  )
}

