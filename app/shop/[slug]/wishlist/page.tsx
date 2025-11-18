"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Heart,
  ShoppingCart,
  Package,
  Trash2,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { ProductGridSkeleton } from "@/components/skeletons/ProductCardSkeleton"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackPageView, trackRemoveFromWishlist } from "@/lib/tracking-events"
import { getProductPrice, formatProductPrice, formatComparePrice } from "@/lib/product-price"

interface WishlistItem {
  id: string
  product: {
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
    }>
  }
  variant: {
    id: string
    name: string
    price: number | null
    image: string | null
  } | null
  createdAt: string
}

export default function WishlistPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const slug = params.slug as string

  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const { trackEvent } = useTracking()

  useEffect(() => {
    const customerData = localStorage.getItem(`storefront_customer_${slug}`)
    if (customerData) {
      try {
        const parsed = JSON.parse(customerData)
        setCustomerId(parsed.id)
        fetchWishlist(parsed.id)
        // PageView event - רק פעם אחת כשהעמוד נטען
        trackPageView(trackEvent, `/shop/${slug}/wishlist`, "רשימת משאלות")
      } catch (error) {
        console.error("Error parsing customer data:", error)
        router.push(`/shop/${slug}/login`)
      }
    } else {
      router.push(`/shop/${slug}/login`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, router]) // רק כשהעמוד משתנה, לא trackEvent

  const fetchWishlist = async (customerId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/storefront/${slug}/wishlist`, {
        headers: {
          "x-customer-id": customerId,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setWishlistItems(data)
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFromWishlist = async (itemId: string) => {
    if (!customerId) return

    // מציאת הפריט לפני ההסרה כדי לשלוח אירוע
    const itemToRemove = wishlistItems.find((item) => item.id === itemId)

    try {
      const response = await fetch(
        `/api/storefront/${slug}/wishlist?itemId=${itemId}&customerId=${customerId}`,
        {
          method: "DELETE",
        }
      )

      if (response.ok) {
        // RemoveFromWishlist event
        if (itemToRemove) {
          trackRemoveFromWishlist(trackEvent, {
            id: itemToRemove.product.id,
            name: itemToRemove.product.name,
          })
        }
        
        toast({
          title: "הוסר מרשימת המשאלות",
          description: "המוצר הוסר בהצלחה",
        })
        fetchWishlist(customerId)
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן להסיר את המוצר",
        variant: "destructive",
      })
    }
  }

  const handleAddToCart = async (productId: string, variantId: string | null) => {
    try {
      const response = await fetch(`/api/storefront/${slug}/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          variantId,
          quantity: 1,
        }),
      })

      if (response.ok) {
        toast({
          title: "נוסף לעגלה",
          description: "המוצר נוסף לעגלת הקניות",
        })
        router.push(`/shop/${slug}/cart`)
      }
    } catch (error) {
      console.error("Error adding to cart:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן להוסיף את המוצר לעגלה",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link href={`/shop/${slug}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                  <ChevronRight className="w-5 h-5" />
                  חזרה לחנות
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">רשימת משאלות</h1>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProductGridSkeleton count={4} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href={`/shop/${slug}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ChevronRight className="w-5 h-5" />
                חזרה לחנות
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">רשימת משאלות</h1>
            <div></div>
          </div>
        </div>
      </header>

      {/* Wishlist Items */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {wishlistItems.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <Heart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">רשימת המשאלות שלך ריקה</h2>
              <p className="text-gray-600 mb-6">הוסף מוצרים לרשימת המשאלות כדי לשמור אותם לקנייה מאוחרת</p>
              <Link href={`/shop/${slug}`}>
                <Button className="prodify-gradient text-white">
                  המשך לקניות
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {wishlistItems.map((item) => {
              const product = item.product
              const variant = item.variant
              // אם יש וריאציה, נשתמש במחיר שלה, אחרת נשתמש בפונקציה שמתחשבת בוריאציות
              const priceInfo = variant?.price !== null && variant?.price !== undefined
                ? { price: variant.price, comparePrice: variant.comparePrice || product.comparePrice, hasVariants: false }
                : getProductPrice({ ...product, variants: product.variants || [] })
              const displayPrice = priceInfo.price
              const displayImage = variant?.image || (product.images && product.images[0])

              return (
                <Card key={item.id} className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      {/* Product Image */}
                      <Link href={`/shop/${slug}/products/${product.slug || product.id}`} className="flex-shrink-0">
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt={product.name}
                            className="w-32 h-32 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </Link>

                      {/* Product Info */}
                      <div className="flex-1">
                        <Link href={`/shop/${slug}/products/${product.slug || product.id}`}>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-purple-600">
                            {product.name}
                          </h3>
                        </Link>
                        {variant && (
                          <p className="text-sm text-gray-600 mb-2">{variant.name}</p>
                        )}
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xl font-bold text-purple-600">
                            ₪{displayPrice.toFixed(2)}
                          </span>
                          {priceInfo.comparePrice && (
                            <span className="text-sm text-gray-500 line-through">
                              ₪{priceInfo.comparePrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {product.availability === "OUT_OF_STOCK" && (
                          <Badge className="bg-red-100 text-red-800 mb-4">
                            אזל מהמלאי
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleAddToCart(product.id, variant?.id || null)}
                          disabled={product.availability === "OUT_OF_STOCK"}
                          className="prodify-gradient text-white"
                        >
                          <ShoppingCart className="w-4 h-4 ml-2" />
                          הוסף לעגלה
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRemoveFromWishlist(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 ml-2" />
                          הסר
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

