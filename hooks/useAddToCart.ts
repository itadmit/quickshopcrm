"use client"

import { useState } from 'react'
import { useCart } from './useCart'
import { useToast } from '@/components/ui/use-toast'

interface UseAddToCartOptions {
  slug: string
  customerId?: string | null
  onSuccess?: () => void
  autoOpenCart?: boolean // האם העגלה נפתחת אוטומטית
}

interface AddToCartParams {
  productId: string
  variantId?: string | null
  quantity?: number
  productName?: string
  // אופציונלי - אם יש נתוני מוצר, נבדוק מלאי לפני הוספה
  productData?: {
    availability?: string
    inventoryQty?: number | null
    variants?: Array<{
      id: string
      inventoryQty?: number | null
    }>
  }
}

/**
 * 🎯 המערכת המרכזית היחידה להוספת מוצרים לעגלה
 * 
 * פשוטה, יציבה ונכונה - קוראים לה והיא עושה הכל:
 * - בודקת מלאי
 * - מוסיפה לעגלה
 * - מטפלת בשגיאות
 * - מעדכנת UI
 * 
 * שימוש:
 * ```tsx
 * const { addToCart, isAddingToCart } = useAddToCart({ slug, customerId })
 * 
 * await addToCart({
 *   productId: 'xxx',
 *   variantId: 'yyy', // אופציונלי
 *   quantity: 1,
 *   productName: 'שם המוצר'
 * })
 * ```
 */
export function useAddToCart({ slug, customerId, onSuccess, autoOpenCart = true }: UseAddToCartOptions) {
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const { addItem, isAddingItem } = useCart(slug, customerId)
  const { toast } = useToast()

  const addToCart = async ({
    productId,
    variantId = null,
    quantity = 1,
    productName = 'המוצר',
    productData
  }: AddToCartParams): Promise<boolean> => {
    // בדיקת מלאי אם יש נתוני מוצר
    if (productData) {
      let availableQty = productData.inventoryQty
      
      // אם יש variant, בדוק את המלאי שלו
      if (variantId && productData.variants) {
        const variant = productData.variants.find(v => v.id === variantId)
        if (variant) {
          availableQty = variant.inventoryQty
        }
      }
      
      // בדיקה אם המוצר אזל מהמלאי
      if (productData.availability === "OUT_OF_STOCK" || availableQty === 0) {
        toast({
          title: "שגיאה",
          description: "המוצר אזל מהמלאי",
          variant: "destructive",
        })
        return false
      }
      
      // בדיקה אם הכמות המבוקשת גדולה מהמלאי הזמין
      if (availableQty !== null && quantity > availableQty) {
        toast({
          title: "שגיאה",
          description: `המלאי הזמין הוא ${availableQty} יחידות בלבד`,
          variant: "destructive",
        })
        return false
      }
    }

    setAddingToCart(productId)

    try {
      await addItem({
        productId,
        variantId: variantId || undefined, // שולח undefined במקום null
        quantity,
      })

      // הצגת טוסט רק אם העגלה לא נפתחת אוטומטית
      if (!autoOpenCart) {
        toast({
          title: 'נוסף לעגלה',
          description: `${productName} נוסף לעגלה בהצלחה`,
        })
      }

      // קריאה ל-callback אם קיים
      if (onSuccess) {
        onSuccess()
      }

      return true
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בהוספה לעגלה',
        variant: 'destructive',
      })
      return false
    } finally {
      setAddingToCart(null)
    }
  }

  return {
    addToCart,
    addingToCart,
    isAddingToCart: isAddingItem || !!addingToCart,
  }
}

