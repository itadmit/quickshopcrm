"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

interface ShopData {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
  theme: string
  themeSettings: any
  settings: any
}

interface NavigationData {
  id: string
  name: string
  location: string
  items: any[]
}

interface CartItem {
  productId: string
  variantId: string | null
  quantity: number
  price: number
  product: {
    name: string
    images: string[]
    slug: string
  }
  variant: {
    name: string
  } | null
}

interface CartData {
  id: string
  items: CartItem[]
  subtotal: number
  total: number
  tax: number
  shipping: number
  coupon: any
  automaticDiscount: number
  customerDiscount: number
  giftCardDiscount: number
}

interface StorefrontContextType {
  shop: ShopData | undefined
  navigation: NavigationData | undefined
  isAdmin: boolean
  cart: CartData | undefined
  cartItemCount: number
  refetchCart: () => void
  applyCoupon: (code: string) => Promise<any>
  removeCoupon: () => Promise<any>
  customerId: string | null
  setCustomerId: (id: string | null) => void
  autoOpenCart: boolean
}

const StorefrontContext = createContext<StorefrontContextType | undefined>(undefined)

export function StorefrontDataProvider({
  children,
  slug,
  initialShop,
  initialNavigation,
  initialIsAdmin,
  initialCart,
  initialCustomerId,
}: {
  children: ReactNode
  slug: string
  initialShop: ShopData | null
  initialNavigation: NavigationData | null
  initialIsAdmin: boolean
  initialCart?: CartData | null
  initialCustomerId?: string | null
}) {
  const { data: session } = useSession()
  const [customerId, setCustomerId] = useState<string | null>(initialCustomerId || null)
  const [autoOpenCart, setAutoOpenCart] = useState(initialShop?.settings?.autoOpenCartAfterAdd !== false)

  // Sync customerId to cookie
  useEffect(() => {
    if (customerId) {
      document.cookie = `customer_${slug}=${customerId}; path=/; max-age=${60 * 60 * 24 * 365}`
    }
  }, [customerId, slug])

  const { data: shop = initialShop } = useQuery<ShopData>({
    queryKey: ['storefrontShop', slug],
    queryFn: async () => {
      const res = await fetch(`/api/storefront/${slug}/info`)
      if (!res.ok) throw new Error('Failed to fetch shop info')
      return res.json()
    },
    initialData: initialShop || undefined,
    enabled: false,
  })

  const { data: navigation = initialNavigation } = useQuery<NavigationData>({
    queryKey: ['storefrontNavigation', slug],
    queryFn: async () => {
      const res = await fetch(`/api/storefront/${slug}/navigation?location=MOBILE`)
      if (!res.ok) throw new Error('Failed to fetch navigation')
      return res.json()
    },
    initialData: initialNavigation || undefined,
    enabled: false,
  })

  const { data: cart = initialCart, refetch: refetchCart } = useQuery<CartData>({
    queryKey: ['storefrontCart', slug, customerId],
    queryFn: async () => {
      if (!customerId) return { items: [], subtotal: 0, total: 0, tax: 0, shipping: 0, coupon: null, automaticDiscount: 0, customerDiscount: 0, giftCardDiscount: 0 } as CartData
      const res = await fetch(`/api/storefront/${slug}/cart?customerId=${customerId}`)
      if (!res.ok) throw new Error('Failed to fetch cart')
      return res.json()
    },
    initialData: initialCart || undefined,
    enabled: false,
    staleTime: 0,
  })

  const { data: isAdminStatus = initialIsAdmin } = useQuery<boolean>({
    queryKey: ['storefrontIsAdmin', slug, session?.user?.companyId],
    queryFn: async () => {
      if (!session?.user?.companyId) return false
      const res = await fetch(`/api/storefront/${slug}/check-admin`)
      if (!res.ok) return false
      return res.json()
    },
    initialData: initialIsAdmin,
    enabled: false,
  })

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0

  const applyCoupon = async (code: string) => {
    if (!customerId) throw new Error("Customer not logged in")
    const res = await fetch(`/api/storefront/${slug}/cart`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, couponCode: code }),
    })
    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || 'Failed to apply coupon')
    }
    refetchCart()
    return res.json()
  }

  const removeCoupon = async () => {
    if (!customerId) throw new Error("Customer not logged in")
    const res = await fetch(`/api/storefront/${slug}/cart`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, removeCoupon: true }),
    })
    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || 'Failed to remove coupon')
    }
    refetchCart()
    return res.json()
  }

  return (
    <StorefrontContext.Provider
      value={{
        shop: shop || undefined,
        navigation: navigation || undefined,
        isAdmin: isAdminStatus,
        cart: cart || undefined,
        cartItemCount,
        refetchCart,
        applyCoupon,
        removeCoupon,
        customerId,
        setCustomerId,
        autoOpenCart,
      }}
    >
      {children}
    </StorefrontContext.Provider>
  )
}

export function useStorefrontData() {
  const context = useContext(StorefrontContext)
  if (context === undefined) {
    throw new Error('useStorefrontData must be used within a StorefrontDataProvider')
  }
  return context
}
