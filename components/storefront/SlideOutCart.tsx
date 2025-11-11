"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Tag,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { CartSkeleton, CartSummarySkeleton } from "@/components/skeletons/CartSkeleton"
import { useShopTheme } from "@/hooks/useShopTheme"
import { useCart } from "@/hooks/useCart"
import { useDebouncedCallback } from "use-debounce"

interface CartItem {
  productId: string
  variantId: string | null
  quantity: number
  price: number
  total: number
  product: {
    id: string
    name: string
    images: string[]
  }
  variant: {
    id: string
    name: string
  } | null
}

interface Cart {
  id: string
  items: CartItem[]
  subtotal: number
  tax: number
  shipping: number
  total: number
  couponCode: string | null
  discount: number
  customerDiscount?: number
  couponDiscount?: number
  automaticDiscount?: number
  couponStatus?: {
    code: string
    isValid: boolean
    reason?: string
    minOrderRequired?: number
  }
}

interface SlideOutCartProps {
  slug: string
  isOpen: boolean
  onClose: () => void
  customerId?: string | null
  onCartUpdate?: () => void
  refreshKey?: number
}

export function SlideOutCart({ slug, isOpen, onClose, customerId, onCartUpdate, refreshKey }: SlideOutCartProps) {
  const router = useRouter()
  const { theme } = useShopTheme(slug)
  const [couponCode, setCouponCode] = useState("")
  const [showDiscount, setShowDiscount] = useState(false)
  const [showCoupon, setShowCoupon] = useState(false)
  const [updatingItem, setUpdatingItem] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // שימוש ב-useCart hook החדש
  const { 
    cart, 
    isLoading, 
    updateItem: updateItemMutation, 
    removeItem: removeItemMutation, 
    applyCoupon: applyCouponMutation,
    removeCoupon: removeCouponMutation,
    isUpdatingItem,
    isApplyingCoupon,
    refetch
  } = useCart(slug, customerId)

  // Debouncing לעדכוני כמות - מונע קריאות API מיותרות
  const debouncedUpdateQuantity = useDebouncedCallback(
    (productId: string, variantId: string | null, quantity: number) => {
      if (quantity <= 0) {
        removeItemMutation({ productId, variantId })
        return
      }
      updateItemMutation({ productId, variantId, quantity })
      if (onCartUpdate) {
        onCartUpdate()
      }
    },
    500 // ממתין 500ms לפני ביצוע
  )

  // עדכון עגלה כש-refreshKey משתנה
  useEffect(() => {
    if (isOpen && refreshKey !== undefined) {
      refetch()
      if (onCartUpdate) {
        onCartUpdate()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, isOpen])

  const handleQuantityChange = (productId: string, variantId: string | null, quantity: number) => {
    setUpdatingItem(`${productId}-${variantId}`)
    // עדכון אופטימיסטי מיד (על ידי React Query)
    // העדכון האמיתי יקרה אחרי 500ms
    debouncedUpdateQuantity(productId, variantId, quantity)
  }

  const handleRemoveItem = async (productId: string, variantId: string | null) => {
    console.log('🗑️ handleRemoveItem called:', { productId, variantId })
    setUpdatingItem(`${productId}-${variantId}`)
    
    try {
      console.log('🚀 Calling removeItemMutation...')
      const result = await removeItemMutation({ productId, variantId })
      console.log('✅ Remove successful:', result)
      
      // המחיקה הצליחה, עכשיו נעדכן את המונה
      if (onCartUpdate) {
        onCartUpdate()
      }
      setUpdatingItem(null)
    } catch (error) {
      console.error('❌ Remove failed:', error)
      setUpdatingItem(null)
    }
  }

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return
    applyCouponMutation(couponCode)
    setCouponCode("")
    if (onCartUpdate) {
      onCartUpdate()
    }
  }

  const handleCouponRemove = () => {
    removeCouponMutation()
    if (onCartUpdate) {
      onCartUpdate()
    }
  }

  return (
    <>
      {/* Cart Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-full md:w-[420px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        dir="rtl"
        style={{ direction: "rtl" }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">עגלה</h2>
              {mounted && cart && cart.items && cart.items.length > 0 && (
                <Badge className="bg-gray-200 text-gray-700 shadow-sm">
                  {cart.items.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-700" />
            </Button>
          </div>

                  {/* Cart Content */}
                  <div className="flex-1 overflow-y-auto">
                    {isLoading && !cart ? (
                      <div className="p-6 space-y-4">
                        <CartSkeleton />
                      </div>
                    ) : !cart || !cart.items || cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <ShoppingCart className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  העגלה שלך ריקה
                </h3>
                <p className="text-gray-600 mb-6">
                  הוסף מוצרים לעגלה כדי להתחיל
                </p>
                <button
                  onClick={onClose}
                  className="text-white rounded-lg px-4 py-2 font-medium transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: theme.primaryColor || "#000000",
                  }}
                >
                  המשך לקניות
                </button>
              </div>
            ) : (
              <div className="p-3 space-y-2 overflow-x-hidden">
                {cart.items.map((item, index) => (
                  <div 
                    key={index} 
                    className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow duration-200"
                  >
                    <div className="flex gap-3 items-stretch">
                      {/* Product Image - Square, full height */}
                      <Link
                        href={`/shop/${slug}/products/${item.productId}`}
                        onClick={onClose}
                        className="flex-shrink-0 self-stretch"
                      >
                        {item.product.images && item.product.images.length > 0 ? (
                          <div className="h-full w-20 rounded border border-gray-100 overflow-hidden">
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-full w-20 bg-gray-50 rounded border border-gray-100 flex items-center justify-center">
                            <ShoppingCart className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                      </Link>

                      {/* Product Info & Controls */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        {/* Top Section - Product Name, Variant, Price per unit */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/shop/${slug}/products/${item.productId}`}
                              onClick={onClose}
                              className="block"
                            >
                              <h3 className="font-medium text-gray-900 text-sm line-clamp-1 hover:text-gray-600 transition-colors mb-0.5">
                                {item.product.name}
                              </h3>
                            </Link>
                            {item.variant && (
                              <p className="text-xs text-gray-500 mb-1">{item.variant.name}</p>
                            )}
                            <p className="text-xs text-gray-600">
                              ₪{item.price.toFixed(2)}
                            </p>
                          </div>
                          
                          {/* Remove Button - Top Right */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.productId, item.variantId)}
                            disabled={updatingItem === `${item.productId}-${item.variantId}` || isUpdatingItem}
                            className="p-1 h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Bottom Section - Quantity Controls and Total Price */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          {/* Quantity Controls */}
                          <div className="flex items-center border border-gray-300 rounded">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleQuantityChange(
                                  item.productId,
                                  item.variantId,
                                  item.quantity - 1
                                )
                              }
                              disabled={updatingItem === `${item.productId}-${item.variantId}` || isUpdatingItem}
                              className="p-1 h-7 w-7 rounded-none hover:bg-gray-50 transition-colors"
                            >
                              <Minus className="w-3 h-3 text-gray-600" />
                            </Button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(
                                  item.productId,
                                  item.variantId,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              onWheel={(e) => {
                                // מונע שינוי ערך בגלילת עכבר
                                e.currentTarget.blur()
                              }}
                              className="w-8 h-7 text-center border-0 focus:outline-none focus:ring-0 text-xs font-medium bg-white"
                              min="1"
                              disabled={updatingItem === `${item.productId}-${item.variantId}` || isUpdatingItem}
                              style={{
                                WebkitAppearance: "none",
                                MozAppearance: "textfield",
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleQuantityChange(
                                  item.productId,
                                  item.variantId,
                                  item.quantity + 1
                                )
                              }
                              disabled={updatingItem === `${item.productId}-${item.variantId}` || isUpdatingItem}
                              className="p-1 h-7 w-7 rounded-none hover:bg-gray-50 transition-colors"
                            >
                              <Plus className="w-3 h-3 text-gray-600" />
                            </Button>
                          </div>
                          
                          {/* Total Price - Right aligned */}
                          <div className="text-right">
                            <span className="font-bold text-base text-gray-900">
                              ₪{item.total.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Summary */}
          {isLoading && !cart ? (
            <div className="border-t border-gray-200 p-6 bg-white">
              <CartSummarySkeleton />
            </div>
          ) : cart && cart.items && cart.items.length > 0 && (
            <div className="border-t border-gray-200 p-6 bg-white">
              {/* Coupon Code Section - Expandable */}
              <div className="mb-4">
                {/* אם יש קופון, תמיד להציג אותו */}
                {mounted && cart.couponCode ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">קוד קופון</span>
                    </div>
                    {mounted && cart.couponCode && (
                      <div className="mt-3 p-3 rounded-lg border" style={{
                        backgroundColor: cart.couponStatus?.isValid ? '#f0fdf4' : '#fefce8',
                        borderColor: cart.couponStatus?.isValid ? '#86efac' : '#fde047'
                      }}>
                        <div className="flex items-start gap-3">
                          {cart.couponStatus?.isValid ? (
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-700 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-semibold text-sm ${cart.couponStatus?.isValid ? 'text-green-800' : 'text-yellow-800'}`}>
                                קופון: {cart.couponCode}
                              </span>
                              {cart.couponStatus?.isValid && cart.couponDiscount && cart.couponDiscount > 0 && (
                                <span className="text-xs font-bold text-green-600">
                                  -₪{cart.couponDiscount.toFixed(2)}
                                </span>
                              )}
                            </div>
                            {cart.couponStatus?.isValid ? (
                              <p className="text-xs text-green-700 font-medium">
                                הקופון הוחל בהצלחה!
                              </p>
                            ) : (
                              <div className="text-xs text-yellow-700">
                                <p className="font-medium mb-1">{cart.couponStatus?.reason}</p>
                                {cart.couponStatus?.minOrderRequired && (
                                  <p className="font-semibold">
                                    הוסיפו עוד ₪{(cart.couponStatus.minOrderRequired - cart.subtotal).toFixed(2)} לקבלת ההנחה
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleCouponRemove()}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => setShowCoupon(!showCoupon)}
                      className="w-full flex items-center justify-between text-gray-900 hover:text-gray-700 transition-colors mb-2"
                    >
                      <span className="font-medium">קוד קופון</span>
                      {showCoupon ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>
                    
                    {showCoupon && (
                      <div className="mt-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="קוד קופון"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleApplyCoupon}
                            variant="outline"
                            size="sm"
                            className="px-4"
                            disabled={isApplyingCoupon}
                          >
                            <Tag className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>


              {/* Discount - Only show if there's a discount */}
              {((cart.customerDiscount && cart.customerDiscount > 0) || (cart.couponDiscount && cart.couponDiscount > 0) || (cart.automaticDiscount && cart.automaticDiscount > 0)) && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <button
                    onClick={() => setShowDiscount(!showDiscount)}
                    className="w-full flex items-center justify-between text-gray-900 hover:text-gray-700 transition-colors"
                  >
                    <span className="font-medium">הנחה</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">
                        -₪{(
                          (cart.customerDiscount || 0) + 
                          (cart.couponDiscount || 0) + 
                          (cart.automaticDiscount || 0)
                        ).toFixed(2)}
                      </span>
                      {showDiscount ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                  {showDiscount && (
                    <div className="mt-3 space-y-2">
                      {cart.customerDiscount && cart.customerDiscount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>הנחת לקוח</span>
                          <span>-₪{cart.customerDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      {cart.couponDiscount && cart.couponDiscount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>קופון {cart.couponCode}</span>
                          <span>-₪{cart.couponDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      {cart.automaticDiscount && cart.automaticDiscount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>הנחה אוטומטית</span>
                          <span>-₪{cart.automaticDiscount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Estimated Total */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-900 font-medium">סה"כ משוער</span>
                  <span className="text-2xl font-bold text-gray-900">
                    ₪{cart.total.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  דמי משלוח יחושבו בקופה
                </p>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => {
                  onClose()
                  router.push(`/shop/${slug}/checkout`)
                }}
                className="w-full text-white rounded-lg h-11 px-8 font-medium transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: theme.primaryColor || "#000000",
                }}
              >
                מעבר לקופה
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

