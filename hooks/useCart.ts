"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'

interface CartItem {
  productId: string
  variantId: string | null
  quantity: number
  price: number
  total: number
  isGift?: boolean
  giftDiscountId?: string
  product: {
    id: string
    name: string
    price: number
    comparePrice: number | null
    images: string[]
    sku: string | null
  }
  variant: {
    id: string
    name: string
    price: number
    sku: string | null
    inventoryQty: number | null
  } | null
}

interface GiftRequiringVariantSelection {
  discountId: string
  productId: string
  productName: string
  hasVariants: boolean
  isOutOfStock?: boolean
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
  automaticDiscountTitle?: string | null
  couponStatus?: {
    code: string
    isValid: boolean
    reason?: string
    minOrderRequired?: number
  }
  giftsRequiringVariantSelection?: GiftRequiringVariantSelection[]
}

/**
 * Hook לניהול עגלת קניות - גרסה פשוטה ויציבה
 * הכל בדאטאבייס, ללא localStorage
 */
export function useCart(slug: string, customerId?: string | null) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  // Fetch cart from server ONLY
  const { data: cart, isLoading, error, refetch } = useQuery({
    queryKey: ['cart', slug, customerId],
    queryFn: async () => {
      const headers: HeadersInit = {}
      if (customerId) {
        headers['x-customer-id'] = customerId
      }
      
      const response = await fetch(`/api/storefront/${slug}/cart`, {
        headers,
        credentials: 'include', // חשוב! שולח cookies עם הבקשה
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch cart')
      }
      
      return response.json() as Promise<Cart>
    },
    staleTime: 1000, // 1 שנייה - מפחית קריאות מיותרות אבל מאפשר עדכון מהיר
    gcTime: 5 * 60 * 1000, // 5 דקות ב-cache
    refetchOnWindowFocus: false, // לא לרענן כל פעם שחוזרים לחלון
    refetchOnMount: true, // רענון כשהקומפוננטה עולה כדי לוודא שהעגלה מעודכנת
  })
  
  // Add to cart mutation
  const addItem = useMutation({
    mutationFn: async ({
      productId,
      variantId,
      quantity = 1,
      addons,
      giftCardData,
    }: {
      productId: string
      variantId?: string | null
      quantity?: number
      addons?: Array<{
        addonId: string
        valueId: string | null
        label: string
        price: number
        quantity: number
      }>
      giftCardData?: {
        recipientName: string
        recipientEmail: string
        recipientPhone: string
        senderName: string
        message: string
      }
    }) => {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (customerId) {
        headers['x-customer-id'] = customerId
      }
      
      const response = await fetch(`/api/storefront/${slug}/cart`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ productId, variantId, quantity, addons, giftCardData }),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to add item' }))
        throw new Error(error.error || 'Failed to add to cart')
      }
      
      const data = await response.json()
      return data
    },
    onSuccess: (data: Cart) => {
      // עדכון ה-cache עם הנתונים החדשים מהשרת
      queryClient.setQueryData(['cart', slug, customerId], data)
      
      // טיפול במתנות שדורשות בחירת וריאציה
      if (data.giftsRequiringVariantSelection && data.giftsRequiringVariantSelection.length > 0) {
        const gift = data.giftsRequiringVariantSelection[0]
        
        if (gift.isOutOfStock) {
          toast({
            title: 'מתנה לא זמינה',
            description: `לצערנו אזל המלאי ממוצר המתנה "${gift.productName}" ולכן המבצע לא חל`,
            variant: 'destructive',
          })
        } else {
          // נשלח event כדי לפתוח מודל בחירת וריאציה
          // הקומפוננטה שצריכה לטפל בזה תאזין ל-event הזה
          window.dispatchEvent(new CustomEvent('openGiftVariantModal', {
            detail: {
              productId: gift.productId,
              productName: gift.productName,
              discountId: gift.discountId,
            }
          }))
        }
      }
      // הערה: הטוסט להוספה לעגלה מטופל ב-useAddToCart.ts עם לוגיקה של autoOpenCart
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
  
  // Update item quantity mutation
  const updateItem = useMutation({
    mutationFn: async ({
      productId,
      variantId,
      quantity,
    }: {
      productId: string
      variantId: string | null
      quantity: number
    }) => {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (customerId) {
        headers['x-customer-id'] = customerId
      }
      
      const response = await fetch(`/api/storefront/${slug}/cart`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ productId, variantId, quantity }),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update item' }))
        throw new Error(error.error || 'Failed to update cart')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cart', slug, customerId], data)
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
  
  // Remove item mutation
  const removeItem = useMutation({
    mutationFn: async ({
      productId,
      variantId,
      addons,
    }: {
      productId: string
      variantId: string | null
      addons?: Array<{
        addonId: string
        valueId: string | null
        label: string
        price: number
        quantity: number
      }>
    }) => {
      const headers: HeadersInit = {}
      if (customerId) {
        headers['x-customer-id'] = customerId
      }
      
      const params = new URLSearchParams({ productId })
      if (variantId) {
        params.append('variantId', variantId)
      }
      if (addons && addons.length > 0) {
        params.append('addons', JSON.stringify(addons))
      }
      
      const response = await fetch(
        `/api/storefront/${slug}/cart?${params}`,
        {
          method: 'DELETE',
          headers,
          credentials: 'include',
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to remove item')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      // עדכן את העגלה ישירות עם הנתונים שחזרו מהשרver
      queryClient.setQueryData(['cart', slug, customerId], data)
      toast({
        title: 'הוסר מהעגלה',
        description: 'המוצר הוסר בהצלחה',
      })
    },
    onError: () => {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להסיר את המוצר',
        variant: 'destructive',
      })
    },
  })
  
  // Apply coupon mutation
  const applyCoupon = useMutation({
    mutationFn: async (couponCode: string) => {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (customerId) {
        headers['x-customer-id'] = customerId
      }
      
      const response = await fetch(`/api/storefront/${slug}/cart`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ couponCode }),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Invalid coupon' }))
        throw new Error(error.error || 'Invalid coupon code')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cart', slug, customerId], data)
      toast({
        title: 'הצלחה',
        description: 'קוד הקופון הוחל בהצלחה',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
  
  // Remove coupon mutation
  const removeCoupon = useMutation({
    mutationFn: async () => {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (customerId) {
        headers['x-customer-id'] = customerId
      }
      
      const response = await fetch(`/api/storefront/${slug}/cart`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ couponCode: null }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove coupon')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cart', slug, customerId], data)
      toast({
        title: 'הוסר',
        description: 'הקופון הוסר מהעגלה',
      })
    },
    onError: () => {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להסיר את הקופון',
        variant: 'destructive',
      })
    },
  })
  
  return {
    cart,
    isLoading,
    error,
    refetch,
    addItem: addItem.mutateAsync,
    updateItem: updateItem.mutateAsync,
    removeItem: removeItem.mutateAsync,
    applyCoupon: applyCoupon.mutateAsync,
    removeCoupon: removeCoupon.mutateAsync,
    isAddingItem: addItem.isPending,
    isUpdatingItem: updateItem.isPending,
    isRemovingItem: removeItem.isPending,
    isApplyingCoupon: applyCoupon.isPending,
  }
}
