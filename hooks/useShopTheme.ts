import { useState, useEffect, useCallback } from "react"
import { useStorefrontData } from "@/components/storefront/StorefrontDataProvider"

interface ThemeSettings {
  primaryColor?: string
  secondaryColor?: string
  logoWidthMobile?: number
  logoWidthDesktop?: number
  logoPaddingMobile?: number
  logoPaddingDesktop?: number
  
  // Header settings
  headerLayout?: "logo-left" | "logo-right" | "logo-center-menu-below"
  stickyHeader?: boolean
  transparentHeader?: boolean
  logoColorOnScroll?: "none" | "white" | "black"
  headerMobilePadding?: number
  
  // Top bar settings
  topBarEnabled?: boolean
  topBarBgColor?: string
  topBarTextColor?: string
  countdownEnabled?: boolean
  countdownEndDate?: string
  countdownText?: string
  messagesEnabled?: boolean
  messagesType?: "rotating" | "static"
  messages?: string[]
  messagesSpeed?: number
  messagesTextColor?: string
  messagesFontSize?: number
  
  // Mobile side menu settings
  mobileSideMenuShowSearch?: boolean
  mobileSideMenuTitle?: string
  mobileSideMenuShowAuthLinks?: boolean
  
  // Cart settings
  showCouponByDefault?: boolean
  
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
  headerLayout: "logo-left" | "logo-right" | "logo-center-menu-below"
  stickyHeader: boolean
  transparentHeader: boolean
  logoColorOnScroll: "none" | "white" | "black"
}

const DEFAULT_THEME: ShopTheme = {
  primaryColor: "#000000",
  secondaryColor: "#333333",
  logoWidthMobile: 85,
  logoWidthDesktop: 135,
  logoPaddingMobile: 0,
  logoPaddingDesktop: 0,
  headerLayout: "logo-left",
  stickyHeader: true,
  transparentHeader: false,
  logoColorOnScroll: "none",
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
  const { shop: contextShop, loading: contextLoading } = useStorefrontData()
  const [theme, setTheme] = useState<ShopTheme>(DEFAULT_THEME)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchTheme = useCallback(async () => {
    try {
      setLoading(true)
      
      const shop = contextShop || await (async () => {
        const response = await fetch(`/api/storefront/${slug}/info?t=${Date.now()}`)
        return response.ok ? await response.json() : null
      })()
      
      if (shop) {
        const themeSettings = (shop.themeSettings as ThemeSettings) || {}
        
        const newTheme = {
          primaryColor: themeSettings.primaryColor || DEFAULT_THEME.primaryColor,
          secondaryColor: themeSettings.secondaryColor || DEFAULT_THEME.secondaryColor,
          logoWidthMobile: themeSettings.logoWidthMobile || DEFAULT_THEME.logoWidthMobile,
          logoWidthDesktop: themeSettings.logoWidthDesktop || DEFAULT_THEME.logoWidthDesktop,
          logoPaddingMobile: themeSettings.logoPaddingMobile || DEFAULT_THEME.logoPaddingMobile,
          logoPaddingDesktop: themeSettings.logoPaddingDesktop || DEFAULT_THEME.logoPaddingDesktop,
          
          // Header settings
          headerLayout: themeSettings.headerLayout || DEFAULT_THEME.headerLayout,
          stickyHeader: themeSettings.stickyHeader !== undefined ? themeSettings.stickyHeader : DEFAULT_THEME.stickyHeader,
          transparentHeader: themeSettings.transparentHeader !== undefined ? themeSettings.transparentHeader : DEFAULT_THEME.transparentHeader,
          logoColorOnScroll: themeSettings.logoColorOnScroll || DEFAULT_THEME.logoColorOnScroll,
          headerMobilePadding: themeSettings.headerMobilePadding || 16,
          
          // Top bar settings
          topBarEnabled: themeSettings.topBarEnabled ?? false,
          topBarBgColor: themeSettings.topBarBgColor || "#000000",
          topBarTextColor: themeSettings.topBarTextColor || "#ffffff",
          countdownEnabled: themeSettings.countdownEnabled ?? false,
          countdownEndDate: themeSettings.countdownEndDate || "",
          countdownText: themeSettings.countdownText || "הצעה מוגבלת!",
          messagesEnabled: themeSettings.messagesEnabled ?? false,
          messagesType: themeSettings.messagesType || "rotating",
          messages: themeSettings.messages || [],
          messagesSpeed: themeSettings.messagesSpeed || 3000,
          messagesTextColor: themeSettings.messagesTextColor || "",
          messagesFontSize: themeSettings.messagesFontSize || 14,
          
          // Mobile side menu settings
          mobileSideMenuShowSearch: themeSettings.mobileSideMenuShowSearch !== undefined ? themeSettings.mobileSideMenuShowSearch : true,
          mobileSideMenuTitle: themeSettings.mobileSideMenuTitle || "תפריט",
          mobileSideMenuShowAuthLinks: themeSettings.mobileSideMenuShowAuthLinks !== undefined ? themeSettings.mobileSideMenuShowAuthLinks : true,
          
          // Cart settings
          showCouponByDefault: themeSettings.showCouponByDefault !== undefined ? themeSettings.showCouponByDefault : true,
          
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
        }
        
        setTheme(newTheme)
      }
    } catch (error) {
      console.error("Error fetching theme:", error)
      setTheme(DEFAULT_THEME)
    } finally {
      setLoading(false)
    }
  }, [slug, contextShop])

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

