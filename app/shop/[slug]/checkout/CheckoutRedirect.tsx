"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

interface CheckoutRedirectProps {
  slug: string
}

export function CheckoutRedirect({ slug }: CheckoutRedirectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [redirected, setRedirected] = useState(false)
  
  useEffect(() => {
    if (redirected) return
    if (!slug) return
    
    // קריאת customerId מ-localStorage
    const customerData = localStorage.getItem(`storefront_customer_${slug}`)
    if (customerData) {
      try {
        const parsed = JSON.parse(customerData)
        const customerId = parsed.id
        
        if (customerId && !pathname.includes(`customerId=${customerId}`)) {
          setRedirected(true)
          // העברת customerId דרך query params
          const currentUrl = new URL(window.location.href)
          currentUrl.searchParams.set('customerId', customerId)
          router.replace(currentUrl.pathname + currentUrl.search)
          return
        }
      } catch (error) {
        console.error("Error parsing customer data:", error)
      }
    }
    
    setRedirected(true)
  }, [slug, router, pathname, redirected])

  return null
}

