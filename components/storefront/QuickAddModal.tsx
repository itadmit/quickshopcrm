"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShoppingCart, Plus, Minus, X, Package } from "lucide-react"
import Link from "next/link"
import { useAddToCart } from "@/hooks/useAddToCart"

interface ProductVariant {
  id: string
  name: string
  price: number
  comparePrice: number | null
  inventoryQty: number | null
  sku: string | null
  option1?: string | null
  option1Value?: string | null
  option2?: string | null
  option2Value?: string | null
  option3?: string | null
  option3Value?: string | null
  image?: string | null
}

interface Product {
  id: string
  name: string
  price: number
  comparePrice: number | null
  images: string[]
  description?: string | null
  variants?: ProductVariant[]
  inventoryQty?: number
  availability?: string
}

interface QuickAddModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product
  slug: string
  customerId?: string | null
  onSuccess?: () => void
  autoOpenCart?: boolean
  onCartOpen?: () => void
  isGift?: boolean
  giftDiscountId?: string | null
}

export function QuickAddModal({
  isOpen,
  onClose,
  product,
  slug,
  customerId,
  onSuccess,
  autoOpenCart = false,
  onCartOpen,
  isGift = false,
  giftDiscountId = null,
}: QuickAddModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [imageError, setImageError] = useState(false)

  const { addToCart, isAddingToCart } = useAddToCart({
    slug,
    customerId,
    autoOpenCart,
    onSuccess: () => {
      if (onSuccess) onSuccess()
      onClose()
      setQuantity(1)
      setSelectedVariant(null)
      setSelectedOptions({})
      
      // פתיחת עגלה אם ההגדרה מאפשרת
      if (autoOpenCart && onCartOpen) {
        setTimeout(() => {
          onCartOpen()
        }, 300) // קצת delay כדי שהטוסט יופיע
      }
    },
  })

  // המרת variants ל-options structure
  const getVariantOptions = (variant: ProductVariant): Record<string, string> => {
    const options: Record<string, string> = {}
    if (variant.option1 && variant.option1Value) {
      options[variant.option1] = variant.option1Value
    }
    if (variant.option2 && variant.option2Value) {
      options[variant.option2] = variant.option2Value
    }
    if (variant.option3 && variant.option3Value) {
      options[variant.option3] = variant.option3Value
    }
    return options
  }

  // בחירה אוטומטית של variant ראשון זמין בפתיחת המודל
  useEffect(() => {
    if (isOpen && product.variants && product.variants.length > 0) {
      // מציאת variant ראשון שזמין
      const firstAvailableVariant = product.variants.find(
        v => v.inventoryQty === null || v.inventoryQty === undefined || v.inventoryQty > 0
      ) || product.variants[0]

      setSelectedVariant(firstAvailableVariant)
      
      // עדכון selectedOptions לפי ה-variant שנבחר
      const options = getVariantOptions(firstAvailableVariant)
      setSelectedOptions(options)
    } else if (!isOpen) {
      // איפוס state כשנסגר המודל
      setSelectedVariant(null)
      setSelectedOptions({})
      setQuantity(1)
    }
  }, [isOpen, product])

  // מציאת כל סוגי האפשרויות (Size, Color, וכו')
  const optionTypes = product.variants
    ? Array.from(
        new Set(
          product.variants.flatMap((v) => {
            const types: string[] = []
            if (v.option1) types.push(v.option1)
            if (v.option2) types.push(v.option2)
            if (v.option3) types.push(v.option3)
            return types
          })
        )
      )
    : []

  // מציאת ערכים אפשריים לכל סוג
  const getOptionValues = (optionType: string) => {
    if (!product.variants) return []
    return Array.from(
      new Set(
        product.variants
          .map((v) => {
            if (v.option1 === optionType) return v.option1Value
            if (v.option2 === optionType) return v.option2Value
            if (v.option3 === optionType) return v.option3Value
            return null
          })
          .filter((val) => val !== null && val !== undefined) as string[]
      )
    )
  }

  // בחירת אפשרות
  const handleOptionSelect = (optionType: string, value: string) => {
    const newOptions = { ...selectedOptions, [optionType]: value }
    setSelectedOptions(newOptions)

    // ניסיון למצוא variant מתאים
    if (product.variants) {
      const matchingVariant = product.variants.find((v) => {
        const variantOptions = getVariantOptions(v)
        return Object.entries(newOptions).every(
          ([key, val]) => variantOptions[key] === val
        )
      })
      setSelectedVariant(matchingVariant || null)
    }
  }

  // חישוב מחיר נוכחי
  const currentPrice = selectedVariant?.price || product.price
  const currentComparePrice = selectedVariant?.comparePrice || product.comparePrice
  const currentInventory = selectedVariant?.inventoryQty !== undefined 
    ? selectedVariant.inventoryQty 
    : product.inventoryQty

  // בדיקה האם אפשר להוסיף לעגלה
  const hasVariants = product.variants && product.variants.length > 0
  const canAddToCart = 
    (!hasVariants || selectedVariant) && 
    (currentInventory === undefined || currentInventory === null || currentInventory > 0) &&
    quantity > 0

  const isOutOfStock = 
    currentInventory !== undefined && 
    currentInventory !== null && 
    currentInventory <= 0

  const handleAddToCart = async () => {
    if (!canAddToCart) return

    // אם זה מתנה, נוסיף ישירות דרך API
    if (isGift && giftDiscountId) {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (customerId) {
          headers['x-customer-id'] = customerId
        }

        const response = await fetch(`/api/storefront/${slug}/cart`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            productId: product.id,
            variantId: selectedVariant?.id || null,
            quantity,
            isGift: true,
            giftDiscountId,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to add gift to cart')
        }

        if (onSuccess) onSuccess()
        onClose()
        setQuantity(1)
        setSelectedVariant(null)
        setSelectedOptions({})
        
        if (autoOpenCart && onCartOpen) {
          setTimeout(() => {
            onCartOpen()
          }, 300)
        }
      } catch (error) {
        console.error('Error adding gift to cart:', error)
      }
      return
    }

    // הוספה רגילה
    addToCart({
      productId: product.id,
      variantId: selectedVariant?.id || null,
      quantity,
      productName: product.name,
    })
  }

  const discountPercentage = currentComparePrice
    ? Math.round(((currentComparePrice - currentPrice) / currentComparePrice) * 100)
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">הוספה מהירה לעגלה</DialogTitle>
          <DialogDescription className="sr-only">
            טופס הוספת מוצר לעגלת הקניות
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* תמונה */}
          <div className="relative">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative">
              {product.images && product.images.length > 0 && !imageError ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-gray-400" />
                </div>
              )}

              {/* תגיות */}
              <div className="absolute top-3 right-3 flex flex-col gap-2">
                {isOutOfStock && (
                  <Badge className="bg-red-500 text-white">אזל מהמלאי</Badge>
                )}
                {discountPercentage > 0 && (
                  <Badge className="bg-green-500 text-white">
                    {discountPercentage}% הנחה
                  </Badge>
                )}
              </div>
            </div>

            {/* לינק למוצר המלא */}
            <Link
              href={`/shop/${slug}/products/${product.slug || product.id}`}
              className="block mt-3 text-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
              onClick={onClose}
            >
              צפה בפרטים המלאים →
            </Link>
          </div>

          {/* פרטי מוצר */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
              {product.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>

            {/* מחיר */}
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-gray-900">
                ₪{currentPrice.toFixed(2)}
              </span>
              {currentComparePrice && (
                <span className="text-lg text-gray-500 line-through">
                  ₪{currentComparePrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* אפשרויות (Variants) */}
            {optionTypes.map((optionType) => (
              <div key={optionType} className="space-y-2">
                <Label className="text-sm font-medium">
                  {optionType === "Size" ? "מידה" : 
                   optionType === "Color" ? "צבע" : 
                   optionType}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {getOptionValues(optionType).map((value) => {
                    const isSelected = selectedOptions[optionType] === value
                    
                    // בדיקה האם האפשרות זמינה
                    const isAvailable = product.variants?.some((v) => {
                      const variantOptions = getVariantOptions(v)
                      const matchesCurrentSelections = Object.entries(selectedOptions)
                        .filter(([key]) => key !== optionType)
                        .every(([key, val]) => variantOptions[key] === val)
                      
                      const matchesThisOption = variantOptions[optionType] === value
                      const hasStock = v.inventoryQty === null || v.inventoryQty === undefined || v.inventoryQty > 0
                      
                      return matchesCurrentSelections && matchesThisOption && hasStock
                    })

                    return (
                      <Button
                        key={value}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleOptionSelect(optionType, value)}
                        disabled={!isAvailable}
                        className={`
                          ${isSelected ? "ring-2 ring-offset-2" : ""}
                          ${!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                      >
                        {value}
                      </Button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* מלאי */}
            {currentInventory !== undefined && currentInventory !== null && (
              <div className="text-sm">
                {currentInventory > 0 ? (
                  <span className="text-green-600">
                    ✓ במלאי ({currentInventory} יחידות)
                  </span>
                ) : (
                  <span className="text-red-600">✗ אזל מהמלאי</span>
                )}
              </div>
            )}

            {/* כמות */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">כמות</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                  min="1"
                  max={currentInventory || undefined}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={currentInventory !== undefined && currentInventory !== null && quantity >= currentInventory}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* הודעה אם חסרות בחירות */}
            {hasVariants && !selectedVariant && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                אנא בחר את כל האפשרויות
              </div>
            )}

            {/* כפתורים */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleAddToCart}
                disabled={!canAddToCart || isAddingToCart}
                className="flex-1"
                size="lg"
              >
                <ShoppingCart className="w-5 h-5 ml-2" />
                {isAddingToCart ? "מוסיף..." : "הוסף לעגלה"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onClose}
              >
                ביטול
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

