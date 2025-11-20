"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Package, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Bundle } from "../types"
import { useCart } from "@/hooks/useCart"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"

interface BundleSelectorProps {
  bundles: Bundle[]
  productId: string
  productPrice: number
  slug: string
  customerId?: string | null
  onAddToCart?: (bundleId: string) => void
  onCartUpdate?: () => void
  theme?: any
}

export function BundleSelector({
  bundles,
  productId,
  productPrice,
  slug,
  customerId,
  onAddToCart,
  onCartUpdate,
  theme,
}: BundleSelectorProps) {
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const { refetch } = useCart(slug, customerId)
  const { toast } = useToast()

  if (!bundles || bundles.length === 0) {
    return null
  }

  // חישוב מחירים לכל bundle
  const bundleOptions = bundles.map((bundle) => {
    // חישוב המחיר המקורי (סכום כל המוצרים)
    const originalPrice = bundle.products.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity)
    }, 0)

    // המחיר של ה-bundle
    const bundlePrice = bundle.price

    // חישוב הנחה
    const discount = originalPrice > bundlePrice 
      ? ((originalPrice - bundlePrice) / originalPrice) * 100 
      : 0

    // חישוב כמות כוללת של יחידות (לא מספר מוצרים שונים)
    const totalQuantity = bundle.products.reduce((sum, item) => sum + item.quantity, 0)
    const uniqueProductsCount = bundle.products.length

    return {
      ...bundle,
      originalPrice,
      bundlePrice,
      discount,
      totalQuantity,
      uniqueProductsCount,
    }
  })

  // מיון לפי הנחה (הכי משתלם ראשון)
  bundleOptions.sort((a, b) => b.discount - a.discount)

  const handleAddBundleToCart = async (bundleId: string) => {
    if (!selectedBundle) {
      toast({
        title: "שגיאה",
        description: "אנא בחר חבילה",
        variant: "destructive",
      })
      return
    }

    setIsAdding(true)

    try {
      // אם יש callback חיצוני, נשתמש בו
      if (onAddToCart) {
        await onAddToCart(bundleId)
        setIsAdding(false)
        return
      }

      // אחרת, נוסיף ישירות דרך API
      const response = await fetch(`/api/storefront/${slug}/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundleId,
          quantity,
        }),
      })

      if (response.ok) {
        const bundle = bundles.find(b => b.id === bundleId)
        toast({
          title: "נוסף לעגלה",
          description: `${bundle?.name || "החבילה"} נוספה לעגלה בהצלחה`,
        })

        // עדכון העגלה אם יש callback
        if (onCartUpdate) {
          onCartUpdate()
        }

        // רענון העגלה דרך useCart
        await refetch()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בהוספה לעגלה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding bundle to cart:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהוספה לעגלה",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-semibold text-gray-900">חבילות מוצרים</h3>
      </div>

      <div className="space-y-3">
        {bundleOptions.map((bundle, index) => {
          const isSelected = selectedBundle === bundle.id
          const isBestValue = index === 0 && bundle.discount > 0
          const isBestSeller = index === 1 && bundle.discount > 0 && bundle.totalQuantity === 2

          return (
            <Card
              key={bundle.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected && "ring-2 ring-emerald-500 border-emerald-500"
              )}
              onClick={() => setSelectedBundle(bundle.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      isSelected 
                        ? "bg-emerald-500 border-emerald-500" 
                        : "border-gray-300"
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {bundle.name}
                        </span>
                        {isBestValue && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                            הכי משתלם
                          </Badge>
                        )}
                        {isBestSeller && !isBestValue && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                            הכי נמכר
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {bundle.description || (
                          bundle.totalQuantity === 1 
                            ? "יחידה אחת"
                            : bundle.totalQuantity === 2
                            ? "2 יחידות"
                            : bundle.totalQuantity === 3
                            ? "3 יחידות"
                            : `${bundle.totalQuantity} יחידות`
                        )}
                        {bundle.uniqueProductsCount > 1 && !bundle.description && ` (${bundle.uniqueProductsCount} מוצרים שונים)`}
                      </p>
                    </div>
                  </div>

                  <div className="text-left ml-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-gray-900">
                        ₪{bundle.bundlePrice.toFixed(2)}
                      </span>
                      {bundle.originalPrice > bundle.bundlePrice && (
                        <span className="text-sm text-gray-400 line-through">
                          ₪{bundle.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {bundle.discount > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        חיסכון של {bundle.discount.toFixed(0)}%
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedBundle && (
        <div className="pt-4 border-t">
          <Button
            onClick={() => handleAddBundleToCart(selectedBundle)}
            disabled={isAdding || !selectedBundle}
            className="w-full prodify-gradient text-white"
            size="lg"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מוסיף...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 ml-2" />
                הוסף לעגלה
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

