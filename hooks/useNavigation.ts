"use client"

import { useState, useEffect } from "react"
import { useStorefrontData } from "@/components/storefront/StorefrontDataProvider"

export interface NavigationItem {
  type: "link" | "page" | "category" | "collection"
  label: string
  url?: string
  pageId?: string
  pageSlug?: string
  categoryId?: string
  collectionId?: string
  children?: NavigationItem[]
  image?: string
  columnTitle?: string
}

export interface Navigation {
  id: string
  name: string
  location: string
  items: NavigationItem[]
}

/**
 * Hook לטעינת ניווט בצד הלקוח
 * @param slug - slug של החנות
 * @param location - מיקום הניווט (HEADER, FOOTER, MOBILE)
 * @param initialNavigation - ניווט התחלתי מהשרת (אופציונלי)
 * @returns ניווט ומצב טעינה
 */
export function useNavigation(
  slug: string,
  location: "HEADER" | "FOOTER" | "MOBILE" = "HEADER",
  initialNavigation?: Navigation | null
) {
  const { navigation: contextNav, loading: contextLoading } = useStorefrontData()
  const [navigation, setNavigation] = useState<Navigation | null>(initialNavigation || contextNav || null)
  const [loading, setLoading] = useState(!initialNavigation && !contextNav)

  useEffect(() => {
    if (initialNavigation) {
      setNavigation(initialNavigation)
      return
    }

    if (contextNav && location === "MOBILE") {
      setNavigation(contextNav)
      setLoading(false)
      return
    }

    if (location !== "MOBILE") {
      const fetchNavigation = async () => {
        try {
          setLoading(true)
          const response = await fetch(`/api/storefront/${slug}/navigation?location=${location}`)
          if (response.ok) {
            const data = await response.json()
            const nav = data.length > 0 ? data[0] : null
            setNavigation(nav)
          }
        } catch (error) {
          console.error("Error fetching navigation:", error)
        } finally {
          setLoading(false)
        }
      }

      fetchNavigation()
    }
  }, [slug, location, initialNavigation, contextNav])

  return { navigation, loading }
}

