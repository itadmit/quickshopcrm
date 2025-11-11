"use client"

import { useState, useEffect } from "react"
import { Package } from "lucide-react"
import Link from "next/link"
import { ProductGridSkeleton } from "@/components/skeletons/ProductCardSkeleton"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { ProductCard } from "@/components/storefront/ProductCard"
import { Card, CardContent } from "@/components/ui/card"
import { getThemeStyles } from "@/hooks/useShopTheme"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackPageView } from "@/lib/tracking-events"
import { AdminBar } from "@/components/storefront/AdminBar"

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
  isPublished: boolean
  settings?: {
    maintenanceMessage?: string
  } | null
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

interface ThemeSettings {
  primaryColor: string
  secondaryColor: string
  logoWidthMobile: number
  logoWidthDesktop: number
  logoPaddingMobile: number
  logoPaddingDesktop: number
}

interface ShopPageClientProps {
  shop: Shop
  products: Product[]
  slug: string
  theme: ThemeSettings
}

export function ShopPageClient({ shop, products: initialProducts, slug, theme }: ShopPageClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>(initialProducts.slice(0, 4))
  const [loading, setLoading] = useState(false)
  const [cartItemCount, setCartItemCount] = useState(0)
  const { trackEvent } = useTracking()

  useEffect(() => {
    if (shop) {
      // PageView event - רק פעם אחת כשהחנות נטענת
      trackPageView(trackEvent, `/shop/${slug}`, shop.name || "דף בית")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id, slug]) // רק כשהחנות משתנה, לא trackEvent

  useEffect(() => {
    fetchCartCount()
  }, [slug])

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

  // אם החנות לא פורסמה, הצג דף תחזוקה
  if (!shop.isPublished) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            {shop.logo && (
              <img src={shop.logo} alt={shop.name} className="h-24 w-24 mx-auto mb-4 rounded-lg" />
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{shop.name}</h1>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-4">
              <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">החנות במצב תחזוקה</h2>
            <p className="text-gray-600 mb-6 whitespace-pre-line">
              {shop.settings?.maintenanceMessage || "אנו עובדים על שיפורים בחנות. אנא חזור מאוחר יותר."}
            </p>
            {shop.description && (
              <p className="text-sm text-gray-500">{shop.description}</p>
            )}
          </div>
        </div>
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
        theme={theme}
      />

      {/* Hero Section - בסגנון Horizon */}
      {loading ? (
        <section className="relative w-full h-[600px] md:h-[700px] overflow-hidden bg-gray-100">
          <div className="w-full h-full bg-gray-200 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-16 w-64 bg-white/20 rounded mx-auto" />
              <div className="h-12 w-32 bg-white/20 rounded mx-auto" />
            </div>
          </div>
        </section>
      ) : featuredProducts.length > 0 ? (
        <section className="relative w-full h-[600px] md:h-[700px] overflow-hidden bg-gray-100">
          {featuredProducts[0]?.images?.[0] ? (
            <div className="relative w-full h-full">
              <img
                src={featuredProducts[0].images[0]}
                alt={featuredProducts[0].name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white px-4">
                  <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                    פריטים חדשים
                  </h1>
                  <Link
                    href={`/shop/${slug}/products/${featuredProducts[0].id}`}
                    className="inline-block px-8 py-3 bg-white text-gray-900 font-semibold rounded-sm hover:bg-gray-100 transition-colors"
                  >
                    קנה עכשיו
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="text-center">
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                  {shop?.name}
                </h1>
                {shop?.description && (
                  <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    {shop.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* Featured Products Section */}
      {loading ? (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-12">
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="h-full">
                  <CardContent className="p-0">
                    <div className="w-full aspect-square bg-gray-200 rounded-t-lg animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                      <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : featuredProducts.length > 0 ? (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-bold text-gray-900">מוצרים מומלצים</h2>
              <Link
                href={`/shop/${slug}/search`}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                צפה בכולם →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  slug={slug}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* All Products Section */}
      {products.length > featuredProducts.length && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <ProductGridSkeleton count={8} />
            ) : (
              <>
                <div className="mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">כל המוצרים</h2>
                  <p className="text-gray-600">נמצאו {products.length} מוצרים</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      slug={slug}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!loading && products.length === 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="bg-white rounded-lg p-12 max-w-md mx-auto">
                <Package className="w-20 h-20 mx-auto mb-6 text-gray-400" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">לא נמצאו מוצרים</h3>
                <p className="text-gray-600">החנות עדיין לא הוסיפה מוצרים</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Newsletter Section */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">הצטרף למועדון</h2>
              <p className="text-gray-600">קבל הצעות בלעדיות וגישה מוקדמת למוצרים חדשים</p>
            </div>
            <div className="flex-1 w-full md:w-auto">
              <form className="flex gap-2">
                <input
                  type="email"
                  placeholder="כתובת אימייל"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <button
                  type="submit"
                  className="px-6 py-3 text-white rounded-sm transition-colors"
                  style={{ backgroundColor: theme.primaryColor }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1"
                  }}
                >
                  →
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

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
      <AdminBar slug={slug} pageType="home" />
    </div>
  )
}

