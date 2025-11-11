"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useAddToCart } from "@/hooks/useAddToCart"
import { QuickAddModal } from "./QuickAddModal"

interface ProductVariant {
  id: string
  name: string
  price: number
  comparePrice: number | null
  inventoryQty: number | null
  sku: string | null
  options: Record<string, string>
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

interface AddToCartButtonProps {
  slug: string
  productId: string
  productName: string
  variantId?: string | null
  quantity?: number
  customerId?: string | null
  onSuccess?: () => void
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  fullWidth?: boolean
  showIcon?: boolean
  disabled?: boolean
  // אפשרויות למודל הוספה מהירה
  useQuickAddModal?: boolean
  product?: Product
  // פתיחת עגלה אוטומטית אחרי הוספה
  autoOpenCart?: boolean
  onCartOpen?: () => void
}

/**
 * קומפוננטת כפתור אחידה להוספת מוצר לעגלה
 * ניתנת לשימוש בכל מקום - עמוד מוצר, דפים, קטגוריות, בילדר וכו'
 * תומכת במודל הוספה מהירה עבור מוצרים עם variants
 */
export function AddToCartButton({
  slug,
  productId,
  productName,
  variantId = null,
  quantity = 1,
  customerId = null,
  onSuccess,
  variant = "default",
  size = "default",
  className = "",
  fullWidth = false,
  showIcon = true,
  disabled = false,
  useQuickAddModal = false,
  product,
  autoOpenCart = false,
  onCartOpen,
}: AddToCartButtonProps) {
  const [showModal, setShowModal] = useState(false)
  
  const { addToCart, isAddingToCart, addingToCart } = useAddToCart({
    slug,
    customerId,
    onSuccess,
    autoOpenCart,
  })

  const isCurrentlyAdding = addingToCart === productId

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // אם יש מודל והמוצר נשלח, או אם יש variants - פתח מודל
    if (useQuickAddModal && product) {
      setShowModal(true)
      return
    }
    
    // אחרת, הוסף ישירות
    addToCart({
      productId,
      variantId,
      quantity,
      productName,
    })
  }

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={disabled || isAddingToCart || isCurrentlyAdding}
        variant={variant}
        size={size}
        className={`${fullWidth ? 'w-full' : ''} ${className}`}
      >
        {showIcon && <ShoppingCart className="w-4 h-4 ml-2" />}
        {isCurrentlyAdding ? "מוסיף..." : "הוספה מהירה"}
      </Button>

      {/* מודל הוספה מהירה */}
      {useQuickAddModal && product && (
        <QuickAddModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          product={product}
          slug={slug}
          customerId={customerId}
          onSuccess={onSuccess}
          autoOpenCart={autoOpenCart}
          onCartOpen={onCartOpen}
        />
      )}
    </>
  )
}

