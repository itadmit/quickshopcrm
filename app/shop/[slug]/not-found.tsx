"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { NotFoundPage } from "@/components/storefront/NotFoundPage"
import { useShopTheme } from "@/hooks/useShopTheme"

export default function ShopNotFound() {
  const params = useParams()
  const slug = params.slug as string
  const [shop, setShop] = useState<any>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const { theme } = useShopTheme(slug)

  useEffect(() => {
    fetchShopInfo()
    fetchCartCount()
  }, [slug])

  const fetchShopInfo = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/info`)
      if (response.ok) {
        const data = await response.json()
        setShop(data)
      }
    } catch (error) {
      console.error("Error fetching shop info:", error)
    }
  }

  const fetchCartCount = async () => {
    try {
      const customerData = localStorage.getItem(`storefront_customer_${slug}`)
      const headers: HeadersInit = {}
      if (customerData) {
        try {
          const parsed = JSON.parse(customerData)
          headers["x-customer-id"] = parsed.id
        } catch (error) {
          console.error("Error parsing customer data:", error)
        }
      }

      const response = await fetch(`/api/storefront/${slug}/cart`, { headers })
      if (response.ok) {
        const data = await response.json()
        const count = data.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0
        setCartItemCount(count)
      }
    } catch (error) {
      console.error("Error fetching cart count:", error)
    }
  }

  return (
    <NotFoundPage
      slug={slug}
      shop={shop}
      cartItemCount={cartItemCount}
      onCartUpdate={fetchCartCount}
      theme={theme}
      type="general"
    />
  )
}

