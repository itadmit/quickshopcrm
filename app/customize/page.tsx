"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { ThemeCustomizer } from "@/components/customize/ThemeCustomizer"
import { PageType } from "@/components/customize/ThemeCustomizer"

export default function CustomizePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedShop, loading: shopLoading } = useShop()
  
  // זיהוי אוטומטי של הדף הנוכחי מ-query params
  const initialPageType = searchParams.get("page") as PageType | null
  const initialPageId = searchParams.get("id") || ""
  
  const [pageType, setPageType] = useState<PageType | null>(initialPageType || "home")
  const [pageId, setPageId] = useState<string>(initialPageId)

  useEffect(() => {
    const pageParam = searchParams.get("page") as PageType | null
    const idParam = searchParams.get("id") || ""
    
    if (pageParam && ["home", "category", "product"].includes(pageParam)) {
      setPageType(pageParam)
      setPageId(idParam)
    } else {
      setPageType("home")
      setPageId("")
    }
  }, [searchParams])

  const handleClose = () => {
    router.push("/appearance")
  }

  if (shopLoading || !selectedShop) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    )
  }

  if (!pageType) {
    return null
  }

  return (
    <ThemeCustomizer
      shopSlug={selectedShop?.slug || ""}
      pageType={pageType}
      pageId={pageId || undefined}
      onClose={handleClose}
    />
  )
}
