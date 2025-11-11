import { useState, useEffect, useCallback } from "react"

interface ThemeSettings {
  primaryColor?: string
  secondaryColor?: string
  logoWidthMobile?: number
  logoWidthDesktop?: number
  logoPaddingMobile?: number
  logoPaddingDesktop?: number
  
  // Category page settings
  categoryProductsPerRowMobile?: number
  categoryProductsPerRowTablet?: number
  categoryProductsPerRowDesktop?: number
  categoryEnableBanners?: boolean
  categoryBanners?: Array<{
    id: string
    title: string
    description?: string
    image?: string
    link?: string
    buttonText?: string
    bgColor?: string
    textColor?: string
    enabled: boolean
  }>
  categoryBannerFrequency?: number
  
  // Product page settings
  productImageRatio?: "1:1" | "3:4" | "9:16"
  productImagePosition?: "left" | "right"
  productShowMobileThumbs?: boolean
  productShowDiscountBadge?: boolean
  productShowQuantityButtons?: boolean
  productShowFavoriteButton?: boolean
  productShowShareButton?: boolean
  productImageBorderRadius?: number
  productMobileImagePadding?: boolean
  productDiscountBadgeRounded?: boolean
  productStickyAddToCart?: boolean
  productImageButtonsColor?: "white" | "black"
  productDiscountBadgeColor?: string
  productShowGalleryArrows?: boolean
  productGalleryArrowsColor?: "white" | "black"
  productRelatedRatio?: "1:1" | "3:4" | "9:16"
  productRelatedBgColor?: string
  productCompleteLookBgColor?: string
  productCompleteLookTitle?: string
  productContentDisplay?: "accordion" | "tabs"
  productStrengths?: Array<{
    id: string
    icon: string
    text: string
  }>
}

interface ShopTheme extends ThemeSettings {
  primaryColor: string
  secondaryColor: string
  logoWidthMobile: number
  logoWidthDesktop: number
  logoPaddingMobile: number
  logoPaddingDesktop: number
}

const DEFAULT_THEME: ShopTheme = {
  primaryColor: "#000000",
  secondaryColor: "#333333",
  logoWidthMobile: 85,
  logoWidthDesktop: 135,
  logoPaddingMobile: 0,
  logoPaddingDesktop: 0,
  categoryProductsPerRowMobile: 2,
  categoryProductsPerRowTablet: 3,
  categoryProductsPerRowDesktop: 4,
  categoryEnableBanners: false,
  categoryBanners: [],
  categoryBannerFrequency: 6,
  productImageRatio: "9:16",
  productImagePosition: "left",
  productShowMobileThumbs: true,
  productShowDiscountBadge: true,
  productShowQuantityButtons: true,
  productShowFavoriteButton: true,
  productShowShareButton: true,
  productImageBorderRadius: 8,
  productMobileImagePadding: false,
  productDiscountBadgeRounded: true,
  productStickyAddToCart: true,
  productImageButtonsColor: "white",
  productDiscountBadgeColor: "red",
  productShowGalleryArrows: true,
  productGalleryArrowsColor: "white",
  productRelatedRatio: "9:16",
  productRelatedBgColor: "#f8f9fa",
  productCompleteLookBgColor: "#f1f3f4",
  productCompleteLookTitle: "השלם את הלוק",
  productContentDisplay: "accordion",
  productStrengths: [],
}

export function useShopTheme(slug: string) {
  const [theme, setTheme] = useState<ShopTheme>(DEFAULT_THEME)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchTheme = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/storefront/${slug}/info?t=${Date.now()}`)
      if (response.ok) {
        const shop = await response.json()
        const themeSettings = (shop.themeSettings as ThemeSettings) || {}
        
        setTheme({
          primaryColor: themeSettings.primaryColor || DEFAULT_THEME.primaryColor,
          secondaryColor: themeSettings.secondaryColor || DEFAULT_THEME.secondaryColor,
          logoWidthMobile: themeSettings.logoWidthMobile || DEFAULT_THEME.logoWidthMobile,
          logoWidthDesktop: themeSettings.logoWidthDesktop || DEFAULT_THEME.logoWidthDesktop,
          logoPaddingMobile: themeSettings.logoPaddingMobile || DEFAULT_THEME.logoPaddingMobile,
          logoPaddingDesktop: themeSettings.logoPaddingDesktop || DEFAULT_THEME.logoPaddingDesktop,
          
          // Category settings
          categoryProductsPerRowMobile: themeSettings.categoryProductsPerRowMobile || DEFAULT_THEME.categoryProductsPerRowMobile,
          categoryProductsPerRowTablet: themeSettings.categoryProductsPerRowTablet || DEFAULT_THEME.categoryProductsPerRowTablet,
          categoryProductsPerRowDesktop: themeSettings.categoryProductsPerRowDesktop || DEFAULT_THEME.categoryProductsPerRowDesktop,
          categoryEnableBanners: themeSettings.categoryEnableBanners ?? DEFAULT_THEME.categoryEnableBanners,
          categoryBanners: themeSettings.categoryBanners || DEFAULT_THEME.categoryBanners,
          categoryBannerFrequency: themeSettings.categoryBannerFrequency || DEFAULT_THEME.categoryBannerFrequency,
          
          // Product settings
          productImageRatio: themeSettings.productImageRatio || DEFAULT_THEME.productImageRatio,
          productImagePosition: themeSettings.productImagePosition || DEFAULT_THEME.productImagePosition,
          productShowMobileThumbs: themeSettings.productShowMobileThumbs ?? DEFAULT_THEME.productShowMobileThumbs,
          productShowDiscountBadge: themeSettings.productShowDiscountBadge ?? DEFAULT_THEME.productShowDiscountBadge,
          productShowQuantityButtons: themeSettings.productShowQuantityButtons ?? DEFAULT_THEME.productShowQuantityButtons,
          productShowFavoriteButton: themeSettings.productShowFavoriteButton ?? DEFAULT_THEME.productShowFavoriteButton,
          productShowShareButton: themeSettings.productShowShareButton ?? DEFAULT_THEME.productShowShareButton,
          productImageBorderRadius: themeSettings.productImageBorderRadius || DEFAULT_THEME.productImageBorderRadius,
          productMobileImagePadding: themeSettings.productMobileImagePadding ?? DEFAULT_THEME.productMobileImagePadding,
          productDiscountBadgeRounded: themeSettings.productDiscountBadgeRounded ?? DEFAULT_THEME.productDiscountBadgeRounded,
          productStickyAddToCart: themeSettings.productStickyAddToCart ?? DEFAULT_THEME.productStickyAddToCart,
          productImageButtonsColor: themeSettings.productImageButtonsColor || DEFAULT_THEME.productImageButtonsColor,
          productDiscountBadgeColor: themeSettings.productDiscountBadgeColor || DEFAULT_THEME.productDiscountBadgeColor,
          productShowGalleryArrows: themeSettings.productShowGalleryArrows ?? DEFAULT_THEME.productShowGalleryArrows,
          productGalleryArrowsColor: themeSettings.productGalleryArrowsColor || DEFAULT_THEME.productGalleryArrowsColor,
          productRelatedRatio: themeSettings.productRelatedRatio || DEFAULT_THEME.productRelatedRatio,
          productRelatedBgColor: themeSettings.productRelatedBgColor || DEFAULT_THEME.productRelatedBgColor,
          productCompleteLookBgColor: themeSettings.productCompleteLookBgColor || DEFAULT_THEME.productCompleteLookBgColor,
          productCompleteLookTitle: themeSettings.productCompleteLookTitle || DEFAULT_THEME.productCompleteLookTitle,
          productContentDisplay: themeSettings.productContentDisplay || DEFAULT_THEME.productContentDisplay,
          productStrengths: themeSettings.productStrengths || DEFAULT_THEME.productStrengths,
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

