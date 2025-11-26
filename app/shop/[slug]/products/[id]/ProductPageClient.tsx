"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  Ruler,
} from "lucide-react"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
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
import { ProductAddonsSelector } from "./components/ProductAddonsSelector"
import { ProductCustomFields } from "./components/ProductCustomFields"
import { BundleSelector } from "./components/BundleSelector"
import { ReviewForm } from "@/components/storefront/ReviewForm"
import { GiftCardForm } from "./components/GiftCardForm"

const popularColors: Record<string, string> = {
  'שחור': '#000000',
  'לבן': '#FFFFFF',
  'אדום': '#FF0000',
  'כחול': '#0000FF',
  'ירוק': '#00FF00',
  'צהוב': '#FFFF00',
  'כתום': '#FFA500',
  'סגול': '#800080',
  'ורוד': '#FFC0CB',
  'חום': '#8B4513',
  'אפור': '#808080',
  'זהב': '#FFD700',
  'כסף': '#C0C0C0',
  'תכלת': '#00FFFF',
  'ורד': '#FF69B4',
  'שמנת': '#FFFDD0',
  'בז\'': '#F5F5DC',
  'חאקי': '#F0E68C',
  'טורקיז': '#40E0D0',
  'אפרסק': '#FFDAB9',
}

export function ProductPageClient({
  slug,
  productId,
  shop,
  product: initialProduct,
  reviews: initialReviews,
  averageRating: initialAverageRating,
  totalReviews: initialTotalReviews,
  reviewsPluginActive = false,
  relatedProducts: initialRelatedProducts,
  galleryLayout: initialGalleryLayout,
  productPageLayout: initialProductPageLayout,
  theme,
  navigation,
  isAdmin,
  autoOpenCart: initialAutoOpenCart,
  productAddons = [],
  bundles = [],
}: ProductPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [reviews] = useState<any[]>(initialReviews)
  const [averageRating] = useState(initialAverageRating)
  const [totalReviews] = useState(initialTotalReviews)
  const [relatedProducts] = useState<any[]>(initialRelatedProducts)
  const [showReviews, setShowReviews] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showQuickBuy, setShowQuickBuy] = useState(false)
  const [isGift, setIsGift] = useState(false)
  const [giftDiscountId, setGiftDiscountId] = useState<string | null>(null)
  
  // Gift Card form data (only for gift card products)
  const [giftCardData, setGiftCardData] = useState({
    recipientName: "",
    recipientEmail: "",
    recipientPhone: "",
    senderName: "",
    message: "",
  })
  
  // State for Product Add-ons
  const [selectedAddons, setSelectedAddons] = useState<Array<{
    addonId: string
    valueId: string | null
    label: string
    price: number
    quantity: number
  }>>([])
  const [addonsTotal, setAddonsTotal] = useState(0)

  // בדיקה אם המודל נפתח כמודל מתנה דרך query params או event
  useEffect(() => {
    const giftParam = searchParams.get("gift")
    const discountIdParam = searchParams.get("discountId")
    // רק אם יש גם gift וגם discountId - זה באמת מתנה
    if (giftParam === "true" && discountIdParam) {
      setIsGift(true)
      setGiftDiscountId(discountIdParam)
      setShowQuickBuy(true)
    } else {
      // אם אין query params של מתנה, וודא שה-state נקי
      if (!giftParam || giftParam !== "true") {
        setIsGift(false)
        setGiftDiscountId(null)
      }
    }
  }, [searchParams])

  // הערה: ה-event של openGiftVariantModal מטופל ב-GiftVariantModalHandler

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [showDesigner, setShowDesigner] = useState(false)
  const [showSizeChart, setShowSizeChart] = useState(false)
  const [sizeChart, setSizeChart] = useState<any>(null)

  // שימוש ב-hook המרכזי לניהול state ולוגיקה
  const {
    product,
    selectedImage,
    setSelectedImage,
    quantity,
    setQuantity,
    selectedVariant,
    setSelectedVariant,
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
    customerId,
  } = useProductPage({
    slug,
    productId,
    product: initialProduct,
    initialGalleryLayout,
    initialProductPageLayout,
    autoOpenCart: initialAutoOpenCart,
    selectedAddons,
  })

  // שמירת gift card data ב-window כדי ש-handleAddToCart יוכל לגשת אליו
  useEffect(() => {
    if (product && (product as any).isGiftCard) {
      (window as any).giftCardData = giftCardData
    } else {
      delete (window as any).giftCardData
    }
  }, [giftCardData, product])

  // טעינת טבלת מידות
  useEffect(() => {
    const fetchSizeChart = async () => {
      if (!slug || !productId) return
      try {
        const response = await fetch(`/api/storefront/${slug}/size-charts?productId=${productId}`)
        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0) {
            setSizeChart(data[0]) // ניקח את הראשון
          }
        }
      } catch (error) {
        console.error("Error fetching size chart:", error)
      }
    }
    fetchSizeChart()
  }, [slug, productId])

  // פונקציות לניהול layout
  const moveElement = (elementId: string, direction: "up" | "down") => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      // שליחת הודעה ל-parent
      window.parent.postMessage({
        type: "moveElement",
        elementId: elementId,
        direction: direction
      }, window.location.origin)
    }
  }

  const toggleElementVisibility = (elementId: string) => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      // שליחת הודעה ל-parent
      window.parent.postMessage({
        type: "toggleElementVisibility",
        elementId: elementId
      }, window.location.origin)
    }
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

  // מחיר נוכחי (כולל תוספות)
  const basePrice = selectedVariant && product.variants
    ? product.variants.find((v) => v.id === selectedVariant)?.price || product.price
    : product.price
  const currentPrice = basePrice + addonsTotal

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
    productId: product.id, // שימוש ב-id האמיתי של המוצר במקום slug
    shopId: shop.id,
    theme,
    hasBundles: bundles && bundles.length > 0, // האם יש bundles
    averageRating,
    totalReviews,
    showReviews,
    setShowReviews,
    relatedProducts,
    currentPrice,
    sizeChart,
    onShowSizeChart: () => setShowSizeChart(true),
    customerId,
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
            className="w-full rounded-sm h-12 px-8 font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{ 
              backgroundColor: theme.primaryColor || "#000000",
              color: theme.primaryTextColor || '#ffffff',
            }}
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
                  color: theme.primaryTextColor || '#ffffff',
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
                <Pencil className="w-6 h-6" style={{ transform: 'none', position: 'relative', left: 0, top: 0 }} />
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
              color: theme.primaryTextColor || '#ffffff',
            }}
          >
            <Palette className="w-6 h-6" />
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
              .map((element, index, array) => {
                // בדיקה אם יש variants בעמוד
                const hasVariants = otherElements.some(el => el.type === "product-variants")
                
                // הוסף bundles אחרי variants (אם יש variants)
                if (hasVariants && element.type === "product-variants" && bundles && bundles.length > 0) {
                  // בדיקה אם זה ה-variants האחרון (אם יש כמה)
                  const isLastVariantsElement = !array[index + 1] || array[index + 1].type !== "product-variants"
                  
                  if (isLastVariantsElement) {
                    return (
                      <div key="bundles-after-variants">
                        {renderElement(element)}
                        {/* Bundle Selector */}
                        <div className="mt-6">
                          <BundleSelector
                            bundles={bundles}
                            productId={product.id}
                            productPrice={currentPrice}
                            slug={slug}
                            customerId={customerId}
                            onCartUpdate={fetchCartCount}
                            theme={theme}
                          />
                        </div>
                      </div>
                    )
                  }
                }
                
                // אם אין variants אבל יש bundles, נוסיף את ה-bundle selector אחרי description או price
                if (!hasVariants && bundles && bundles.length > 0) {
                  const hasDescription = otherElements.some(el => el.type === "product-description")
                  
                  // אם יש description, נוסיף אחרי description
                  if (hasDescription && element.type === "product-description") {
                    const isLastDescriptionElement = !array[index + 1] || array[index + 1].type !== "product-description"
                    
                    if (isLastDescriptionElement) {
                      return (
                        <div key="bundles-after-description">
                          {renderElement(element)}
                          {/* Bundle Selector */}
                          <div className="mt-6">
                            <BundleSelector
                              bundles={bundles}
                              productId={product.id}
                              productPrice={currentPrice}
                              slug={slug}
                              customerId={customerId}
                              onCartUpdate={fetchCartCount}
                              theme={theme}
                            />
                          </div>
                        </div>
                      )
                    }
                  }
                  
                  // אם אין description, נוסיף אחרי price
                  if (!hasDescription && element.type === "product-price") {
                    const isLastPriceElement = !array[index + 1] || array[index + 1].type !== "product-price"
                    
                    if (isLastPriceElement) {
                      return (
                        <div key="bundles-after-price">
                          {renderElement(element)}
                          {/* Bundle Selector */}
                          <div className="mt-6">
                            <BundleSelector
                              bundles={bundles}
                              productId={product.id}
                              productPrice={currentPrice}
                              slug={slug}
                              customerId={customerId}
                              onCartUpdate={fetchCartCount}
                              theme={theme}
                            />
                          </div>
                        </div>
                      )
                    }
                  }
                }
                // הוסף Gift Card Form אחרי variants אם זה gift card product
                if (element.position === 5 && element.type === "product-quantity" && (product as any).isGiftCard) {
                  const variantPrice = selectedVariant && product.variants
                    ? product.variants.find((v) => v.id === selectedVariant)?.price || product.price
                    : product.price
                  
                  return (
                    <div key="gift-card-form">
                      {/* Gift Card Form */}
                      <div className="mb-6">
                        <GiftCardForm
                          data={giftCardData}
                          onChange={setGiftCardData}
                          variantPrice={variantPrice}
                        />
                      </div>
                      {/* Quantity element */}
                      {renderElement(element)}
                    </div>
                  )
                }
                
                // הוסף את התוספות אחרי variants (position 4) ולפני quantity (position 5)
                if (element.position === 5 && element.type === "product-quantity" && productAddons && productAddons.length > 0) {
                  return (
                    <div key="elements-with-addons">
                      {/* Product Add-ons */}
                      <div className="mb-6">
                        <ProductAddonsSelector
                          addons={productAddons}
                          onChange={setSelectedAddons}
                          onPriceChange={setAddonsTotal}
                          theme={theme}
                        />
                      </div>
                      {/* Quantity element */}
                      {renderElement(element)}
                    </div>
                  )
                }
                return <div key={element.id}>{renderElement(element)}</div>
              })}
          </div>
        </div>

        {/* Custom Fields */}
        {product.customFieldValues && product.customFieldValues.length > 0 && (
          <div className="mt-8 max-w-2xl">
            <ProductCustomFields customFieldValues={product.customFieldValues as any} />
          </div>
        )}

        {/* Reviews Section - רק אם התוסף פעיל */}
        {reviewsPluginActive && showReviews && !layoutElements.find(el => el.type === "product-reviews") && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">ביקורות ({totalReviews})</h2>
              <Button
                onClick={() => setShowReviewForm(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Star className="w-4 h-4" />
                כתוב ביקורת
              </Button>
            </div>
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
                              className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(img, '_blank')}
                            />
                          ))}
                        </div>
                      )}
                      {review.videos && review.videos.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 mt-4">
                          {review.videos.map((video: string, idx: number) => (
                            <video
                              key={idx}
                              src={video}
                              controls
                              className="w-full max-w-md rounded-lg"
                              preload="metadata"
                            >
                              הדפדפן שלך לא תומך בהצגת וידאו.
                            </video>
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
      </main>

      {/* רינדור מוצרים קשורים - מחוץ ל-main כדי שהרקע ישתרע על כל הרוחב */}
      {relatedElement && renderElement(relatedElement)}

      {/* Review Form Dialog - רק אם התוסף פעיל */}
      {reviewsPluginActive && (
        <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>כתוב ביקורת</DialogTitle>
            <DialogDescription>
              שתף את החוויה שלך עם המוצר
            </DialogDescription>
          </DialogHeader>
          <ReviewForm
            productId={productId}
            slug={slug}
            shopId={shop.id}
            customerId={customerId}
            onSuccess={() => {
              setShowReviewForm(false)
              // רענון הביקורות
              window.location.reload()
            }}
            onCancel={() => setShowReviewForm(false)}
          />
        </DialogContent>
      </Dialog>
      )}

      {/* Quick Buy Modal */}
      <Dialog open={showQuickBuy} onOpenChange={(open) => {
        if (!open) {
          // איפוס state כשסוגרים את המודל
          setIsGift(false)
          setGiftDiscountId(null)
          // ניקוי query params אם יש
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            if (url.searchParams.get('gift') === 'true') {
              url.searchParams.delete('gift')
              url.searchParams.delete('discountId')
              window.history.replaceState({}, '', url.toString())
            }
          }
        }
        setShowQuickBuy(open)
      }}>
        <DialogContent className="max-w-md" dir="rtl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">קנייה מהירה</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowQuickBuy(false)
                setIsGift(false)
                setGiftDiscountId(null)
              }}
              className="p-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {product && (
            <div className="space-y-4">
              {/* הודעת מתנה */}
              {isGift && (
                <div className="bg-gradient-to-r from-pink-50 to-emerald-50 border-2 border-pink-200 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-2">🎁</div>
                  <h3 className="text-lg font-bold text-pink-700">מזל טוב! קבלת מתנה</h3>
                </div>
              )}

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
              {(() => {
                // בניית options מה-variants אם אין options במסד הנתונים
                let displayOptions = product.options && product.options.length > 0 
                  ? product.options 
                  : []
                
                // אם אין options אבל יש variants, נבנה options מה-variants
                if (displayOptions.length === 0 && product.variants && product.variants.length > 0) {
                  const optionTypes = Array.from(
                    new Set(
                      product.variants.flatMap((v: any) => {
                        const types: string[] = []
                        if (v.option1) types.push(v.option1)
                        if (v.option2) types.push(v.option2)
                        if (v.option3) types.push(v.option3)
                        return types
                      })
                    )
                  )
                  
                  displayOptions = optionTypes.map((optionType, index) => {
                    // מציאת כל הערכים האפשריים לסוג הזה
                    const values = Array.from(
                      new Set(
                        product.variants
                          ?.map((v: any) => {
                            if (v.option1 === optionType) return v.option1Value
                            if (v.option2 === optionType) return v.option2Value
                            if (v.option3 === optionType) return v.option3Value
                            return null
                          })
                          .filter((val: any) => val !== null && val !== undefined) || []
                      )
                    ).map((value: any) => ({
                      id: value,
                      label: value,
                    }))
                    
                    return {
                      id: `option-${optionType}-${index}`,
                      name: optionType,
                      values: values,
                    }
                  })
                }
                
                return displayOptions.length > 0 ? (
                  <div className="space-y-3">
                    {displayOptions.map((option: any) => {
                    const isOptionSelected = selectedOptionValues[option.id] !== undefined
                    const optionName = option.name === "Size" ? "מידה" : 
                                      option.name === "Color" ? "צבע" : 
                                      option.name
                    const isColorOption = option.type === "color" || option.name === "Color" || option.name === "צבע"
                    
                    return (
                      <div key={option.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {optionName}
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {(Array.isArray(option.values) ? option.values : []).map((value: any) => {
                            const valueId = typeof value === 'object' ? value.id : value
                            const valueLabel = typeof value === 'object' ? value.label : value
                            const isSelected = selectedOptionValues[option.id] === valueId
                            
                            // בדיקת זמינות - האם יש variant זמין עם הערך הזה + הבחירות הקודמות
                            const isAvailable = (() => {
                              // אם אין variants, הכל זמין
                              if (!product.variants || product.variants.length === 0) return true
                              
                              // אם אין בחירות אחרות, בדוק רק את הערך הזה
                              if (Object.keys(selectedOptionValues).length === 0) {
                                return product.variants.some((variant: any) => {
                                  const matchesValue = 
                                    (variant.option1 === option.name && variant.option1Value === valueId) ||
                                    (variant.option2 === option.name && variant.option2Value === valueId) ||
                                    (variant.option3 === option.name && variant.option3Value === valueId)
                                  
                                  if (!matchesValue) return false
                                  return variant.inventoryQty === null || variant.inventoryQty === undefined || variant.inventoryQty > 0
                                })
                              }
                              
                              // יש בחירות קודמות - צריך לבדוק שהן תואמות
                              return product.variants.some((v: any) => {
                                // המרת variant ל-options structure
                                const variantOptions: Record<string, string> = {}
                                if (v.option1 && v.option1Value) {
                                  variantOptions[v.option1] = v.option1Value
                                }
                                if (v.option2 && v.option2Value) {
                                  variantOptions[v.option2] = v.option2Value
                                }
                                if (v.option3 && v.option3Value) {
                                  variantOptions[v.option3] = v.option3Value
                                }
                                
                                // בדיקה שהבחירות הקודמות תואמות (מלבד האפשרות הנוכחית)
                                const matchesCurrentSelections = Object.entries(selectedOptionValues)
                                  .filter(([key]) => key !== option.id)
                                  .every(([optionId, val]) => {
                                    // מצא את שם האפשרות לפי ה-ID
                                    const selectedOption = displayOptions.find((opt: any) => opt.id === optionId)
                                    const optionName = selectedOption?.name || optionId
                                    return variantOptions[optionName] === val
                                  })
                                
                                // בדיקה שהאפשרות הנוכחית תואמת
                                const matchesThisOption = variantOptions[option.name] === valueId
                                
                                // בדיקת מלאי
                                const hasStock = v.inventoryQty === null || v.inventoryQty === undefined || v.inventoryQty > 0
                                
                                return matchesCurrentSelections && matchesThisOption && hasStock
                              })
                            })()
                            
                            // קביעת קוד הצבע
                            let colorCode: string | undefined = undefined
                            if (isColorOption) {
                              // נסה לקבל מהמטא-דאטה
                              if (typeof value === 'object' && value.metadata?.color) {
                                colorCode = value.metadata.color
                              } else {
                                // נסה לחפש ב-popularColors לפי התווית
                                colorCode = popularColors[valueLabel]
                              }
                            }
                            
                            // בדיקה אם זה דפוס
                            const isPattern = option.type === "pattern" || (typeof value === 'object' && value.metadata?.pattern)
                            const patternStyle = typeof value === 'object' && value.metadata?.pattern ? value.metadata.pattern : undefined
                            const patternBackgroundSize = typeof value === 'object' && value.metadata?.backgroundSize ? value.metadata.backgroundSize : '12px 12px'
                            const patternBackgroundPosition = typeof value === 'object' && value.metadata?.backgroundPosition ? value.metadata.backgroundPosition : '0 0'
                            
                            // אם זה צבע, הצג עיגול
                            if (isColorOption && colorCode && !isPattern) {
                              return (
                                <button
                                  key={valueId}
                                  onClick={() => setSelectedOptionValues({ ...selectedOptionValues, [option.id]: valueId })}
                                  disabled={!isAvailable}
                                  className={`relative w-10 h-10 rounded-full border-2 transition-all ${
                                    isSelected
                                      ? "ring-2 ring-offset-2"
                                      : isAvailable
                                      ? "border-gray-300 hover:border-gray-400"
                                      : "border-gray-200 opacity-50 cursor-not-allowed"
                                  }`}
                                  style={{
                                    backgroundColor: colorCode,
                                    borderColor: isSelected ? theme.primaryColor : undefined,
                                    ringColor: isSelected ? theme.primaryColor : undefined,
                                  }}
                                  title={valueLabel}
                                />
                              )
                            }
                            
                            // אם זה דפוס, הצג עם דפוס CSS
                            if (isPattern && patternStyle) {
                              return (
                                <button
                                  key={valueId}
                                  onClick={() => setSelectedOptionValues({ ...selectedOptionValues, [option.id]: valueId })}
                                  disabled={!isAvailable}
                                  className={`relative w-10 h-10 rounded-full border-2 transition-all overflow-hidden ${
                                    isSelected
                                      ? "ring-2 ring-offset-2"
                                      : isAvailable
                                      ? "border-gray-300 hover:border-gray-400"
                                      : "border-gray-200 opacity-50 cursor-not-allowed"
                                  }`}
                                  style={{
                                    borderColor: isSelected ? theme.primaryColor : undefined,
                                    ringColor: isSelected ? theme.primaryColor : undefined,
                                    backgroundImage: patternStyle,
                                    backgroundSize: patternBackgroundSize,
                                    backgroundPosition: patternBackgroundPosition,
                                  }}
                                  title={valueLabel}
                                />
                              )
                            }
                            
                            // אחרת, הצג כפתור רגיל
                            return (
                              <button
                                key={valueId}
                                onClick={() => setSelectedOptionValues({ ...selectedOptionValues, [option.id]: valueId })}
                                disabled={!isAvailable}
                                className={`px-3 py-1.5 border-2 rounded-sm text-sm font-medium transition-all ${
                                  isSelected
                                    ? ""
                                    : isAvailable
                                    ? "border-gray-300 text-gray-700 hover:border-gray-400"
                                    : "border-gray-200 text-gray-400 opacity-50 cursor-not-allowed"
                                }`}
                                style={isSelected ? {
                                  borderColor: theme.primaryColor,
                                  backgroundColor: theme.primaryColor,
                                  color: theme.primaryTextColor || '#ffffff',
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
                            יש לבחור {optionName}
                          </p>
                        )}
                      </div>
                    )
                  })}
                  </div>
                ) : null
              })()}

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
                        {theme?.productShowInventory && maxQty > 0 && (
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
                {/* רק אם זה באמת מתנה - יש giftDiscountId ו-isGift */}
                {isGift && giftDiscountId ? (
                  <button
                    onClick={async () => {
                      setIsProcessingCheckout(true)
                      try {
                        const customerData = localStorage.getItem(`storefront_customer_${slug}`)
                        const headers: HeadersInit = { 'Content-Type': 'application/json' }
                        let customerId: string | null = null
                        
                        if (customerData) {
                          try {
                            const parsed = JSON.parse(customerData)
                            customerId = parsed.id
                            if (customerId) {
                              headers['x-customer-id'] = customerId
                            }
                          } catch (error) {
                            console.error("Error parsing customer data:", error)
                          }
                        }

                        const response = await fetch(`/api/storefront/${slug}/cart`, {
                          method: 'POST',
                          headers,
                          credentials: 'include',
                          body: JSON.stringify({
                            productId: product.id,
                            variantId: selectedVariant,
                            quantity,
                            isGift: true,
                            giftDiscountId,
                          }),
                        })

                        if (!response.ok) {
                          const errorData = await response.json().catch(() => ({}))
                          throw new Error(errorData.error || 'Failed to add gift to cart')
                        }

                        setShowQuickBuy(false)
                        setIsGift(false)
                        setGiftDiscountId(null)
                        setIsProcessingCheckout(false)
                        
                        // ניקוי query params
                        if (typeof window !== 'undefined') {
                          const url = new URL(window.location.href)
                          url.searchParams.delete('gift')
                          url.searchParams.delete('discountId')
                          window.history.replaceState({}, '', url.toString())
                        }
                        
                        toast({
                          title: "הצלחה",
                          description: "המתנה נוספה לעגלה בהצלחה!",
                        })
                        
                        router.push(`/shop/${slug}/checkout`)
                      } catch (error: any) {
                        console.error('Error adding gift to cart:', error)
                        setIsProcessingCheckout(false)
                        toast({
                          title: "שגיאה",
                          description: error.message || "אירעה שגיאה בהוספת המתנה לעגלה",
                          variant: "destructive",
                        })
                      }
                    }}
                    disabled={product.availability === "OUT_OF_STOCK" || isProcessingCheckout || (product.options && product.options.length > 0 && !selectedVariant)}
                    className="w-full rounded-sm h-11 px-8 font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    style={{ 
                      backgroundColor: theme.primaryColor || "#000000",
                      color: theme.primaryTextColor || '#ffffff',
                    }}
                  >
                    {isProcessingCheckout ? (
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-5 h-5 ml-2" />
                    )}
                    {isProcessingCheckout ? "מוסיף..." : "הוסף מתנה לעגלה"}
                  </button>
                ) : (
                  /* מוצר רגיל - לא מתנה */
                  <>
                    <button
                      onClick={async () => {
                        const success = await handleAddToCart(true)
                        if (success) {
                          setShowQuickBuy(false)
                        }
                      }}
                      disabled={product.availability === "OUT_OF_STOCK" || isAddingToCart || (product.options && product.options.length > 0 && !selectedVariant)}
                      className="w-full rounded-sm h-11 px-8 font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      style={{ 
                        backgroundColor: theme.primaryColor || "#000000",
                        color: theme.primaryTextColor || '#ffffff',
                      }}
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
                      disabled={product.availability === "OUT_OF_STOCK" || isProcessingCheckout || (product.options && product.options.length > 0 && !selectedVariant)}
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
                  </>
                )}
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

      {/* Size Chart Modal */}
      {sizeChart && (
        <Dialog open={showSizeChart} onOpenChange={setShowSizeChart}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                {sizeChart.name}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {sizeChart.imageUrl ? (
                <img
                  src={sizeChart.imageUrl}
                  alt={sizeChart.name}
                  className="w-full h-auto rounded-lg"
                />
              ) : sizeChart.content ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sizeChart.content }}
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

