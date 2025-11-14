"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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
import { Gift, Plus, Minus, Package, Sparkles, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"

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

interface GiftProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product
  slug: string
  customerId?: string | null
  onSuccess?: () => void
  autoOpenCart?: boolean
  onCartOpen?: () => void
  giftDiscountId: string
  giftTitle?: string
}

export function GiftProductModal({
  isOpen,
  onClose,
  product,
  slug,
  customerId,
  onSuccess,
  autoOpenCart = false,
  onCartOpen,
  giftDiscountId,
  giftTitle = "קבלת מתנה",
}: GiftProductModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [imageError, setImageError] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { toast } = useToast()
  
  // מתנה תמיד כמות 1
  const quantity = 1

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
    }
  }, [isOpen, product])

  // מציאת כל סוגי האפשרויות - מעדיפים options אם קיימים, אחרת מה-variants
  const optionTypes = useMemo(() => {
    if (product.options && product.options.length > 0) {
      // אם יש options במסד, נשתמש בהם
      return product.options.map((opt: any) => opt.name || opt.id)
    } else if (product.variants) {
      // אחרת ננסה לחלץ מה-variants
      return Array.from(
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
    }
    return []
  }, [product.options, product.variants])

  // מציאת ערכים אפשריים לכל סוג
  const getOptionValues = useCallback((optionType: string) => {
    // אם יש options, נשתמש בהם
    if (product.options && product.options.length > 0) {
      const option = product.options.find((opt: any) => (opt.name || opt.id) === optionType)
      if (option && option.values) {
        // נעדיף label, אחר כך id, אחר כך value
        return option.values.map((v: any) => {
          if (typeof v === 'string') return v
          return v.label || v.id || v.value || v.name
        })
      }
    }
    
    // אחרת ננסה לחלץ מה-variants
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
  }, [product.options, product.variants])

  // בחירת אפשרות
  const handleOptionSelect = useCallback((optionType: string, value: string) => {
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
  }, [selectedOptions, product.variants])

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

  const handleAddGiftToCart = async () => {
    if (!canAddToCart) return

    setIsAdding(true)
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
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to add gift to cart')
      }

      toast({
        title: "🎁 מתנה נוספה לעגלה!",
        description: "המתנה שלך מחכה לך בעגלה",
      })

      if (onSuccess) onSuccess()
      onClose()
      setSelectedVariant(null)
      setSelectedOptions({})
      
      if (autoOpenCart && onCartOpen) {
        setTimeout(() => {
          onCartOpen()
        }, 300)
      }
    } catch (error: any) {
      console.error('Error adding gift to cart:', error)
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בהוספת המתנה",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        {/* Header עדין */}
        <DialogHeader className="relative pb-2">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-50/30 via-purple-50/30 to-blue-50/30 rounded-t-lg -mx-6 -mt-6 h-20" />
          <div className="relative text-center py-2">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400 rounded-full mb-1.5">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 mb-0.5">
              {giftTitle}
            </DialogTitle>
            <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              מגיע לך מתנה מיוחדת
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </p>
          </div>
          <DialogDescription className="sr-only">
            בחירת אפשרויות למוצר המתנה
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* תמונה */}
          <div className="relative max-w-[200px] mx-auto">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-50 relative border-2 border-purple-100">
              {product.images && product.images.length > 0 && !imageError ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-gray-300" />
                </div>
              )}

              {isOutOfStock && (
                <div className="absolute bottom-2 left-2 right-2">
                  <Badge className="bg-red-500 text-white text-xs w-full justify-center">
                    אזל מהמלאי
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* שם המוצר */}
          <div className="text-center">
            <h3 className="text-base font-bold text-gray-900">
              {product.name}
            </h3>
          </div>

          {/* מחיר - מחוק */}
          <div className="flex items-center justify-center gap-2 py-1.5 border-y border-gray-100">
            <span className="text-sm font-medium text-gray-400 line-through">
              ₪{currentPrice.toFixed(2)}
            </span>
            <span className="text-xl font-bold text-green-600">
              חינם!
            </span>
            <Badge className="bg-green-100 text-green-700 text-xs">
              <Gift className="w-3 h-3 ml-1" />
              100% הנחה
            </Badge>
          </div>

          {/* אפשרויות (Variants) */}
          {optionTypes.length > 0 && (
            <div className="space-y-2.5">
              {optionTypes.map((optionType) => {
                const isOptionSelected = selectedOptions[optionType] !== undefined
                return (
                  <div key={optionType}>
                    <Label className="block text-sm font-semibold text-gray-900 mb-2 text-center">
                      {optionType === "Size" ? "מידה" : 
                       optionType === "Color" ? "צבע" : 
                       optionType}
                    </Label>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {getOptionValues(optionType).map((value) => {
                        const isSelected = selectedOptions[optionType] === value
                        
                        // בדיקה האם האפשרות זמינה
                        const isAvailable = (() => {
                          // אם אין variants, הכל זמין
                          if (!product.variants || product.variants.length === 0) return true
                          
                          // Debug
                          if (optionType === optionTypes[0] && value === getOptionValues(optionType)[0]) {
                            const firstVariant = product.variants[0]
                            const variantOptions = getVariantOptions(firstVariant)
                            console.log('🐛 Debug availability:', {
                              optionType,
                              value,
                              firstVariantOptions: variantOptions,
                              selectedOptions,
                              allOptionTypes: optionTypes
                            })
                          }
                          
                          return product.variants.some((v) => {
                            const variantOptions = getVariantOptions(v)
                            
                            // בדיקה שהבחירות הקודמות תואמות (מלבד האפשרות הנוכחית)
                            const matchesCurrentSelections = Object.entries(selectedOptions)
                              .filter(([key]) => key !== optionType)
                              .every(([key, val]) => variantOptions[key] === val)
                            
                            // בדיקה שהאפשרות הנוכחית תואמת
                            const matchesThisOption = variantOptions[optionType] === value
                            
                            // בדיקת מלאי
                            const hasStock = v.inventoryQty === null || v.inventoryQty === undefined || v.inventoryQty > 0
                            
                            return matchesCurrentSelections && matchesThisOption && hasStock
                          })
                        })()

                        return (
                          <button
                            key={value}
                            onClick={() => handleOptionSelect(optionType, value)}
                            disabled={!isAvailable}
                            className={`px-4 py-2 border-2 rounded-sm text-sm font-medium transition-all ${
                              isSelected
                                ? "text-white bg-purple-500 border-purple-500"
                                : isAvailable
                                ? "border-gray-300 text-gray-700 hover:border-purple-300 hover:bg-purple-50"
                                : "border-gray-200 text-gray-400 opacity-50 cursor-not-allowed"
                            }`}
                          >
                            {value}
                          </button>
                        )
                      })}
                    </div>
                    {!isOptionSelected && (
                      <p className="text-red-600 text-xs mt-1.5 font-medium flex items-center justify-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        יש לבחור {optionType === "Size" ? "מידה" : optionType === "Color" ? "צבע" : optionType}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* הודעה אם חסרות בחירות */}
          {hasVariants && !selectedVariant && (
            <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 text-center">
              אנא בחר את כל האפשרויות כדי לקבל את המתנה
            </div>
          )}

          {/* כפתורים */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleAddGiftToCart}
              disabled={!canAddToCart || isAdding}
              className="w-full h-11 text-base font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Gift className="w-5 h-5 ml-2" />
              {isAdding ? "מוסיף מתנה..." : "קבל את המתנה!"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-full text-gray-500 hover:text-gray-700"
            >
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

