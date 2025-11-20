"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ChevronRight,
  Tag,
  Loader2,
  Lock,
} from "lucide-react"
import Link from "next/link"
import { CartSkeleton } from "@/components/skeletons/CartSkeleton"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import {
  trackPageView,
  trackViewCart,
  trackRemoveFromCart,
  trackInitiateCheckout,
} from "@/lib/tracking-events"
import { LoadingOverlay } from "@/components/storefront/LoadingOverlay"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { ProductCard } from "@/components/storefront/ProductCard"
import { useShopTheme } from "@/hooks/useShopTheme"
import { useNavigation } from "@/hooks/useNavigation"

interface CartItem {
  productId: string
  variantId: string | null
  product: {
    id: string
    slug: string
    name: string
    price: number
    images: string[]
  }
  variant: {
    id: string
    name: string
    price: number | null
  } | null
  quantity: number
  price: number
  total: number
  isGift?: boolean
  giftDiscountId?: string
  bundleId?: string
  bundleName?: string
  addons?: Array<{
    addonId: string
    valueId: string | null
    label: string
    price: number
    quantity: number
  }>
}

interface Cart {
  id: string
  items: CartItem[]
  subtotal: number
  tax: number
  shipping: number
  total: number
  couponCode: string | null
  discount: number
  customerDiscount?: number
  couponDiscount?: number
  automaticDiscount?: number
  automaticDiscountTitle?: string
}

interface RecommendedProduct {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  images: string[]
  availability: string
}

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
}

export default function CartPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [couponCode, setCouponCode] = useState("")
  const [customerId, setCustomerId] = useState<string | null>(null)
  const { trackEvent } = useTracking()
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false)
  const [shop, setShop] = useState<Shop | null>(null)
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([])
  const [loadingRecommended, setLoadingRecommended] = useState(false)
  const theme = useShopTheme(slug)
  const { navigation } = useNavigation(slug, "HEADER")

  useEffect(() => {
    const customerData = localStorage.getItem(`storefront_customer_${slug}`)
    if (customerData) {
      try {
        const parsed = JSON.parse(customerData)
        setCustomerId(parsed.id)
      } catch (error) {
        console.error("Error parsing customer data:", error)
      }
    }
    fetchShop()
    fetchCart()
    
    // PageView event
    trackPageView(trackEvent, `/shop/${slug}/cart`, "עגלת קניות")
  }, [slug])

  useEffect(() => {
    if (cart && cart.items.length > 0) {
      fetchRecommendedProducts()
    }
  }, [cart])

  const fetchShop = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/info`)
      if (response.ok) {
        const data = await response.json()
        setShop(data)
      }
    } catch (error) {
      console.error("Error fetching shop:", error)
    }
  }

  const fetchRecommendedProducts = async () => {
    if (!cart || cart.items.length === 0) return
    
    setLoadingRecommended(true)
    try {
      const productIds = cart.items.map(item => item.productId).join(",")
      const response = await fetch(`/api/storefront/${slug}/cart/recommended-products?productIds=${productIds}&limit=4`)
      if (response.ok) {
        const data = await response.json()
        setRecommendedProducts(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching recommended products:", error)
    } finally {
      setLoadingRecommended(false)
    }
  }

  const fetchCart = async () => {
    setLoading(true)
    try {
      const headers: HeadersInit = {}
      if (customerId) {
        headers["x-customer-id"] = customerId
      }

      const response = await fetch(`/api/storefront/${slug}/cart`, {
        headers,
        credentials: 'include', // חשוב! שולח cookies עם הבקשה
      })
      if (response.ok) {
        const data = await response.json()
        setCart(data)
        
        // ViewCart event
        if (data.items && data.items.length > 0) {
          const items = data.items.map((item: CartItem) => ({
            id: item.variantId || item.productId, // אם יש variant, נשלח את ה-variant ID
            name: item.variant?.name 
              ? `${item.product.name} - ${item.variant.name}` 
              : item.product.name, // אם יש variant, נוסיף את שם הvariant
            price: item.variant?.price || item.product.price,
            quantity: item.quantity,
          }))
          trackViewCart(trackEvent, items, data.total)
        }
      }
    } catch (error) {
      console.error("Error fetching cart:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (productId: string, variantId: string | null, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(productId, variantId)
      return
    }

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (customerId) {
        headers["x-customer-id"] = customerId
      }

      const response = await fetch(`/api/storefront/${slug}/cart`, {
        method: "PUT",
        headers,
        credentials: 'include', // חשוב! שולח cookies עם הבקשה
        body: JSON.stringify({
          productId,
          variantId,
          quantity,
        }),
      })

      if (response.ok) {
        fetchCart()
      }
    } catch (error) {
      console.error("Error updating cart:", error)
    }
  }

  const removeItem = async (productId: string, variantId: string | null) => {
    try {
      const headers: HeadersInit = {}
      if (customerId) {
        headers["x-customer-id"] = customerId
      }

      // מציאת הפריט לפני ההסרה כדי לשלוח אירוע
      const itemToRemove = cart?.items.find(
        (item) => item.productId === productId && item.variantId === variantId
      )

      const params = new URLSearchParams({ productId })
      if (variantId) {
        params.append("variantId", variantId)
      }

      const response = await fetch(`/api/storefront/${slug}/cart?${params}`, {
        method: "DELETE",
        headers,
        credentials: 'include', // חשוב! שולח cookies עם הבקשה
      })

      if (response.ok) {
        // RemoveFromCart event
        if (itemToRemove) {
          trackRemoveFromCart(trackEvent, {
            id: itemToRemove.variantId || itemToRemove.productId, // אם יש variant, נשלח את ה-variant ID
            name: itemToRemove.variant?.name 
              ? `${itemToRemove.product.name} - ${itemToRemove.variant.name}` 
              : itemToRemove.product.name, // אם יש variant, נוסיף את שם הvariant
          }, itemToRemove.quantity)
        }
        fetchCart()
      }
    } catch (error) {
      console.error("Error removing item:", error)
    }
  }

  const applyCoupon = async () => {
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (customerId) {
        headers["x-customer-id"] = customerId
      }

      const response = await fetch(`/api/storefront/${slug}/cart`, {
        method: "PUT",
        headers,
        credentials: 'include', // חשוב! שולח cookies עם הבקשה
        body: JSON.stringify({
          couponCode,
        }),
      })

      if (response.ok) {
        fetchCart()
        setCouponCode("")
      } else {
        const error = await response.json()
        alert(error.error || "קוד קופון לא תקין")
      }
    } catch (error) {
      console.error("Error applying coupon:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <CartSkeleton />
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-white" dir="rtl" style={theme?.theme ? { 
        '--primary-color': theme.theme.primaryColor || '#000000',
      } as React.CSSProperties : {}}>
        {shop && (
          <StorefrontHeader
            slug={slug}
            shop={shop}
            navigation={navigation}
            cartItemCount={0}
            onCartUpdate={() => {}}
            theme={theme?.theme}
            disableCartDrawer={true}
          />
        )}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <ShoppingCart className="w-20 h-20 mx-auto mb-6 text-gray-300" />
            <h2 className="text-3xl font-bold text-gray-900 mb-3">העגלה שלך ריקה</h2>
            <p className="text-gray-600 mb-8 text-lg">הוסף מוצרים לעגלה כדי להתחיל</p>
            <Link href={`/shop/${slug}`}>
              <Button className="prodify-gradient text-white px-8 py-6 text-lg">
                המשך לקניות
              </Button>
            </Link>
          </div>
        </main>
        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-16">
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
    <div className="min-h-screen bg-gray-50" dir="rtl" style={theme?.theme ? { 
      '--primary-color': theme.theme.primaryColor || '#000000',
    } as React.CSSProperties : {}}>
      <LoadingOverlay 
        isLoading={isProcessingCheckout} 
        message="מעביר לתשלום..."
      />
      
      {/* Header */}
      {shop && (
        <StorefrontHeader
          slug={slug}
          shop={shop}
          navigation={navigation}
          cartItemCount={cart.items.reduce((sum, item) => sum + item.quantity, 0)}
          onCartUpdate={fetchCart}
          theme={theme?.theme}
          disableCartDrawer={true}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">עגלת קניות</h1>
        <p className="text-gray-600 mb-8">עדכן את הכמויות או המשך לתשלום</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item, index) => {
              const price = item.variant?.price || item.product.price
              return (
                <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row gap-4 p-4">
                      {/* Product Image */}
                      <Link 
                        href={`/shop/${slug}/products/${item.product.slug || item.product.id}`}
                        className="flex-shrink-0 mx-auto sm:mx-0"
                      >
                        {item.product.images && item.product.images.length > 0 ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-100 rounded-lg flex items-center justify-center">
                            <ShoppingCart className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </Link>
                      
                      <div className="flex-1 min-w-0 flex flex-col">
                        {/* Product Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <Link href={`/shop/${slug}/products/${item.product.slug || item.product.id}`}>
                                <h3 className="font-semibold text-base sm:text-lg mb-1 hover:text-gray-700 transition-colors cursor-pointer line-clamp-2">
                                  {item.product.name}
                                </h3>
                              </Link>
                              
                              {/* Bundle Name */}
                              {item.bundleName && (
                                <p className="text-xs text-emerald-600 mb-1 font-medium">
                                  חלק מחבילה: {item.bundleName}
                                </p>
                              )}
                              
                              {/* Variant */}
                              {item.variant && (
                                <p className="text-xs sm:text-sm text-gray-500 mb-1">
                                  {item.variant.name}
                                </p>
                              )}
                              
                              {/* Addons */}
                              {item.addons && item.addons.length > 0 && (
                                <div className="text-xs text-gray-500 mb-1">
                                  {item.addons.map((addon, idx) => (
                                    <div key={idx}>
                                      {addon.label}
                                      {addon.price > 0 && ` (+₪${addon.price.toFixed(2)})`}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Gift Badge */}
                              {item.isGift && (
                                <Badge className="bg-green-100 text-green-800 text-xs mt-1">
                                  מתנה
                                </Badge>
                              )}
                            </div>
                            
                            {/* Remove Button */}
                            {!item.isGift && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 h-8 w-8 p-0"
                                onClick={() => removeItem(item.productId, item.variantId)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                          {/* Price per unit */}
                          <p className="text-xs sm:text-sm text-gray-500 mb-2">
                            ₪{price.toFixed(2)} ליחידה
                          </p>
                        </div>
                        
                        {/* Quantity Controls and Total */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                          {!item.isGift ? (
                            <div className="flex items-center border rounded-lg overflow-hidden">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-none hover:bg-gray-100"
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.variantId,
                                    item.quantity - 1
                                  )
                                }
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-10 text-center text-sm font-medium border-x">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-none hover:bg-gray-100"
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.variantId,
                                    item.quantity + 1
                                  )
                                }
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">כמות: {item.quantity}</span>
                          )}
                          <span className="text-base sm:text-lg font-bold text-gray-900">
                            ₪{item.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Recommended Products Section */}
            {recommendedProducts.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">מוצרים מומלצים עבורך</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {recommendedProducts.slice(0, 4).map((product) => {
                    // חישוב המחיר הנכון - אם המחיר הבסיסי הוא 0, נראה מחיר מינימלי מהוריאציות
                    const displayPrice = product.price > 0 ? product.price : 0
                    const displayComparePrice = product.comparePrice && product.comparePrice > displayPrice ? product.comparePrice : null
                    const hasDiscount = displayComparePrice && displayComparePrice > displayPrice
                    
                    return (
                      <div key={product.id} className="w-full">
                        <Link 
                          href={`/shop/${slug}/products/${product.slug || product.id}`}
                          className="block group"
                        >
                          <Card className="h-full transition-all duration-200 border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300">
                            <CardContent className="p-0">
                              {/* Image Container */}
                              <div className="relative overflow-hidden bg-gray-100 aspect-square">
                                {product.images && product.images.length > 0 ? (
                                  <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    style={{ borderRadius: '8px 8px 0 0' }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ShoppingCart className="w-12 h-12 text-gray-400" />
                                  </div>
                                )}
                                
                                {/* Discount Badge */}
                                {hasDiscount && (
                                  <Badge className="absolute top-3 right-3 bg-green-500 text-white shadow-lg">
                                    {Math.round(((displayComparePrice - displayPrice) / displayComparePrice) * 100)}% הנחה
                                  </Badge>
                                )}
                                
                                {/* Out of Stock Badge */}
                                {product.availability === "OUT_OF_STOCK" && (
                                  <Badge className="absolute top-3 right-3 bg-red-500 text-white shadow-lg">
                                    אזל מהמלאי
                                  </Badge>
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="p-3">
                                <h3 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-gray-700 transition-colors">
                                  {product.name}
                                </h3>
                                <div className="space-y-1">
                                  {displayPrice > 0 ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {displayComparePrice && (
                                        <span className="text-xs text-gray-500 line-through">
                                          ₪{displayComparePrice.toFixed(2)}
                                        </span>
                                      )}
                                      <span className="text-base font-bold text-gray-900">
                                        ₪{displayPrice.toFixed(2)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-sm font-medium text-gray-600">
                                      בחר אפשרות
                                    </span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <Card className="shadow-lg sticky top-8">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6">סיכום הזמנה</h2>

                {/* Coupon */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    קוד קופון או הנחה
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="הכנס קוד קופון"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={applyCoupon} 
                      variant="outline"
                      className="px-4"
                    >
                      <Tag className="w-4 h-4 ml-1" />
                      החל
                    </Button>
                  </div>
                  {cart.couponCode && (
                    <Badge className="mt-2 bg-green-100 text-green-800">
                      קופון: {cart.couponCode}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>סכום ביניים</span>
                    <span className="font-medium">₪{cart.subtotal.toFixed(2)}</span>
                  </div>
                  {cart.customerDiscount && cart.customerDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>הנחת לקוח</span>
                      <span className="font-medium">-₪{cart.customerDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {cart.couponDiscount && cart.couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>קופון {cart.couponCode}</span>
                      <span className="font-medium">-₪{cart.couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {cart.automaticDiscount && cart.automaticDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{cart.automaticDiscountTitle || 'הנחה אוטומטית'}</span>
                      <span className="font-medium">-₪{cart.automaticDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {cart.shipping > 0 ? (
                    <div className="flex justify-between text-gray-700">
                      <span>משלוח</span>
                      <span className="font-medium">₪{cart.shipping.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-green-600">
                      <span>משלוח</span>
                      <span className="font-medium">חינם</span>
                    </div>
                  )}
                  {theme?.theme?.showTaxInCart !== false && cart.tax > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>כולל מע"מ</span>
                      <span className="font-medium">₪{cart.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-xl">
                    <span>סה"כ</span>
                    <span>₪{cart.total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsProcessingCheckout(true)
                    // InitiateCheckout event
                    const items = cart.items.map((item) => ({
                      id: item.productId,
                      name: item.product.name,
                      price: item.variant?.price || item.product.price,
                      quantity: item.quantity,
                    }))
                    trackInitiateCheckout(trackEvent, items, cart.total)
                    router.push(`/shop/${slug}/checkout`)
                  }}
                  disabled={isProcessingCheckout}
                  className="w-full text-white py-6 text-lg font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: theme?.theme?.primaryColor || '#9333ea' }}
                >
                  {isProcessingCheckout ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>מעביר לקופה...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>מעבר לקופה</span>
                    </>
                  )}
                </button>
                
                <p className="mt-4 text-center text-sm text-gray-500">
                  תשלום מאובטח ומוצפן
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">{shop?.name || "חנות"}</h3>
              <p className="text-sm text-gray-600">{shop?.description || ""}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">קישורים מהירים</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href={`/shop/${slug}`} className="text-gray-600 hover:text-gray-900">
                    דף הבית
                  </Link>
                </li>
                <li>
                  <Link href={`/shop/${slug}/cart`} className="text-gray-600 hover:text-gray-900">
                    עגלת קניות
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">צור קשר</h3>
              <p className="text-sm text-gray-600">
                יש לך שאלות? אנחנו כאן לעזור
              </p>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <p className="text-gray-600 text-sm">
                &copy; {new Date().getFullYear()} {shop?.name || "חנות"}. כל הזכויות שמורות.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

