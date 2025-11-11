"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'

interface CartItem {
  productId: string
  variantId: string | null
  quantity: number
  price: number
  total: number
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
    staleTime: 0, // תמיד לבדוק אם יש עדכון
    refetchOnWindowFocus: true, // לרענן כשחוזרים לחלון
    refetchOnMount: true, // לרענן כשהקומפוננטה עולה
  })
  
  // Add to cart mutation
  const addItem = useMutation({
    mutationFn: async ({
      productId,
      variantId,
      quantity = 1,
    }: {
      productId: string
      variantId?: string | null
      quantity?: number
    }) => {
      console.log('🛒 useCart - addItem called:', { productId, variantId, quantity, slug, customerId })
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (customerId) {
        headers['x-customer-id'] = customerId
      }
      
      console.log('📤 useCart - Sending request to:', `/api/storefront/${slug}/cart`)
      console.log('📋 useCart - Headers:', headers)
      console.log('📦 useCart - Body:', { productId, variantId, quantity })
      
      const response = await fetch(`/api/storefront/${slug}/cart`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ productId, variantId, quantity }),
      })
      
      console.log('📥 useCart - Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to add item' }))
        console.error('❌ useCart - Add to cart failed:', error)
        throw new Error(error.error || 'Failed to add to cart')
      }
      
      const data = await response.json()
      console.log('✅ useCart - Add to cart success:', data)
      return data
    },
    onSuccess: (data) => {
      console.log('✨ useCart - onSuccess called with data:', data)
      queryClient.setQueryData(['cart', slug, customerId], data)
      console.log('📌 useCart - Query data updated')
      toast({
        title: 'נוסף לעגלה',
        description: 'המוצר נוסף לעגלה בהצלחה',
      })
    },
    onError: (error: Error) => {
      console.error('💥 useCart - onError called:', error)
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
    }: {
      productId: string
      variantId: string | null
    }) => {
      const headers: HeadersInit = {}
      if (customerId) {
        headers['x-customer-id'] = customerId
      }
      
      const params = new URLSearchParams({ productId })
      if (variantId) {
        params.append('variantId', variantId)
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
