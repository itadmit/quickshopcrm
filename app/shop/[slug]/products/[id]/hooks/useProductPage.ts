import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
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
import { Product, GalleryLayout } from "../types"
import { ProductPageElement } from "@/components/storefront/ProductPageLayoutDesigner"

interface UseProductPageProps {
  slug: string
  productId: string
  product: Product
  initialGalleryLayout: GalleryLayout
  initialProductPageLayout: { elements: ProductPageElement[] } | null
  autoOpenCart: boolean
}

export function useProductPage({
  slug,
  productId,
  product: initialProduct,
  initialGalleryLayout,
  initialProductPageLayout,
  autoOpenCart: initialAutoOpenCart,
}: UseProductPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [product, setProduct] = useState<Product>(initialProduct)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<string, string>>({})
  const [cartOpenCallback, setCartOpenCallback] = useState<(() => void) | null>(null)
  const [cartRefreshKey, setCartRefreshKey] = useState(0)
  const [galleryLayout, setGalleryLayout] = useState<GalleryLayout>(initialGalleryLayout)
  const [productPageLayout, setProductPageLayout] = useState<{ elements: ProductPageElement[] } | null>(initialProductPageLayout)
  const [isEditingLayout, setIsEditingLayout] = useState(false)
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false)
  const [autoOpenCart] = useState(initialAutoOpenCart)
  const { trackEvent } = useTracking()

  const { addToCart, isAddingToCart } = useAddToCart({
    slug,
    customerId,
    autoOpenCart,
    onSuccess: () => {
      fetchCartCount()
      setCartRefreshKey(prev => prev + 1)
    }
  })

  // עדכון product כאשר initialProduct משתנה
  useEffect(() => {
    setProduct(initialProduct)
    // איפוס תמונה נבחרת למוצר חדש
    setSelectedImage(0)
  }, [initialProduct])

  // טעינת customer ID מ-localStorage
  useEffect(() => {
    const customerData = localStorage.getItem(`storefront_customer_${slug}`)
    if (customerData) {
      try {
        const parsed = JSON.parse(customerData)
        setCustomerId(parsed.id)
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
    if (!product || typeof document === 'undefined') return

    const title = product.seoTitle || product.name
    const description = product.seoDescription || product.description || ""
    const image = product.images && product.images.length > 0 ? product.images[0] : ""
    
    // עדכון title
    document.title = title
    
    trackPageView(trackEvent, `/shop/${slug}/products/${productId}`, title)
    
    // עדכון meta tags - רק עדכון, לא הסרה ב-cleanup
    // זה בטוח יותר ולא גורם לבעיות עם removeChild
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      if (typeof document === 'undefined' || !document.head) return
      
      try {
        const attribute = isProperty ? 'property' : 'name'
        let meta = document.querySelector(`meta[${attribute}="${name}"]`)
        if (!meta) {
          meta = document.createElement('meta')
          meta.setAttribute(attribute, name)
          document.head.appendChild(meta)
        }
        if (meta) {
          meta.setAttribute('content', content)
        }
      } catch (error) {
        // התעלם משגיאות - לא קריטי
        console.debug('Error updating meta tag:', name, error)
      }
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

    // אין cleanup - נשאיר את ה-meta tags כי הם יתעדכנו במוצר הבא
    // זה מונע בעיות עם removeChild כשהקומפוננטה מתבטלת
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

  return {
    product,
    selectedImage,
    setSelectedImage,
    quantity,
    setQuantity,
    selectedVariant,
    setSelectedVariant,
    isInWishlist,
    wishlistItemId,
    customerId,
    cartItemCount,
    selectedOptionValues,
    setSelectedOptionValues,
    cartOpenCallback,
    cartRefreshKey,
    galleryLayout,
    setGalleryLayout,
    productPageLayout,
    setProductPageLayout,
    isEditingLayout,
    setIsEditingLayout,
    isProcessingCheckout,
    setIsProcessingCheckout,
    isAddingToCart,
    handleOpenCart,
    fetchCartCount,
    handleToggleWishlist,
    handleAddToCart,
    saveProductPageLayout,
    saveGalleryLayout,
  }
}

