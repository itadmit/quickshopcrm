"use client"

import { TrackingPixelProvider } from "@/components/storefront/TrackingPixelProvider"
import { useParams } from "next/navigation"
import { useEffect } from "react"

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const slug = params.slug as string

  // עדכון favicon דינמי לפי חנות
  useEffect(() => {
    const faviconUrl = `/api/storefront/${slug}/favicon`
    
    // הסרת favicon קיים אם יש
    const existingFavicon = document.querySelector('link[rel="icon"]')
    if (existingFavicon) {
      existingFavicon.remove()
    }

    // הוספת favicon חדש
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    link.href = faviconUrl
    document.head.appendChild(link)

    // גם עבור favicon.ico (למקרה שהדפדפן מחפש את זה)
    const linkIco = document.createElement('link')
    linkIco.rel = 'shortcut icon'
    linkIco.type = 'image/x-icon'
    linkIco.href = faviconUrl
    document.head.appendChild(linkIco)

    return () => {
      // ניקוי בעת unmount
      const favicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
      favicons.forEach(fav => {
        if (fav.getAttribute('href')?.includes(`/api/storefront/${slug}/favicon`)) {
          fav.remove()
        }
      })
    }
  }, [slug])

  return (
    <TrackingPixelProvider shopSlug={slug}>
      {children}
    </TrackingPixelProvider>
  )
}

