"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingCart,
  Heart,
  Package,
  Star,
  ChevronRight,
  Minus,
  Plus,
  X,
  ChevronLeft,
  AlertCircle,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Pencil,
  Palette,
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { ProductPageSkeleton } from "@/components/skeletons/ProductPageSkeleton"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { ProductCard } from "@/components/storefront/ProductCard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useShopTheme, getThemeStyles } from "@/hooks/useShopTheme"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import {
  trackPageView,
  trackViewContent,
  trackSelectVariant,
  trackAddToCart,
  trackAddToWishlist,
  trackRemoveFromWishlist,
} from "@/lib/tracking-events"
import { ProductPageDesigner } from "@/components/storefront/ProductPageDesigner"
import { cn } from "@/lib/utils"

type GalleryLayout = "standard" | "right-side" | "left-side" | "masonry" | "fixed"

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  comparePrice: number | null
  images: string[]
  availability: string
  inventoryQty: number
  seoTitle?: string | null
  seoDescription?: string | null
  variants?: Array<{
    id: string
    name: string
    price: number | null
    inventoryQty: number
  }>
  options?: Array<{
    id: string
    name: string
    values: Array<{ id: string; label: string; metadata?: any }> | string[]
  }>
}

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const slug = params.slug as string
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [showReviews, setShowReviews] = useState(false)
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [shop, setShop] = useState<any>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [showQuickBuy, setShowQuickBuy] = useState(false)
  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<string, string>>({})
  const { theme } = useShopTheme(slug)
  const [autoOpenCart, setAutoOpenCart] = useState(true)
  const [cartOpenCallback, setCartOpenCallback] = useState<(() => void) | null>(null)
  const [cartRefreshKey, setCartRefreshKey] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [showDesigner, setShowDesigner] = useState(false)
  const [galleryLayout, setGalleryLayout] = useState<GalleryLayout>("standard")
  const { trackEvent } = useTracking()

  const handleOpenCart = useCallback((callback: () => void) => {
    setCartOpenCallback(() => callback)
  }, [])

  useEffect(() => {
    // טעינה מקבילה של כל הנתונים
    const loadData = async () => {
      const customerData = localStorage.getItem(`storefront_customer_${slug}`)
      let parsedCustomer: any = null
      if (customerData) {
        try {
          parsedCustomer = JSON.parse(customerData)
          setCustomerId(parsedCustomer.id)
        } catch (error) {
          console.error("Error parsing customer data:", error)
        }
      }

      // טעינה מקבילה של כל הנתונים
      await Promise.all([
        fetchShopInfo(),
        fetchProduct(),
        fetchCartCount(),
        fetchShopSettings(),
        fetchGalleryLayout(),
        parsedCustomer ? checkWishlist(parsedCustomer.id) : Promise.resolve(),
        fetchReviews(),
        fetchRelatedProducts(),
        checkAdminStatus(),
      ])
    }

    loadData()
  }, [slug, productId])

  // עדכון meta tags ל-SEO + PageView event
  useEffect(() => {
    if (!product) return

    const title = product.seoTitle || product.name
    const description = product.seoDescription || product.description || ""
    const image = product.images && product.images.length > 0 ? product.images[0] : ""
    
    // עדכון title
    document.title = title
    
    // PageView event - רק פעם אחת כשהמוצר נטען
    trackPageView(trackEvent, `/shop/${slug}/products/${productId}`, title)
    
    // עדכון או יצירת meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name'
      let meta = document.querySelector(`meta[${attribute}="${name}"]`)
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute(attribute, name)
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', content)
    }

    // Meta tags בסיסיים
    updateMetaTag('description', description)
    updateMetaTag('og:title', title, true)
    updateMetaTag('og:description', description, true)
    updateMetaTag('og:type', 'product', true)
    if (image) {
      updateMetaTag('og:image', image, true)
    }
    updateMetaTag('twitter:card', 'summary_large_image')
    updateMetaTag('twitter:title', title)
    updateMetaTag('twitter:description', description)
    if (image) {
      updateMetaTag('twitter:image', image)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, slug, productId]) // רק כשהמוצר משתנה, לא trackEvent

  // ViewContent event - רק כשהמוצר או ה-variant משתנים
  useEffect(() => {
    if (!product) return

    const currentPrice = selectedVariant && product.variants
      ? product.variants.find((v) => v.id === selectedVariant)?.price || product.price
      : product.price
    
    trackViewContent(trackEvent, {
      id: product.id,
      name: product.name,
      price: currentPrice,
      sku: product.sku || null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, selectedVariant]) // רק כשהמוצר או ה-variant משתנים

  const checkAdminStatus = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/check-admin`)
      if (response.ok) {
        const data = await response.json()
        setIsAdmin(data.isAdmin || false)
      }
    } catch (error) {
      console.error("Error checking admin status:", error)
      setIsAdmin(false)
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

  const fetchGalleryLayout = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/product-gallery-layout`)
      if (response.ok) {
        const data = await response.json()
        if (data.layout) {
          setGalleryLayout(data.layout as GalleryLayout)
        }
      }
    } catch (error) {
      console.error("Error fetching gallery layout:", error)
    }
  }

  const saveGalleryLayout = async (layout: GalleryLayout) => {
    try {
      const response = await fetch(`/api/storefront/${slug}/product-gallery-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      })
      if (response.ok) {
        setGalleryLayout(layout)
      }
    } catch (error) {
      console.error("Error saving gallery layout:", error)
    }
  }

  useEffect(() => {
    // עדכון selectedVariant לפי selectedOptionValues
    if (product && product.variants && product.options && product.variants.length > 0) {
      // מציאת הווריאציה המתאימה לפי ה-options שנבחרו
      const matchingVariant = product.variants.find((variant: any) => {
        // בדיקה אם הווריאציה מתאימה לכל ה-options שנבחרו
        return product.options?.every((option: any) => {
          const selectedValueId = selectedOptionValues[option.id]
          
          // אם לא נבחר ערך עבור option זה, דלג עליו
          if (selectedValueId === undefined) {
            return true
          }
          
          // מציאת ה-label של הערך שנבחר
          let selectedLabel: string | null = null
          if (option.values && Array.isArray(option.values)) {
            const valueObj = option.values.find((v: any) => {
              if (typeof v === 'string') return v === selectedValueId
              return v.id === selectedValueId || v.label === selectedValueId
            })
            if (valueObj) {
              selectedLabel = typeof valueObj === 'string' ? valueObj : (valueObj.label || valueObj.id)
            }
          }
          
          if (!selectedLabel) return false
          
          // בדיקה אם הווריאציה מכילה את הערך הזה ב-option1, option2 או option3
          const optionName = option.name
          return (
            (variant.option1 === optionName && variant.option1Value === selectedLabel) ||
            (variant.option2 === optionName && variant.option2Value === selectedLabel) ||
            (variant.option3 === optionName && variant.option3Value === selectedLabel)
          )
        })
      })
      
      if (matchingVariant && matchingVariant.id !== selectedVariant) {
        setSelectedVariant(matchingVariant.id)
        
        // SelectVariant event
        if (product) {
          const variantPrice = matchingVariant.price || product.price
          trackSelectVariant(trackEvent, product, {
            id: matchingVariant.id,
            name: matchingVariant.name,
            price: variantPrice,
            sku: matchingVariant.sku || null,
          })
        }
      } else if (!matchingVariant && product.variants.length > 0) {
        // אם לא נמצאה התאמה, נבחר את הווריאציה הראשונה
        setSelectedVariant(product.variants[0].id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptionValues, product?.id])

  useEffect(() => {
    // עדכון כמות מקסימלית כשמשנים variant או product
    if (!product) return
    
    let availableQty = product.inventoryQty
    if (selectedVariant && product.variants) {
      const variant = product.variants.find((v) => v.id === selectedVariant)
      if (variant) {
        availableQty = variant.inventoryQty
      }
    }
    const maxQty = product.availability === "OUT_OF_STOCK" ? 0 : availableQty
    
    // אם הכמות הנוכחית גדולה מהמלאי הזמין, עדכן אותה
    // רק אם יש שינוי ב-variant או product, לא כל פעם ש-quantity משתנה
    setQuantity((currentQty) => {
      if (currentQty > maxQty && maxQty > 0) {
        return maxQty
      } else if (maxQty === 0 && currentQty > 0) {
        return 1 // שמור על 1 גם אם אין מלאי (הכפתור יהיה disabled)
      }
      return currentQty
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariant, product?.id])

  const fetchShopInfo = async () => {
    try {
      // שימוש ב-cache של Next.js
      const response = await fetch(`/api/storefront/${slug}/info`, {
        next: { revalidate: 300 }, // Cache for 5 minutes
      })
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

      // שימוש ב-cache קצר מאוד
      const response = await fetch(`/api/storefront/${slug}/cart`, { 
        headers,
        next: { revalidate: 0 }, // Always fresh but uses Next.js cache
      })
      if (response.ok) {
        const data = await response.json()
        const count = data.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0
        setCartItemCount(count)
      }
    } catch (error) {
      console.error("Error fetching cart count:", error)
    }
  }

  const fetchProduct = async () => {
    setLoading(true)
    try {
      // שימוש ב-cache של Next.js
      const response = await fetch(`/api/storefront/${slug}/products/${productId}`, {
        next: { revalidate: 60 }, // Cache for 60 seconds
      })
      if (response.ok) {
        const data = await response.json()
        setProduct(data)
        if (data.variants && data.variants.length > 0) {
          // אם יש options, נחכה ל-useEffect שיבחר את הווריאציה הנכונה
          // אם אין options, נבחר את הראשונה
          if (!data.options || data.options.length === 0) {
            setSelectedVariant(data.variants[0].id)
          } else {
            // אתחל את ה-options - קודם ננסה להשתמש ב-defaultOptionValues מ-customFields
            const initialOptions: Record<string, string> = {}
            let hasDefaults = false
            
            if (data.customFields && typeof data.customFields === 'object') {
              const customFields = data.customFields as any
              if (customFields.defaultOptionValues) {
                hasDefaults = true
                Object.assign(initialOptions, customFields.defaultOptionValues)
              }
            }
            
            // אם אין ברירות מחדל, נשתמש בערכים הראשונים
            if (!hasDefaults) {
              data.options.forEach((option: any) => {
                if (option.values && Array.isArray(option.values) && option.values.length > 0) {
                  const firstValue = option.values[0]
                  const valueId = typeof firstValue === 'object' ? firstValue.id : firstValue
                  initialOptions[option.id] = valueId
                }
              })
            }
            
            setSelectedOptionValues(initialOptions)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching product:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/products/${productId}/reviews`)
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews || [])
        setAverageRating(data.averageRating || 0)
        setTotalReviews(data.totalReviews || 0)
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
    }
  }

  const fetchRelatedProducts = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/products/${productId}/related`)
      if (response.ok) {
        const data = await response.json()
        setRelatedProducts(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching related products:", error)
    }
  }

  const checkWishlist = async (customerId: string) => {
    try {
      const response = await fetch(`/api/storefront/${slug}/wishlist`, {
        headers: {
          "x-customer-id": customerId,
        },
      })
      if (response.ok) {
        const items = await response.json()
        const item = items.find((i: any) => i.productId === productId && i.variantId === selectedVariant)
        if (item) {
          setIsInWishlist(true)
          setWishlistItemId(item.id)
        }
      }
    } catch (error) {
      console.error("Error checking wishlist:", error)
    }
  }

  const handleToggleWishlist = async () => {
    if (!customerId) {
      router.push(`/shop/${slug}/login`)
      return
    }

    if (isInWishlist && wishlistItemId) {
      // Remove from wishlist
      try {
        const response = await fetch(
          `/api/storefront/${slug}/wishlist?itemId=${wishlistItemId}&customerId=${customerId}`,
          { method: "DELETE" }
        )
        if (response.ok) {
          setIsInWishlist(false)
          setWishlistItemId(null)
          
          // RemoveFromWishlist event
          if (product) {
            trackRemoveFromWishlist(trackEvent, {
              id: product.id,
              name: product.name,
            })
          }
        }
      } catch (error) {
        console.error("Error removing from wishlist:", error)
      }
    } else {
      // Add to wishlist
      try {
        const response = await fetch(`/api/storefront/${slug}/wishlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            variantId: selectedVariant,
            customerId,
          }),
        })
        if (response.ok) {
          const data = await response.json()
          setIsInWishlist(true)
          setWishlistItemId(data.id)
          
          // AddToWishlist event
          if (product) {
            const currentPrice = selectedVariant && product.variants
              ? product.variants.find((v) => v.id === selectedVariant)?.price || product.price
              : product.price
            
            trackAddToWishlist(trackEvent, {
              id: product.id,
              name: product.name,
              price: currentPrice,
            })
          }
        }
      } catch (error) {
        console.error("Error adding to wishlist:", error)
      }
    }
  }

  const handleAddToCart = async (showToast = true) => {
    if (!product) return false

    // בדיקת מלאי לפני הוספה לעגלה
    let availableQty = product.inventoryQty
    
    // אם יש variant נבחר, בדוק את המלאי שלו
    if (selectedVariant && product.variants) {
      const variant = product.variants.find((v) => v.id === selectedVariant)
      if (variant) {
        availableQty = variant.inventoryQty
      }
    }

    // בדיקה אם המוצר אזל מהמלאי או שהכמות המבוקשת גדולה מהמלאי הזמין
    if (product.availability === "OUT_OF_STOCK" || availableQty === 0) {
      if (showToast) {
        toast({
          title: "שגיאה",
          description: "המוצר אזל מהמלאי",
          variant: "destructive",
        })
      }
      return false
    }

    // בדיקה אם הכמות המבוקשת גדולה מהמלאי הזמין
    if (quantity > availableQty) {
      if (showToast) {
        toast({
          title: "שגיאה",
          description: `המלאי הזמין הוא ${availableQty} יחידות בלבד`,
          variant: "destructive",
        })
      }
      return false
    }

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (customerId) {
        headers["x-customer-id"] = customerId
      }

      const body: any = {
        productId: product.id,
        quantity,
      }
      
      // רק אם יש variantId, נוסיף אותו
      if (selectedVariant) {
        body.variantId = selectedVariant
      }

      const response = await fetch(`/api/storefront/${slug}/cart`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const data = await response.json()
        if (showToast) {
          toast({
            title: "הצלחה",
            description: "המוצר נוסף לעגלה בהצלחה",
          })
        }
        fetchCartCount()
        
        // AddToCart event
        const currentPrice = selectedVariant && product.variants
          ? product.variants.find((v) => v.id === selectedVariant)?.price || product.price
          : product.price
        
        trackAddToCart(trackEvent, {
          id: product.id,
          name: product.name,
          price: currentPrice,
          sku: product.sku || null,
        }, quantity, selectedVariant || undefined)
        
        // עדכון מפתח רענון לעגלה
        setCartRefreshKey(prev => prev + 1)
        
        // פתיחת עגלה אם ההגדרה מאפשרת
        if (autoOpenCart && cartOpenCallback) {
          setTimeout(() => {
            cartOpenCallback()
          }, 300) // קצת delay כדי שהטוסט יופיע
        }
        
        return true
      } else {
        const error = await response.json()
        if (showToast) {
          toast({
            title: "שגיאה",
            description: error.error || "לא ניתן להוסיף את המוצר לעגלה",
            variant: "destructive",
          })
        }
        return false
      }
    } catch (error) {
      console.error("Error adding to cart:", error)
      if (showToast) {
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בהוספת המוצר לעגלה",
          variant: "destructive",
        })
      }
      return false
    }
  }

  const handleEdit = () => {
    router.push(`/products/${productId}/edit`)
  }

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      const response = await fetch(`/api/products/${productId}/duplicate`, {
        method: "POST",
      })
      if (response.ok) {
        const duplicatedProduct = await response.json()
        toast({
          title: "הצלחה",
          description: "המוצר שוכפל בהצלחה",
        })
        router.push(`/products/${duplicatedProduct.id}/edit`)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לשכפל את המוצר",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error duplicating product:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשכפול המוצר",
        variant: "destructive",
      })
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "המוצר נמחק בהצלחה",
        })
        router.push(`/shop/${slug}`)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן למחוק את המוצר",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת המוצר",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  const renderGallery = () => {
    if (!product || !product.images || product.images.length === 0) {
      return (
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
          <Package className="w-32 h-32 text-gray-400" />
        </div>
      )
    }

    switch (galleryLayout) {
      case "standard":
        return (
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              <img
                src={product.images[selectedImage]}
                alt={product.seoTitle || product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                      selectedImage === index
                        ? "ring-2"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={selectedImage === index ? {
                      borderColor: theme.primaryColor,
                      '--tw-ring-color': theme.primaryColor,
                    } as React.CSSProperties & { '--tw-ring-color': string } : {}}
                  >
                    <img
                      src={image}
                      alt={`${product.seoTitle || product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )

      case "right-side":
        return (
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={product.images[selectedImage]}
                  alt={product.seoTitle || product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {product.images.length > 1 && (
              <div className="flex flex-col gap-2 w-20">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                      selectedImage === index
                        ? "ring-2"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={selectedImage === index ? {
                      borderColor: theme.primaryColor,
                      '--tw-ring-color': theme.primaryColor,
                    } as React.CSSProperties & { '--tw-ring-color': string } : {}}
                  >
                    <img
                      src={image}
                      alt={`${product.seoTitle || product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )

      case "left-side":
        return (
          <div className="flex gap-4">
            {product.images.length > 1 && (
              <div className="flex flex-col gap-2 w-20">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                      selectedImage === index
                        ? "ring-2"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={selectedImage === index ? {
                      borderColor: theme.primaryColor,
                      '--tw-ring-color': theme.primaryColor,
                    } as React.CSSProperties & { '--tw-ring-color': string } : {}}
                  >
                    <img
                      src={image}
                      alt={`${product.seoTitle || product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1">
              <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={product.images[selectedImage]}
                  alt={product.seoTitle || product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        )

      case "masonry":
        return (
          <>
            {/* Desktop - תצוגה אנכית */}
            <div className="hidden lg:block space-y-2">
              {product.images.map((image, index) => {
                // תמונות גדולות באינדקסים 0, 3, 6, 9... (כל 3 תמונות)
                const isLarge = index % 3 === 0
                
                if (isLarge) {
                  // תמונה גדולה על כל הרוחב
                  return (
                    <div key={index} className="w-full">
                      <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                        <img
                          src={image}
                          alt={`${product.seoTitle || product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )
                } else {
                  // תמונות קטנות - נצטרך לקבץ אותן ב-2
                  const groupIndex = Math.floor((index - 1) / 3)
                  const positionInGroup = (index - 1) % 3
                  
                  // אם זו התמונה הראשונה בקבוצה של 2 קטנות, ניצור את הקונטיינר
                  if (positionInGroup === 0) {
                    const nextImage = product.images[index + 1]
                    return (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                          <img
                            src={image}
                            alt={`${product.seoTitle || product.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {nextImage && (
                          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                            <img
                              src={nextImage}
                              alt={`${product.seoTitle || product.name} ${index + 2}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )
                  }
                  // אם זו התמונה השנייה בקבוצה, נדלג (כי כבר רינדרנו אותה עם הראשונה)
                  return null
                }
              })}
            </div>
            {/* Mobile - סלידר אופקי עם רווח של 5px לבן */}
            <div className="lg:hidden flex overflow-x-auto snap-x snap-mandatory scrollbar-hide bg-white -mx-4 px-4">
              {product.images.map((image, index) => (
                <div 
                  key={index} 
                  className="flex-shrink-0 snap-center"
                  style={{ 
                    width: 'calc(100vw - 2rem - 5px)',
                    marginRight: index < product.images.length - 1 ? '5px' : '0'
                  }}
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={image}
                      alt={`${product.seoTitle || product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )

      case "fixed":
        return (
          <>
            {/* Desktop - תצוגה אנכית */}
            <div className="hidden lg:block space-y-4">
              {product.images.map((image, index) => (
                <div key={index} className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={image}
                    alt={`${product.seoTitle || product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            {/* Mobile - סלידר אופקי ללא רווח */}
            <div className="lg:hidden flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {product.images.map((image, index) => (
                <div key={index} className="flex-shrink-0 w-full snap-center">
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={image}
                      alt={`${product.seoTitle || product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )

      default:
        return null
    }
  }

  if (loading) {
    return <ProductPageSkeleton />
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">מוצר לא נמצא</p>
      </div>
    )
  }

  const currentPrice = selectedVariant && product.variants
    ? product.variants.find((v) => v.id === selectedVariant)?.price || product.price
    : product.price

  return (
    <div className="min-h-screen bg-white" dir="rtl" style={getThemeStyles(theme)}>
      {/* Header */}
      <StorefrontHeader
        slug={slug}
        shop={shop}
        cartItemCount={cartItemCount}
        onCartUpdate={fetchCartCount}
        onOpenCart={handleOpenCart}
        cartRefreshKey={cartRefreshKey}
      />

      {/* Admin Floating Buttons */}
      {isAdmin && (
        <>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                className="fixed right-6 bottom-6 z-50 rounded-full w-14 h-14 p-0 shadow-lg hover:shadow-xl transition-all flex items-center justify-center aspect-square focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 active:scale-100 active:translate-x-0 active:translate-y-0"
                style={{ 
                  backgroundColor: theme.primaryColor || "#000000",
                  outline: 'none',
                  transform: 'none'
                }}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onFocus={(e) => {
                  e.target.style.transform = 'none'
                }}
              >
                <Pencil className="w-6 h-6 text-white" style={{ transform: 'none', position: 'relative', left: 0, top: 0 }} />
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                side="top"
                sideOffset={8}
                className="min-w-[160px]"
                onCloseAutoFocus={(e) => {
                  e.preventDefault()
                }}
                onEscapeKeyDown={(e) => {
                  // Allow escape to close without blocking scroll
                }}
              >
                <DropdownMenuItem
                  onClick={handleEdit}
                  className="cursor-pointer flex flex-row-reverse items-center gap-2"
                >
                  <Edit className="w-4 h-4 flex-shrink-0" />
                  עריכה
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDuplicate}
                  disabled={isDuplicating}
                  className="cursor-pointer flex flex-row-reverse items-center gap-2"
                >
                  <Copy className="w-4 h-4 flex-shrink-0" />
                  {isDuplicating ? "משכפל..." : "שכפול"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="cursor-pointer flex flex-row-reverse items-center gap-2 text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 flex-shrink-0" />
                  מחיקת מוצר
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          
          {/* כפתור עיצוב */}
          <Button
            onClick={() => setShowDesigner(true)}
            className="fixed right-6 bottom-24 z-50 rounded-full w-14 h-14 p-0 shadow-lg hover:shadow-xl transition-all flex items-center justify-center aspect-square"
            style={{ 
              backgroundColor: theme.primaryColor || "#000000",
            }}
          >
            <Palette className="w-6 h-6 text-white" />
          </Button>
        </>
      )}

      {/* Product */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className={cn(
          "grid gap-12",
          galleryLayout === "masonry" || galleryLayout === "fixed"
            ? "grid-cols-1 lg:grid-cols-2"
            : "grid-cols-1 lg:grid-cols-2"
        )}>
          {/* Images Gallery */}
          <div className={cn(
            galleryLayout === "masonry" || galleryLayout === "fixed" 
              ? "order-1 lg:order-2" 
              : "order-1"
          )}>
            {renderGallery()}
          </div>

          {/* Product Info */}
          <div className={cn(
            "space-y-6",
            galleryLayout === "masonry" || galleryLayout === "fixed" 
              ? "order-2 lg:order-1 lg:sticky lg:top-4 lg:h-fit" 
              : "order-2"
          )}>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{product.seoTitle || product.name}</h1>
              
              <div className="flex items-center gap-4 mb-6">
                <span className="text-3xl font-bold text-gray-900">
                  ₪{currentPrice.toFixed(2)}
                </span>
                {product.comparePrice && (
                  <span className="text-xl text-gray-500 line-through">
                    ₪{product.comparePrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {product.description && (
              <div className="mb-6">
                <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* Variants */}
            {product.options && product.options.length > 0 && (
              <div className="space-y-4">
                {product.options.map((option) => {
                  const isOptionSelected = selectedOptionValues[option.id] !== undefined
                  return (
                    <div key={option.id}>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        {option.name}
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {(Array.isArray(option.values) ? option.values : []).map((value: any) => {
                          const valueId = typeof value === 'object' ? value.id : value
                          const valueLabel = typeof value === 'object' ? value.label : value
                          const isSelected = selectedOptionValues[option.id] === valueId
                          return (
                            <button
                              key={valueId}
                              onClick={() => setSelectedOptionValues({ ...selectedOptionValues, [option.id]: valueId })}
                              className={`px-4 py-2 border-2 rounded-sm text-sm font-medium transition-all ${
                                isSelected
                                  ? "text-white"
                                  : "border-gray-300 text-gray-700 hover:border-gray-400"
                              }`}
                              style={isSelected ? {
                                borderColor: theme.primaryColor,
                                backgroundColor: theme.primaryColor,
                              } : {}}
                            >
                              {valueLabel}
                            </button>
                          )
                        })}
                        {isOptionSelected && (
                          <button
                            onClick={() => {
                              const updated = { ...selectedOptionValues }
                              delete updated[option.id]
                              setSelectedOptionValues(updated)
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                          >
                            נקה
                          </button>
                        )}
                      </div>
                      {!isOptionSelected && (
                        <p className="text-red-600 text-sm mt-2 font-medium flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" />
                          יש לבחור {option.name}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                כמות
              </label>
              <div className="flex items-center gap-2 w-fit">
                {(() => {
                  // חישוב המלאי הזמין
                  let availableQty = product.inventoryQty
                  if (selectedVariant && product.variants) {
                    const variant = product.variants.find((v) => v.id === selectedVariant)
                    if (variant) {
                      availableQty = variant.inventoryQty
                    }
                  }
                  const maxQty = product.availability === "OUT_OF_STOCK" ? 0 : availableQty
                  
                  return (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="rounded-sm"
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1
                          setQuantity(Math.max(1, Math.min(maxQty || 1, newQty)))
                        }}
                        className="w-20 text-center rounded-sm"
                        min="1"
                        max={maxQty || 1}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(Math.min(maxQty || 1, quantity + 1))}
                        className="rounded-sm"
                        disabled={quantity >= (maxQty || 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      {maxQty > 0 && (
                        <span className="text-sm text-gray-500">
                          (זמין: {maxQty})
                        </span>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Add to Cart & Buy Now */}
            <div className="space-y-3">
              <button
                onClick={() => handleAddToCart(true)}
                disabled={product.availability === "OUT_OF_STOCK"}
                className="w-full text-white rounded-sm h-11 px-8 font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{ backgroundColor: theme.primaryColor || "#000000" }}
              >
                <ShoppingCart className="w-5 h-5 ml-2" />
                הוסף לעגלה
              </button>
              <Button
                onClick={() => setShowQuickBuy(true)}
                disabled={product.availability === "OUT_OF_STOCK"}
                variant="outline"
                className="w-full border-2 rounded-sm hover:bg-gray-50"
                style={{
                  borderColor: theme.primaryColor,
                  color: theme.primaryColor,
                }}
                size="lg"
              >
                קנה עכשיו
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={handleToggleWishlist}
                  className={`flex-1 rounded-sm ${
                    isInWishlist 
                      ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" 
                      : ""
                  }`}
                >
                  <Heart className={`w-5 h-5 ml-2 ${isInWishlist ? "fill-red-600" : ""}`} />
                  {isInWishlist ? "הוסר מרשימת משאלות" : "הוסף לרשימת משאלות"}
                </Button>
              </div>
            </div>

            {/* Availability */}
            {product.availability === "OUT_OF_STOCK" && (
              <Badge className="bg-red-100 text-red-800 mb-4">
                אזל מהמלאי
              </Badge>
            )}
            {product.availability === "PRE_ORDER" && (
              <Badge className="bg-blue-100 text-blue-800 mb-4">
                הזמנה מראש
              </Badge>
            )}

            {/* Rating Summary */}
            {totalReviews > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
                    {renderStars(Math.round(averageRating))}
                    <div className="text-sm text-gray-600 mt-1">{totalReviews} ביקורות</div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowReviews(!showReviews)}
                  >
                    {showReviews ? "הסתר ביקורות" : "הצג ביקורות"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        {showReviews && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">ביקורות ({totalReviews})</h2>
            {reviews.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <Star className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">אין ביקורות עדיין</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <Card key={review.id} className="shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            {renderStars(review.rating)}
                            {review.isVerified && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                רכישה מאומתת
                              </Badge>
                            )}
                          </div>
                          {review.title && (
                            <h3 className="font-semibold text-gray-900">{review.title}</h3>
                          )}
                          <p className="text-sm text-gray-600 mt-1">
                            {review.customer?.firstName || "לקוח"} {review.customer?.lastName || ""}
                            {" • "}
                            {new Date(review.createdAt).toLocaleDateString("he-IL")}
                          </p>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700 mb-4">{review.comment}</p>
                      )}
                      {review.images && review.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-4">
                          {review.images.map((img: string, idx: number) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Review image ${idx + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 border-t border-gray-200 pt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">מוצרים קשורים</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                  slug={slug}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Quick Buy Modal */}
      <Dialog open={showQuickBuy} onOpenChange={setShowQuickBuy}>
        <DialogContent className="max-w-md" dir="rtl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">קנייה מהירה</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuickBuy(false)}
              className="p-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {product && (
            <div className="space-y-4">
              <div className="flex gap-4">
                {product.images && product.images.length > 0 && (
                  <img
                    src={product.images[0]}
                    alt={product.seoTitle || product.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      ₪{currentPrice.toFixed(2)}
                    </span>
                    {product.comparePrice && (
                      <span className="text-sm text-gray-500 line-through">
                        ₪{product.comparePrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Options in Modal */}
              {product.options && product.options.length > 0 && (
                <div className="space-y-3">
                  {product.options.map((option) => {
                    const isOptionSelected = selectedOptionValues[option.id] !== undefined
                    return (
                      <div key={option.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {option.name}
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {(Array.isArray(option.values) ? option.values : []).map((value: any) => {
                            const valueId = typeof value === 'object' ? value.id : value
                            const valueLabel = typeof value === 'object' ? value.label : value
                            const isSelected = selectedOptionValues[option.id] === valueId
                            return (
                              <button
                                key={valueId}
                                onClick={() => setSelectedOptionValues({ ...selectedOptionValues, [option.id]: valueId })}
                                className={`px-3 py-1.5 border-2 rounded-sm text-sm font-medium transition-all ${
                                  isSelected
                                    ? "text-white"
                                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                                }`}
                                style={isSelected ? {
                                  borderColor: theme.primaryColor,
                                  backgroundColor: theme.primaryColor,
                                } : {}}
                              >
                                {valueLabel}
                              </button>
                            )
                          })}
                          {isOptionSelected && (
                            <button
                              onClick={() => {
                                const updated = { ...selectedOptionValues }
                                delete updated[option.id]
                                setSelectedOptionValues(updated)
                              }}
                              className="text-xs text-gray-500 hover:text-gray-700 underline"
                            >
                              נקה
                            </button>
                          )}
                        </div>
                        {!isOptionSelected && (
                          <p className="text-red-600 text-sm mt-2 font-medium flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4" />
                            יש לבחור {option.name}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Quantity in Modal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  כמות
                </label>
                <div className="flex items-center gap-2">
                  {(() => {
                    // חישוב המלאי הזמין
                    let availableQty = product.inventoryQty
                    if (selectedVariant && product.variants) {
                      const variant = product.variants.find((v) => v.id === selectedVariant)
                      if (variant) {
                        availableQty = variant.inventoryQty
                      }
                    }
                    const maxQty = product.availability === "OUT_OF_STOCK" ? 0 : availableQty
                    
                    return (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 1
                            setQuantity(Math.max(1, Math.min(maxQty || 1, newQty)))
                          }}
                          className="w-20 text-center"
                          min="1"
                          max={maxQty || 1}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.min(maxQty || 1, quantity + 1))}
                          disabled={quantity >= (maxQty || 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        {maxQty > 0 && (
                          <span className="text-sm text-gray-500">
                            (זמין: {maxQty})
                          </span>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4">
                <button
                  onClick={async () => {
                    const success = await handleAddToCart(true)
                    if (success) {
                      setShowQuickBuy(false)
                    }
                  }}
                  disabled={product.availability === "OUT_OF_STOCK"}
                  className="w-full text-white rounded-sm h-11 px-8 font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{ backgroundColor: theme.primaryColor || "#000000" }}
                >
                  <ShoppingCart className="w-5 h-5 ml-2" />
                  הוסף לעגלה
                </button>
                <Button
                  onClick={async () => {
                    const success = await handleAddToCart(false)
                    if (success) {
                      setShowQuickBuy(false)
                      router.push(`/shop/${slug}/checkout`)
                    }
                  }}
                  disabled={product.availability === "OUT_OF_STOCK"}
                  variant="outline"
                  className="w-full border-2"
                  style={{
                    borderColor: theme.primaryColor,
                    color: theme.primaryColor,
                  }}
                  size="lg"
                >
                  קנה עכשיו
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Page Designer */}
      <ProductPageDesigner
        open={showDesigner}
        onOpenChange={setShowDesigner}
        onLayoutChange={(layout) => {
          setGalleryLayout(layout)
          saveGalleryLayout(layout)
        }}
        currentLayout={galleryLayout}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>מחיקת מוצר</DialogTitle>
            <DialogDescription>
              האם אתה בטוח שברצונך למחוק את המוצר "{product?.name}"? פעולה זו לא ניתנת לביטול.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "מוחק..." : "מחק"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  )
}

