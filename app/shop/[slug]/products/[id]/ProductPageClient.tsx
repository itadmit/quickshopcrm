"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingCart,
  Loader2,
  Star,
  X,
  AlertCircle,
  Minus,
  Plus,
  Edit,
  Copy,
  Trash2,
  Pencil,
  Palette,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getThemeStyles } from "@/hooks/useShopTheme"
import { ProductPageDesigner } from "@/components/storefront/ProductPageDesigner"
import { ProductPageElement, ProductPageElementType } from "@/components/storefront/ProductPageLayoutDesigner"
import { cn } from "@/lib/utils"
import { AdminBar } from "@/components/storefront/AdminBar"
import { LoadingOverlay } from "@/components/storefront/LoadingOverlay"
import { useProductPage } from "./hooks/useProductPage"
import { ProductElements } from "./components/ProductElements"
import { Product, ProductPageClientProps, GalleryLayout } from "./types"

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
  const { toast } = useToast()

  const [reviews] = useState<any[]>(initialReviews)
  const [averageRating] = useState(initialAverageRating)
  const [totalReviews] = useState(initialTotalReviews)
  const [relatedProducts] = useState<any[]>(initialRelatedProducts)
  const [showReviews, setShowReviews] = useState(false)
  const [showQuickBuy, setShowQuickBuy] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [showDesigner, setShowDesigner] = useState(false)

  // שימוש ב-hook המרכזי לניהול state ולוגיקה
  const {
    product,
    selectedImage,
    setSelectedImage,
    quantity,
    setQuantity,
    selectedVariant,
    isInWishlist,
    cartItemCount,
    selectedOptionValues,
    setSelectedOptionValues,
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
  } = useProductPage({
    slug,
    productId,
    product: initialProduct,
    initialGalleryLayout,
    initialProductPageLayout,
    autoOpenCart: initialAutoOpenCart,
  })

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

  const handleCheckout = async () => {
    setIsProcessingCheckout(true)
    const success = await handleAddToCart(false)
    if (success) {
      router.push(`/shop/${slug}/checkout`)
    } else {
      setIsProcessingCheckout(false)
    }
  }

  const handleOpenElementSettings = (elementId: string) => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({
        type: "openElementSettings",
        elementId: elementId
      }, window.location.origin)
    } else {
      router.push(`/customize?page=product&id=${productId}&element=${elementId}`)
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

  // מחיר נוכחי
  const currentPrice = selectedVariant && product.variants
    ? product.variants.find((v) => v.id === selectedVariant)?.price || product.price
    : product.price

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">מוצר לא נמצא</p>
      </div>
    )
  }

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

  // שימוש בקומפוננטת ProductElements
  const renderElement = ProductElements({
    product,
    selectedImage,
    onImageSelect: setSelectedImage,
    quantity,
    setQuantity,
    selectedVariant,
    selectedOptionValues,
    setSelectedOptionValues,
    isInWishlist,
    isAddingToCart,
    isProcessingCheckout,
    onAddToCart: handleAddToCart,
    onToggleWishlist: handleToggleWishlist,
    onCheckout: handleCheckout,
    galleryLayout,
    productPageLayout,
    isEditingLayout,
    onMoveElement: moveElement,
    onToggleElementVisibility: toggleElementVisibility,
    onOpenElementSettings: handleOpenElementSettings,
    slug,
    productId,
    theme,
    averageRating,
    totalReviews,
    showReviews,
    setShowReviews,
    relatedProducts,
    currentPrice,
  })

  // פונקציה לרינדור כוכבים לביקורות
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

