"use client"

import { usePathname } from "next/navigation"
import { ShopProvider } from "./ShopProvider"
import { ReactNode } from "react"

export function ConditionalShopProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  
  // Only load ShopProvider for admin pages, not storefront
  const isStorefront = pathname?.startsWith('/shop/')
  const isPublicPage = pathname === '/login' || pathname === '/register' || pathname?.startsWith('/invite')
  
  if (isStorefront || isPublicPage) {
    return <>{children}</>
  }
  
  return <ShopProvider>{children}</ShopProvider>
}


