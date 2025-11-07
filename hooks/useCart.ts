/**
 * Hook משופר לניהול עגלה עם React Query
 * 
 * שיפורים:
 * - Optimistic Updates
 * - Cache חכם
 * - Retry logic
 * - Real-time sync בין טאבים
 * - Local Storage backup
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { useEffect } from 'react'

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
}

// Local Storage helpers
const CartStorage = {
  get: (slug: string): Cart | null => {
    if (typeof window === 'undefined') return null
    try {
      const data = localStorage.getItem(`cart_${slug}`)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  },
  
  set: (slug: string, cart: Cart) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`cart_${slug}`, JSON.stringify(cart))
      // Trigger storage event for other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: `cart_${slug}`,
        newValue: JSON.stringify(cart),
      }))
    } catch (error) {
      console.error('Error saving cart to localStorage:', error)
    }
  },
  
  remove: (slug: string) => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`cart_${slug}`)
  },
}

export function useCart(slug: string, customerId?: string | null) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  // Fetch cart
  const {
    data: cart,
    isLoading,
    error,
  } = useQuery<Cart>({
    queryKey: ['cart', slug, customerId],
    queryFn: async () => {
      const headers: HeadersInit = {}
      if (customerId) {
        headers['x-customer-id'] = customerId
      }
      
      const response = await fetch(`/api/storefront/${slug}/cart`, {
        headers,
        cache: 'no-store',
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch cart')
      }
      
      const data = await response.json()
      
      // וודא ש-items תמיד יהיה array
      if (!data.items) {
        data.items = []
      }
      
      // Save to localStorage
      if (data.items && data.items.length > 0) {
        CartStorage.set(slug, data)
      }
      
      return data
    },
    staleTime: 2000, // 2 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime)
    refetchOnWindowFocus: true, // Sync between tabs
    refetchOnMount: true,
    // Use localStorage as initial data if available
    initialData: () => CartStorage.get(slug) || undefined,
  })
  
  // Update quantity mutation with optimistic updates
  const updateQuantity = useMutation({
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
        body: JSON.stringify({
          productId,
          variantId,
          quantity,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || 'Failed to update cart')
      }
      
      return response.json()
    },
    // Optimistic update - update UI immediately
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['cart', slug, customerId] })
      
      // Snapshot previous value
      const previousCart = queryClient.getQueryData<Cart>(['cart', slug, customerId])
      
      // Optimistically update
      queryClient.setQueryData<Cart>(['cart', slug, customerId], (old) => {
        if (!old) return old
        
        const currentItems = old.items || []
        const items = [...currentItems]
        const itemIndex = items.findIndex(
          (item) =>
            item.productId === newData.productId &&
            (item.variantId === newData.variantId ||
              (!item.variantId && !newData.variantId))
        )
        
        if (itemIndex >= 0) {
          if (newData.quantity <= 0) {
            // Remove item
            items.splice(itemIndex, 1)
          } else {
            // Update quantity
            items[itemIndex] = {
              ...items[itemIndex],
              quantity: newData.quantity,
              total: items[itemIndex].price * newData.quantity,
            }
          }
          
          // Recalculate totals
          const subtotal = items.length > 0 ? items.reduce((sum, item) => sum + item.total, 0) : 0
          const discount = old.discount || 0
          const tax = old.tax || 0
          const shipping = old.shipping || 0
          const total = subtotal - discount + tax + shipping
          
          return {
            ...old,
            items: items.length > 0 ? items : [], // תמיד array, גם אם ריק
            subtotal,
            total: Math.max(0, total),
          }
        }
        
        return old
      })
      
      return { previousCart }
    },
    // On error, rollback
    onError: (err, newData, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart', slug, customerId], context.previousCart)
      }
      toast({
        title: 'שגיאה',
        description: err instanceof Error ? err.message : 'לא ניתן לעדכן את העגלה',
        variant: 'destructive',
      })
    },
    // On success, refetch to get accurate totals
    onSuccess: (data) => {
      queryClient.setQueryData(['cart', slug, customerId], data)
      if (data.items && data.items.length > 0) {
        CartStorage.set(slug, data)
      }
    },
    // Always refetch after mutation
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', slug, customerId] })
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
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to remove item')
      }
      
      return response.json()
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['cart', slug, customerId] })
      const previousCart = queryClient.getQueryData<Cart>(['cart', slug, customerId])
      
      queryClient.setQueryData<Cart>(['cart', slug, customerId], (old) => {
        if (!old) return old
        
        const currentItems = old.items || []
        const items = currentItems.filter(
          (item) =>
            !(
              item.productId === newData.productId &&
              item.variantId === newData.variantId
            )
        )
        
        const subtotal = items.length > 0 ? items.reduce((sum, item) => sum + item.total, 0) : 0
        const discount = old.discount || 0
        const tax = old.tax || 0
        const shipping = old.shipping || 0
        const total = subtotal - discount + tax + shipping
        
        return {
          ...old,
          items: items.length > 0 ? items : [], // תמיד array, גם אם ריק
          subtotal,
          total: Math.max(0, total),
        }
      })
      
      return { previousCart }
    },
    onError: (err, newData, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart', slug, customerId], context.previousCart)
      }
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להסיר את המוצר',
        variant: 'destructive',
      })
    },
    onSuccess: () => {
      // ה-API לא מחזיר את העגלה המעודכנת, אז נעשה refetch
      // ה-optimistic update כבר עדכן את ה-UI
      toast({
        title: 'הוסר מהעגלה',
        description: 'המוצר הוסר בהצלחה',
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', slug, customerId] })
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
      if (data.items && data.items.length > 0) {
        CartStorage.set(slug, data)
      }
      toast({
        title: 'הצלחה',
        description: 'קוד הקופון הוחל בהצלחה',
      })
    },
    onError: (err) => {
      toast({
        title: 'שגיאה',
        description: err instanceof Error ? err.message : 'קוד קופון לא תקין',
        variant: 'destructive',
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', slug, customerId] })
    },
  })
  
  // Listen for storage changes (sync between tabs)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `cart_${slug}` && e.newValue) {
        try {
          const newCart = JSON.parse(e.newValue)
          queryClient.setQueryData(['cart', slug, customerId], newCart)
        } catch (error) {
          console.error('Error parsing storage event:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [slug, customerId, queryClient])

  return {
    cart: cart || null,
    isLoading,
    error,
    updateQuantity: updateQuantity.mutate,
    removeItem: removeItem.mutate,
    applyCoupon: applyCoupon.mutate,
    isUpdating: updateQuantity.isPending || removeItem.isPending || applyCoupon.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['cart', slug, customerId] }),
  }
}

