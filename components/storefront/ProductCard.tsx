"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Heart } from "lucide-react"
import { useState } from "react"

interface ProductCardProps {
  product: {
    id: string
    name: string
    slug: string
    price: number
    comparePrice: number | null
    images: string[]
    availability: string
  }
  slug: string
  showWishlist?: boolean
  onWishlistToggle?: (productId: string) => void
  isInWishlist?: boolean
}

export function ProductCard({
  product,
  slug,
  showWishlist = false,
  onWishlistToggle,
  isInWishlist = false,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
  const discountPercentage = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0

  return (
    <div className="group relative">
      <Link href={`/shop/${slug}/products/${product.id}`}>
        <Card className="h-full hover:shadow-lg transition-all duration-300 border-gray-200 overflow-hidden hover:border-gray-300">
          <CardContent className="p-0">
            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden bg-gray-100">
              {product.images && product.images.length > 0 && !imageError ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-gray-400" />
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-3 right-3 flex flex-col gap-2">
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
                {discountPercentage > 0 && (
                  <Badge className="bg-green-500 text-white shadow-lg">
                    {discountPercentage}% הנחה
                  </Badge>
                )}
              </div>

              {/* Wishlist Button */}
              {showWishlist && onWishlistToggle && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onWishlistToggle(product.id)
                  }}
                  className="absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100"
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
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">
                  ₪{product.price.toFixed(2)}
                </span>
                {product.comparePrice && (
                  <span className="text-sm text-gray-500 line-through">
                    ₪{product.comparePrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}

