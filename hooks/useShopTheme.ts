import { useState, useEffect, useCallback } from "react"

interface ThemeSettings {
  primaryColor?: string
  secondaryColor?: string
}

interface ShopTheme {
  primaryColor: string
  secondaryColor: string
}

const DEFAULT_THEME: ShopTheme = {
  primaryColor: "#000000", // שחור ברירת מחדל
  secondaryColor: "#333333", // אפור כהה
}

export function useShopTheme(slug: string) {
  const [theme, setTheme] = useState<ShopTheme>(DEFAULT_THEME)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchTheme = useCallback(async () => {
    try {
      setLoading(true)
      // הוספת timestamp ל-cache busting
      const response = await fetch(`/api/storefront/${slug}/info?t=${Date.now()}`)
      if (response.ok) {
        const shop = await response.json()
        const themeSettings = (shop.themeSettings as ThemeSettings) || {}
        
        setTheme({
          primaryColor: themeSettings.primaryColor || DEFAULT_THEME.primaryColor,
          secondaryColor: themeSettings.secondaryColor || DEFAULT_THEME.secondaryColor,
        })
      }
    } catch (error) {
      console.error("Error fetching theme:", error)
      setTheme(DEFAULT_THEME)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    if (slug) {
      fetchTheme()
    }
  }, [slug, refreshKey, fetchTheme])

  // פונקציה לרענון ידני
  const refetch = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  // האזנה ל-event של עדכון צבעים
  useEffect(() => {
    const handleThemeUpdate = () => {
      refetch()
    }

    window.addEventListener('themeUpdated', handleThemeUpdate)
    return () => {
      window.removeEventListener('themeUpdated', handleThemeUpdate)
    }
  }, [refetch])

  return { theme, loading, refetch }
}

// Helper function to get CSS variables from theme
export function getThemeStyles(theme: ShopTheme) {
  return {
    "--shop-primary": theme.primaryColor,
    "--shop-secondary": theme.secondaryColor,
  } as React.CSSProperties
}

// Helper function to get Tailwind classes with theme colors
export function getThemeClasses(theme: ShopTheme) {
  return {
    primary: {
      bg: `bg-[${theme.primaryColor}]`,
      text: `text-[${theme.primaryColor}]`,
      border: `border-[${theme.primaryColor}]`,
      hover: `hover:bg-[${theme.primaryColor}]`,
    },
    secondary: {
      bg: `bg-[${theme.secondaryColor}]`,
      text: `text-[${theme.secondaryColor}]`,
      border: `border-[${theme.secondaryColor}]`,
      hover: `hover:bg-[${theme.secondaryColor}]`,
    },
  }
}

