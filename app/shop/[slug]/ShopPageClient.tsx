"use client"

import { useState, useEffect } from "react"
import { Package, ShoppingBag, Watch, Glasses, Shirt, Laptop, Coffee, Sparkles, ArrowRight, Zap, Star, Heart, TrendingUp, Gift, Award, Flame, Tag, Bell } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ProductGridSkeleton } from "@/components/skeletons/ProductCardSkeleton"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { ProductCard } from "@/components/storefront/ProductCard"
import { Card, CardContent } from "@/components/ui/card"
import { getThemeStyles } from "@/hooks/useShopTheme"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackPageView } from "@/lib/tracking-events"
import { AdminBar } from "@/components/storefront/AdminBar"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useStorefrontData } from "@/components/storefront/StorefrontDataProvider"
import { defaultSections, HomePageSection, sectionLabels } from "@/components/customize/HomePageCustomizer"
import { cn } from "@/lib/utils"

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
  variants?: Array<{
    id: string
    name: string
    price: number | null
    comparePrice: number | null
    inventoryQty: number | null
    sku: string | null
    options: Record<string, string>
  }>
}

interface ThemeSettings {
  primaryColor: string
  secondaryColor: string
  primaryTextColor?: string
  logoWidthMobile: number
  logoWidthDesktop: number
  logoPaddingMobile: number
  logoPaddingDesktop: number
  headerLayout?: "logo-left" | "logo-right" | "logo-center-menu-below"
  stickyHeader?: boolean
  transparentHeader?: boolean
  logoColorOnScroll?: "none" | "white" | "black"
}

interface NavigationItem {
  type: "link" | "page" | "category" | "collection"
  label: string
  url?: string
  pageId?: string
  pageSlug?: string
  categoryId?: string
  categorySlug?: string
  collectionId?: string
  collectionSlug?: string
  children?: NavigationItem[]
}

interface Navigation {
  id: string
  name: string
  location: string
  items: NavigationItem[]
}

interface ShopPageClientProps {
  shop: Shop
  products: Product[]
  slug: string
  theme: ThemeSettings
  navigation: Navigation | null
}

export function ShopPageClient({ shop, products: initialProducts, slug, theme, navigation }: ShopPageClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>(initialProducts.slice(0, 4))
  const [loading, setLoading] = useState(initialProducts.length === 0) // אם אין מוצרים מהשרת, נטען מהלקוח
  const { trackEvent } = useTracking()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [customerId, setCustomerId] = useState<string | null>(null)
  const { cart } = useStorefrontData()
  const [homePageSections, setHomePageSections] = useState<HomePageSection[]>([])
  const [isCustomizeMode, setIsCustomizeMode] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [loadingSections, setLoadingSections] = useState(true)
  
  const cartItemCount = cart?.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0

  // Placeholder icons for empty store
  const placeholderIcons = [ShoppingBag, Watch, Glasses, Shirt, Laptop, Coffee, Package, Sparkles]
  const categoryIcons = [Shirt, Watch, Laptop, Coffee, Glasses, ShoppingBag]

  // טעינת מוצרים בצד הלקוח אם אין מוצרים מהשרת
  useEffect(() => {
    if (initialProducts.length === 0) {
      const fetchProducts = async () => {
        try {
          const response = await fetch(`/api/storefront/${slug}/products?limit=8`)
          if (response.ok) {
            const data = await response.json()
            setProducts(data.products || [])
            setFeaturedProducts((data.products || []).slice(0, 4))
          }
        } catch (error) {
          console.error("Error fetching products:", error)
        } finally {
          setLoading(false)
        }
      }

      fetchProducts()
    }
  }, [slug, initialProducts.length])

  // טעינת homePageLayout מה-API
  useEffect(() => {
    const fetchHomePageLayout = async () => {
      try {
        const response = await fetch(`/api/storefront/${slug}/home-page-layout`)
        if (response.ok) {
          const data = await response.json()
          if (data.sections && Array.isArray(data.sections) && data.sections.length > 0) {
            setHomePageSections(data.sections)
          } else {
            // אם אין sections מותאמים אישית, נשתמש ב-defaultSections
            setHomePageSections(defaultSections)
          }
        } else {
          // אם יש שגיאה, נשתמש ב-defaultSections
          setHomePageSections(defaultSections)
        }
      } catch (error) {
        console.error("Error fetching home page layout:", error)
        // אם יש שגיאה, נשתמש ב-defaultSections
        setHomePageSections(defaultSections)
      } finally {
        setLoadingSections(false)
      }
    }

    fetchHomePageLayout()
  }, [slug])

  // טעינת קטגוריות
  useEffect(() => {
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

    fetchCategories()
  }, [slug])

  // קריאת הגדרות customize mode
  useEffect(() => {
    const customizeParam = searchParams.get("customize")
    setIsCustomizeMode(customizeParam === "true")
    
    if (customizeParam === "true") {
      // האזנה לעדכונים מה-customize window
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === "updateHomePageSections") {
          setHomePageSections(event.data.sections)
        }
      }
      
      window.addEventListener("message", handleMessage)
      return () => window.removeEventListener("message", handleMessage)
    }
  }, [searchParams])

  useEffect(() => {
    if (shop) {
      // PageView event - רק פעם אחת כשהחנות נטענת
      trackPageView(trackEvent, `/shop/${slug}`, shop.name || "דף בית")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id, slug]) // רק כשהחנות משתנה, לא trackEvent

  useEffect(() => {
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

  // הפעלת קופון אוטומטית אם יש בURL
  useEffect(() => {
    const couponCode = searchParams.get("coupon")
    if (couponCode && customerId) {
      applyCouponAutomatically(couponCode)
    }
  }, [searchParams, customerId])

  const applyCouponAutomatically = async (couponCode: string) => {
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (customerId) {
        headers["x-customer-id"] = customerId
      }

      const response = await fetch(`/api/storefront/${slug}/cart`, {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({
          couponCode,
        }),
      })

      if (response.ok) {
        toast({
          title: "קופון הופעל!",
          description: `קוד הנחה ${couponCode} הופעל בעגלה שלך`,
        })
      } else {
        const error = await response.json()
        console.error("Failed to apply coupon:", error)
      }
    } catch (error) {
      console.error("Error applying coupon automatically:", error)
    }
  }

  // קבלת config של סקשן מההגדרות או ברירת מחדל
  const getSectionConfig = (sectionId: string, defaultConfig: any = {}) => {
    if (homePageSections.length > 0) {
      const section = homePageSections.find(s => s.id === sectionId)
      return section ? { ...defaultConfig, ...section.config } : defaultConfig
    }
    return defaultConfig
  }

  // בדיקה אם סקשן מוסתר
  const isSectionVisible = (sectionId: string) => {
    if (homePageSections.length === 0) return true // ברירת מחדל - הכל גלוי
    const section = homePageSections.find(s => s.id === sectionId)
    return section ? section.visible : true
  }

  // קבלת הסקשנים הממוינים לפי position
  const getSortedSections = () => {
    return [...homePageSections].sort((a, b) => a.position - b.position)
  }

  // פונקציה שמציגה סקשן hero
  const renderHeroSection = (section: HomePageSection) => {
    const config = section.config
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const bgImage = isMobile 
      ? (config.backgroundImageMobile || config.backgroundImage || "")
      : (config.backgroundImage || "")
    const video = config.video || ""
    // אם אין title, הצג את שם האתר. אם יש textColor, השתמש בו, אחרת ברירת מחדל כהה
    const displayTitle = config.title || shop.name || ""
    const textColor = config.textColor || (bgImage || video ? "#ffffff" : "#000000")
    const overlayColor = config.overlayColor || "#000000"
    const addOverlay = config.addOverlay !== false // ברירת מחדל true, אבל אם אין רקע אז false
    
    // חישוב opacity של ההחשכה - רק אם יש רקע
    const overlayOpacity = (bgImage || video) && addOverlay ? 0.3 : 0
    
    return (
      <section key={section.id} className="relative w-full h-[600px] md:h-[700px] overflow-hidden bg-gray-100">
        {/* רקע - סרטון או תמונה */}
        {video ? (
          <div className="relative w-full h-full">
            <video
              src={video}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
            {addOverlay && (
              <div 
                className="absolute inset-0"
                style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
              />
            )}
          </div>
        ) : bgImage ? (
          <div className="relative w-full h-full">
            <img
              src={bgImage}
              alt={config.title || "Hero"}
              className="w-full h-full object-cover"
            />
            {addOverlay && (
              <div 
                className="absolute inset-0"
                style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
        )}

        {/* תוכן */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4" style={{ color: textColor }}>
            {displayTitle && (
              <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                {displayTitle}
              </h1>
            )}
            {config.subtitle && (
              <p className="text-xl md:text-2xl mb-6">{config.subtitle}</p>
            )}
            {config.description && (
              <p className="text-lg mb-8 max-w-2xl mx-auto">{config.description}</p>
            )}
            {config.buttonText && (
              <Link
                href={config.buttonUrl || `/shop/${slug}/search`}
                className={cn(
                  "inline-block px-8 py-3 font-semibold rounded-sm transition-colors",
                  bgImage || video
                    ? "bg-white text-gray-900 hover:bg-gray-100"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                )}
              >
                {config.buttonText}
              </Link>
            )}
          </div>
        </div>
      </section>
    )
  }

  // פונקציה שמציגה סקשן new-arrivals
  const renderNewArrivalsSection = (section: HomePageSection) => {
    const config = section.config
    const sectionProducts = config.products && config.products.length > 0
      ? products.filter(p => config.products!.includes(p.id))
      : products.slice(0, 4)

    return (
      <section key={section.id} className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-12">
            {config.icon === "sparkles" && <Sparkles className="w-8 h-8 text-gray-900" />}
            {config.icon === "trending-up" && <TrendingUp className="w-8 h-8 text-gray-900" />}
            {config.icon === "star" && <Star className="w-8 h-8 text-gray-900" />}
            {config.icon === "heart" && <Heart className="w-8 h-8 text-gray-900" />}
            {config.icon === "zap" && <Zap className="w-8 h-8 text-gray-900" />}
            {config.icon === "gift" && <Gift className="w-8 h-8 text-gray-900" />}
            {config.icon === "award" && <Award className="w-8 h-8 text-gray-900" />}
            {config.icon === "flame" && <Flame className="w-8 h-8 text-gray-900" />}
            {config.icon === "shopping-bag" && <ShoppingBag className="w-8 h-8 text-gray-900" />}
            {config.icon === "package" && <Package className="w-8 h-8 text-gray-900" />}
            {config.icon === "tag" && <Tag className="w-8 h-8 text-gray-900" />}
            {config.icon === "bell" && <Bell className="w-8 h-8 text-gray-900" />}
            <h2 className="text-3xl font-bold text-gray-900">{config.title || "חדש באתר"}</h2>
          </div>
          {config.subtitle && (
            <p className="text-gray-600 mb-8">{config.subtitle}</p>
          )}
          {sectionProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {sectionProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    ...product,
                    variants: product.variants?.filter(v => v.price !== null).map(v => ({
                      ...v,
                      price: v.price!
                    }))
                  }}
                  slug={slug}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => {
                const Icon = placeholderIcons[i - 1]
                return (
                  <Card key={i} className="h-full overflow-hidden group cursor-default opacity-75 hover:opacity-90 transition-opacity">
                    <CardContent className="p-0">
                      <div className="relative w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Icon className="w-16 h-16 text-gray-300" />
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                        <div className="flex items-center justify-between pt-2">
                          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </section>
    )
  }

  // פונקציה שמציגה סקשן categories
  const renderCategoriesSection = (section: HomePageSection) => {
    const config = section.config
    const displayCategories = config.categories && config.categories.includes("all")
      ? categories
      : categories.filter(c => config.categories?.includes(c.id))

    return (
      <section key={section.id} className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{config.title || "קטגוריות"}</h2>
            {config.subtitle && (
              <p className="text-gray-600">{config.subtitle}</p>
            )}
          </div>
          {displayCategories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {displayCategories.slice(0, 6).map((category, i) => {
                const Icon = categoryIcons[i % categoryIcons.length]
                return (
                  <Link
                    key={category.id}
                    href={`/shop/${slug}/categories/${category.id}`}
                  >
                    <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
                      <CardContent className="p-0">
                        {category.image ? (
                          <div className="relative w-full aspect-square">
                            <img
                              src={category.image}
                              alt={category.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="relative w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <Icon className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-center font-medium text-gray-900">{category.name}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => {
                const Icon = categoryIcons[i - 1]
                return (
                  <Card key={i} className="overflow-hidden group cursor-default hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="relative w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Icon className="w-12 h-12 text-gray-300" />
                      </div>
                      <div className="p-3">
                        <div className="h-5 w-3/4 mx-auto bg-gray-200 rounded animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </section>
    )
  }

  // פונקציה שמציגה סקשן hero-cta
  const renderHeroCTASection = (section: HomePageSection) => {
    const config = section.config
    const bgImage = config.backgroundImage || ""

    return (
      <section key={section.id} className="relative w-full h-[600px] md:h-[700px] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        {bgImage ? (
          <div className="relative w-full h-full">
            <img
              src={bgImage}
              alt={config.title || "Hero CTA"}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white px-4">
                {config.icon === "star" && (
                  <div className="flex justify-center mb-8">
                    <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
                      <Star className="w-12 h-12 text-white" />
                    </div>
                  </div>
                )}
                {config.title && (
                  <h2 className="text-3xl md:text-5xl font-bold mb-6">{config.title}</h2>
                )}
                {config.description && (
                  <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto">{config.description}</p>
                )}
                {config.buttonText && (
                  <Link
                    href={config.buttonUrl || `/shop/${slug}/search`}
                    className="inline-block px-8 py-4 text-lg font-semibold text-white bg-transparent border-2 border-white rounded-md hover:bg-white/10 transition-all"
                  >
                    {config.buttonText}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-700 px-4">
              {config.icon === "star" && (
                <div className="flex justify-center mb-8">
                  <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                    <Star className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
              )}
              {config.title && (
                <h2 className="text-3xl md:text-5xl font-bold mb-6">{config.title}</h2>
              )}
              {config.description && (
                <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto">{config.description}</p>
              )}
              {config.buttonText && (
                <Link
                  href={config.buttonUrl || `/shop/${slug}/search`}
                  className="inline-block px-8 py-4 text-lg font-semibold text-gray-700 bg-transparent border-2 border-gray-400 rounded-md hover:bg-gray-200 hover:border-gray-500 transition-all"
                >
                  {config.buttonText}
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    )
  }

  // פונקציה שמציגה סקשן featured-products
  const renderFeaturedProductsSection = (section: HomePageSection) => {
    const config = section.config
    const sectionProducts = config.products && config.products.length > 0
      ? products.filter(p => config.products!.includes(p.id))
      : featuredProducts

    return (
      <section key={section.id} className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-12">
            {config.icon === "sparkles" && <Sparkles className="w-8 h-8 text-gray-900" />}
            {config.icon === "trending-up" && <TrendingUp className="w-8 h-8 text-gray-900" />}
            {config.icon === "star" && <Star className="w-8 h-8 text-gray-900" />}
            {config.icon === "heart" && <Heart className="w-8 h-8 text-gray-900" />}
            {config.icon === "zap" && <Zap className="w-8 h-8 text-gray-900" />}
            {config.icon === "gift" && <Gift className="w-8 h-8 text-gray-900" />}
            {config.icon === "award" && <Award className="w-8 h-8 text-gray-900" />}
            {config.icon === "flame" && <Flame className="w-8 h-8 text-gray-900" />}
            {config.icon === "shopping-bag" && <ShoppingBag className="w-8 h-8 text-gray-900" />}
            {config.icon === "package" && <Package className="w-8 h-8 text-gray-900" />}
            {config.icon === "tag" && <Tag className="w-8 h-8 text-gray-900" />}
            {config.icon === "bell" && <Bell className="w-8 h-8 text-gray-900" />}
            <h2 className="text-3xl font-bold text-gray-900">{config.title || "מוצרים מומלצים"}</h2>
          </div>
          {config.subtitle && (
            <p className="text-gray-600 mb-8">{config.subtitle}</p>
          )}
          {sectionProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sectionProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    ...product,
                    variants: product.variants?.filter(v => v.price !== null).map(v => ({
                      ...v,
                      price: v.price!
                    }))
                  }}
                  slug={slug}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                const Icon = placeholderIcons[(i - 1) % placeholderIcons.length]
                return (
                  <Card key={i} className="h-full overflow-hidden group cursor-default opacity-75 hover:opacity-90 transition-opacity">
                    <CardContent className="p-0">
                      <div className="relative w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Icon className="w-16 h-16 text-gray-300" />
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                        <div className="flex items-center justify-between pt-2">
                          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </section>
    )
  }

  // פונקציה שמציגה סקשן about
  const renderAboutSection = (section: HomePageSection) => {
    const config = section.config
    const bgImage = config.backgroundImage || ""

    return (
      <section key={section.id} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {bgImage ? (
              <div className="order-2 lg:order-1">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                  <img
                    src={bgImage}
                    alt={config.title || "אודות"}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="order-2 lg:order-1">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                  <Heart className="w-24 h-24 text-gray-300" />
                </div>
              </div>
            )}
            <div className="order-1 lg:order-2 space-y-6">
              {config.title && (
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{config.title}</h2>
              )}
              {config.subtitle && (
                <p className="text-xl text-gray-600">{config.subtitle}</p>
              )}
              {config.description && (
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{config.description}</p>
              )}
              {config.buttonText && (
                <Link
                  href={config.buttonUrl || `/shop/${slug}/search`}
                  className="inline-block text-lg font-semibold underline hover:no-underline transition-all"
                  style={{ color: theme.primaryColor }}
                >
                  {config.buttonText}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    )
  }

  // האזנה להודעות מהקסטומייזר
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      
      if (event.data.type === "scrollToSection") {
        const sectionId = event.data.sectionId
        const element = document.querySelector(`[data-section-id="${sectionId}"]`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
          // הוספת מסגרת סגולה זמנית
          element.classList.add("ring-4", "ring-emerald-500", "ring-opacity-50")
          setTimeout(() => {
            element.classList.remove("ring-4", "ring-emerald-500", "ring-opacity-50")
          }, 2000)
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  // פונקציה שמציגה סקשן לפי הסוג שלו
  const renderSection = (section: HomePageSection) => {
    if (!isSectionVisible(section.id)) return null

    const sectionComponent = (() => {
      switch (section.type) {
        case "hero":
          return renderHeroSection(section)
        case "new-arrivals":
          return renderNewArrivalsSection(section)
        case "categories":
          return renderCategoriesSection(section)
        case "hero-cta":
          return renderHeroCTASection(section)
        case "featured-products":
          return renderFeaturedProductsSection(section)
        case "about":
          return renderAboutSection(section)
        default:
          return null
      }
    })()

    if (!sectionComponent) return null

    // עטיפת הסקשן ב-div עם id ו-hover effect
    const sectionLabel = sectionLabels[section.type] || section.type
    
    // בדיקה אם אנחנו בתוך iframe (תצוגה מקדימה)
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top
    
    const handleSectionClick = (e: React.MouseEvent) => {
      // רק אם אנחנו בתוך iframe, שלח הודעה לקסטומייזר
      if (isInIframe) {
        e.preventDefault()
        e.stopPropagation()
        // שליחת הודעה להורה (הקסטומייזר)
        window.parent.postMessage({
          type: "selectSection",
          sectionId: section.id
        }, window.location.origin)
      }
    }
    
    return (
      <div
        key={section.id}
        data-section-id={section.id}
        className={cn(
          "relative group",
          isInIframe && "cursor-pointer"
        )}
        onClick={handleSectionClick}
      >
        {/* Tooltip עם שם הסקשן - מופיע ב-hover רק בקסטומייזר */}
        {isInIframe && (
          <div className="absolute top-0 right-0 bg-emerald-600 text-white text-xs px-2 py-1 rounded z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            {sectionLabel}
          </div>
        )}
        {/* מסגרת סגולה ב-hover - רק בקסטומייזר */}
        {isInIframe && (
          <div className="absolute inset-0 border-2 border-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40" />
        )}
        {sectionComponent}
      </div>
    )
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
    <div className="min-h-screen bg-white" dir="rtl" style={getThemeStyles({
      ...theme,
      headerLayout: theme.headerLayout || "logo-left",
      stickyHeader: theme.stickyHeader !== undefined ? theme.stickyHeader : true,
      transparentHeader: theme.transparentHeader !== undefined ? theme.transparentHeader : false,
      logoColorOnScroll: theme.logoColorOnScroll || "none",
    } as any)}>
      {/* Header */}
      <StorefrontHeader
        slug={slug}
        shop={shop}
        navigation={navigation}
        cartItemCount={cartItemCount}
        onCartUpdate={() => {}}
        theme={theme}
      />

      {/* Dynamic Home Page Sections */}
      {loadingSections ? (
        <>
          {/* Hero Skeleton */}
          <section className="relative w-full h-[600px] md:h-[700px] overflow-hidden bg-gray-100">
            <div className="w-full h-full bg-gray-200 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="h-12 w-64 bg-gray-300 rounded animate-pulse mx-auto" />
                <div className="h-6 w-48 bg-gray-300 rounded animate-pulse mx-auto" />
              </div>
            </div>
          </section>
          
          {/* Featured Products Skeleton */}
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-8">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
              <ProductGridSkeleton count={4} />
            </div>
          </section>
        </>
      ) : (
        <>
          {getSortedSections().map((section) => renderSection(section))}
        </>
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
                  className="px-6 py-3 rounded-sm transition-colors"
                  style={{ 
                    backgroundColor: theme.primaryColor,
                    color: theme.primaryTextColor || '#ffffff',
                  }}
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

