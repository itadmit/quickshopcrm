"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { PageSkeleton } from "@/components/skeletons/PageSkeleton"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useCart } from "@/hooks/useCart"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { useShopTheme } from "@/hooks/useShopTheme"
import { AddToCartButton } from "@/components/storefront/AddToCartButton"
import { AdminBar } from "@/components/storefront/AdminBar"
import { getProductPrice, formatProductPrice, formatComparePrice } from "@/lib/product-price"

interface ProductVariant {
  id: string
  name: string
  price: number
  comparePrice: number | null
  inventoryQty: number | null
  sku: string | null
  options: Record<string, string>
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  images: string[]
  description: string | null
  inventoryQty?: number
  availability?: string
  variants?: ProductVariant[]
}

interface Page {
  id: string
  title: string
  slug: string
  content: string | null
  template: string | null
  displayType: string | null
  selectedProducts: string[] | null
  featuredImage: string | null
  couponCode: string | null
  products?: Product[]
  seoTitle: string | null
  seoDescription: string | null
}

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
}

export default function StaticPage() {
  const params = useParams()
  const slug = params.slug as string
  const pageId = params.id as string
  const { toast } = useToast()
  const { theme } = useShopTheme(slug)

  const [page, setPage] = useState<Page | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [autoOpenCart, setAutoOpenCart] = useState(false)
  const [openCartCallback, setOpenCartCallback] = useState<(() => void) | null>(null)

  const { cart, applyCoupon, refetch: refetchCart } = useCart(slug, customerId)

  useEffect(() => {
    setMounted(true)
    // קבלת customerId מ-localStorage
    const customerData = localStorage.getItem(`storefront_customer_${slug}`)
    if (customerData) {
      try {
        const parsed = JSON.parse(customerData)
        setCustomerId(parsed.id)
      } catch (error) {
        console.error("Error parsing customer data:", error)
      }
    }
  }, [slug])

  useEffect(() => {
    fetchPage()
    fetchShopInfo()
    fetchCartCount()
    fetchShopSettings()
  }, [slug, pageId])

  useEffect(() => {
    if (cart?.items && mounted) {
      const count = cart.items.reduce((sum, item) => sum + item.quantity, 0)
      setCartItemCount(count)
    }
  }, [cart, mounted])

  // הפעלת קופון אוטומטית בעת כניסה לעמוד - בכל פעם!
  useEffect(() => {
    if (page?.couponCode && mounted && cart) {
      // בדיקה אם הקופון כבר מופעל בעגלה
      if (cart.couponCode !== page.couponCode) {
        // הקופון לא מופעל או שונה - נפעיל אותו
        console.log('🎫 Applying coupon automatically:', page.couponCode)
        applyCoupon(page.couponCode).then(() => {
          toast({
            title: "קופון הופעל אוטומטית",
            description: `קוד הנחה ${page.couponCode} הופעל בעגלה שלך`,
          })
        }).catch((error) => {
          console.error('❌ Failed to apply coupon:', error)
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.couponCode, mounted, pageId, cart?.couponCode])

  const fetchPage = async () => {
    setLoading(true)
    try {
      // pageId יכול להיות גם slug או id
      const response = await fetch(`/api/storefront/${slug}/pages/${pageId}`)
      if (response.ok) {
        const data = await response.json()
        setPage(data)
      }
    } catch (error) {
      console.error("Error fetching page:", error)
    } finally {
      setLoading(false)
    }
  }

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

  const fetchShopSettings = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/info`)
      if (response.ok) {
        const shopData = await response.json()
        setAutoOpenCart(shopData.settings?.autoOpenCartAfterAdd !== false) // ברירת מחדל true
      }
    } catch (error) {
      console.error("Error fetching shop settings:", error)
    }
  }

  const fetchCartCount = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/cart`)
      if (response.ok) {
        const cartData = await response.json()
        if (cartData.items) {
          const count = cartData.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
          setCartItemCount(count)
        }
      }
    } catch (error) {
      console.error("Error fetching cart count:", error)
    }
  }

  // פונקציה לרענון מונה העגלה אחרי הוספה מוצלחת
  const handleCartUpdate = async () => {
    console.log('🔄 handleCartUpdate - Refreshing cart count')
    await fetchCartCount()
  }

  const getThemeStyles = (theme: any) => {
    if (!theme) return {}
    return {
      '--primary-color': theme.primaryColor || '#9333ea',
      '--secondary-color': theme.secondaryColor || '#a855f7',
    } as React.CSSProperties
  }

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-white" dir="rtl" style={getThemeStyles(theme)}>
        <StorefrontHeader
          slug={slug}
          shop={shop}
          cartItemCount={0}
          onCartUpdate={fetchCartCount}
        />
        <PageSkeleton />
      </div>
    )
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-white" dir="rtl" style={getThemeStyles(theme)}>
        <StorefrontHeader
          slug={slug}
          shop={shop}
          cartItemCount={mounted ? cartItemCount : 0}
          onCartUpdate={fetchCartCount}
        />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">דף לא נמצא</p>
        </div>
        <footer className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <p className="text-gray-600 text-sm">
                &copy; {new Date().getFullYear()} {shop?.name || "חנות"}. כל הזכויות שמורות.
              </p>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white" dir="rtl" style={getThemeStyles(theme)}>
      {/* Header */}
      <StorefrontHeader
        slug={slug}
        shop={shop}
        cartItemCount={mounted ? cartItemCount : 0}
        onCartUpdate={fetchCartCount}
        onOpenCart={(callback) => setOpenCartCallback(() => callback)}
      />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Image */}
        {page.featuredImage && (
          <div className="mb-8">
            <img
              src={page.featuredImage}
              alt={page.title}
              className="w-full h-64 md:h-96 object-cover rounded-lg shadow-lg"
            />
          </div>
        )}

        {page.template === "CHOICES_OF" && page.products ? (
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{page.title}</h1>
              
              {/* Coupon Alert - מתחת לכותרת */}
              {mounted && page.couponCode && cart && cart.couponCode === page.couponCode && (
                <div className="mt-4 flex justify-center">
                  <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 text-green-700 flex-shrink-0" />
                    <span className="text-green-800 font-medium text-sm">
                      קוד הנחה {page.couponCode} הופעל בעגלה שלך
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Products Display - Grid or List */}
            {page.displayType === "LIST" ? (
              <div className="space-y-3">
                {page.products.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="flex flex-row gap-2 sm:gap-4">
                      <Link
                        href={`/shop/${slug}/products/${product.slug || product.id}`}
                        className="flex-shrink-0 w-32 sm:w-48 h-full relative overflow-hidden bg-gray-100"
                      >
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 sm:w-16 h-12 sm:h-16 text-gray-400" />
                          </div>
                        )}
                      </Link>
                      <CardContent className="flex-1 p-2 sm:p-4 flex flex-col justify-between">
                        <div>
                          <Link href={`/shop/${slug}/products/${product.id}`}>
                            <h3 className="text-sm sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2 hover:text-purple-600 transition-colors line-clamp-2">
                              {product.name}
                            </h3>
                          </Link>
                          {product.description && (
                            <p className="text-xs sm:text-base text-gray-600 mb-2 sm:mb-4 line-clamp-1 sm:line-clamp-2 hidden sm:block">{product.description}</p>
                          )}
                          <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-4">
                            {(() => {
                              const priceInfo = getProductPrice(product)
                              return priceInfo.comparePrice && priceInfo.comparePrice > priceInfo.price ? (
                                <>
                                  <span className="text-base sm:text-2xl font-bold text-gray-900">{formatProductPrice(product)}</span>
                                  <span className="text-xs sm:text-lg text-gray-500 line-through">{formatComparePrice(product)}</span>
                                </>
                              ) : (
                                <span className="text-base sm:text-2xl font-bold text-gray-900">{formatProductPrice(product)}</span>
                              )
                            })()}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 w-full sm:w-auto">
                          <AddToCartButton
                            slug={slug}
                            productId={product.id}
                            productName={product.name}
                            customerId={customerId}
                            onSuccess={handleCartUpdate}
                            useQuickAddModal={true}
                            product={product}
                            className="w-full sm:w-auto sm:flex-1 text-xs sm:text-base h-8 sm:h-10 px-2 sm:px-4"
                            autoOpenCart={autoOpenCart}
                            onCartOpen={openCartCallback || undefined}
                          />
                          <Button
                            variant="outline"
                            asChild
                            className="w-full sm:w-auto sm:flex-1 text-xs sm:text-base h-8 sm:h-10 px-2 sm:px-4"
                          >
                            <Link href={`/shop/${slug}/products/${product.id}`}>
                              צפה במוצר
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {page.products.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                    <Link
                      href={`/shop/${slug}/products/${product.id}`}
                      className="block"
                    >
                      <div className="aspect-square relative overflow-hidden bg-gray-100">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-16 h-16 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-3">
                          {(() => {
                            const priceInfo = getProductPrice(product)
                            return priceInfo.comparePrice && priceInfo.comparePrice > priceInfo.price ? (
                              <>
                                <span className="text-lg font-bold text-gray-900">{formatProductPrice(product)}</span>
                                <span className="text-sm text-gray-500 line-through">{formatComparePrice(product)}</span>
                              </>
                            ) : (
                              <span className="text-lg font-bold text-gray-900">{formatProductPrice(product)}</span>
                            )
                          })()}
                        </div>
                      </CardContent>
                    </Link>
                    <div className="px-4 pb-4">
                      <AddToCartButton
                        slug={slug}
                        productId={product.id}
                        productName={product.name}
                        customerId={customerId}
                        onSuccess={handleCartUpdate}
                        useQuickAddModal={true}
                        product={product}
                        size="sm"
                        fullWidth
                        autoOpenCart={autoOpenCart}
                        onCartOpen={openCartCallback || undefined}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">{page.title}</h1>
              
              {/* Coupon Alert - מתחת לכותרת */}
              {mounted && page.couponCode && cart && cart.couponCode === page.couponCode && (
                <Alert className="mb-6 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-500 ml-2" />
                  <AlertDescription className="text-green-800 font-medium flex items-center gap-2">
                    ✨ קוד הנחה {page.couponCode} הופעל בעגלה שלך
                  </AlertDescription>
                </Alert>
              )}
              
              {page.content && (
                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: page.content }}
                />
              )}
            </CardContent>
          </Card>
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
      <AdminBar slug={slug} pageType="page" pageId={pageId} />
    </div>
  )
}

