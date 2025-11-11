"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Heart } from "lucide-react"
import { useState } from "react"
import { AddToCartButton } from "./AddToCartButton"

interface ProductVariant {
  id: string
  name: string
  price: number
  comparePrice: number | null
  inventoryQty: number | null
  sku: string | null
  options: Record<string, string>
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
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  const discountPercentage = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0
  
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
    return `${theme?.categoryImageBorderRadius || 8}px`
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

  return (
    <div 
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/shop/${slug}/products/${product.id}`}>
        <Card className={`h-full transition-all duration-300 border-gray-200 overflow-hidden ${cardHoverEffect ? 'hover:shadow-lg hover:border-gray-300' : ''} ${removeMobilePadding ? 'md:border' : 'border'}`}>
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
                    <Badge className="bg-red-500 text-white shadow-lg">
                      אזל מהמלאי
                    </Badge>
                  )}
                  {product.availability === "PRE_ORDER" && (
                    <Badge className="bg-blue-500 text-white shadow-lg">
                      הזמנה מראש
                    </Badge>
                  )}
                  {autoSaleBadge && discountPercentage > 0 && (
                    <Badge className="bg-green-500 text-white shadow-lg">
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
            </div>

            {/* Product Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-gray-700 transition-colors">
                {product.name}
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-bold text-gray-900">
                  ₪{product.price.toFixed(2)}
                </span>
                {product.comparePrice && (
                  <span className="text-sm text-gray-500 line-through">
                    ₪{product.comparePrice.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Quick Add Button - מופיע בהובר */}
              {showQuickAdd && isHovered && (
                <div className="absolute bottom-4 left-4 right-4" onClick={(e) => e.preventDefault()}>
                  <AddToCartButton
                    slug={slug}
                    productId={product.id}
                    productName={product.name}
                    customerId={customerId}
                    onSuccess={onCartUpdate}
                    useQuickAddModal={true}
                    product={product}
                    size="sm"
                    fullWidth
                    className="shadow-lg"
                    autoOpenCart={autoOpenCart}
                    onCartOpen={onCartOpen}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}

