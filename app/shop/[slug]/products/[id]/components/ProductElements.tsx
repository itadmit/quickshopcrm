"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, ChevronRight, Heart, MoreVertical, ShoppingCart, Loader2, Star } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ProductCard } from "@/components/storefront/ProductCard"
import { ProductPageElement, ProductPageElementType } from "@/components/storefront/ProductPageLayoutDesigner"
import { EditableProductElement } from "@/components/storefront/EditableProductElement"
import { ProductGallery } from "./ProductGallery"
import { Product, GalleryLayout } from "../types"
import { cn } from "@/lib/utils"

interface ProductElementsProps {
  product: Product
  selectedImage: number
  onImageSelect: (index: number) => void
  quantity: number
  setQuantity: (qty: number | ((prev: number) => number)) => void
  selectedVariant: string | null
  selectedOptionValues: Record<string, string>
  setSelectedOptionValues: (values: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  isInWishlist: boolean
  isAddingToCart: boolean
  isProcessingCheckout: boolean
  onAddToCart: (showToast?: boolean) => Promise<boolean>
  onToggleWishlist: () => void
  onCheckout: () => Promise<void>
  galleryLayout: GalleryLayout
  productPageLayout: { elements: ProductPageElement[] } | null
  isEditingLayout: boolean
  onMoveElement: (elementId: string, direction: "up" | "down") => void
  onToggleElementVisibility: (elementId: string) => void
  onOpenElementSettings: (elementId: string) => void
  slug: string
  productId: string
  theme: any
  averageRating: number
  totalReviews: number
  showReviews: boolean
  setShowReviews: (show: boolean) => void
  relatedProducts: any[]
  currentPrice: number
}

export function ProductElements({
  product,
  selectedImage,
  onImageSelect,
  quantity,
  setQuantity,
  selectedVariant,
  selectedOptionValues,
  setSelectedOptionValues,
  isInWishlist,
  isAddingToCart,
  isProcessingCheckout,
  onAddToCart,
  onToggleWishlist,
  onCheckout,
  galleryLayout,
  productPageLayout,
  isEditingLayout,
  onMoveElement,
  onToggleElementVisibility,
  onOpenElementSettings,
  slug,
  productId,
  theme,
  averageRating,
  totalReviews,
  showReviews,
  setShowReviews,
  relatedProducts,
  currentPrice,
}: ProductElementsProps) {
  const router = useRouter()
  const { toast } = useToast()

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
            <ProductGallery
              product={product}
              selectedImage={selectedImage}
              onImageSelect={onImageSelect}
              galleryLayout={galleryLayout}
              theme={theme}
            />
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
        let availableQty = product.inventoryQty
        if (selectedVariant && product.variants) {
          const variant = product.variants.find((v) => v.id === selectedVariant)
          if (variant) {
            availableQty = variant.inventoryQty
          }
        }
        const maxQty = product.availability === "OUT_OF_STOCK" ? 0 : availableQty
        
        return (
          <div key={element.id} style={elementStyle}>
            <label className="block text-sm font-semibold text-gray-900 mb-3" style={elementStyle}>
              כמות
            </label>
            <div className="flex items-center gap-2 w-fit">
              {theme?.productShowQuantityButtons !== false && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="rounded-sm"
                    disabled={quantity <= 1}
                  >
                    <span>-</span>
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
                    <span>+</span>
                  </Button>
                </>
              )}
              {maxQty > 0 && (
                <span className="text-sm text-gray-500">
                  (זמין: {maxQty})
                </span>
              )}
            </div>
          </div>
        )

      case "product-buttons":
        return (
          <div key={element.id} className="space-y-3">
            <button
              onClick={() => onAddToCart(true)}
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
              onClick={onCheckout}
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
                  onClick={onToggleWishlist}
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
                    if (typeof window !== 'undefined' && navigator.share) {
                      navigator.share({
                        title: product.name,
                        text: product.description || "",
                        url: window.location.href,
                      })
                    } else if (typeof window !== 'undefined') {
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
          onMoveUp={() => onMoveElement(element.id, "up")}
          onMoveDown={() => onMoveElement(element.id, "down")}
          onToggleVisibility={() => onToggleElementVisibility(element.id)}
          onOpenSettings={() => onOpenElementSettings(element.id)}
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

  return renderElement
}

export function useProductElements(props: ProductElementsProps) {
  return ProductElements(props)
}

