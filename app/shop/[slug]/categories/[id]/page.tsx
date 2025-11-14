"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  ChevronLeft,
  Filter,
  Grid3x3,
  List,
  X,
  Palette,
} from "lucide-react"
import Link from "next/link"
import { ProductGridSkeleton } from "@/components/skeletons/ProductCardSkeleton"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { ProductCard } from "@/components/storefront/ProductCard"
import { useShopTheme, getThemeStyles } from "@/hooks/useShopTheme"
import { ProductBadges } from "@/components/storefront/ProductBadges"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackPageView } from "@/lib/tracking-events"
import { AdminBar } from "@/components/storefront/AdminBar"
import { getProductPrice, formatProductPrice, formatComparePrice } from "@/lib/product-price"

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parentId: string | null
  parent: {
    id: string
    name: string
    slug: string
  } | null
  children: Array<{
    id: string
    name: string
    slug: string
    image: string | null
    _count: {
      products: number
    }
  }>
  _count: {
    products: number
  }
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

export default function CategoryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = params.slug as string
  const categoryId = params.id as string

  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [shop, setShop] = useState<any>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list" | "compact-grid" | "large-grid">("grid")
  const [isAdmin, setIsAdmin] = useState(false)

  // קריאת preview_layout מ-query params לעדכון בזמן אמת
  useEffect(() => {
    const previewLayout = searchParams.get("preview_layout") as "grid" | "list" | "compact-grid" | "large-grid" | null
    if (previewLayout && ["grid", "list", "compact-grid", "large-grid"].includes(previewLayout)) {
      setViewMode(previewLayout)
    }
  }, [searchParams])
  const [filters, setFilters] = useState({
    availability: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  })
  const { theme } = useShopTheme(slug)
  const { trackEvent } = useTracking()

  useEffect(() => {
    fetchShopInfo()
    fetchCategory()
    fetchProducts()
    fetchCartCount()
    fetchCategoryLayout()
  }, [slug, categoryId])

  useEffect(() => {
    if (category) {
      // PageView event - רק פעם אחת כשהקטגוריה נטענת
      trackPageView(trackEvent, `/shop/${slug}/categories/${categoryId}`, category.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.id, slug, categoryId]) // רק כשהקטגוריה משתנה, לא trackEvent

  useEffect(() => {
    fetchProducts()
  }, [filters])

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

  const fetchCategory = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/categories/${categoryId}`)
      if (response.ok) {
        const data = await response.json()
        setCategory(data)
      }
    } catch (error) {
      console.error("Error fetching category:", error)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("category", categoryId)
      if (filters.availability) {
        params.append("availability", filters.availability)
      }
      params.append("sortBy", filters.sortBy)
      params.append("sortOrder", filters.sortOrder)

      const response = await fetch(`/api/storefront/${slug}/products?${params}`)
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

  const fetchCartCount = async () => {
    try {
      const customerData = localStorage.getItem(`storefront_customer_${slug}`)
      const headers: HeadersInit = {}
      if (customerData) {
        try {
          const parsed = JSON.parse(customerData)
          headers["x-customer-id"] = parsed.id
        } catch (error) {
          console.error("Error parsing customer data:", error)
        }
      }

      const response = await fetch(`/api/storefront/${slug}/cart`, { headers })
      if (response.ok) {
        const data = await response.json()
        const count = data.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0
        setCartItemCount(count)
      }
    } catch (error) {
      console.error("Error fetching cart count:", error)
    }
  }

  const fetchCategoryLayout = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/category-layout`)
      if (response.ok) {
        const data = await response.json()
        if (data.layout) {
          setViewMode(data.layout as "grid" | "list" | "compact-grid" | "large-grid")
        }
      }
    } catch (error) {
      console.error("Error fetching category layout:", error)
    }
  }

  if (loading && !category) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">קטגוריה לא נמצאה</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white" dir="rtl" style={getThemeStyles(theme)}>
      {/* Header */}
      <StorefrontHeader
        slug={slug}
        shop={shop}
        cartItemCount={cartItemCount}
        onCartUpdate={fetchCartCount}
      />

      {/* Category Header */}
      <section className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href={`/shop/${slug}`} className="hover:text-gray-900 transition-colors">
              בית
            </Link>
            <ChevronLeft className="w-4 h-4" />
            {category.parent && (
              <>
                <Link 
                  href={`/shop/${slug}/categories/${category.parent.id}`}
                  className="hover:text-gray-900 transition-colors"
                >
                  {category.parent.name}
                </Link>
                <ChevronLeft className="w-4 h-4" />
              </>
            )}
            <span className="text-gray-900 font-medium">{category.name}</span>
          </div>
          <div className="flex items-start gap-6">
            {category.image && (
              <img 
                src={category.image} 
                alt={category.name} 
                className="h-24 w-24 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{category.name}</h1>
              {category.description && (
                <p className="text-gray-600 mb-4">{category.description}</p>
              )}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{category._count.products} מוצרים</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subcategories */}
      {category.children && category.children.length > 0 && (
        <section className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">תת-קטגוריות</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/shop/${slug}/categories/${child.id}`}
                  className="text-center group"
                >
                  <div className="mb-3 overflow-hidden rounded-lg">
                    {child.image ? (
                      <img
                        src={child.image}
                        alt={child.name}
                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{child.name}</p>
                  <p className="text-xs text-gray-500">{child._count.products} מוצרים</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filters and Sort Bar */}
      <section className="bg-white border-b border-gray-200 sticky top-[73px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                סינון
              </Button>

              <select
                value={filters.availability}
                onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">כל הזמינות</option>
                <option value="IN_STOCK">במלאי</option>
                <option value="OUT_OF_STOCK">אזל מהמלאי</option>
                <option value="PRE_ORDER">הזמנה מראש</option>
              </select>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{products.length} מוצרים</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split("-")
                  setFilters({ ...filters, sortBy, sortOrder })
                }}
                className="px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="createdAt-desc">חדש ביותר</option>
                <option value="createdAt-asc">ישן ביותר</option>
                <option value="price-asc">מחיר: נמוך לגבוה</option>
                <option value="price-desc">מחיר: גבוה לנמוך</option>
                <option value="name-asc">שם: א-ת</option>
                <option value="name-desc">שם: ת-א</option>
              </select>

              <div className="flex items-center gap-1 border border-gray-300 rounded-sm">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-none border-0"
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-none border-0"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-20 h-20 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">אין מוצרים בקטגוריה זו</h3>
            <p className="text-gray-600">נסה לשנות את הסינון או לחזור לקטגוריות אחרות</p>
          </div>
        ) : viewMode === "grid" ? (
          <>
            <style dangerouslySetInnerHTML={{__html: `
              .category-products-grid {
                display: grid;
                gap: 1.5rem;
                grid-template-columns: repeat(${theme?.categoryProductsPerRowMobile || 2}, minmax(0, 1fr));
              }
              @media (min-width: 768px) {
                .category-products-grid {
                  grid-template-columns: repeat(${theme?.categoryProductsPerRowTablet || 3}, minmax(0, 1fr));
                }
              }
              @media (min-width: 1024px) {
                .category-products-grid {
                  grid-template-columns: repeat(${theme?.categoryProductsPerRowDesktop || 4}, minmax(0, 1fr));
                }
              }
            `}} />
          <div className="category-products-grid">
            {products.map((product, index) => {
              const shouldShowBanner = 
                theme?.categoryEnableBanners && 
                theme?.categoryBanners && 
                theme.categoryBanners.length > 0 &&
                (index + 1) % (theme.categoryBannerFrequency || 6) === 0
              
              const activeBanners = theme?.categoryBanners?.filter((b: any) => b.enabled) || []
              const bannerIndex = shouldShowBanner && activeBanners.length > 0
                ? Math.floor((index + 1) / (theme.categoryBannerFrequency || 6) - 1) % activeBanners.length
                : -1
              
              const banner = bannerIndex >= 0 ? activeBanners[bannerIndex] : null

              return (
                <>
                  <ProductCard
                    key={product.id}
                    product={product}
                    slug={slug}
                    theme={theme}
                  />
                  {banner && (
                    <div 
                      key={`banner-${index}`}
                      className="rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                      style={{
                        gridColumn: '1 / -1',
                        backgroundColor: banner.bgColor || '#f3f4f6',
                        color: banner.textColor || '#000000',
                      }}
                    >
                      <Link href={banner.link || '#'} className="block">
                        <div className="flex flex-col md:flex-row items-center gap-4 p-6">
                          {banner.image && (
                            <div className="w-full md:w-1/3">
                              <img 
                                src={banner.image} 
                                alt={banner.title}
                                className="w-full h-48 object-cover rounded-lg"
                              />
                            </div>
                          )}
                          <div className="flex-1 text-center md:text-right">
                            <h3 className="text-2xl font-bold mb-2">{banner.title}</h3>
                            {banner.description && (
                              <p className="text-lg mb-4">{banner.description}</p>
                            )}
                            {banner.buttonText && (
                              <Button 
                                className="mt-2"
                                style={{
                                  backgroundColor: banner.textColor || '#000000',
                                  color: banner.bgColor || '#ffffff',
                                }}
                              >
                                {banner.buttonText}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  )}
                </>
              )
            })}
          </div>
          </>
        ) : viewMode === "compact-grid" ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/shop/${slug}/products/${product.slug || product.id}`}
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-400" />
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
                <div className="p-2">
                  <h3 className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-gray-900">
                      {formatProductPrice(product)}
                    </span>
                    {formatComparePrice(product) && (
                      <span className="text-xs text-gray-500 line-through">
                        {formatComparePrice(product)}
                      </span>
                    )}
                  </div>
                  {product.availability === "OUT_OF_STOCK" && (
                    <span className="text-xs text-red-600 mt-1 block">אזל מהמלאי</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : viewMode === "large-grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/shop/${slug}/products/${product.slug || product.id}`}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-400" />
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{product.name}</h3>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl font-bold text-gray-900">
                      {formatProductPrice(product)}
                    </span>
                    {formatComparePrice(product) && (
                      <span className="text-base text-gray-500 line-through">
                        {formatComparePrice(product)}
                      </span>
                    )}
                  </div>
                  {product.availability === "OUT_OF_STOCK" && (
                    <span className="text-sm text-red-600">אזל מהמלאי</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/shop/${slug}/products/${product.slug || product.id}`}
                className="flex gap-6 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors group"
              >
                <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-400" />
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
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-gray-900">
                      {formatProductPrice(product)}
                    </span>
                    {formatComparePrice(product) && (
                      <span className="text-sm text-gray-500 line-through">
                        {formatComparePrice(product)}
                      </span>
                    )}
                  </div>
                  {product.availability === "OUT_OF_STOCK" && (
                    <Badge className="mt-2 bg-red-100 text-red-800">אזל מהמלאי</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Admin Bar - רק למנהלים */}
      <AdminBar slug={slug} pageType="collection" collectionId={categoryId} />
    </div>
  )
}

