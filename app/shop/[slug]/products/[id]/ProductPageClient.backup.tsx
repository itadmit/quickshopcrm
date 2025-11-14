"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  AlertCircle,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Pencil,
  Palette,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { ProductCard } from "@/components/storefront/ProductCard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getThemeStyles } from "@/hooks/useShopTheme"
import { useAddToCart } from "@/hooks/useAddToCart"
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
import { ProductPageElement, ProductPageElementType } from "@/components/storefront/ProductPageLayoutDesigner"
import { EditableProductElement } from "@/components/storefront/EditableProductElement"
import { cn } from "@/lib/utils"
import { AdminBar } from "@/components/storefront/AdminBar"
import { LoadingOverlay } from "@/components/storefront/LoadingOverlay"

type GalleryLayout = "standard" | "right-side" | "left-side" | "masonry" | "fixed"

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  comparePrice: number | null
  sku?: string | null
  images: string[]
  availability: string
  inventoryQty: number
  seoTitle?: string | null
  seoDescription?: string | null
  variants?: Array<{
    id: string
    name: string
    price: number | null
    sku?: string | null
    inventoryQty: number
    option1Value?: string | null
    option2Value?: string | null
    option3Value?: string | null
  }>
  options?: Array<{
    id: string
    name: string
    values: Array<{ id: string; label: string; metadata?: any }> | string[]
  }>
}

interface ProductPageClientProps {
  slug: string
  productId: string
  shop: any
  product: Product
  reviews: any[]
  averageRating: number
  totalReviews: number
  relatedProducts: any[]
  galleryLayout: GalleryLayout
  productPageLayout: { elements: ProductPageElement[] } | null
  theme: any
  navigation: any
  isAdmin: boolean
  autoOpenCart: boolean
}

export function ProductPageClient({
  slug,
  productId,
  shop,
  product: initialProduct,
  reviews: initialReviews,
  averageRating: initialAverageRating,
  totalReviews: initialTotalReviews,
  relatedProducts: initialRelatedProducts,
  galleryLayout: initialGalleryLayout,
  productPageLayout: initialProductPageLayout,
  theme,
  navigation,
  isAdmin,
  autoOpenCart: initialAutoOpenCart,
}: ProductPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [product] = useState<Product>(initialProduct)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [reviews] = useState<any[]>(initialReviews)
  const [averageRating] = useState(initialAverageRating)
  const [totalReviews] = useState(initialTotalReviews)
  const [relatedProducts] = useState<any[]>(initialRelatedProducts)
  const [showReviews, setShowReviews] = useState(false)
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [showQuickBuy, setShowQuickBuy] = useState(false)
  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<string, string>>({})
  const [cartOpenCallback, setCartOpenCallback] = useState<(() => void) | null>(null)
  const [cartRefreshKey, setCartRefreshKey] = useState(0)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [showDesigner, setShowDesigner] = useState(false)
  const [galleryLayout, setGalleryLayout] = useState<GalleryLayout>(initialGalleryLayout)
  const [productPageLayout, setProductPageLayout] = useState<{ elements: ProductPageElement[] } | null>(initialProductPageLayout)
  const [isEditingLayout, setIsEditingLayout] = useState(false)
  const { trackEvent } = useTracking()
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false)
  const [autoOpenCart] = useState(initialAutoOpenCart)
  
  // 🎯 המערכת המרכזית היחידה להוספה לעגלה
  const { addToCart, isAddingToCart } = useAddToCart({
    slug,
    customerId,
    autoOpenCart,
    onSuccess: () => {
      fetchCartCount()
      setCartRefreshKey(prev => prev + 1)
    }
  })

  // טעינת customer ID מ-localStorage
  useEffect(() => {
    const customerData = localStorage.getItem(`storefront_customer_${slug}`)
    if (customerData) {
      try {
        const parsed = JSON.parse(customerData)
        setCustomerId(parsed.id)
        // בדיקת wishlist רק אם יש customer
        if (parsed.id) {
          checkWishlist(parsed.id)
        }
      } catch (error) {
        console.error("Error parsing customer data:", error)
      }
    }
  }, [slug])

  // אתחול variant ו-options
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      if (!product.options || product.options.length === 0) {
        setSelectedVariant(product.variants[0].id)
      } else {
        const initialOptions: Record<string, string> = {}
        let hasDefaults = false
        
        if ((product as any).customFields && typeof (product as any).customFields === 'object') {
          const customFields = (product as any).customFields as any
          if (customFields.defaultOptionValues) {
            hasDefaults = true
            Object.assign(initialOptions, customFields.defaultOptionValues)
          }
        }
        
        if (!hasDefaults) {
          product.options.forEach((option: any) => {
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
  }, [product])

  // טעינת cart count
  useEffect(() => {
    fetchCartCount()
  }, [slug])

  // בדיקה אם אנחנו במצב עריכה דרך query params
  useEffect(() => {
    const editMode = searchParams.get("edit_layout") === "true"
    setIsEditingLayout(editMode)
  }, [searchParams])

  // קריאת preview_layout מ-query params
  useEffect(() => {
    const previewLayout = searchParams.get("preview_layout") as GalleryLayout | null
    if (previewLayout && ["standard", "right-side", "left-side", "masonry", "fixed"].includes(previewLayout)) {
      setGalleryLayout(previewLayout)
    }
  }, [searchParams])

  const handleOpenCart = useCallback((callback: () => void) => {
    setCartOpenCallback(() => callback)
  }, [])

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

      const response = await fetch(`/api/storefront/${slug}/cart`, { 
        headers,
        next: { revalidate: 0 },
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

  // עדכון meta tags ל-SEO + PageView event
  useEffect(() => {
    if (!product) return

    const title = product.seoTitle || product.name
    const description = product.seoDescription || product.description || ""
    const image = product.images && product.images.length > 0 ? product.images[0] : ""
    
    document.title = title
    
    trackPageView(trackEvent, `/shop/${slug}/products/${productId}`, title)
    
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
  }, [product?.id, slug, productId, trackEvent])

  // ViewContent event
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
  }, [product?.id, selectedVariant, trackEvent])

  // עדכון selectedVariant לפי selectedOptionValues
  useEffect(() => {
    if (product && product.variants && product.options && product.variants.length > 0) {
      const selectedLabels: string[] = []
      
      product.options?.forEach((option: any) => {
        const selectedValueId = selectedOptionValues[option.id]
        if (selectedValueId !== undefined) {
          if (option.values && Array.isArray(option.values)) {
            const valueObj = option.values.find((v: any) => {
              if (typeof v === 'string') return v === selectedValueId
              return v.id === selectedValueId || v.label === selectedValueId
            })
            if (valueObj) {
              const label = typeof valueObj === 'string' ? valueObj : (valueObj.label || valueObj.id)
              if (label) selectedLabels.push(label)
            }
          }
        }
      })
      
      const matchingVariant = product.variants.find((variant: any) => {
        const variantValues = [
          variant.option1Value,
          variant.option2Value,
          variant.option3Value,
        ].filter(Boolean).map(v => v?.toString().trim())
        
        if (selectedLabels.length === 0) return false
        
        const isMatch = (label: string, value: string): boolean => {
          const labelLower = label.toLowerCase().trim()
          const valueLower = value.toLowerCase().trim()
          
          if (labelLower === valueLower) return true
          
          const isNumeric = /^\d+$/.test(label.trim()) || /^\d+$/.test(value.trim())
          if (isNumeric) {
            return label.trim() === value.trim()
          }
          
          return valueLower.includes(labelLower) || labelLower.includes(valueLower)
        }
        
        const allLabelsMatch = selectedLabels.every(label => {
          return variantValues.some(v => isMatch(label, v))
        })
        
        const allVariantValuesMatch = variantValues.every(v => {
          return selectedLabels.some(label => isMatch(label, v))
        })
        
        return allLabelsMatch && allVariantValuesMatch && variantValues.length === selectedLabels.length
      })
      
      if (matchingVariant && matchingVariant.id !== selectedVariant) {
        setSelectedVariant(matchingVariant.id)
        
        if (product) {
          const variantPrice = matchingVariant.price || product.price
          trackSelectVariant(trackEvent, product, {
            id: matchingVariant.id,
            name: matchingVariant.name,
            price: variantPrice,
            sku: matchingVariant.sku || null,
          })
        }
      } else if (!matchingVariant && product.variants.length > 0 && Object.keys(selectedOptionValues).length === 0) {
        setSelectedVariant(product.variants[0].id)
      }
    }
  }, [selectedOptionValues, product?.id, trackEvent])

  useEffect(() => {
    if (!product) return
    
    let availableQty = product.inventoryQty
    if (selectedVariant && product.variants) {
      const variant = product.variants.find((v) => v.id === selectedVariant)
      if (variant) {
        availableQty = variant.inventoryQty
      }
    }
    const maxQty = product.availability === "OUT_OF_STOCK" ? 0 : availableQty
    
    setQuantity((currentQty) => {
      if (currentQty > maxQty && maxQty > 0) {
        return maxQty
      } else if (maxQty === 0 && currentQty > 0) {
        return 1
      }
      return currentQty
    })
  }, [selectedVariant, product?.id])

  const handleToggleWishlist = async () => {
    if (!customerId) {
      router.push(`/shop/${slug}/login`)
      return
    }

    if (isInWishlist && wishlistItemId) {
      try {
        const response = await fetch(
          `/api/storefront/${slug}/wishlist?itemId=${wishlistItemId}&customerId=${customerId}`,
          { method: "DELETE" }
        )
        if (response.ok) {
          setIsInWishlist(false)
          setWishlistItemId(null)
          
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

    const currentPrice = selectedVariant && product.variants
      ? product.variants.find((v) => v.id === selectedVariant)?.price || product.price
      : product.price

    const success = await addToCart({
      productId: product.id,
      variantId: selectedVariant,
      quantity,
      productName: product.name,
      productData: {
        availability: product.availability,
        inventoryQty: product.inventoryQty,
        variants: product.variants?.map(v => ({
          id: v.id,
          inventoryQty: v.inventoryQty
        }))
      }
    })

    if (success) {
      trackAddToCart(trackEvent, {
        id: product.id,
        name: product.name,
        price: currentPrice,
        sku: product.sku || null,
      }, quantity, selectedVariant || undefined)
      
      if (autoOpenCart && cartOpenCallback) {
        setTimeout(() => {
          cartOpenCallback()
        }, 300)
      }
    }

    return success
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

  // פונקציה לחישוב aspect ratio לפי ההגדרות
  const getAspectRatioClass = () => {
    const ratio = theme?.productImageRatio || "9:16"
    switch (ratio) {
      case "1:1":
        return "aspect-square"
      case "3:4":
        return "aspect-[3/4]"
      case "9:16":
        return "aspect-[9/16]"
      default:
        return "aspect-square"
    }
  }

  // פונקציה לחישוב border radius לפי ההגדרות
  const getImageBorderRadius = () => {
    const radius = theme?.productImageBorderRadius || 8
    return `${radius}px`
  }

  // פונקציה לחישוב צבע תג הנחה
  const getDiscountBadgeColor = () => {
    const color = theme?.productDiscountBadgeColor || "red"
    const colorMap: Record<string, string> = {
      red: "bg-red-500",
      green: "bg-green-500",
      blue: "bg-blue-500",
      orange: "bg-orange-500",
      black: "bg-black",
      white: "bg-white text-black",
      transparent: "bg-transparent",
    }
    return colorMap[color] || colorMap.red
  }

  // פונקציה לחישוב צבע כפתורים על התמונה
  const getImageButtonColor = () => {
    const color = theme?.productImageButtonsColor || "white"
    return color === "white" ? "text-white" : "text-black"
  }

  // פונקציה לחישוב צבע חצי ניווט
  const getGalleryArrowColor = () => {
    const color = theme?.productGalleryArrowsColor || "white"
    return color === "white" ? "text-white" : "text-black"
  }

  const renderGallery = () => {
    if (!product || !product.images || product.images.length === 0) {
      return (
        <div className={`${getAspectRatioClass()} bg-gray-100 rounded-lg flex items-center justify-center`} style={{ borderRadius: getImageBorderRadius() }}>
          <Package className="w-32 h-32 text-gray-400" />
        </div>
      )
    }

    const borderRadius = getImageBorderRadius()
    const showArrows = theme?.productShowGalleryArrows !== false
    const arrowColor = getGalleryArrowColor()

    switch (galleryLayout) {
      case "standard":
        return (
          <div className="space-y-4">
            <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100 relative`} style={{ borderRadius }}>
              <img
                src={product.images[selectedImage]}
                alt={product.seoTitle || product.name}
                className="w-full h-full object-cover"
              />
              {/* תג הנחה */}
              {theme?.productShowDiscountBadge && product.comparePrice && product.comparePrice > product.price && (
                <div className={`absolute top-2 right-2 ${getDiscountBadgeColor()} px-2 py-1 text-xs font-bold ${theme?.productDiscountBadgeRounded ? 'rounded' : ''}`}>
                  {Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
                </div>
              )}
              {/* כפתורים על התמונה */}
              {product.images.length > 1 && showArrows && (
                <>
                  <button
                    onClick={() => setSelectedImage((prev) => (prev > 0 ? prev - 1 : product.images.length - 1))}
                    className={`absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2 ${arrowColor} transition-all`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImage((prev) => (prev < product.images.length - 1 ? prev + 1 : 0))}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2 ${arrowColor} transition-all`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            {/* תמונות קטנות במובייל */}
            {product.images.length > 1 && (theme?.productShowMobileThumbs !== false || window.innerWidth >= 1024) && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`${getAspectRatioClass()} overflow-hidden border-2 transition-all`}
                    style={{
                      borderRadius,
                      borderColor: selectedImage === index ? theme.primaryColor : "#e5e7eb",
                    }}
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
              <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100 relative`} style={{ borderRadius }}>
                <img
                  src={product.images[selectedImage]}
                  alt={product.seoTitle || product.name}
                  className="w-full h-full object-cover"
                />
                {theme?.productShowDiscountBadge && product.comparePrice && product.comparePrice > product.price && (
                  <div className={`absolute top-2 right-2 ${getDiscountBadgeColor()} px-2 py-1 text-xs font-bold ${theme?.productDiscountBadgeRounded ? 'rounded' : ''}`}>
                    {Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
                  </div>
                )}
              </div>
            </div>
            {product.images.length > 1 && (
              <div className="flex flex-col gap-2 w-20">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`${getAspectRatioClass()} overflow-hidden border-2 transition-all`}
                    style={{
                      borderRadius,
                      borderColor: selectedImage === index ? theme.primaryColor : "#e5e7eb",
                    }}
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
                    className={`${getAspectRatioClass()} overflow-hidden border-2 transition-all`}
                    style={{
                      borderRadius,
                      borderColor: selectedImage === index ? theme.primaryColor : "#e5e7eb",
                    }}
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
              <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100 relative`} style={{ borderRadius }}>
                <img
                  src={product.images[selectedImage]}
                  alt={product.seoTitle || product.name}
                  className="w-full h-full object-cover"
                />
                {theme?.productShowDiscountBadge && product.comparePrice && product.comparePrice > product.price && (
                  <div className={`absolute top-2 right-2 ${getDiscountBadgeColor()} px-2 py-1 text-xs font-bold ${theme?.productDiscountBadgeRounded ? 'rounded' : ''}`}>
                    {Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case "masonry":
        return (
          <>
            <div className="hidden lg:block space-y-2">
              {product.images.map((image, index) => {
                const isLarge = index % 3 === 0
                if (isLarge) {
                  return (
                    <div key={index} className="w-full">
                      <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100`} style={{ borderRadius }}>
                        <img
                          src={image}
                          alt={`${product.seoTitle || product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )
                } else {
                  const groupIndex = Math.floor((index - 1) / 3)
                  const positionInGroup = (index - 1) % 3
                  if (positionInGroup === 0) {
                    const nextImage = product.images[index + 1]
                    return (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100`} style={{ borderRadius }}>
                          <img
                            src={image}
                            alt={`${product.seoTitle || product.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {nextImage && (
                          <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100`} style={{ borderRadius }}>
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
                  return null
                }
              })}
            </div>
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
                  <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100`} style={{ borderRadius }}>
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
            <div className="hidden lg:block space-y-4">
              {product.images.map((image, index) => (
                <div key={index} className={`${getAspectRatioClass()} overflow-hidden bg-gray-100`} style={{ borderRadius }}>
                  <img
                    src={image}
                    alt={`${product.seoTitle || product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="lg:hidden flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {product.images.map((image, index) => (
                <div key={index} className="flex-shrink-0 w-full snap-center">
                  <div className={`${getAspectRatioClass()} overflow-hidden bg-gray-100`} style={{ borderRadius }}>
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

  // פונקציות לניהול layout
  const moveElement = (elementId: string, direction: "up" | "down") => {
    if (!productPageLayout) return
    
    const newElements = [...productPageLayout.elements]
    const index = newElements.findIndex((el) => el.id === elementId)
    if (index === -1) return

    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newElements.length) return

    const temp = newElements[index].position
    newElements[index].position = newElements[newIndex].position
    newElements[newIndex].position = temp

    const sortedElements = newElements.sort((a, b) => a.position - b.position)
    saveProductPageLayout({ elements: sortedElements })
  }

  const toggleElementVisibility = (elementId: string) => {
    if (!productPageLayout) return
    
    const newElements = productPageLayout.elements.map((el) =>
      el.id === elementId ? { ...el, visible: !el.visible } : el
    )
    saveProductPageLayout({ elements: newElements })
  }

  const saveProductPageLayout = async (layout: { elements: ProductPageElement[] }) => {
    try {
      const response = await fetch(`/api/storefront/${slug}/product-page-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements: layout.elements }),
      })
      if (response.ok) {
        const data = await response.json()
        setProductPageLayout(data.layout)
      }
    } catch (error) {
      console.error("Error saving layout:", error)
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

  const getElementStyle = (element: ProductPageElement): React.CSSProperties => {
    const style = element.config?.style || {}
    if (!style || Object.keys(style).length === 0) {
      return {}
    }
    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      textAlign: style.textAlign,
      marginTop: style.marginTop !== undefined ? `${style.marginTop}px` : undefined,
      marginBottom: style.marginBottom !== undefined ? `${style.marginBottom}px` : undefined,
      paddingTop: style.paddingTop !== undefined ? `${style.paddingTop}px` : undefined,
      paddingBottom: style.paddingBottom !== undefined ? `${style.paddingBottom}px` : undefined,
      color: style.color,
    }
  }

  const renderElement = (element: ProductPageElement, index?: number) => {
    if (!element.visible && !isEditingLayout) return null

    const currentIndex = productPageLayout?.elements.findIndex(el => el.id === element.id) ?? index ?? 0
    const sortedElements = productPageLayout?.elements.sort((a, b) => a.position - b.position) || []
    const canMoveUp = currentIndex > 0
    const canMoveDown = currentIndex < sortedElements.length - 1

    const elementStyle = getElementStyle(element)

    const elementContent = (() => {
      if (!element.visible && isEditingLayout) {
        return <div className="p-4 text-gray-400 text-center">אלמנט מוסתר</div>
      }

      switch (element.type) {
      case "product-gallery":
        return (
          <div key={element.id} className={cn(
            galleryLayout === "masonry" || galleryLayout === "fixed" 
              ? "order-1 lg:order-2" 
              : galleryLayout === "left-side"
              ? "order-1 lg:order-1"
              : galleryLayout === "right-side"
              ? "order-1 lg:order-2"
              : "order-1"
          )} style={elementStyle}>
            {renderGallery()}
          </div>
        )

      case "product-name":
        return (
          <div key={element.id} style={elementStyle}>
            <h1 className="text-4xl font-bold text-gray-900 mb-4" style={elementStyle}>{product.seoTitle || product.name}</h1>
          </div>
        )

      case "product-price":
        const priceStyle = {
          ...elementStyle,
          color: element.config?.style?.priceColor || elementStyle.color || undefined,
        }
        const comparePriceStyle = {
          fontSize: element.config?.style?.comparePriceFontSize 
            ? `${element.config.style.comparePriceFontSize}px` 
            : "1rem",
          color: element.config?.style?.comparePriceColor || undefined,
        }
        return (
          <div key={element.id} className="flex items-baseline gap-4 mb-6" style={elementStyle}>
            {product.comparePrice && (
              <span className="line-through text-gray-500" style={comparePriceStyle}>
                ₪{product.comparePrice.toFixed(2)}
              </span>
            )}
            <span className="text-3xl font-bold" style={priceStyle}>
              ₪{currentPrice.toFixed(2)}
            </span>
          </div>
        )

      case "product-description":
        return product.description ? (
          <div key={element.id} className="mb-6" style={elementStyle}>
            {element.config?.title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{element.config.title}</h3>
            )}
            <p className="text-gray-700 whitespace-pre-line" style={elementStyle}>{product.description}</p>
          </div>
        ) : null

      case "product-variants":
        return product.options && product.options.length > 0 ? (
          <div key={element.id} className="space-y-4" style={elementStyle}>
            {product.options.map((option) => {
              const isOptionSelected = selectedOptionValues[option.id] !== undefined
              return (
                <div key={option.id}>
                  <label className="block text-sm font-semibold text-gray-900 mb-3" style={elementStyle}>
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
        ) : null

      case "product-quantity":
        return (
          <div key={element.id} style={elementStyle}>
            <label className="block text-sm font-semibold text-gray-900 mb-3" style={elementStyle}>
              כמות
            </label>
            <div className="flex items-center gap-2 w-fit">
              {(() => {
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
                    {theme?.productShowQuantityButtons !== false && (
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
                      </>
                    )}
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
        )

      case "product-buttons":
        return (
          <div key={element.id} className="space-y-3">
            <button
              onClick={() => handleAddToCart(true)}
              disabled={product.availability === "OUT_OF_STOCK" || isAddingToCart}
              className="w-full text-white rounded-sm h-11 px-8 font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              style={{ backgroundColor: theme.primaryColor || "#000000" }}
            >
              {isAddingToCart ? (
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
              ) : (
                <ShoppingCart className="w-5 h-5 ml-2" />
              )}
              {isAddingToCart ? "מוסיף..." : "הוסף לעגלה"}
            </button>
            <Button
              onClick={async () => {
                setIsProcessingCheckout(true)
                const success = await handleAddToCart(false)
                if (success) {
                  router.push(`/shop/${slug}/checkout`)
                } else {
                  setIsProcessingCheckout(false)
                }
              }}
              disabled={product.availability === "OUT_OF_STOCK" || isProcessingCheckout}
              variant="outline"
              className="w-full border-2 rounded-sm hover:bg-gray-50"
              style={{
                borderColor: theme.primaryColor,
                color: theme.primaryColor,
              }}
              size="lg"
            >
              {isProcessingCheckout ? (
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
              ) : null}
              קנה עכשיו
            </Button>
            <div className="flex gap-2">
              {theme?.productShowFavoriteButton !== false && (
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
              )}
              {theme?.productShowShareButton !== false && (
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: product.name,
                        text: product.description || "",
                        url: window.location.href,
                      })
                    } else {
                      navigator.clipboard.writeText(window.location.href)
                      toast({
                        title: "הקישור הועתק",
                        description: "הקישור הועתק ללוח",
                      })
                    }
                  }}
                  className="flex-1 rounded-sm"
                >
                  <MoreVertical className="w-5 h-5 ml-2" />
                  שתף
                </Button>
              )}
            </div>
          </div>
        )

      case "product-reviews":
        return totalReviews > 0 ? (
          <div key={element.id} className="mb-6 p-4 bg-gray-50 rounded-lg" style={elementStyle}>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900" style={elementStyle}>{averageRating.toFixed(1)}</div>
                {renderStars(Math.round(averageRating))}
                <div className="text-sm text-gray-600 mt-1" style={elementStyle}>{totalReviews} ביקורות</div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowReviews(!showReviews)}
              >
                {showReviews ? "הסתר ביקורות" : "הצג ביקורות"}
              </Button>
            </div>
          </div>
        ) : null

      case "product-related":
        return relatedProducts.length > 0 ? (
          <div 
            key={element.id} 
            className="mt-16 border-t border-gray-200 pt-12" 
            style={{
              ...elementStyle,
              backgroundColor: theme?.productRelatedBgColor || "#f8f9fa",
            }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-8" style={elementStyle}>מוצרים קשורים</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                  slug={slug}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        ) : null

      case "custom-text":
        return element.config?.content ? (
          <div key={element.id} className="mb-6" style={elementStyle}>
            {element.config.title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-2" style={elementStyle}>{element.config.title}</h3>
            )}
            <p className="text-gray-700 whitespace-pre-line" style={elementStyle}>{element.config.content}</p>
          </div>
        ) : null

      case "custom-accordion":
        return element.config?.content ? (
          <div key={element.id} className="mb-6" style={elementStyle}>
            <details className="group">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <span className="font-semibold text-gray-900" style={elementStyle}>{element.config.title || "פרטים נוספים"}</span>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-open:rotate-90 transition-transform" />
                </div>
              </summary>
              <div className="p-4 text-gray-700 whitespace-pre-line" style={elementStyle}>
                {element.config.content}
              </div>
            </details>
          </div>
        ) : null

      case "custom-html":
        return element.config?.html ? (
          <div key={element.id} className="mb-6" style={elementStyle}>
            {element.config.title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-2" style={elementStyle}>{element.config.title}</h3>
            )}
            <div dangerouslySetInnerHTML={{ __html: element.config.html }} />
          </div>
        ) : null

      default:
        return null
      }
    })()

    if (isEditingLayout) {
      const elementLabels: Record<ProductPageElementType, string> = {
        "product-name": "שם מוצר",
        "product-price": "מחיר",
        "product-description": "תיאור מוצר",
        "product-gallery": "גלריה",
        "product-variants": "וריאציות",
        "product-quantity": "כמות",
        "product-buttons": "כפתורים",
        "product-reviews": "ביקורות",
        "product-related": "מוצרים קשורים",
        "custom-text": "טקסט מותאם",
        "custom-accordion": "אקורדיון",
        "custom-html": "HTML מותאם",
      }

      return (
        <EditableProductElement
          key={element.id}
          elementId={element.id}
          elementName={elementLabels[element.type]}
          isEditing={isEditingLayout}
          onMoveUp={() => moveElement(element.id, "up")}
          onMoveDown={() => moveElement(element.id, "down")}
          onToggleVisibility={() => toggleElementVisibility(element.id)}
          onOpenSettings={() => {
            if (window.parent !== window) {
              window.parent.postMessage({
                type: "openElementSettings",
                elementId: element.id
              }, window.location.origin)
            } else {
              router.push(`/customize?page=product&id=${productId}&element=${element.id}`)
            }
          }}
          isVisible={element.visible}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        >
          {elementContent}
        </EditableProductElement>
      )
    }

    return elementContent
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

  const layoutElements = productPageLayout?.elements || [
    { id: "gallery", type: "product-gallery" as ProductPageElementType, visible: true, position: 0 },
    { id: "name", type: "product-name" as ProductPageElementType, visible: true, position: 1 },
    { id: "price", type: "product-price" as ProductPageElementType, visible: true, position: 2 },
    { id: "description", type: "product-description" as ProductPageElementType, visible: true, position: 3 },
    { id: "variants", type: "product-variants" as ProductPageElementType, visible: true, position: 4 },
    { id: "quantity", type: "product-quantity" as ProductPageElementType, visible: true, position: 5 },
    { id: "buttons", type: "product-buttons" as ProductPageElementType, visible: true, position: 6 },
    { id: "reviews", type: "product-reviews" as ProductPageElementType, visible: true, position: 7 },
    { id: "related", type: "product-related" as ProductPageElementType, visible: true, position: 8 },
  ]

  const visibleElements = isEditingLayout 
    ? layoutElements 
    : layoutElements.filter(el => el.visible !== false)
  
  const galleryElement = visibleElements.find(el => el.type === "product-gallery")
  const relatedElement = visibleElements.find(el => el.type === "product-related")
  const otherElements = visibleElements.filter(el => el.type !== "product-gallery" && el.type !== "product-related")

  return (
    <div className="min-h-screen bg-white" dir="rtl" style={getThemeStyles(theme)}>
      <LoadingOverlay 
        isLoading={isAddingToCart} 
        message="מוסיף לעגלה..."
      />
      <LoadingOverlay 
        isLoading={isProcessingCheckout} 
        message="מעביר לתשלום..."
      />

      <StorefrontHeader
        slug={slug}
        shop={shop}
        cartItemCount={cartItemCount}
        onCartUpdate={fetchCartCount}
        onOpenCart={handleOpenCart}
        cartRefreshKey={cartRefreshKey}
        navigation={navigation}
        theme={theme}
      />

      {/* Sticky Add to Cart במובייל */}
      {theme?.productStickyAddToCart && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-4 shadow-lg">
          <button
            onClick={() => handleAddToCart(true)}
            disabled={product.availability === "OUT_OF_STOCK" || isAddingToCart}
            className="w-full text-white rounded-sm h-12 px-8 font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{ backgroundColor: theme.primaryColor || "#000000" }}
          >
            {isAddingToCart ? (
              <Loader2 className="w-5 h-5 ml-2 animate-spin" />
            ) : (
              <ShoppingCart className="w-5 h-5 ml-2" />
            )}
            {isAddingToCart ? "מוסיף..." : "הוסף לעגלה"}
          </button>
        </div>
      )}

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
          
          <Button
            onClick={() => {
              router.push(`/customize?page=product&id=${productId}`)
            }}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24 lg:pb-12">
        <div className={cn(
          "grid gap-12",
          galleryLayout === "masonry" || galleryLayout === "fixed"
            ? "grid-cols-1 lg:grid-cols-2"
            : "grid-cols-1 lg:grid-cols-2"
        )}>
          {/* רינדור גלריה */}
          {galleryElement && renderElement(galleryElement)}

          {/* Product Info - רינדור שאר האלמנטים */}
          <div className={cn(
            "space-y-6",
            galleryLayout === "masonry" || galleryLayout === "fixed" 
              ? "order-2 lg:order-1 lg:sticky lg:top-4 lg:h-fit" 
              : galleryLayout === "left-side"
              ? "order-2 lg:order-2"
              : galleryLayout === "right-side"
              ? "order-2 lg:order-1"
              : "order-2"
          )}>
            {otherElements
              .sort((a, b) => a.position - b.position)
              .map((element) => renderElement(element))}
          </div>
        </div>

        {/* Reviews Section */}
        {showReviews && !layoutElements.find(el => el.type === "product-reviews") && (
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

        {/* רינדור מוצרים קשורים */}
        {relatedElement && renderElement(relatedElement)}
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
                        {theme?.productShowQuantityButtons !== false && (
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
                          </>
                        )}
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
                  disabled={product.availability === "OUT_OF_STOCK" || isAddingToCart}
                  className="w-full text-white rounded-sm h-11 px-8 font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{ backgroundColor: theme.primaryColor || "#000000" }}
                >
                  {isAddingToCart ? (
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-5 h-5 ml-2" />
                  )}
                  {isAddingToCart ? "מוסיף..." : "הוסף לעגלה"}
                </button>
                <Button
                  onClick={async () => {
                    setIsProcessingCheckout(true)
                    const success = await handleAddToCart(false)
                    if (success) {
                      setShowQuickBuy(false)
                      router.push(`/shop/${slug}/checkout`)
                    } else {
                      setIsProcessingCheckout(false)
                    }
                  }}
                  disabled={product.availability === "OUT_OF_STOCK" || isProcessingCheckout}
                  variant="outline"
                  className="w-full border-2"
                  style={{
                    borderColor: theme.primaryColor,
                    color: theme.primaryColor,
                  }}
                  size="lg"
                >
                  {isProcessingCheckout ? (
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  ) : null}
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

      {/* Admin Bar */}
      <AdminBar slug={slug} pageType="product" productSlug={productId} />
    </div>
  )
}

