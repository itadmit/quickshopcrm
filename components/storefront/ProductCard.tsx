"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Heart } from "lucide-react"
import { useState, useEffect } from "react"
import { AddToCartButton } from "./AddToCartButton"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { getProductPrice, formatProductPrice, formatComparePrice } from "@/lib/product-price"

interface ProductVariant {
  id: string
  name: string
  price: number
  comparePrice: number | null
  inventoryQty: number | null
  sku: string | null
  options?: Record<string, string>
  option1?: string | null
  option1Value?: string | null
  option2?: string | null
  option2Value?: string | null
  option3?: string | null
  option3Value?: string | null
}

interface ProductOption {
  id: string
  name: string
  type: string
  values: any
  position: number
}

interface ProductCardProps {
  product: {
    id: string
    name: string
    slug: string
    price: number
    comparePrice: number | null
    images: string[]
    availability: string
    description?: string | null
    inventoryQty?: number
    variants?: ProductVariant[]
    options?: ProductOption[]
  }
  slug: string
  showWishlist?: boolean
  onWishlistToggle?: (productId: string) => void
  isInWishlist?: boolean
  customerId?: string | null
  onCartUpdate?: () => void
  showQuickAdd?: boolean
  theme?: any
  autoOpenCart?: boolean
  onCartOpen?: () => void
}

export function ProductCard({
  product,
  slug,
  showWishlist = false,
  onWishlistToggle,
  isInWishlist = false,
  customerId = null,
  onCartUpdate,
  showQuickAdd = true,
  theme,
  autoOpenCart = false,
  onCartOpen,
}: ProductCardProps) {
  const router = useRouter()
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isClicking, setIsClicking] = useState(false)
  const [applicableDiscount, setApplicableDiscount] = useState<{
    id: string
    title: string
    type: string
    value: number
    originalPrice: number
    discountedPrice: number
  } | null>(null)
  
  const priceInfo = getProductPrice(product)
  const discountPercentage = priceInfo.comparePrice
    ? Math.round(((priceInfo.comparePrice - priceInfo.price) / priceInfo.comparePrice) * 100)
    : 0

  // טעינת הנחה אוטומטית שחלה על המוצר
  useEffect(() => {
    const fetchDiscount = async () => {
      try {
        const params = new URLSearchParams()
        if (customerId) {
          params.append('customerId', customerId)
        }
        // אם יש variant, נשתמש במחיר הבסיסי של המוצר
        const response = await fetch(`/api/storefront/${slug}/products/${product.id}/discounts?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          if (data.discounts && data.discounts.length > 0) {
            setApplicableDiscount(data.discounts[0]) // ההנחה הראשונה (עם עדיפות גבוהה)
          }
        }
      } catch (error) {
        console.error('Error fetching discount:', error)
      }
    }
    fetchDiscount()
  }, [slug, product.id, customerId])
  
  // Get aspect ratio class
  const getAspectRatioClass = () => {
    const ratio = theme?.categoryImageAspectRatio || "1:1"
    switch (ratio) {
      case "3:4": return "aspect-[3/4]"
      case "6:9": return "aspect-[6/9]"
      case "9:16": return "aspect-[9/16]"
      default: return "aspect-square"
    }
  }
  
  // Get border radius
  const getBorderRadius = () => {
    // אם מסירים מסגרות, תמיד 0
    if (removeCardBorders) return '0px'
    return `${theme?.categoryImageBorderRadius !== undefined ? theme.categoryImageBorderRadius : 0}px`
  }
  
  // Get badge position classes
  const getBadgePositionClasses = () => {
    const position = theme?.categoryBadgePosition || "top-right"
    switch (position) {
      case "top-left": return "top-3 left-3"
      case "bottom-right": return "bottom-3 right-3"
      case "bottom-left": return "bottom-3 left-3"
      default: return "top-3 right-3"
    }
  }
  
  // Get fav button position classes
  const getFavButtonPositionClasses = () => {
    const position = theme?.categoryFavButtonPosition || "top-right"
    switch (position) {
      case "top-right": return "top-3 right-3"
      case "bottom-right": return "bottom-3 right-3"
      case "bottom-left": return "bottom-3 left-3"
      default: return "top-3 left-3"
    }
  }
  
  const showFavButton = showWishlist && (theme?.categoryShowFavButton !== false)
  const cardHoverEffect = theme?.categoryCardHoverEffect !== false
  const showImageArrows = theme?.categoryShowImageArrows && product.images.length > 1
  const showImageDots = theme?.categoryShowImageDots && product.images.length > 1
  const removeMobilePadding = theme?.categoryRemoveMobilePadding
  const showBadges = theme?.categoryShowBadges !== false
  const autoSaleBadge = theme?.categoryAutoSaleBadge !== false

  const productUrl = `/shop/${slug}/products/${product.slug || product.id}`

  // Prefetching אגרסיבי כשמרחפים על המוצר
  useEffect(() => {
    if (isHovered) {
      // טעינה מראש של העמוד כשמרחפים
      router.prefetch(productUrl)
    }
  }, [isHovered, productUrl, router])

  const handleProductClick = (e: React.MouseEvent) => {
    setIsClicking(true)
    // Link יטען את העמוד - אפקט עדין בלבד
    // Next.js יראה את loading.tsx אוטומטית
  }

  // פונקציות עזר לחילוץ מידות וצבעים
  const getUniqueValues = (optionName: string, type: 'size' | 'color') => {
    if (!product.variants || !product.options) {
      return []
    }
    
    let option
    
    if (type === 'color') {
      // מצא את אופציית הצבע
      option = product.options.find(opt => opt.type === 'color')
    } else if (type === 'size') {
      // מצא את אופציית המידה - לפי שם או כל button
      option = product.options.find(opt => 
        opt.name === 'מידה' || 
        opt.name === 'size' || 
        opt.name === 'Size' ||
        opt.type === 'button'
      )
    }
    
    if (!option) return []
    
    const values = new Map<string, { value: string, hasStock: boolean }>()
    
    product.variants.forEach(variant => {
      let variantValue: string | null = null
      
      // מצא את הערך של האופציה הזו בvariant
      if (variant.option1 === option.name) {
        variantValue = variant.option1Value || null
      } else if (variant.option2 === option.name) {
        variantValue = variant.option2Value || null
      } else if (variant.option3 === option.name) {
        variantValue = variant.option3Value || null
      }
      
      if (variantValue) {
        const hasStock = variant.inventoryQty !== null && variant.inventoryQty > 0
        const existing = values.get(variantValue)
        
        // אם כבר קיים ערך זה, נשמור hasStock = true אם לפחות variant אחד יש לו מלאי
        values.set(variantValue, {
          value: variantValue,
          hasStock: existing ? (existing.hasStock || hasStock) : hasStock
        })
      }
    })
    
    return Array.from(values.values())
  }

  const colorValues = getUniqueValues('color', 'color')
  const sizeValues = getUniqueValues('size', 'size')
  
  // האם להציג כפתורי מידות
  const showSizeButtons = theme?.categoryShowSizeButtons !== false && sizeValues.length > 0
  const hideOutOfStockSizes = theme?.categoryHideOutOfStockSizes === true
  const sizeButtonPosition = theme?.categorySizeButtonPosition || 'on-image'
  const removeCardBorders = theme?.categoryRemoveCardBorders || false
  
  // סינון מידות לפי מלאי אם נדרש
  const displayedSizes = hideOutOfStockSizes 
    ? sizeValues.filter(s => s.hasStock) 
    : sizeValues

  return (
    <div 
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsClicking(false)
      }}
    >
      <Link 
        href={productUrl} 
        onClick={handleProductClick}
        prefetch={true}
        scroll={true}
        className="block"
      >
        <Card className={cn(
          "h-full transition-all duration-200 overflow-hidden",
          removeCardBorders ? "shadow-none border-0 rounded-none" : "shadow-sm border border-gray-200 rounded-lg",
          !removeCardBorders && cardHoverEffect && "hover:shadow-lg hover:border-gray-300",
          removeCardBorders && cardHoverEffect && "hover:shadow-md",
          isClicking && "opacity-90 scale-[0.98]"
        )}>
          <CardContent className={removeMobilePadding ? 'p-0 md:p-0' : 'p-0'}>
            {/* Image Container */}
            <div 
              className={`relative overflow-hidden bg-gray-100 ${getAspectRatioClass()}`}
              style={{ borderRadius: getBorderRadius() }}
            >
              {product.images && product.images.length > 0 && !imageError ? (
                <>
                  <img
                    src={product.images[currentImageIndex]}
                    alt={product.name}
                    className={`w-full h-full object-cover ${cardHoverEffect ? 'group-hover:scale-110 transition-transform duration-500' : ''}`}
                    onError={() => setImageError(true)}
                  />
                  
                  {/* Image Navigation Arrows */}
                  {showImageArrows && (
                    <>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setCurrentImageIndex((prev) => prev === 0 ? product.images.length - 1 : prev - 1)
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ❮
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setCurrentImageIndex((prev) => prev === product.images.length - 1 ? 0 : prev + 1)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ❯
                      </button>
                    </>
                  )}
                  
                  {/* Image Navigation Dots */}
                  {showImageDots && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {product.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setCurrentImageIndex(idx)
                          }}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-gray-400" />
                </div>
              )}

              {/* Badges */}
              {showBadges && (
                <div className={`absolute ${getBadgePositionClasses()} flex flex-col gap-2`}>
                  {product.availability === "OUT_OF_STOCK" && (
                    <Badge className="bg-red-500 text-white shadow-lg rounded-md pointer-events-none">
                      אזל מהמלאי
                    </Badge>
                  )}
                  {product.availability === "PRE_ORDER" && (
                    <Badge className="bg-blue-500 text-white shadow-lg rounded-md">
                      הזמנה מראש
                    </Badge>
                  )}
                  {autoSaleBadge && discountPercentage > 0 && (
                    <Badge className="bg-green-500 text-white shadow-lg rounded-md">
                      {discountPercentage}% הנחה
                    </Badge>
                  )}
                </div>
              )}

              {/* Wishlist Button */}
              {showFavButton && onWishlistToggle && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onWishlistToggle(product.id)
                  }}
                  className={`absolute ${getFavButtonPositionClasses()} p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100`}
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isInWishlist
                        ? "fill-red-500 text-red-500"
                        : "text-gray-600 hover:text-red-500"
                    } transition-colors`}
                  />
                </button>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
              
              {/* Quick Add Cart Icon - bottom left */}
              {showQuickAdd && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    // TODO: Open quick add modal
                  }}
                  className="absolute bottom-2 left-2 w-8 h-8 bg-white/95 backdrop-blur-sm hover:bg-white rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110 flex items-center justify-center"
                  title="הוסף לסל"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                </button>
              )}
              
              {/* Size Buttons on Image */}
              {showSizeButtons && sizeButtonPosition === 'on-image' && displayedSizes.length > 0 && (
                <div className="absolute top-3 left-3 flex flex-col gap-1.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  {displayedSizes.map((size: any) => (
                    <button
                      key={size.value}
                      className={`relative bg-white/95 backdrop-blur-sm hover:bg-white text-gray-900 text-xs font-medium px-2.5 py-1.5 rounded-md shadow-md transition-all hover:scale-105 border border-gray-200 overflow-hidden ${!size.hasStock ? 'opacity-60' : ''}`}
                    >
                      {size.value}
                      {!size.hasStock && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-md">
                          <div 
                            className="w-[150%] h-[2px] bg-red-500"
                            style={{
                              transform: 'rotate(-25deg)',
                              transformOrigin: 'center'
                            }}
                          />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className={removeCardBorders ? "px-2 py-3" : "p-4"}>
              <h3 className={`font-semibold text-gray-900 line-clamp-2 group-hover:text-gray-700 transition-colors ${removeCardBorders ? 'mb-1.5' : 'mb-2'}`}>
                {product.name}
              </h3>
              
              {/* Color Samples - מתחת לשם */}
              {theme?.categoryShowColorSamples !== false && product.options && product.options.some(opt => opt.type === 'color') && (
                <div className={`flex items-center gap-1.5 ${removeCardBorders ? 'mb-2' : 'mb-3'}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  {product.options
                    .filter(opt => opt.type === 'color')
                    .flatMap(opt => {
                      // נבדוק איזה צבעים יש מלאי
                      const colorStock = new Map<string, boolean>()
                      
                      product.variants?.forEach(variant => {
                        let variantColorValue: string | null = null
                        
                        if (variant.option1 === opt.name) variantColorValue = variant.option1Value || null
                        else if (variant.option2 === opt.name) variantColorValue = variant.option2Value || null
                        else if (variant.option3 === opt.name) variantColorValue = variant.option3Value || null
                        
                        if (variantColorValue) {
                          const hasStock = variant.inventoryQty !== null && variant.inventoryQty > 0
                          const existing = colorStock.get(variantColorValue)
                          colorStock.set(variantColorValue, existing || hasStock)
                        }
                      })
                      
                      // מציג את כל הצבעים מה-values של האופציה
                      return (opt.values as any[]).map((colorValue: any) => {
                        const label = colorValue.label || colorValue.id || String(colorValue)
                        const colorCode = colorValue.metadata?.color || colorValue.color || null
                        const hasStock = colorStock.get(label)
                        
                        // אם hideOutOfStockSizes מופעל, מסתיר צבעים ללא מלאי
                        if (hideOutOfStockSizes && !hasStock) return null
                        
                        return (
                          <button
                            key={label}
                            className="w-6 h-6 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-all hover:scale-110 relative"
                            style={{ 
                              backgroundColor: colorCode || label.toLowerCase(),
                              opacity: !hasStock ? 0.5 : 1
                            }}
                            title={label}
                          >
                            {!hasStock && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-full h-0.5 bg-gray-400 rotate-45" />
                              </div>
                            )}
                          </button>
                        )
                      }).filter(Boolean)
                    })
                  }
                </div>
              )}
              
              <div className={`space-y-1 ${removeCardBorders ? 'mb-0' : 'mb-3'}`}>
                {/* הצגת המחיר המקורי */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* הצגת comparePrice אם יש */}
                  {formatComparePrice(product) && (
                    <span className="text-sm text-gray-500 line-through">
                      {formatComparePrice(product)}
                    </span>
                  )}
                  <span 
                    className="text-lg font-bold"
                    style={{ color: theme?.regularPriceColor || '#111827' }}
                  >
                    {applicableDiscount && applicableDiscount.originalPrice > 0
                      ? `₪${applicableDiscount.originalPrice.toFixed(2)}`
                      : formatProductPrice(product)}
                  </span>
                </div>
                
                {/* הצגת הנחה אוטומטית למטה אם יש */}
                {applicableDiscount && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-green-100 text-green-800 border border-green-700 text-xs font-semibold whitespace-nowrap px-2 py-1 rounded-sm transition-none">
                      {applicableDiscount.title}
                    </Badge>
                    <span 
                      className="text-base font-bold"
                      style={{ color: theme?.salePriceColor || '#ef4444' }}
                    >
                      ₪{applicableDiscount.discountedPrice.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Size Buttons Below Image */}
              {showSizeButtons && sizeButtonPosition === 'below-image' && displayedSizes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  {displayedSizes.map((size: any) => (
                    <button
                      key={size.value}
                      className="bg-white hover:bg-gray-50 text-gray-900 text-xs font-medium px-2.5 py-1 rounded border border-gray-300 hover:border-gray-400 transition-all"
                    >
                      {size.value}
                    </button>
                  ))}
                </div>
              )}

            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}

