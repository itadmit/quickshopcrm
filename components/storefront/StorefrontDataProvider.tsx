"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface StorefrontData {
  shop: any
  navigation: any
  cart: any
  isAdmin: boolean
  loading: boolean
}

const StorefrontDataContext = createContext<StorefrontData | null>(null)

export function StorefrontDataProvider({ 
  children, 
  slug,
  initialShop,
  initialNavigation,
  initialIsAdmin = false
}: { 
  children: ReactNode
  slug: string
  initialShop?: any
  initialNavigation?: any
  initialIsAdmin?: boolean
}) {
  const [shop, setShop] = useState(initialShop || null)
  const [navigation, setNavigation] = useState(initialNavigation || null)
  const [cart, setCart] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promises = []

        if (!shop) {
          promises.push(
            fetch(`/api/storefront/${slug}/info`).then(r => r.ok ? r.json() : null)
          )
        }

        if (!navigation) {
          promises.push(
            fetch(`/api/storefront/${slug}/navigation?location=MOBILE`).then(r => r.ok ? r.json() : null)
          )
        }

        if (!isAdmin) {
          promises.push(
            fetch(`/api/storefront/${slug}/check-admin`).then(r => r.ok ? r.json() : null)
          )
        }

        promises.push(
          fetch(`/api/storefront/${slug}/cart`).then(r => r.ok ? r.json() : null)
        )

        const results = await Promise.all(promises)
        let index = 0

        if (!shop && results[index]) {
          setShop(results[index])
          index++
        }

        if (!navigation && results[index]) {
          setNavigation(results[index])
          index++
        }

        if (!isAdmin && results[index]) {
          setIsAdmin(results[index]?.isAdmin || false)
          index++
        }

        if (results[index]) {
          setCart(results[index])
        }
      } catch (error) {
        console.error('Error fetching storefront data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug])

  return (
    <StorefrontDataContext.Provider value={{ shop, navigation, cart, isAdmin, loading }}>
      {children}
    </StorefrontDataContext.Provider>
  )
}

export function useStorefrontData() {
  const context = useContext(StorefrontDataContext)
  if (!context) {
    throw new Error('useStorefrontData must be used within StorefrontDataProvider')
  }
  return context
}

