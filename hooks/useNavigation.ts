"use client"

import { useState, useEffect } from "react"

export interface NavigationItem {
  type: "link" | "page" | "category" | "collection"
  label: string
  url?: string
  pageId?: string
  pageSlug?: string
  categoryId?: string
  collectionId?: string
  children?: NavigationItem[]
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
  // אם יש ניווט התחלתי מהשרת, נשתמש בו
  const [navigation, setNavigation] = useState<Navigation | null>(initialNavigation || null)
  const [loading, setLoading] = useState(!initialNavigation)

  useEffect(() => {
    // אם יש כבר ניווט מהשרת, לא צריך לטעון
    if (initialNavigation) {
      return
    }

    // טעינה מהשרת
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
  }, [slug, location, initialNavigation])

  return { navigation, loading }
}

