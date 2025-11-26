"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Palette,
  Layout,
  Eye,
  Settings,
  Save,
  Type,
  Image as ImageIcon,
  Timer,
  Bell,
  Menu as MenuIcon,
  Upload,
  X,
  Grid3x3,
  ShoppingBag,
  Trash2,
  Plus,
  CheckCircle2,
  CreditCard,
  Mail,
  Gift,
  Monitor,
  Tablet,
  Smartphone,
  Image,
  DollarSign,
  AlignLeft,
  Filter,
  Tag,
  Loader,
  Heart,
  ShoppingCart,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AppearanceSettings {
  // לוגו ופאביקון
  logo: string | null
  favicon: string | null
  
  // פונט
  fontFamily: string
  
  // צבעים כלליים
  primaryColor: string
  secondaryColor: string
  primaryTextColor: string
  
  // צבעי הדר
  headerBgColor: string
  headerTextColor: string
  
  // צבעי פוטר
  footerBgColor: string
  footerTextColor: string
  
  // צבעי כפתורים
  addToCartBtnColor: string
  addToCartBtnTextColor: string
  proceedToCheckoutBtnColor: string
  proceedToCheckoutBtnTextColor: string
  paymentBtnColor: string
  paymentBtnTextColor: string
  
  // צבעי מחירים
  regularPriceColor: string
  salePriceColor: string
  
  // פריסת הדר
  headerLayout: "logo-left" | "logo-right" | "logo-center-menu-below"
  
  // הגדרות לוגו
  logoWidthMobile: number
  logoWidthDesktop: number
  logoPaddingMobile: number
  logoPaddingDesktop: number
  logoColorOnScroll: "none" | "white" | "black"
  
  // הדר נצמד ושקוף
  stickyHeader: boolean
  transparentHeader: boolean
  
  // פדינג הדר במובייל
  headerMobilePadding: number
  
  // תפריט צד במובייל
  mobileSideMenuShowSearch: boolean
  mobileSideMenuTitle: string
  mobileSideMenuShowAuthLinks: boolean
  
  // התנהגות סל
  cartBehavior: "open-cart" | "show-notification"
  showCouponByDefault: boolean
  showCartPageButton: boolean
  showTaxInCart: boolean
  
  // טוב בר
  topBarEnabled: boolean
  topBarBgColor: string
  topBarTextColor: string
  
  // קאונטדאון
  countdownEnabled: boolean
  countdownEndDate: string
  countdownText: string
  
  // הודעות טופ בר
  messagesEnabled: boolean
  messagesType: "rotating" | "static"
  messages: string[]
  messagesSpeed: number
  messagesTextColor: string
  messagesFontSize: number
  
  // ===== הגדרות עמוד קטגוריה =====
  // פריסה
  categoryProductsPerRowDesktop: number
  categoryProductsPerRowTablet: number
  categoryProductsPerRowMobile: number
  
  // כרטיס מוצר
  categoryCardHoverEffect: boolean
  categoryShowFavButton: boolean
  categoryQuickAddToCart: boolean
  categoryShowColorSamples: boolean
  categoryShowVideo: boolean
  categoryShowImageArrows: boolean
  categoryShowImageDots: boolean
  categoryRemoveMobilePadding: boolean
  categoryImageBorderRadius: number
  categoryImageAspectRatio: "1:1" | "3:4" | "6:9" | "9:16"
  categoryShowSizeButtons: boolean
  categorySizeButtonPosition: "on-image" | "below-image"
  categoryShowOnlyInStock: boolean
  categoryRemoveCardBorders: boolean
  
  // מחירים
  categoryRoundPrices: boolean
  categoryShowDecimals: boolean
  categoryContentAlignment: "right" | "center" | "left"
  categoryFavButtonPosition: "top-right" | "top-left" | "bottom-right" | "bottom-left"
  
  // טיפוגרפיה
  categoryProductNameFontSize: number
  categoryProductNameColor: string
  categoryRegularPriceFontSize: number
  categoryRegularPriceColor: string
  categorySalePriceFontSize: number
  categorySalePriceColor: string
  categoryStrikePriceFontSize: number
  categoryStrikePriceColor: string
  
  // מיון וסינון
  categoryDefaultSort: string
  categoryFilterPosition: "top" | "sidebar"
  
  // באנרים ומדבקות
  categoryEnableBanners: boolean
  categoryShowBadges: boolean
  categoryAutoSaleBadge: boolean
  categoryBannerFrequency: number
  categoryBadgePosition: "top-right" | "top-left" | "bottom-right" | "bottom-left"
  categoryBanners: Array<{
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
  
  // טעינה
  categoryProductsPerPage: number
  categoryLoadType: "load-more" | "pagination" | "infinite-scroll"
  
  // ===== הגדרות עמוד מוצר =====
  // תמונה
  productImageRatio: "1:1" | "3:4" | "9:16"
  productImagePosition: "left" | "right"
  productShowMobileThumbs: boolean
  productShowDiscountBadge: boolean
  productShowQuantityButtons: boolean
  productShowInventory: boolean
  productShowFavoriteButton: boolean
  productShowShareButton: boolean
  productImageBorderRadius: number
  productMobileImagePadding: boolean
  productDiscountBadgeRounded: boolean
  productStickyAddToCart: boolean
  productImageButtonsColor: "white" | "black"
  productDiscountBadgeColor: "red" | "green" | "blue" | "orange" | "black" | "white" | "transparent"
  
  // חצי גלריה
  productShowGalleryArrows: boolean
  productGalleryArrowsColor: "white" | "black"
  
  // מוצרים קשורים
  productRelatedRatio: "1:1" | "3:4" | "9:16"
  productRelatedBgColor: string
  productCompleteLookBgColor: string
  productCompleteLookTitle: string
  
  // תצוגת תוכן
  productContentDisplay: "accordion" | "tabs"
  
  // חוזקות החנות
  productStrengths: Array<{
    id: string
    icon: string
    text: string
  }>
  
  // ===== הגדרות עמוד קופה =====
  checkoutPagePrimaryColor: string
  checkoutPageBackgroundColor: string
  checkoutPageTextColor: string
  checkoutPageSectionBgColor: string
  checkoutPageBorderColor: string
  checkoutShowNewsletterCheckbox: boolean
  checkoutNewsletterDefaultChecked: boolean
  checkoutShowZipField: boolean
  checkoutZipRequired: boolean
  checkoutFooterLinks: Array<{
    id: string
    text: string
    url: string
  }>
  checkoutCustomFields: Array<{
    id: string
    label: string
    type: "text" | "textarea" | "date" | "checkbox"
    placeholder?: string
    required: boolean
    enabled: boolean
  }>
  
  // ===== הגדרות דף תודה =====
  thankYouPageTemplate: "minimal" | "detailed" | "celebration"
  thankYouPagePrimaryColor: string
  thankYouPageBackgroundColor: string
  thankYouPageTextColor: string
  thankYouPageShowOrderDetails: boolean
  thankYouPageShowContinueShopping: boolean
  
  // ===== הגדרות מיילים =====
  emailSenderName: string
  emailColor1: string
  emailColor2: string
  
  // ===== הגדרות עיצוב Gift Card =====
  giftCardBackgroundType: "gradient" | "image"
  giftCardGradientColor1: string
  giftCardGradientColor2: string
  giftCardBackgroundImage: string | null
  giftCardBackgroundPosition: "center" | "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  giftCardTextPosition: "right" | "left" | "center"
}

const FONTS = [
  { 
    id: "Noto Sans Hebrew", 
    name: "Noto Sans Hebrew", 
    description: "פונט נקי ומודרני (ברירת מחדל)",
    hebrewName: "נוטו סאנס עברית"
  },
  { 
    id: "Heebo", 
    name: "Heebo", 
    description: "פונט אלגנטי וקריא",
    hebrewName: "היבו"
  },
  { 
    id: "Assistant", 
    name: "Assistant", 
    description: "פונט ידידותי ונגיש",
    hebrewName: "אסיסטנט"
  },
  { 
    id: "Varela Round", 
    name: "Varela Round", 
    description: "פונט עגול ומסוגנן",
    hebrewName: "ורלה ראונד"
  },
  { 
    id: "Rubik", 
    name: "Rubik", 
    description: "פונט מודרני ובולט",
    hebrewName: "רוביק"
  },
]

export default function AppearancePage() {
  const router = useRouter()
  const { selectedShop, loading: shopLoading } = useShop()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"logo" | "theme" | "header" | "cart" | "topbar" | "category" | "product" | "checkout" | "thankyou" | "emails" | "giftcard">("logo")
  const [pages, setPages] = useState<Array<{ id: string; title: string; slug: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState<{ [key: string]: boolean }>({})

  const [settings, setSettings] = useState<AppearanceSettings>({
    logo: null,
    favicon: null,
    fontFamily: "Noto Sans Hebrew",
    primaryColor: "#000000",
    secondaryColor: "#333333",
    primaryTextColor: "#ffffff",
    headerBgColor: "#ffffff",
    headerTextColor: "#000000",
    footerBgColor: "#ffffff",
    footerTextColor: "#6b7280",
    addToCartBtnColor: "#000000",
    addToCartBtnTextColor: "#ffffff",
    proceedToCheckoutBtnColor: "#000000",
    proceedToCheckoutBtnTextColor: "#ffffff",
    paymentBtnColor: "#000000",
    paymentBtnTextColor: "#ffffff",
    regularPriceColor: "#111827",
    salePriceColor: "#ef4444",
    headerLayout: "logo-left",
    logoWidthMobile: 85,
    logoWidthDesktop: 135,
    logoPaddingMobile: 0,
    logoPaddingDesktop: 0,
    logoColorOnScroll: "none",
    stickyHeader: true,
    transparentHeader: false,
    headerMobilePadding: 16,
    mobileSideMenuShowSearch: true,
    mobileSideMenuTitle: "תפריט",
    mobileSideMenuShowAuthLinks: true,
    cartBehavior: "open-cart",
    showCouponByDefault: true,
    showCartPageButton: false,
    showTaxInCart: true,
    topBarEnabled: false,
    topBarBgColor: "#000000",
    topBarTextColor: "#ffffff",
    countdownEnabled: false,
    countdownEndDate: "",
    countdownText: "הצעה מוגבלת!",
    messagesEnabled: false,
    messagesType: "rotating",
    messages: [
      "משלוח חינם ברכישה מעל 250 ש\"ח",
      "החל מ 08/25 , משלוח עד 3 ימי עסקים",
      "כל האתר ב 60% הנחה"
    ],
    messagesSpeed: 3000,
    messagesTextColor: "",
    messagesFontSize: 14,
    
    // ברירות מחדל עמוד קטגוריה
    categoryProductsPerRowDesktop: 4,
    categoryProductsPerRowTablet: 3,
    categoryProductsPerRowMobile: 2,
    categoryCardHoverEffect: true,
    categoryShowFavButton: true,
    categoryQuickAddToCart: true,
    categoryShowColorSamples: true,
    categoryShowVideo: true,
    categoryShowImageArrows: false,
    categoryShowImageDots: false,
    categoryRemoveMobilePadding: false,
    categoryImageBorderRadius: 0,
    categoryImageAspectRatio: "1:1",
    categoryShowSizeButtons: true,
    categorySizeButtonPosition: "on-image",
    categoryShowOnlyInStock: true,
    categoryRemoveCardBorders: true,
    categoryRoundPrices: false,
    categoryShowDecimals: true,
    categoryContentAlignment: "right",
    categoryFavButtonPosition: "top-right",
    categoryProductNameFontSize: 14,
    categoryProductNameColor: "#000000",
    categoryRegularPriceFontSize: 16,
    categoryRegularPriceColor: "#000000",
    categorySalePriceFontSize: 16,
    categorySalePriceColor: "#000000",
    categoryStrikePriceFontSize: 14,
    categoryStrikePriceColor: "#9CA3AF",
    categoryDefaultSort: "default",
    categoryFilterPosition: "top",
    categoryEnableBanners: false,
    categoryShowBadges: true,
    categoryAutoSaleBadge: true,
    categoryBannerFrequency: 6,
    categoryBadgePosition: "top-right",
    categoryBanners: [],
    categoryProductsPerPage: 24,
    categoryLoadType: "load-more",
    
    // ברירות מחדל עמוד מוצר
    productImageRatio: "9:16",
    productImagePosition: "left",
    productShowMobileThumbs: true,
    productShowDiscountBadge: true,
    productShowQuantityButtons: true,
    productShowInventory: false,
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
    productStrengths: [
      { id: "1", icon: "ri-truck-line", text: 'משלוח חינם ברכישה מעל 250 ש"ח' },
      { id: "2", icon: "ri-time-line", text: "החזרה והחלפה באתר עד 21 ימים - חינם" },
    ],
    
    // ברירות מחדל עמוד קופה
    checkoutPagePrimaryColor: "#9333ea",
    checkoutPageBackgroundColor: "#ffffff",
    checkoutPageTextColor: "#111827",
    checkoutPageSectionBgColor: "#f9fafb",
    checkoutPageBorderColor: "#e5e7eb",
    checkoutShowNewsletterCheckbox: true,
    checkoutNewsletterDefaultChecked: true,
    checkoutShowZipField: false,
    checkoutZipRequired: false,
    checkoutFooterLinks: [],
    checkoutCustomFields: [],
    
    // ברירות מחדל דף תודה
    thankYouPageTemplate: "minimal",
    thankYouPagePrimaryColor: "#9333ea",
    thankYouPageBackgroundColor: "#ffffff",
    thankYouPageTextColor: "#111827",
    thankYouPageShowOrderDetails: true,
    thankYouPageShowContinueShopping: true,
    
    // הגדרות מיילים
    emailSenderName: "",
    emailColor1: "#15b981",
    emailColor2: "#10b981",
    
    // הגדרות עיצוב Gift Card
    giftCardBackgroundType: "gradient",
    giftCardGradientColor1: "#ff9a9e",
    giftCardGradientColor2: "#fecfef",
    giftCardBackgroundImage: null,
    giftCardBackgroundPosition: "center",
    giftCardTextPosition: "right",
  })

  useEffect(() => {
    if (selectedShop?.id) {
      loadAppearanceSettings()
      loadPages()
    }
  }, [selectedShop])

  const loadPages = async () => {
    if (!selectedShop?.id) return
    
    try {
      const response = await fetch(`/api/pages?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setPages(data)
      }
    } catch (error) {
      console.error("Error loading pages:", error)
    }
  }

  const loadAppearanceSettings = async () => {
    if (!selectedShop?.id) return
    
    try {
      const response = await fetch(`/api/shops/${selectedShop.id}`)
      if (response.ok) {
        const shop = await response.json()
        
        // טעינת ההגדרות מ-themeSettings
        const themeSettings = shop.themeSettings || {}
        const shopSettings = shop.settings || {}
        
        setSettings({
          logo: shop.logo || null,
          favicon: shop.favicon || null,
          fontFamily: themeSettings.fontFamily || "Noto Sans Hebrew",
          primaryColor: themeSettings.primaryColor || "#000000",
          secondaryColor: themeSettings.secondaryColor || "#333333",
          primaryTextColor: themeSettings.primaryTextColor || "#ffffff",
          headerBgColor: themeSettings.headerBgColor || "#ffffff",
          headerTextColor: themeSettings.headerTextColor || "#000000",
          footerBgColor: themeSettings.footerBgColor || "#ffffff",
          footerTextColor: themeSettings.footerTextColor || "#6b7280",
          addToCartBtnColor: themeSettings.addToCartBtnColor || "#000000",
          addToCartBtnTextColor: themeSettings.addToCartBtnTextColor || "#ffffff",
          proceedToCheckoutBtnColor: themeSettings.proceedToCheckoutBtnColor || "#000000",
          proceedToCheckoutBtnTextColor: themeSettings.proceedToCheckoutBtnTextColor || "#ffffff",
          paymentBtnColor: themeSettings.paymentBtnColor || "#000000",
          paymentBtnTextColor: themeSettings.paymentBtnTextColor || "#ffffff",
          regularPriceColor: themeSettings.regularPriceColor || "#111827",
          salePriceColor: themeSettings.salePriceColor || "#ef4444",
          headerLayout: themeSettings.headerLayout || "logo-left",
          logoWidthMobile: themeSettings.logoWidthMobile || 85,
          logoWidthDesktop: themeSettings.logoWidthDesktop || 135,
          logoPaddingMobile: themeSettings.logoPaddingMobile || 0,
          logoPaddingDesktop: themeSettings.logoPaddingDesktop || 0,
          logoColorOnScroll: themeSettings.logoColorOnScroll || "none",
          stickyHeader: themeSettings.stickyHeader !== undefined ? themeSettings.stickyHeader : true,
          transparentHeader: themeSettings.transparentHeader || false,
          headerMobilePadding: themeSettings.headerMobilePadding || 16,
          mobileSideMenuShowSearch: themeSettings.mobileSideMenuShowSearch !== undefined ? themeSettings.mobileSideMenuShowSearch : true,
          mobileSideMenuTitle: themeSettings.mobileSideMenuTitle || "תפריט",
          mobileSideMenuShowAuthLinks: themeSettings.mobileSideMenuShowAuthLinks !== undefined ? themeSettings.mobileSideMenuShowAuthLinks : true,
          cartBehavior: shopSettings.cartBehavior || "open-cart",
          showCouponByDefault: themeSettings.showCouponByDefault !== undefined ? themeSettings.showCouponByDefault : true,
          showCartPageButton: themeSettings.showCartPageButton !== undefined ? themeSettings.showCartPageButton : false,
          showTaxInCart: themeSettings.showTaxInCart !== undefined ? themeSettings.showTaxInCart : true,
          topBarEnabled: themeSettings.topBarEnabled || false,
          topBarBgColor: themeSettings.topBarBgColor || "#000000",
          topBarTextColor: themeSettings.topBarTextColor || "#ffffff",
          countdownEnabled: themeSettings.countdownEnabled || false,
          countdownEndDate: themeSettings.countdownEndDate || "",
          countdownText: themeSettings.countdownText || "הצעה מוגבלת!",
          messagesEnabled: themeSettings.messagesEnabled || false,
          messagesType: themeSettings.messagesType || "rotating",
          messages: themeSettings.messages || ["משלוח חינם ברכישה מעל 250 ש\"ח"],
          messagesSpeed: themeSettings.messagesSpeed || 3000,
          messagesTextColor: themeSettings.messagesTextColor || "",
          messagesFontSize: themeSettings.messagesFontSize || 14,
          
          // הגדרות עמוד קטגוריה
          categoryProductsPerRowDesktop: themeSettings.categoryProductsPerRowDesktop || 4,
          categoryProductsPerRowTablet: themeSettings.categoryProductsPerRowTablet || 3,
          categoryProductsPerRowMobile: themeSettings.categoryProductsPerRowMobile || 2,
          categoryCardHoverEffect: themeSettings.categoryCardHoverEffect !== undefined ? themeSettings.categoryCardHoverEffect : true,
          categoryShowFavButton: themeSettings.categoryShowFavButton !== undefined ? themeSettings.categoryShowFavButton : true,
          categoryQuickAddToCart: themeSettings.categoryQuickAddToCart !== undefined ? themeSettings.categoryQuickAddToCart : true,
          categoryShowColorSamples: themeSettings.categoryShowColorSamples !== undefined ? themeSettings.categoryShowColorSamples : true,
          categoryShowVideo: themeSettings.categoryShowVideo !== undefined ? themeSettings.categoryShowVideo : true,
          categoryShowImageArrows: themeSettings.categoryShowImageArrows || false,
          categoryShowImageDots: themeSettings.categoryShowImageDots || false,
          categoryRemoveMobilePadding: themeSettings.categoryRemoveMobilePadding || false,
          categoryImageBorderRadius: themeSettings.categoryImageBorderRadius !== undefined ? themeSettings.categoryImageBorderRadius : 0,
          categoryImageAspectRatio: themeSettings.categoryImageAspectRatio || "1:1",
          categoryShowSizeButtons: themeSettings.categoryShowSizeButtons !== undefined ? themeSettings.categoryShowSizeButtons : true,
          categorySizeButtonPosition: themeSettings.categorySizeButtonPosition || "on-image",
          categoryShowOnlyInStock: themeSettings.categoryShowOnlyInStock !== undefined ? themeSettings.categoryShowOnlyInStock : true,
          categoryRemoveCardBorders: themeSettings.categoryRemoveCardBorders !== undefined ? themeSettings.categoryRemoveCardBorders : true,
          categoryRoundPrices: themeSettings.categoryRoundPrices || false,
          categoryShowDecimals: themeSettings.categoryShowDecimals !== undefined ? themeSettings.categoryShowDecimals : true,
          categoryContentAlignment: themeSettings.categoryContentAlignment || "right",
          categoryFavButtonPosition: themeSettings.categoryFavButtonPosition || "top-right",
          categoryProductNameFontSize: themeSettings.categoryProductNameFontSize || 14,
          categoryProductNameColor: themeSettings.categoryProductNameColor || "#000000",
          categoryRegularPriceFontSize: themeSettings.categoryRegularPriceFontSize || 16,
          categoryRegularPriceColor: themeSettings.categoryRegularPriceColor || "#000000",
          categorySalePriceFontSize: themeSettings.categorySalePriceFontSize || 16,
          categorySalePriceColor: themeSettings.categorySalePriceColor || "#000000",
          categoryStrikePriceFontSize: themeSettings.categoryStrikePriceFontSize || 14,
          categoryStrikePriceColor: themeSettings.categoryStrikePriceColor || "#9CA3AF",
          categoryDefaultSort: themeSettings.categoryDefaultSort || "default",
          categoryFilterPosition: themeSettings.categoryFilterPosition || "top",
          categoryEnableBanners: themeSettings.categoryEnableBanners || false,
          categoryShowBadges: themeSettings.categoryShowBadges !== undefined ? themeSettings.categoryShowBadges : true,
          categoryAutoSaleBadge: themeSettings.categoryAutoSaleBadge !== undefined ? themeSettings.categoryAutoSaleBadge : true,
          categoryBannerFrequency: themeSettings.categoryBannerFrequency || 6,
          categoryBadgePosition: themeSettings.categoryBadgePosition || "top-right",
          categoryBanners: themeSettings.categoryBanners || [],
          categoryProductsPerPage: themeSettings.categoryProductsPerPage || 24,
          categoryLoadType: themeSettings.categoryLoadType || "load-more",
          
          // הגדרות עמוד מוצר
          productImageRatio: themeSettings.productImageRatio || "9:16",
          productImagePosition: themeSettings.productImagePosition || "left",
          productShowMobileThumbs: themeSettings.productShowMobileThumbs !== undefined ? themeSettings.productShowMobileThumbs : true,
          productShowDiscountBadge: themeSettings.productShowDiscountBadge !== undefined ? themeSettings.productShowDiscountBadge : true,
          productShowQuantityButtons: themeSettings.productShowQuantityButtons !== undefined ? themeSettings.productShowQuantityButtons : true,
          productShowInventory: themeSettings.productShowInventory !== undefined ? themeSettings.productShowInventory : false,
          productShowFavoriteButton: themeSettings.productShowFavoriteButton !== undefined ? themeSettings.productShowFavoriteButton : true,
          productShowShareButton: themeSettings.productShowShareButton !== undefined ? themeSettings.productShowShareButton : true,
          productImageBorderRadius: themeSettings.productImageBorderRadius || 8,
          productMobileImagePadding: themeSettings.productMobileImagePadding || false,
          productDiscountBadgeRounded: themeSettings.productDiscountBadgeRounded !== undefined ? themeSettings.productDiscountBadgeRounded : true,
          productStickyAddToCart: themeSettings.productStickyAddToCart !== undefined ? themeSettings.productStickyAddToCart : true,
          productImageButtonsColor: themeSettings.productImageButtonsColor || "white",
          productDiscountBadgeColor: themeSettings.productDiscountBadgeColor || "red",
          productShowGalleryArrows: themeSettings.productShowGalleryArrows !== undefined ? themeSettings.productShowGalleryArrows : true,
          productGalleryArrowsColor: themeSettings.productGalleryArrowsColor || "white",
          productRelatedRatio: themeSettings.productRelatedRatio || "9:16",
          productRelatedBgColor: themeSettings.productRelatedBgColor || "#f8f9fa",
          productCompleteLookBgColor: themeSettings.productCompleteLookBgColor || "#f1f3f4",
          productCompleteLookTitle: themeSettings.productCompleteLookTitle || "השלם את הלוק",
          productContentDisplay: themeSettings.productContentDisplay || "accordion",
          productStrengths: themeSettings.productStrengths || [
            { id: "1", icon: "ri-truck-line", text: 'משלוח חינם ברכישה מעל 250 ש"ח' },
            { id: "2", icon: "ri-time-line", text: "החזרה והחלפה באתר עד 21 ימים - חינם" },
          ],
          
          // הגדרות עמוד קופה
          checkoutPagePrimaryColor: shopSettings.checkoutPage?.primaryColor || "#9333ea",
          checkoutPageBackgroundColor: shopSettings.checkoutPage?.backgroundColor || "#ffffff",
          checkoutPageTextColor: shopSettings.checkoutPage?.textColor || "#111827",
          checkoutPageSectionBgColor: shopSettings.checkoutPage?.sectionBgColor || "#f9fafb",
          checkoutPageBorderColor: shopSettings.checkoutPage?.borderColor || "#e5e7eb",
          checkoutShowNewsletterCheckbox: shopSettings.checkoutPage?.showNewsletterCheckbox !== undefined ? shopSettings.checkoutPage.showNewsletterCheckbox : true,
          checkoutNewsletterDefaultChecked: shopSettings.checkoutPage?.newsletterDefaultChecked !== undefined ? shopSettings.checkoutPage.newsletterDefaultChecked : true,
          checkoutShowZipField: shopSettings.checkoutPage?.showZipField !== undefined ? shopSettings.checkoutPage.showZipField : false,
          checkoutZipRequired: shopSettings.checkoutPage?.zipRequired !== undefined ? shopSettings.checkoutPage.zipRequired : false,
          checkoutFooterLinks: shopSettings.checkoutPage?.footerLinks || [],
          checkoutCustomFields: shopSettings.checkoutPage?.customFields || [],
          
          // הגדרות דף תודה
          thankYouPageTemplate: themeSettings.thankYouPageTemplate || "minimal",
          thankYouPagePrimaryColor: themeSettings.thankYouPagePrimaryColor || "#9333ea",
          thankYouPageBackgroundColor: themeSettings.thankYouPageBackgroundColor || "#ffffff",
          thankYouPageTextColor: themeSettings.thankYouPageTextColor || "#111827",
          thankYouPageShowOrderDetails: themeSettings.thankYouPageShowOrderDetails !== undefined ? themeSettings.thankYouPageShowOrderDetails : true,
          thankYouPageShowContinueShopping: themeSettings.thankYouPageShowContinueShopping !== undefined ? themeSettings.thankYouPageShowContinueShopping : true,
          
          // הגדרות מיילים
          emailSenderName: themeSettings.emailSenderName || shop.name || "",
          emailColor1: themeSettings.emailColor1 || "#15b981",
          emailColor2: themeSettings.emailColor2 || "#10b981",
          
          // הגדרות עיצוב Gift Card
          giftCardBackgroundType: themeSettings.giftCardBackgroundType || "gradient",
          giftCardGradientColor1: themeSettings.giftCardGradientColor1 || "#ff9a9e",
          giftCardGradientColor2: themeSettings.giftCardGradientColor2 || "#fecfef",
          giftCardBackgroundImage: themeSettings.giftCardBackgroundImage || null,
          giftCardBackgroundPosition: themeSettings.giftCardBackgroundPosition || "center",
          giftCardTextPosition: themeSettings.giftCardTextPosition || "right",
        })
      }
    } catch (error) {
      console.error("Error loading appearance settings:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את הגדרות המראה",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    if (!selectedShop?.id) return
    
    setSaving(true)
    try {
      // מנקה שורות ריקות בסוף של ההודעות לפני שמירה
      let cleanedMessages = [...settings.messages]
      while (cleanedMessages.length > 0 && cleanedMessages[cleanedMessages.length - 1].trim() === '') {
        cleanedMessages.pop()
      }
      if (cleanedMessages.length === 0) {
        cleanedMessages = ['']
      }
      
      const response = await fetch(`/api/shops/${selectedShop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logo: settings.logo,
          favicon: settings.favicon,
          themeSettings: {
            fontFamily: settings.fontFamily,
            primaryColor: settings.primaryColor,
            secondaryColor: settings.secondaryColor,
            primaryTextColor: settings.primaryTextColor,
            headerBgColor: settings.headerBgColor,
            headerTextColor: settings.headerTextColor,
            footerBgColor: settings.footerBgColor,
            footerTextColor: settings.footerTextColor,
            addToCartBtnColor: settings.addToCartBtnColor,
            addToCartBtnTextColor: settings.addToCartBtnTextColor,
            proceedToCheckoutBtnColor: settings.proceedToCheckoutBtnColor,
            proceedToCheckoutBtnTextColor: settings.proceedToCheckoutBtnTextColor,
            paymentBtnColor: settings.paymentBtnColor,
            paymentBtnTextColor: settings.paymentBtnTextColor,
            regularPriceColor: settings.regularPriceColor,
            salePriceColor: settings.salePriceColor,
            headerLayout: settings.headerLayout,
            logoWidthMobile: settings.logoWidthMobile,
            logoWidthDesktop: settings.logoWidthDesktop,
            logoPaddingMobile: settings.logoPaddingMobile,
            logoPaddingDesktop: settings.logoPaddingDesktop,
            logoColorOnScroll: settings.logoColorOnScroll,
            stickyHeader: settings.stickyHeader,
            transparentHeader: settings.transparentHeader,
            headerMobilePadding: settings.headerMobilePadding,
            mobileSideMenuShowSearch: settings.mobileSideMenuShowSearch,
            mobileSideMenuTitle: settings.mobileSideMenuTitle,
            mobileSideMenuShowAuthLinks: settings.mobileSideMenuShowAuthLinks,
            showCouponByDefault: settings.showCouponByDefault,
            showCartPageButton: settings.showCartPageButton,
            showTaxInCart: settings.showTaxInCart,
            topBarEnabled: settings.topBarEnabled,
            topBarBgColor: settings.topBarBgColor,
            topBarTextColor: settings.topBarTextColor,
            countdownEnabled: settings.countdownEnabled,
            countdownEndDate: settings.countdownEndDate,
            countdownText: settings.countdownText,
            messagesEnabled: settings.messagesEnabled,
            messagesType: settings.messagesType,
            messages: cleanedMessages,
            messagesSpeed: settings.messagesSpeed,
            messagesTextColor: settings.messagesTextColor,
            messagesFontSize: settings.messagesFontSize,
            
            // הגדרות עמוד קטגוריה
            categoryProductsPerRowDesktop: settings.categoryProductsPerRowDesktop,
            categoryProductsPerRowTablet: settings.categoryProductsPerRowTablet,
            categoryProductsPerRowMobile: settings.categoryProductsPerRowMobile,
            categoryCardHoverEffect: settings.categoryCardHoverEffect,
            categoryShowFavButton: settings.categoryShowFavButton,
            categoryQuickAddToCart: settings.categoryQuickAddToCart,
            categoryShowColorSamples: settings.categoryShowColorSamples,
            categoryShowVideo: settings.categoryShowVideo,
            categoryShowImageArrows: settings.categoryShowImageArrows,
            categoryShowImageDots: settings.categoryShowImageDots,
            categoryRemoveMobilePadding: settings.categoryRemoveMobilePadding,
            categoryImageBorderRadius: settings.categoryImageBorderRadius,
            categoryImageAspectRatio: settings.categoryImageAspectRatio,
            categoryShowSizeButtons: settings.categoryShowSizeButtons,
            categorySizeButtonPosition: settings.categorySizeButtonPosition,
            categoryShowOnlyInStock: settings.categoryShowOnlyInStock,
            categoryRemoveCardBorders: settings.categoryRemoveCardBorders,
            categoryRoundPrices: settings.categoryRoundPrices,
            categoryShowDecimals: settings.categoryShowDecimals,
            categoryContentAlignment: settings.categoryContentAlignment,
            categoryFavButtonPosition: settings.categoryFavButtonPosition,
            categoryProductNameFontSize: settings.categoryProductNameFontSize,
            categoryProductNameColor: settings.categoryProductNameColor,
            categoryRegularPriceFontSize: settings.categoryRegularPriceFontSize,
            categoryRegularPriceColor: settings.categoryRegularPriceColor,
            categorySalePriceFontSize: settings.categorySalePriceFontSize,
            categorySalePriceColor: settings.categorySalePriceColor,
            categoryStrikePriceFontSize: settings.categoryStrikePriceFontSize,
            categoryStrikePriceColor: settings.categoryStrikePriceColor,
            categoryDefaultSort: settings.categoryDefaultSort,
            categoryFilterPosition: settings.categoryFilterPosition,
            categoryEnableBanners: settings.categoryEnableBanners,
            categoryShowBadges: settings.categoryShowBadges,
            categoryAutoSaleBadge: settings.categoryAutoSaleBadge,
            categoryBannerFrequency: settings.categoryBannerFrequency,
            categoryBadgePosition: settings.categoryBadgePosition,
            categoryBanners: settings.categoryBanners,
            categoryProductsPerPage: settings.categoryProductsPerPage,
            categoryLoadType: settings.categoryLoadType,
            
            // הגדרות עמוד מוצר
            productImageRatio: settings.productImageRatio,
            productImagePosition: settings.productImagePosition,
            productShowMobileThumbs: settings.productShowMobileThumbs,
            productShowDiscountBadge: settings.productShowDiscountBadge,
            productShowQuantityButtons: settings.productShowQuantityButtons,
            productShowFavoriteButton: settings.productShowFavoriteButton,
            productShowShareButton: settings.productShowShareButton,
            productImageBorderRadius: settings.productImageBorderRadius,
            productMobileImagePadding: settings.productMobileImagePadding,
            productDiscountBadgeRounded: settings.productDiscountBadgeRounded,
            productStickyAddToCart: settings.productStickyAddToCart,
            productImageButtonsColor: settings.productImageButtonsColor,
            productDiscountBadgeColor: settings.productDiscountBadgeColor,
            productShowGalleryArrows: settings.productShowGalleryArrows,
            productGalleryArrowsColor: settings.productGalleryArrowsColor,
            productRelatedRatio: settings.productRelatedRatio,
            productRelatedBgColor: settings.productRelatedBgColor,
            productCompleteLookBgColor: settings.productCompleteLookBgColor,
            productCompleteLookTitle: settings.productCompleteLookTitle,
            productContentDisplay: settings.productContentDisplay,
            productStrengths: settings.productStrengths,
            
            // הגדרות עמוד קופה
            checkoutPagePrimaryColor: settings.checkoutPagePrimaryColor,
            checkoutPageBackgroundColor: settings.checkoutPageBackgroundColor,
            checkoutPageTextColor: settings.checkoutPageTextColor,
            checkoutPageSectionBgColor: settings.checkoutPageSectionBgColor,
            checkoutPageBorderColor: settings.checkoutPageBorderColor,
            
            // הגדרות דף תודה
            thankYouPageTemplate: settings.thankYouPageTemplate,
            thankYouPagePrimaryColor: settings.thankYouPagePrimaryColor,
            thankYouPageBackgroundColor: settings.thankYouPageBackgroundColor,
            thankYouPageTextColor: settings.thankYouPageTextColor,
            thankYouPageShowOrderDetails: settings.thankYouPageShowOrderDetails,
            thankYouPageShowContinueShopping: settings.thankYouPageShowContinueShopping,
            
            // הגדרות מיילים
            emailSenderName: settings.emailSenderName,
            emailColor1: settings.emailColor1,
            emailColor2: settings.emailColor2,
            
            // הגדרות עיצוב Gift Card
            giftCardBackgroundType: settings.giftCardBackgroundType,
            giftCardGradientColor1: settings.giftCardGradientColor1,
            giftCardGradientColor2: settings.giftCardGradientColor2,
            giftCardBackgroundImage: settings.giftCardBackgroundImage,
            giftCardBackgroundPosition: settings.giftCardBackgroundPosition,
            giftCardTextPosition: settings.giftCardTextPosition,
          },
          settings: {
            cartBehavior: settings.cartBehavior,
            checkoutPage: {
              primaryColor: settings.checkoutPagePrimaryColor,
              backgroundColor: settings.checkoutPageBackgroundColor,
              textColor: settings.checkoutPageTextColor,
              sectionBgColor: settings.checkoutPageSectionBgColor,
              borderColor: settings.checkoutPageBorderColor,
              showNewsletterCheckbox: settings.checkoutShowNewsletterCheckbox,
              newsletterDefaultChecked: settings.checkoutNewsletterDefaultChecked,
              showZipField: settings.checkoutShowZipField,
              zipRequired: settings.checkoutZipRequired,
              footerLinks: settings.checkoutFooterLinks,
              customFields: settings.checkoutCustomFields,
            },
            thankYouPage: {
              template: settings.thankYouPageTemplate,
              primaryColor: settings.thankYouPagePrimaryColor,
              backgroundColor: settings.thankYouPageBackgroundColor,
              textColor: settings.thankYouPageTextColor,
              showOrderDetails: settings.thankYouPageShowOrderDetails,
              showContinueShopping: settings.thankYouPageShowContinueShopping,
            },
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save")
      }

      // מעדכן את ה-state עם ההודעות המנוקות כדי שהמשתמש יראה את הערך המנוקה
      updateSettings("messages", cleanedMessages)

      toast({
        title: "הצלחה!",
        description: "הגדרות המראה נשמרו בהצלחה",
      })

      // שליחת event לעדכון בממשק
      window.dispatchEvent(new Event('themeUpdated'))
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בשמירת ההגדרות",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (field: keyof AppearanceSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  if (shopLoading || !selectedShop) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Palette className="w-16 h-16 text-gray-400 mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {shopLoading ? "טוען נתונים..." : "אין חנות נבחרת"}
          </h2>
          <p className="text-gray-600 mb-4">אנא המתן</p>
        </div>
      </AppLayout>
    )
  }

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case "theme":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">בחירת פונט</h3>
              <p className="text-sm text-gray-600 mb-4">הפונט ישפיע על הפרונט של החנות בלבד</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {FONTS.map((font) => (
                  <div
                    key={font.id}
                    className={cn(
                      "p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md",
                      settings.fontFamily === font.id
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => updateSettings("fontFamily", font.id)}
                  >
                    <div className="text-center">
                      <h4 className="font-semibold text-gray-900 mb-1 text-sm">{font.hebrewName}</h4>
                      <p className="text-xs text-gray-500 mb-2">{font.name}</p>
                      <div 
                        className="text-3xl font-bold mb-1"
                        style={{ 
                          fontFamily: font.id === "Noto Sans Hebrew" ? "Noto Sans Hebrew" : 
                                      font.id === "Heebo" ? "Heebo" :
                                      font.id === "Assistant" ? "Assistant" :
                                      font.id === "Varela Round" ? "Varela Round" :
                                      font.id === "Rubik" ? "Rubik" : font.id
                        }}
                      >
                        שלום
                      </div>
                      <p className="text-xs text-gray-600">{font.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-900">צבעים כלליים</h3>
              
              <div>
                <Label htmlFor="primaryColor">צבע ראשי</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="primaryColor"
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => updateSettings("primaryColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.primaryColor}
                    onChange={(e) => updateSettings("primaryColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="secondaryColor">צבע משני</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="secondaryColor"
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => updateSettings("secondaryColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.secondaryColor}
                    onChange={(e) => updateSettings("secondaryColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="primaryTextColor">צבע טקסט ראשי (לכפתורים)</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="primaryTextColor"
                    type="color"
                    value={settings.primaryTextColor}
                    onChange={(e) => updateSettings("primaryTextColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.primaryTextColor}
                    onChange={(e) => updateSettings("primaryTextColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-900">צבעי הדר</h3>
              
              <div>
                <Label htmlFor="headerBgColor">צבע רקע הדר</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="headerBgColor"
                    type="color"
                    value={settings.headerBgColor}
                    onChange={(e) => updateSettings("headerBgColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.headerBgColor}
                    onChange={(e) => updateSettings("headerBgColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="headerTextColor">צבע תוכן הדר</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="headerTextColor"
                    type="color"
                    value={settings.headerTextColor}
                    onChange={(e) => updateSettings("headerTextColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.headerTextColor}
                    onChange={(e) => updateSettings("headerTextColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-900">צבעי פוטר</h3>
              
              <div>
                <Label htmlFor="footerBgColor">צבע רקע פוטר</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="footerBgColor"
                    type="color"
                    value={settings.footerBgColor}
                    onChange={(e) => updateSettings("footerBgColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.footerBgColor}
                    onChange={(e) => updateSettings("footerBgColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="footerTextColor">צבע תוכן פוטר</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="footerTextColor"
                    type="color"
                    value={settings.footerTextColor}
                    onChange={(e) => updateSettings("footerTextColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.footerTextColor}
                    onChange={(e) => updateSettings("footerTextColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-900">צבעי כפתורים</h3>
              
              <div>
                <Label htmlFor="addToCartBtnColor">צבע כפתור הוספה לסל</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="addToCartBtnColor"
                    type="color"
                    value={settings.addToCartBtnColor}
                    onChange={(e) => updateSettings("addToCartBtnColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.addToCartBtnColor}
                    onChange={(e) => updateSettings("addToCartBtnColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="addToCartBtnTextColor">צבע טקסט כפתור הוספה לסל</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="addToCartBtnTextColor"
                    type="color"
                    value={settings.addToCartBtnTextColor}
                    onChange={(e) => updateSettings("addToCartBtnTextColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.addToCartBtnTextColor}
                    onChange={(e) => updateSettings("addToCartBtnTextColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="proceedToCheckoutBtnColor">צבע כפתור מעבר לתשלום</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="proceedToCheckoutBtnColor"
                    type="color"
                    value={settings.proceedToCheckoutBtnColor}
                    onChange={(e) => updateSettings("proceedToCheckoutBtnColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.proceedToCheckoutBtnColor}
                    onChange={(e) => updateSettings("proceedToCheckoutBtnColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="proceedToCheckoutBtnTextColor">צבע טקסט כפתור מעבר לתשלום</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="proceedToCheckoutBtnTextColor"
                    type="color"
                    value={settings.proceedToCheckoutBtnTextColor}
                    onChange={(e) => updateSettings("proceedToCheckoutBtnTextColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.proceedToCheckoutBtnTextColor}
                    onChange={(e) => updateSettings("proceedToCheckoutBtnTextColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="paymentBtnColor">צבע כפתור תשלום</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="paymentBtnColor"
                    type="color"
                    value={settings.paymentBtnColor}
                    onChange={(e) => updateSettings("paymentBtnColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.paymentBtnColor}
                    onChange={(e) => updateSettings("paymentBtnColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="paymentBtnTextColor">צבע טקסט כפתור תשלום</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="paymentBtnTextColor"
                    type="color"
                    value={settings.paymentBtnTextColor}
                    onChange={(e) => updateSettings("paymentBtnTextColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.paymentBtnTextColor}
                    onChange={(e) => updateSettings("paymentBtnTextColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-900">צבעי מחירים</h3>
              
              <div>
                <Label htmlFor="regularPriceColor">צבע מחיר רגיל</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="regularPriceColor"
                    type="color"
                    value={settings.regularPriceColor}
                    onChange={(e) => updateSettings("regularPriceColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.regularPriceColor}
                    onChange={(e) => updateSettings("regularPriceColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="salePriceColor">צבע מחיר מבצע</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="salePriceColor"
                    type="color"
                    value={settings.salePriceColor}
                    onChange={(e) => updateSettings("salePriceColor", e.target.value)}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.salePriceColor}
                    onChange={(e) => updateSettings("salePriceColor", e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case "header":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">פריסת הדר</h3>
              <Select 
                value={settings.headerLayout} 
                onValueChange={(value) => updateSettings("headerLayout", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logo-left">לוגו משמאל, תפריט במרכז</SelectItem>
                  <SelectItem value="logo-right">לוגו מימין, תפריט במרכז</SelectItem>
                  <SelectItem value="logo-center-menu-below">לוגו במרכז, תפריט מתחת</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="stickyHeader" className="font-semibold">
                    הפעל הדר נצמד (Sticky)
                  </Label>
                  <p className="text-sm text-gray-600">
                    כאשר מופעל, ההדר יישאר נראה בזמן גלילה
                  </p>
                </div>
                <Switch
                  id="stickyHeader"
                  checked={settings.stickyHeader}
                  onCheckedChange={(checked) => updateSettings("stickyHeader", checked)}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="transparentHeader" className="font-semibold">
                    הדר שקוף
                  </Label>
                  <p className="text-sm text-gray-600">
                    הדר שקוף בראש העמוד, יהפוך לאטום בעת גלילה
                  </p>
                </div>
                <Switch
                  id="transparentHeader"
                  checked={settings.transparentHeader}
                  onCheckedChange={(checked) => updateSettings("transparentHeader", checked)}
                />
              </div>

              {/* פדינג הדר במובייל */}
              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="headerMobilePadding" className="font-semibold">
                    רוחב פדינג מהצדדים במובייל (px)
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="headerMobilePadding"
                      type="range"
                      value={settings.headerMobilePadding}
                      onChange={(e) => updateSettings("headerMobilePadding", parseInt(e.target.value) || 16)}
                      min="0"
                      max="50"
                      step="1"
                      className="w-1/2 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={settings.headerMobilePadding}
                        onChange={(e) => updateSettings("headerMobilePadding", parseInt(e.target.value) || 16)}
                        min="0"
                        max="50"
                        className="w-20 h-8 text-sm text-center font-medium"
                      />
                      <span className="text-sm text-gray-600 font-medium">px</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">ברירת מחדל: 16px</p>
                </div>
              </div>

              {/* הגדרות תפריט צד במובייל */}
              <div className="pt-6 border-t mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">תפריט צד במובייל</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="mobileSideMenuShowSearch" className="font-semibold">
                        הצג חיפוש
                      </Label>
                      <p className="text-sm text-gray-600">
                        הצג שדה חיפוש בתפריט הצד במובייל
                      </p>
                    </div>
                    <Switch
                      id="mobileSideMenuShowSearch"
                      checked={settings.mobileSideMenuShowSearch}
                      onCheckedChange={(checked) => updateSettings("mobileSideMenuShowSearch", checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobileSideMenuTitle" className="font-semibold">
                      כותרת תפריט
                    </Label>
                    <Input
                      id="mobileSideMenuTitle"
                      value={settings.mobileSideMenuTitle}
                      onChange={(e) => updateSettings("mobileSideMenuTitle", e.target.value)}
                      placeholder="תפריט"
                    />
                    <p className="text-sm text-gray-600">
                      כותרת ברירת מחדל של תפריט הצד במובייל
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="mobileSideMenuShowAuthLinks" className="font-semibold">
                        הצג קישורי התחברות והרשמה
                      </Label>
                      <p className="text-sm text-gray-600">
                        הצג קישורי התחברות והרשמה בתחתית תפריט הצד
                      </p>
                    </div>
                    <Switch
                      id="mobileSideMenuShowAuthLinks"
                      checked={settings.mobileSideMenuShowAuthLinks}
                      onCheckedChange={(checked) => updateSettings("mobileSideMenuShowAuthLinks", checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "logo":
        return (
          <div className="space-y-6">
            {/* העלאת לוגו */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                לוגו החנות <span className="text-gray-400 font-normal">(אופציונלי)</span>
              </Label>
              <div className="mt-2 flex items-center gap-4">
                {settings.logo ? (
                  <div className="relative group">
                    <img 
                      src={settings.logo} 
                      alt="Logo" 
                      className="w-28 h-28 object-cover rounded-xl shadow-md ring-2 ring-emerald-100 transition-transform group-hover:scale-105" 
                    />
                    <button
                      onClick={async () => {
                        // מחיקת הקובץ מהשרת (S3) אם זה URL של S3
                        if (settings.logo && settings.logo.startsWith('https://') && settings.logo.includes('.s3.')) {
                          try {
                            const response = await fetch(`/api/files/delete?path=${encodeURIComponent(settings.logo)}`, {
                              method: 'DELETE',
                            })
                            if (response.ok) {
                              toast({
                                title: "הצלחה",
                                description: "הלוגו נמחק מהשרת",
                              })
                            } else {
                              toast({
                                title: "אזהרה",
                                description: "הלוגו הוסר מהתצוגה, אך לא נמחק מהשרת",
                                variant: "destructive",
                              })
                            }
                          } catch (error) {
                            console.error('Error deleting file:', error)
                            toast({
                              title: "אזהרה",
                              description: "הלוגו הוסר מהתצוגה, אך לא נמחק מהשרת",
                              variant: "destructive",
                            })
                          }
                        }
                        updateSettings("logo", null)
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all hover:scale-110"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all duration-200 group">
                    <Upload className="w-8 h-8 text-gray-400 group-hover:text-emerald-500 transition-colors mb-2" />
                    <span className="text-sm font-medium text-gray-600 group-hover:text-emerald-600">העלה לוגו</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          try {
                            const formData = new FormData()
                            formData.append("file", file)
                            formData.append("entityType", "shops")
                            formData.append("entityId", selectedShop?.id || "new")
                            formData.append("fileType", "logo")
                            if (selectedShop?.id) {
                              formData.append("shopId", selectedShop.id)
                            }

                            const response = await fetch("/api/files/upload", {
                              method: "POST",
                              body: formData,
                            })

                            if (response.ok) {
                              const data = await response.json()
                              updateSettings("logo", data.file.path)
                              toast({
                                title: "הצלחה",
                                description: "הלוגו הועלה בהצלחה",
                              })
                            } else {
                              throw new Error("Failed to upload")
                            }
                          } catch (error) {
                            toast({
                              title: "שגיאה",
                              description: "אירעה שגיאה בהעלאת הלוגו",
                              variant: "destructive",
                            })
                          }
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* העלאת פאביקון */}
            <div className="space-y-2 pt-6 border-t">
              <Label className="text-sm font-semibold text-gray-700">
                Favicon (אייקון דפדפן) <span className="text-gray-400 font-normal">(אופציונלי)</span>
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                האייקון שמוצג בכרטיסיית הדפדפן. מומלץ: 32x32 או 64x64 פיקסלים (PNG, SVG או ICO)
              </p>
              <div className="mt-2 flex items-center gap-4">
                {settings.favicon ? (
                  <div className="relative group">
                    <img 
                      src={settings.favicon} 
                      alt="Favicon" 
                      className="w-16 h-16 object-contain rounded-lg shadow-md ring-2 ring-emerald-100 transition-transform group-hover:scale-105" 
                    />
                    <button
                      onClick={async () => {
                        // מחיקת הקובץ מהשרת (S3) אם זה URL של S3
                        if (settings.favicon && settings.favicon.startsWith('https://') && settings.favicon.includes('.s3.')) {
                          try {
                            const response = await fetch(`/api/files/delete?path=${encodeURIComponent(settings.favicon)}`, {
                              method: 'DELETE',
                            })
                            if (response.ok) {
                              toast({
                                title: "הצלחה",
                                description: "ה-Favicon נמחק מהשרת",
                              })
                            } else {
                              toast({
                                title: "אזהרה",
                                description: "ה-Favicon הוסר מהתצוגה, אך לא נמחק מהשרת",
                                variant: "destructive",
                              })
                            }
                          } catch (error) {
                            console.error('Error deleting file:', error)
                            toast({
                              title: "אזהרה",
                              description: "ה-Favicon הוסר מהתצוגה, אך לא נמחק מהשרת",
                              variant: "destructive",
                            })
                          }
                        }
                        updateSettings("favicon", null)
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all hover:scale-110"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all duration-200 group">
                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 transition-colors mb-1" />
                    <span className="text-xs font-medium text-gray-600 group-hover:text-emerald-600 text-center px-2">העלה Favicon</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/svg+xml,image/x-icon,.ico"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          try {
                            const formData = new FormData()
                            formData.append("file", file)
                            formData.append("entityType", "shops")
                            formData.append("entityId", selectedShop?.id || "new")
                            formData.append("fileType", "favicon")
                            if (selectedShop?.id) {
                              formData.append("shopId", selectedShop.id)
                            }

                            const response = await fetch("/api/files/upload", {
                              method: "POST",
                              body: formData,
                            })

                            if (response.ok) {
                              const data = await response.json()
                              updateSettings("favicon", data.file.path)
                              toast({
                                title: "הצלחה",
                                description: "ה-Favicon הועלה בהצלחה",
                              })
                            } else {
                              throw new Error("Failed to upload")
                            }
                          } catch (error) {
                            toast({
                              title: "שגיאה",
                              description: "אירעה שגיאה בהעלאת ה-Favicon",
                              variant: "destructive",
                            })
                          }
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* הגדרות גודל לוגו */}
            {settings.logo && (
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900">הגדרות גודל ופדינג לוגו</h3>
                
                <div className="grid grid-cols-2 gap-4">
              {/* רוחב לוגו מובייל */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="logoWidthMobile" className="text-sm font-medium">
                    רוחב מובייל
                  </Label>
                  <span className="text-sm text-gray-600">{settings.logoWidthMobile}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="logoWidthMobile"
                    type="range"
                    value={settings.logoWidthMobile}
                    onChange={(e) => updateSettings("logoWidthMobile", parseFloat(e.target.value))}
                    min="20"
                    max="300"
                    step="5"
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <Input
                    type="number"
                    value={settings.logoWidthMobile}
                    onChange={(e) => updateSettings("logoWidthMobile", parseFloat(e.target.value) || 85)}
                    min="20"
                    max="300"
                    className="w-16 h-8 text-xs text-center"
                  />
                </div>
              </div>

              {/* רוחב לוגו מחשב */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="logoWidthDesktop" className="text-sm font-medium">
                    רוחב מחשב
                  </Label>
                  <span className="text-sm text-gray-600">{settings.logoWidthDesktop}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="logoWidthDesktop"
                    type="range"
                    value={settings.logoWidthDesktop}
                    onChange={(e) => updateSettings("logoWidthDesktop", parseFloat(e.target.value))}
                    min="30"
                    max="500"
                    step="5"
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <Input
                    type="number"
                    value={settings.logoWidthDesktop}
                    onChange={(e) => updateSettings("logoWidthDesktop", parseFloat(e.target.value) || 135)}
                    min="30"
                    max="500"
                    className="w-16 h-8 text-xs text-center"
                  />
                </div>
              </div>

              {/* פדינג לוגו מובייל */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="logoPaddingMobile" className="text-sm font-medium">
                    פדינג מובייל
                  </Label>
                  <span className="text-sm text-gray-600">{settings.logoPaddingMobile}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="logoPaddingMobile"
                    type="range"
                    value={settings.logoPaddingMobile}
                    onChange={(e) => updateSettings("logoPaddingMobile", parseFloat(e.target.value))}
                    min="0"
                    max="100"
                    step="2"
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <Input
                    type="number"
                    value={settings.logoPaddingMobile}
                    onChange={(e) => updateSettings("logoPaddingMobile", parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    className="w-16 h-8 text-xs text-center"
                  />
                </div>
              </div>

              {/* פדינג לוגו מחשב */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="logoPaddingDesktop" className="text-sm font-medium">
                    פדינג מחשב
                  </Label>
                  <span className="text-sm text-gray-600">{settings.logoPaddingDesktop}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="logoPaddingDesktop"
                    type="range"
                    value={settings.logoPaddingDesktop}
                    onChange={(e) => updateSettings("logoPaddingDesktop", parseFloat(e.target.value))}
                    min="0"
                    max="100"
                    step="2"
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <Input
                    type="number"
                    value={settings.logoPaddingDesktop}
                    onChange={(e) => updateSettings("logoPaddingDesktop", parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    className="w-16 h-8 text-xs text-center"
                  />
                </div>
              </div>
            </div>

                <div className="pt-6 border-t">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">שינוי צבע לוגו בגלילה</h4>
                  <Select 
                    value={settings.logoColorOnScroll} 
                    onValueChange={(value) => updateSettings("logoColorOnScroll", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא שינוי</SelectItem>
                      <SelectItem value="white">שנה ללבן בעת גלילה</SelectItem>
                      <SelectItem value="black">שנה לשחור בעת גלילה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )

      case "cart":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                בחר מה יקרה אחרי הוספת מוצר לסל
              </h3>
              <Select 
                value={settings.cartBehavior} 
                onValueChange={(value) => updateSettings("cartBehavior", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open-cart">פתיחת עגלת הקניות (ברירת מחדל)</SelectItem>
                  <SelectItem value="show-notification">הצגת הודעת הצלחה בלבד</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 mt-2">
                {settings.cartBehavior === "open-cart" 
                  ? "עגלת הקניות תיפתח אוטומטית אחרי הוספת מוצר"
                  : "תוצג הודעת הצלחה קטנה בלי לפתוח את העגלה"}
              </p>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">הצגת קופון ברירת מחדל</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    האם להציג את החלק של קופון פתוח כברירת מחדל בעגלה
                  </p>
                </div>
                <Switch
                  checked={settings.showCouponByDefault}
                  onCheckedChange={(checked) => updateSettings("showCouponByDefault", checked)}
                />
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">הצגת כפתור מעבר לעגלה</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    הצג כפתור נוסף "מעבר לעגלה" בעגלת הצד, מתחת לכפתור "מעבר לקופה"
                  </p>
                </div>
                <Switch
                  checked={settings.showCartPageButton}
                  onCheckedChange={(checked) => updateSettings("showCartPageButton", checked)}
                />
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">הצגת מע"מ בעגלה</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    הצג את שורת "כולל מע״מ" בעגלת הקניות ובעמוד הקופה (ברירת מחדל: כבוי)
                  </p>
                </div>
                <Switch
                  checked={settings.showTaxInCart}
                  onCheckedChange={(checked) => updateSettings("showTaxInCart", checked)}
                />
              </div>
            </div>
          </div>
        )

      case "category":
        // פונקציה ליצירת תצוגה מקדימה של כרטיס מוצר
        const CategoryPreviewCard = () => {
          const aspectRatioMap = {
            "1:1": "aspect-square",
            "3:4": "aspect-[3/4]",
            "6:9": "aspect-[6/9]",
            "9:16": "aspect-[9/16]",
          }
          
          return (
            <div className={cn(
              "bg-white rounded-lg overflow-hidden transition-all",
              !settings.categoryRemoveCardBorders && "border border-gray-200 shadow-sm",
              settings.categoryRemoveCardBorders && "shadow-none"
            )}>
              {/* תמונה */}
              <div 
                className={cn(
                  "relative bg-gray-100",
                  aspectRatioMap[settings.categoryImageAspectRatio]
                )} 
                style={{ 
                  borderRadius: settings.categoryImageBorderRadius > 0 
                    ? `${settings.categoryImageBorderRadius}px ${settings.categoryImageBorderRadius}px 0 0` 
                    : undefined 
                }}
              >
                <Skeleton className="w-full h-full" />
                
                {/* כפתור מועדפים - תמיד משמאל כדי לא להתנגש עם מדבקות */}
                {settings.categoryShowFavButton && (() => {
                  // אם יש מדבקות למעלה, כפתור המועדפים יהיה משמאל (top-left)
                  // אחרת, השתמש במיקום שנבחר
                  const hasTopBadge = settings.categoryShowBadges && 
                    (settings.categoryBadgePosition === "top-right" || settings.categoryBadgePosition === "top-left");
                  
                  let position = "";
                  if (hasTopBadge) {
                    // אם יש מדבקות למעלה, כפתור המועדפים משמאל
                    position = "top-2 left-2";
                  } else {
                    // אחרת, השתמש במיקום שנבחר
                    if (settings.categoryFavButtonPosition === "top-right") position = "top-2 right-2";
                    else if (settings.categoryFavButtonPosition === "top-left") position = "top-2 left-2";
                    else if (settings.categoryFavButtonPosition === "bottom-right") position = "bottom-2 right-2";
                    else if (settings.categoryFavButtonPosition === "bottom-left") position = "bottom-2 left-2";
                    else position = "top-2 left-2"; // ברירת מחדל משמאל
                  }
                  
                  return (
                    <div className={cn("absolute z-20", position)}>
                      <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors">
                        <Heart className="w-4 h-4 text-gray-600" />
                      </div>
                    </div>
                  );
                })()}
                
                {/* מדבקות - תמיד מימין למעלה */}
                {settings.categoryShowBadges && (
                  <div className={cn(
                    "absolute z-10",
                    settings.categoryBadgePosition === "top-right" && "top-2 right-2",
                    settings.categoryBadgePosition === "top-left" && "top-2 left-2",
                    settings.categoryBadgePosition === "bottom-right" && "bottom-2 right-2",
                    settings.categoryBadgePosition === "bottom-left" && "bottom-2 left-2"
                  )}>
                    {settings.categoryAutoSaleBadge && (
                      <div className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded shadow-sm">
                        SALE
                      </div>
                    )}
                  </div>
                )}
                
                {/* חצים על התמונה */}
                {settings.categoryShowImageArrows && (
                  <>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
                      <div className="w-0 h-0 border-r-4 border-r-gray-600 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
                    </div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
                      <div className="w-0 h-0 border-l-4 border-l-gray-600 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
                    </div>
                  </>
                )}
                
                {/* נקודות תחתית התמונה */}
                {settings.categoryShowImageDots && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-sm"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-sm"></div>
                  </div>
                )}
                
                {/* כפתורי מידות על התמונה */}
                {settings.categoryShowSizeButtons && settings.categorySizeButtonPosition === "on-image" && (
                  <div className="absolute bottom-2 right-2 flex gap-1 z-10">
                    {settings.categoryShowOnlyInStock ? (
                      <>
                        <div className="w-6 h-6 rounded bg-white/90 backdrop-blur-sm text-xs flex items-center justify-center text-gray-700 font-medium shadow-sm">
                          S
                        </div>
                        <div className="w-6 h-6 rounded bg-white/90 backdrop-blur-sm text-xs flex items-center justify-center text-gray-700 font-medium shadow-sm">
                          M
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded bg-white/90 backdrop-blur-sm text-xs flex items-center justify-center text-gray-700 font-medium shadow-sm opacity-50">
                          XS
                        </div>
                        <div className="w-6 h-6 rounded bg-white/90 backdrop-blur-sm text-xs flex items-center justify-center text-gray-700 font-medium shadow-sm">
                          S
                        </div>
                        <div className="w-6 h-6 rounded bg-white/90 backdrop-blur-sm text-xs flex items-center justify-center text-gray-700 font-medium shadow-sm">
                          M
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {/* תוכן */}
              <div className={cn(
                "space-y-2",
                settings.categoryRemoveMobilePadding ? "p-2 md:p-3" : "p-3",
                settings.categoryContentAlignment === "right" && "text-right",
                settings.categoryContentAlignment === "center" && "text-center",
                settings.categoryContentAlignment === "left" && "text-left"
              )}>
                {/* שם מוצר */}
                <div 
                  className="font-medium truncate"
                  style={{
                    fontSize: `${settings.categoryProductNameFontSize}px`,
                    color: settings.categoryProductNameColor
                  }}
                >
                  שם המוצר לדוגמה
                </div>
                
                {/* מחירים */}
                <div className="flex items-center gap-2 flex-wrap" style={{ justifyContent: settings.categoryContentAlignment === "center" ? "center" : settings.categoryContentAlignment === "right" ? "flex-end" : "flex-start" }}>
                  {/* מחיר מבצע */}
                  <span 
                    className="font-semibold"
                    style={{
                      fontSize: `${settings.categorySalePriceFontSize}px`,
                      color: settings.categorySalePriceColor
                    }}
                  >
                    {settings.categoryRoundPrices 
                      ? `₪${Math.round(99)}` 
                      : settings.categoryShowDecimals 
                        ? "₪99.00" 
                        : "₪99"}
                  </span>
                  {/* מחיר מחוק */}
                  <span 
                    className="line-through"
                    style={{
                      fontSize: `${settings.categoryStrikePriceFontSize}px`,
                      color: settings.categoryStrikePriceColor
                    }}
                  >
                    {settings.categoryRoundPrices 
                      ? `₪${Math.round(149)}` 
                      : settings.categoryShowDecimals 
                        ? "₪149.00" 
                        : "₪149"}
                  </span>
                  {/* מחיר רגיל (אם אין מבצע) - להצגה בתצוגה מקדימה */}
                  {!settings.categoryAutoSaleBadge && (
                    <span 
                      className="font-semibold"
                      style={{
                        fontSize: `${settings.categoryRegularPriceFontSize}px`,
                        color: settings.categoryRegularPriceColor
                      }}
                    >
                      {settings.categoryRoundPrices 
                        ? `₪${Math.round(149)}` 
                        : settings.categoryShowDecimals 
                          ? "₪149.00" 
                          : "₪149"}
                    </span>
                  )}
                </div>
                
                {/* כפתורי מידות מתחת למחיר */}
                {settings.categoryShowSizeButtons && settings.categorySizeButtonPosition === "below-image" && (
                  <div className="flex gap-1 pt-1" style={{ justifyContent: settings.categoryContentAlignment === "center" ? "center" : settings.categoryContentAlignment === "right" ? "flex-end" : "flex-start" }}>
                    <div className="w-7 h-7 rounded border border-gray-300 text-xs flex items-center justify-center text-gray-700 font-medium hover:border-gray-400 cursor-pointer">
                      S
                    </div>
                    <div className="w-7 h-7 rounded border border-gray-300 text-xs flex items-center justify-center text-gray-700 font-medium hover:border-gray-400 cursor-pointer">
                      M
                    </div>
                    <div className="w-7 h-7 rounded border border-gray-300 text-xs flex items-center justify-center text-gray-700 font-medium hover:border-gray-400 cursor-pointer">
                      L
                    </div>
                  </div>
                )}
                
                {/* דוגמאות צבע */}
                {settings.categoryShowColorSamples && (
                  <div className="flex gap-1.5 pt-1" style={{ justifyContent: settings.categoryContentAlignment === "center" ? "center" : settings.categoryContentAlignment === "right" ? "flex-end" : "flex-start" }}>
                    <div className="w-4 h-4 rounded-full border border-gray-300 bg-red-500"></div>
                    <div className="w-4 h-4 rounded-full border border-gray-300 bg-blue-500"></div>
                    <div className="w-4 h-4 rounded-full border border-gray-300 bg-green-500"></div>
                  </div>
                )}
              </div>
            </div>
          )
        }
        
        return (
          <div className="space-y-6">
            {/* תצוגה מקדימה */}
            <Card className="bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-emerald-600" />
                    <CardTitle className="text-lg">תצוגה מקדימה</CardTitle>
                  </div>
                  <span className="text-sm text-gray-600">השינויים יופיעו בזמן אמת</span>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="grid gap-4 p-4 bg-white rounded-lg"
                  style={{
                    gridTemplateColumns: `repeat(${settings.categoryProductsPerRowDesktop}, minmax(0, 1fr))`
                  }}
                >
                  {Array.from({ length: Math.min(settings.categoryProductsPerRowDesktop, 4) }).map((_, i) => (
                    <CategoryPreviewCard key={i} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* פריסה */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Grid3x3 className="w-5 h-5 text-gray-600" />
                  <CardTitle>פריסת רשת</CardTitle>
                </div>
                <CardDescription>הגדר כמה מוצרים יוצגו בכל שורה לפי סוג המכשיר</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-gray-600" />
                      <Label className="text-sm font-semibold">דסקטופ</Label>
                    </div>
                    <Input
                      type="number"
                      value={settings.categoryProductsPerRowDesktop}
                      onChange={(e) => updateSettings("categoryProductsPerRowDesktop", parseFloat(e.target.value) || 4)}
                      min="1"
                      max="6"
                      className="text-center font-medium text-lg"
                    />
                    <p className="text-xs text-gray-500">מוצרים בשורה</p>
                  </div>
                  
                  <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <Tablet className="w-4 h-4 text-gray-600" />
                      <Label className="text-sm font-semibold">טאבלט</Label>
                    </div>
                    <Input
                      type="number"
                      value={settings.categoryProductsPerRowTablet}
                      onChange={(e) => updateSettings("categoryProductsPerRowTablet", parseFloat(e.target.value) || 3)}
                      min="1"
                      max="6"
                      className="text-center font-medium text-lg"
                    />
                    <p className="text-xs text-gray-500">מוצרים בשורה</p>
                  </div>
                  
                  <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-gray-600" />
                      <Label className="text-sm font-semibold">מובייל</Label>
                    </div>
                    <Input
                      type="number"
                      value={settings.categoryProductsPerRowMobile}
                      onChange={(e) => updateSettings("categoryProductsPerRowMobile", parseFloat(e.target.value) || 2)}
                      min="1"
                      max="4"
                      className="text-center font-medium text-lg"
                    />
                    <p className="text-xs text-gray-500">מוצרים בשורה</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* הגדרות כרטיס מוצר */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-gray-600" />
                  <CardTitle>עיצוב כרטיס מוצר</CardTitle>
                </div>
                <CardDescription>התאם את המראה והתנהגות של כרטיסי המוצרים</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* תמונה */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    תמונות
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">עיגול פינות תמונה (px)</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          value={settings.categoryImageBorderRadius}
                          onChange={(e) => updateSettings("categoryImageBorderRadius", parseFloat(e.target.value) || 0)}
                          min="0"
                          max="50"
                          step="1"
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                        <Input
                          type="number"
                          value={settings.categoryImageBorderRadius}
                          onChange={(e) => updateSettings("categoryImageBorderRadius", parseFloat(e.target.value) || 0)}
                          min="0"
                          max="50"
                          className="w-20 text-center"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">יחס גובה-רוחב תמונות</Label>
                      <Select
                        value={settings.categoryImageAspectRatio}
                        onValueChange={(value) => updateSettings("categoryImageAspectRatio", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1:1">ריבוע (1:1)</SelectItem>
                          <SelectItem value="3:4">פורטרט (3:4)</SelectItem>
                          <SelectItem value="6:9">גבוה (6:9)</SelectItem>
                          <SelectItem value="9:16">מאורך גבוה (9:16)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">אפקט hover לתמונות</Label>
                        <p className="text-xs text-gray-500">תמונה שנייה בעת מעבר עכבר</p>
                      </div>
                      <Switch
                        checked={settings.categoryCardHoverEffect}
                        onCheckedChange={(checked) => updateSettings("categoryCardHoverEffect", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">הצג וידאו למוצרים</Label>
                        <p className="text-xs text-gray-500">וידאו במקום תמונה (אם קיים)</p>
                      </div>
                      <Switch
                        checked={settings.categoryShowVideo}
                        onCheckedChange={(checked) => updateSettings("categoryShowVideo", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">הצג חצים על התמונה</Label>
                        <p className="text-xs text-gray-500">חצי ניווט לגלריית התמונות</p>
                      </div>
                      <Switch
                        checked={settings.categoryShowImageArrows}
                        onCheckedChange={(checked) => updateSettings("categoryShowImageArrows", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">הצג נקודות תחתית התמונה</Label>
                        <p className="text-xs text-gray-500">נקודות לניווט בגלריית התמונות</p>
                      </div>
                      <Switch
                        checked={settings.categoryShowImageDots}
                        onCheckedChange={(checked) => updateSettings("categoryShowImageDots", checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* כפתורים ואינטראקציות */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    כפתורים ואינטראקציות
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">כפתור מועדפים</Label>
                        <p className="text-xs text-gray-500">כפתור הוספה לרשימת מועדפים</p>
                      </div>
                      <Switch
                        checked={settings.categoryShowFavButton}
                        onCheckedChange={(checked) => updateSettings("categoryShowFavButton", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">הוספה מהירה לעגלה</Label>
                        <p className="text-xs text-gray-500">חלון קופץ לבחירת אפשרויות</p>
                      </div>
                      <Switch
                        checked={settings.categoryQuickAddToCart}
                        onCheckedChange={(checked) => updateSettings("categoryQuickAddToCart", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">דוגמאות צבע</Label>
                        <p className="text-xs text-gray-500">עיגולי צבע על כרטיס המוצר</p>
                      </div>
                      <Switch
                        checked={settings.categoryShowColorSamples}
                        onCheckedChange={(checked) => updateSettings("categoryShowColorSamples", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">כפתורי מידות</Label>
                        <p className="text-xs text-gray-500">הצגת מידות זמינות על כרטיס המוצר</p>
                      </div>
                      <Switch
                        checked={settings.categoryShowSizeButtons}
                        onCheckedChange={(checked) => updateSettings("categoryShowSizeButtons", checked)}
                      />
                    </div>
                  </div>

                  {settings.categoryShowSizeButtons && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">הצג רק מידות במלאי</Label>
                          <p className="text-xs text-gray-500">הסתר מידות שאזלו מהמלאי</p>
                        </div>
                        <Switch
                          checked={settings.categoryShowOnlyInStock}
                          onCheckedChange={(checked) => updateSettings("categoryShowOnlyInStock", checked)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">מיקום כפתורי מידות</Label>
                        <Select
                          value={settings.categorySizeButtonPosition}
                          onValueChange={(value) => updateSettings("categorySizeButtonPosition", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on-image">על התמונה מצד ימין</SelectItem>
                            <SelectItem value="below-image">מתחת למחיר</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* עיצוב כללי */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Layout className="w-4 h-4" />
                    עיצוב כללי
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">הסר מסגרות מכרטיסים</Label>
                        <p className="text-xs text-gray-500">עיצוב נקי ללא מסגרות סביב המוצרים</p>
                      </div>
                      <Switch
                        checked={settings.categoryRemoveCardBorders}
                        onCheckedChange={(checked) => updateSettings("categoryRemoveCardBorders", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">הסר פדינג מובייל</Label>
                        <p className="text-xs text-gray-500">הסרת רווחים מצדי התמונות במובייל</p>
                      </div>
                      <Switch
                        checked={settings.categoryRemoveMobilePadding}
                        onCheckedChange={(checked) => updateSettings("categoryRemoveMobilePadding", checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* תצוגת מחירים ויישור */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gray-600" />
                  <CardTitle>תצוגת מחירים ויישור</CardTitle>
                </div>
                <CardDescription>התאם את תצוגת המחירים ומיקום התוכן בכרטיסי המוצרים</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">יישור תוכן</Label>
                    <p className="text-xs text-gray-500 mb-2">יישור שם המוצר, מחיר וצבעים</p>
                    <Select
                      value={settings.categoryContentAlignment}
                      onValueChange={(value) => updateSettings("categoryContentAlignment", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="right">ימין</SelectItem>
                        <SelectItem value="center">מרכז</SelectItem>
                        <SelectItem value="left">שמאל</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">מיקום כפתור מועדפים</Label>
                    <p className="text-xs text-gray-500 mb-2">מיקום כפתור המועדפים על התמונה</p>
                    <Select
                      value={settings.categoryFavButtonPosition}
                      onValueChange={(value) => updateSettings("categoryFavButtonPosition", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-right">למעלה ימין</SelectItem>
                        <SelectItem value="top-left">למעלה שמאל</SelectItem>
                        <SelectItem value="bottom-right">למטה ימין</SelectItem>
                        <SelectItem value="bottom-left">למטה שמאל</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t">
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium">עיגול מחירים</Label>
                      <p className="text-xs text-gray-500">הצגת מחירים ללא עשרוניות (₪52)</p>
                    </div>
                    <Switch
                      checked={settings.categoryRoundPrices}
                      onCheckedChange={(checked) => updateSettings("categoryRoundPrices", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium">מחירים עם עשרוניות</Label>
                      <p className="text-xs text-gray-500">הצגת מחירים עם .00 (₪52.00)</p>
                    </div>
                    <Switch
                      checked={settings.categoryShowDecimals}
                      onCheckedChange={(checked) => updateSettings("categoryShowDecimals", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* טיפוגרפיה */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Type className="w-5 h-5 text-gray-600" />
                  <CardTitle>טיפוגרפיה</CardTitle>
                </div>
                <CardDescription>התאם את הגדלים והצבעים של הטקסטים בכרטיסי המוצרים</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* שם המוצר */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">Aa</span>
                      </div>
                      <Label className="text-sm font-semibold text-gray-900">שם המוצר</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">גודל פונט (px)</Label>
                        <Input
                          type="number"
                          value={settings.categoryProductNameFontSize}
                          onChange={(e) => updateSettings("categoryProductNameFontSize", parseFloat(e.target.value) || 14)}
                          min="10"
                          max="24"
                          className="text-center font-medium"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">צבע</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={settings.categoryProductNameColor}
                            onChange={(e) => updateSettings("categoryProductNameColor", e.target.value)}
                            className="h-9 w-16 cursor-pointer rounded"
                          />
                          <Input
                            value={settings.categoryProductNameColor}
                            onChange={(e) => updateSettings("categoryProductNameColor", e.target.value)}
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* מחיר רגיל */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">₪</span>
                      </div>
                      <Label className="text-sm font-semibold text-gray-900">מחיר רגיל</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">גודל פונט (px)</Label>
                        <Input
                          type="number"
                          value={settings.categoryRegularPriceFontSize}
                          onChange={(e) => updateSettings("categoryRegularPriceFontSize", parseFloat(e.target.value) || 16)}
                          min="10"
                          max="24"
                          className="text-center font-medium"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">צבע</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={settings.categoryRegularPriceColor}
                            onChange={(e) => updateSettings("categoryRegularPriceColor", e.target.value)}
                            className="h-9 w-16 cursor-pointer rounded"
                          />
                          <Input
                            value={settings.categoryRegularPriceColor}
                            onChange={(e) => updateSettings("categoryRegularPriceColor", e.target.value)}
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* מחיר מבצע */}
                  <div className="bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">%</span>
                      </div>
                      <Label className="text-sm font-semibold text-gray-900">מחיר מבצע</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">גודל פונט (px)</Label>
                        <Input
                          type="number"
                          value={settings.categorySalePriceFontSize}
                          onChange={(e) => updateSettings("categorySalePriceFontSize", parseFloat(e.target.value) || 16)}
                          min="10"
                          max="24"
                          className="text-center font-medium"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">צבע</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={settings.categorySalePriceColor}
                            onChange={(e) => updateSettings("categorySalePriceColor", e.target.value)}
                            className="h-9 w-16 cursor-pointer rounded"
                          />
                          <Input
                            value={settings.categorySalePriceColor}
                            onChange={(e) => updateSettings("categorySalePriceColor", e.target.value)}
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* מחיר מחוק */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-400 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold line-through">₪</span>
                      </div>
                      <Label className="text-sm font-semibold text-gray-900">מחיר מחוק</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">גודל פונט (px)</Label>
                        <Input
                          type="number"
                          value={settings.categoryStrikePriceFontSize}
                          onChange={(e) => updateSettings("categoryStrikePriceFontSize", parseFloat(e.target.value) || 14)}
                          min="10"
                          max="24"
                          className="text-center font-medium"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">צבע</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={settings.categoryStrikePriceColor}
                            onChange={(e) => updateSettings("categoryStrikePriceColor", e.target.value)}
                            className="h-9 w-16 cursor-pointer rounded"
                          />
                          <Input
                            value={settings.categoryStrikePriceColor}
                            onChange={(e) => updateSettings("categoryStrikePriceColor", e.target.value)}
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* מיון וסינון */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <CardTitle>מיון וסינון</CardTitle>
                </div>
                <CardDescription>הגדר את אופן המיון והסינון של המוצרים בעמוד הקטגוריה</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">מיון ברירת מחדל</Label>
                    <Select
                      value={settings.categoryDefaultSort}
                      onValueChange={(value) => updateSettings("categoryDefaultSort", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">סדר ברירת מחדל</SelectItem>
                        <SelectItem value="price-asc">מחיר: נמוך לגבוה</SelectItem>
                        <SelectItem value="price-desc">מחיר: גבוה לנמוך</SelectItem>
                        <SelectItem value="name-asc">שם: א-ת</SelectItem>
                        <SelectItem value="name-desc">שם: ת-א</SelectItem>
                        <SelectItem value="newest">חדש ביותר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">מיקום פילטרים</Label>
                    <Select
                      value={settings.categoryFilterPosition}
                      onValueChange={(value) => updateSettings("categoryFilterPosition", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">למעלה בדף</SelectItem>
                        <SelectItem value="sidebar">סיידבר צדדי</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* באנרים ברשימת מוצרים */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-gray-600" />
                  <CardTitle>באנרים ברשימת מוצרים</CardTitle>
                </div>
                <CardDescription>הוסף באנרים שיופיעו באמצע רשימת המוצרים</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">הפעל באנרים ברשימה</Label>
                    <p className="text-xs text-gray-500">באנרים באמצע רשימת המוצרים</p>
                  </div>
                  <Switch
                    checked={settings.categoryEnableBanners}
                    onCheckedChange={(checked) => updateSettings("categoryEnableBanners", checked)}
                  />
                </div>

                {settings.categoryEnableBanners && (
                  <>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-medium">תדירות באנרים</Label>
                      <p className="text-xs text-gray-500 mb-2">באנר יופיע אחרי כל X מוצרים</p>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={settings.categoryBannerFrequency}
                          onChange={(e) => updateSettings("categoryBannerFrequency", parseFloat(e.target.value) || 6)}
                          min="2"
                          max="20"
                          className="w-24"
                        />
                        <span className="text-sm text-gray-600">מוצרים</span>
                      </div>
                    </div>

                    {/* ניהול באנרים */}
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">רשימת באנרים</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            באנרים שיופיעו אחרי כל {settings.categoryBannerFrequency} מוצרים
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            const newBanner = {
                              id: Date.now().toString(),
                              title: "באנר חדש",
                              description: "",
                              image: "",
                              link: "",
                              buttonText: "לחץ כאן",
                              bgColor: "#f3f4f6",
                              textColor: "#111827",
                              enabled: true,
                            }
                            updateSettings("categoryBanners", [...settings.categoryBanners, newBanner])
                          }}
                          size="sm"
                          className="prodify-gradient text-white"
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          הוסף באנר
                        </Button>
                      </div>

                  {settings.categoryBanners.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm text-gray-600 font-medium mb-1">לא הוגדרו באנרים עדיין</p>
                      <p className="text-xs text-gray-500">השתמש בכפתור "הוסף באנר" להוספת באנר ראשון</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {settings.categoryBanners.map((banner, index) => (
                        <div
                          key={banner.id}
                          className="border rounded-lg p-4 space-y-3 bg-white shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-700">באנר #{index + 1}</span>
                                <Switch
                                  checked={banner.enabled}
                                  onCheckedChange={(checked) => {
                                    const updated = [...settings.categoryBanners]
                                    updated[index] = { ...banner, enabled: checked }
                                    updateSettings("categoryBanners", updated)
                                  }}
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updated = settings.categoryBanners.filter((_, i) => i !== index)
                                updateSettings("categoryBanners", updated)
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs">כותרת</Label>
                              <Input
                                value={banner.title}
                                onChange={(e) => {
                                  const updated = [...settings.categoryBanners]
                                  updated[index] = { ...banner, title: e.target.value }
                                  updateSettings("categoryBanners", updated)
                                }}
                                placeholder="כותרת הבאנר"
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">טקסט כפתור</Label>
                              <Input
                                value={banner.buttonText}
                                onChange={(e) => {
                                  const updated = [...settings.categoryBanners]
                                  updated[index] = { ...banner, buttonText: e.target.value }
                                  updateSettings("categoryBanners", updated)
                                }}
                                placeholder="טקסט הכפתור"
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-2 col-span-2">
                              <Label className="text-xs">תיאור (אופציונלי)</Label>
                              <Textarea
                                value={banner.description || ""}
                                onChange={(e) => {
                                  const updated = [...settings.categoryBanners]
                                  updated[index] = { ...banner, description: e.target.value }
                                  updateSettings("categoryBanners", updated)
                                }}
                                placeholder="תיאור קצר"
                                rows={2}
                                className="text-sm resize-none"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">קישור (URL)</Label>
                              <Input
                                value={banner.link || ""}
                                onChange={(e) => {
                                  const updated = [...settings.categoryBanners]
                                  updated[index] = { ...banner, link: e.target.value }
                                  updateSettings("categoryBanners", updated)
                                }}
                                placeholder="https://example.com"
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">תמונת רקע (URL)</Label>
                              <Input
                                value={banner.image || ""}
                                onChange={(e) => {
                                  const updated = [...settings.categoryBanners]
                                  updated[index] = { ...banner, image: e.target.value }
                                  updateSettings("categoryBanners", updated)
                                }}
                                placeholder="https://example.com/image.jpg"
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">צבע רקע</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="color"
                                  value={banner.bgColor || "#f3f4f6"}
                                  onChange={(e) => {
                                    const updated = [...settings.categoryBanners]
                                    updated[index] = { ...banner, bgColor: e.target.value }
                                    updateSettings("categoryBanners", updated)
                                  }}
                                  className="w-16 h-9"
                                />
                                <Input
                                  value={banner.bgColor || "#f3f4f6"}
                                  onChange={(e) => {
                                    const updated = [...settings.categoryBanners]
                                    updated[index] = { ...banner, bgColor: e.target.value }
                                    updateSettings("categoryBanners", updated)
                                  }}
                                  className="flex-1 text-sm"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">צבע טקסט</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="color"
                                  value={banner.textColor || "#111827"}
                                  onChange={(e) => {
                                    const updated = [...settings.categoryBanners]
                                    updated[index] = { ...banner, textColor: e.target.value }
                                    updateSettings("categoryBanners", updated)
                                  }}
                                  className="w-16 h-9"
                                />
                                <Input
                                  value={banner.textColor || "#111827"}
                                  onChange={(e) => {
                                    const updated = [...settings.categoryBanners]
                                    updated[index] = { ...banner, textColor: e.target.value }
                                    updateSettings("categoryBanners", updated)
                                  }}
                                  className="flex-1 text-sm"
                                />
                              </div>
                            </div>
                          </div>

                          {/* תצוגה מקדימה */}
                          <div className="pt-3 border-t">
                            <Label className="text-xs text-gray-600 mb-2 block">תצוגה מקדימה</Label>
                            <div
                              className="rounded-lg p-6 text-center relative overflow-hidden"
                              style={{
                                backgroundColor: banner.bgColor || "#f3f4f6",
                                color: banner.textColor || "#111827",
                                backgroundImage: banner.image ? `url(${banner.image})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                            >
                              {banner.image && (
                                <div className="absolute inset-0 bg-black/30" />
                              )}
                              <div className="relative z-10">
                                <h3 className="text-lg font-bold mb-2">{banner.title || "כותרת הבאנר"}</h3>
                                {banner.description && (
                                  <p className="text-sm mb-4 opacity-90">{banner.description}</p>
                                )}
                                {banner.buttonText && (
                                  <button
                                    className="px-4 py-2 rounded-lg font-medium text-sm"
                                    style={{
                                      backgroundColor: banner.textColor || "#111827",
                                      color: banner.bgColor || "#f3f4f6",
                                    }}
                                  >
                                    {banner.buttonText}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* מדבקות על מוצרים */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-gray-600" />
                  <CardTitle>מדבקות על מוצרים</CardTitle>
                </div>
                <CardDescription>הגדר את תצוגת המדבקות על כרטיסי המוצרים</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">הצג מדבקות</Label>
                    <p className="text-xs text-gray-500">מדבקות "חדש", "מבצע" וכו' על כרטיסי המוצרים</p>
                  </div>
                  <Switch
                    checked={settings.categoryShowBadges}
                    onCheckedChange={(checked) => updateSettings("categoryShowBadges", checked)}
                  />
                </div>

                {settings.categoryShowBadges && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">מדבקת SALE אוטומטית</Label>
                        <p className="text-xs text-gray-500">הצג מדבקת "SALE" אוטומטית על מוצרים עם מחיר מבצע</p>
                      </div>
                      <Switch
                        checked={settings.categoryAutoSaleBadge}
                        onCheckedChange={(checked) => updateSettings("categoryAutoSaleBadge", checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">מיקום מדבקות</Label>
                      <Select
                        value={settings.categoryBadgePosition}
                        onValueChange={(value) => updateSettings("categoryBadgePosition", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top-right">למעלה ימין</SelectItem>
                          <SelectItem value="top-left">למעלה שמאל</SelectItem>
                          <SelectItem value="bottom-right">למטה ימין</SelectItem>
                          <SelectItem value="bottom-left">למטה שמאל</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* הגדרות טעינה */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Loader className="w-5 h-5 text-gray-600" />
                  <CardTitle>הגדרות טעינה</CardTitle>
                </div>
                <CardDescription>הגדר את אופן טעינת המוצרים בעמוד הקטגוריה</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">מוצרים בעמוד</Label>
                    <Input
                      type="number"
                      value={settings.categoryProductsPerPage}
                      onChange={(e) => updateSettings("categoryProductsPerPage", parseFloat(e.target.value) || 24)}
                      min="12"
                      max="100"
                      step="4"
                    />
                    <p className="text-xs text-gray-500">מספר המוצרים שיוצגו בכל עמוד</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">סוג טעינת מוצרים</Label>
                    <Select
                      value={settings.categoryLoadType}
                      onValueChange={(value) => updateSettings("categoryLoadType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="load-more">כפתור "טען עוד"</SelectItem>
                        <SelectItem value="pagination">עמודים</SelectItem>
                        <SelectItem value="infinite-scroll">גלילה אינסופית</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">אופן טעינת מוצרים נוספים</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "topbar":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="topBarEnabled" className="text-lg font-semibold">
                  הפעל סרג עליון
                </Label>
                <p className="text-sm text-gray-600">
                  הפעלה/כיבוי של כל הסרג העליון (קאונטדאון והודעות)
                </p>
              </div>
              <Switch
                id="topBarEnabled"
                checked={settings.topBarEnabled}
                onCheckedChange={(checked) => updateSettings("topBarEnabled", checked)}
              />
            </div>

            {settings.topBarEnabled && (
              <>
                <div className="space-y-4 pt-6 border-t">
                  <h4 className="font-semibold text-gray-900">צבעי סרג עליון</h4>
                  
                  <div>
                    <Label htmlFor="topBarBgColor">צבע רקע סרג עליון</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        id="topBarBgColor"
                        type="color"
                        value={settings.topBarBgColor}
                        onChange={(e) => updateSettings("topBarBgColor", e.target.value)}
                        className="w-16 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={settings.topBarBgColor}
                        onChange={(e) => updateSettings("topBarBgColor", e.target.value)}
                        className="flex-1 h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="topBarTextColor">צבע טקסט סרג עליון</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        id="topBarTextColor"
                        type="color"
                        value={settings.topBarTextColor}
                        onChange={(e) => updateSettings("topBarTextColor", e.target.value)}
                        className="w-16 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={settings.topBarTextColor}
                        onChange={(e) => updateSettings("topBarTextColor", e.target.value)}
                        className="flex-1 h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="countdownEnabled" className="font-semibold">
                        הפעל שעון ספירה לאחור
                      </Label>
                      <p className="text-sm text-gray-600">
                        הצגת שעון ספירה לאחור בסרג העליון
                      </p>
                    </div>
                    <Switch
                      id="countdownEnabled"
                      checked={settings.countdownEnabled}
                      onCheckedChange={(checked) => updateSettings("countdownEnabled", checked)}
                    />
                  </div>

                  {settings.countdownEnabled && (
                    <>
                      <div>
                        <Label htmlFor="countdownText">טקסט קאונטדאון</Label>
                        <Input
                          id="countdownText"
                          value={settings.countdownText}
                          onChange={(e) => updateSettings("countdownText", e.target.value)}
                          placeholder="הצעה מוגבלת!"
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="countdownEndDate">תאריך סיום</Label>
                        <Input
                          id="countdownEndDate"
                          type="datetime-local"
                          value={settings.countdownEndDate}
                          onChange={(e) => updateSettings("countdownEndDate", e.target.value)}
                          className="mt-2"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="messagesEnabled" className="font-semibold">
                        הפעל הודעות סרג עליון
                      </Label>
                      <p className="text-sm text-gray-600">
                        הצגת הודעות בסרג העליון של האתר
                      </p>
                    </div>
                    <Switch
                      id="messagesEnabled"
                      checked={settings.messagesEnabled}
                      onCheckedChange={(checked) => updateSettings("messagesEnabled", checked)}
                    />
                  </div>

                  {settings.messagesEnabled && (
                    <>
                      <div>
                        <Label htmlFor="messagesType">סוג הודעות</Label>
                        <Select 
                          value={settings.messagesType} 
                          onValueChange={(value) => updateSettings("messagesType", value)}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rotating">הודעות מתחלפות</SelectItem>
                            <SelectItem value="static">הודעה סטטית</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="messages">הודעות</Label>
                        <textarea
                          id="messages"
                          value={settings.messages.join("\n")}
                          onChange={(e) => {
                            const value = e.target.value
                            // שומר את כל התוכן בדיוק כמו שהמשתמש הקליד - כולל רווחים ושורות חדשות
                            // מפריד לפי שורות חדשות בלבד
                            const lines = value.split("\n")
                            
                            // שומר את כל השורות כמו שהן - כולל רווחים ושורות ריקות באמצע ובסוף
                            // זה מאפשר למשתמש ליצור שורות חדשות עם Enter
                            // הניקוי של שורות ריקות בסוף יקרה רק בעת שמירה
                            let messages = [...lines]
                            
                            // אם אין הודעות, נשמור מערך ריק
                            if (messages.length === 0) {
                              messages = ['']
                            }
                            
                            updateSettings("messages", messages)
                          }}
                          placeholder="כל שורה היא הודעה נפרדת&#10;משלוח חינם ברכישה מעל 250 ש&quot;ח&#10;החל מ 08/25 , משלוח עד 3 ימי עסקים"
                          rows={8}
                          className="mt-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ whiteSpace: 'pre-wrap' }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          כל שורה היא הודעה נפרדת. לחץ Enter כדי לרדת שורה חדשה
                        </p>
                      </div>

                      {settings.messagesType === "rotating" && (
                        <div>
                          <Label htmlFor="messagesSpeed">מהירות החלפה (במילישניות)</Label>
                          <Input
                            id="messagesSpeed"
                            type="number"
                            value={settings.messagesSpeed}
                            onChange={(e) => updateSettings("messagesSpeed", parseInt(e.target.value) || 3000)}
                            min="1000"
                            max="10000"
                            className="mt-2"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            1000 = שנייה אחת, מומלץ: 3000-5000
                          </p>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="messagesTextColor">צבע טקסט הודעות</Label>
                        <div className="mt-2 flex items-center gap-3">
                          <input
                            id="messagesTextColor"
                            type="color"
                            value={settings.messagesTextColor || settings.topBarTextColor}
                            onChange={(e) => updateSettings("messagesTextColor", e.target.value)}
                            className="w-16 h-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={settings.messagesTextColor || settings.topBarTextColor}
                            onChange={(e) => updateSettings("messagesTextColor", e.target.value)}
                            className="flex-1 h-10 text-sm"
                            placeholder="השאר ריק לשימוש בצבע ברירת מחדל"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="messagesFontSize">גודל טקסט הודעות (px)</Label>
                        <Input
                          id="messagesFontSize"
                          type="number"
                          value={settings.messagesFontSize}
                          onChange={(e) => updateSettings("messagesFontSize", parseInt(e.target.value) || 14)}
                          min="10"
                          max="24"
                          className="mt-2"
                        />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const tabs = [
    { key: "logo", label: "לוגו ופאביקון", icon: ImageIcon, divider: false },
    { key: "theme", label: "טיפוגרפיה וצבעים", icon: Palette, divider: false },
    { key: "header", label: "הדר", icon: Layout, divider: false },
    { key: "cart", label: "התנהגות סל", icon: Settings, divider: false },
    { key: "topbar", label: "טופ בר", icon: Bell, divider: true },
    { key: "category", label: "עמוד קטגוריה", icon: Grid3x3, divider: false },
    { key: "product", label: "עמוד מוצר", icon: ShoppingBag, divider: false },
    { key: "checkout", label: "עמוד קופה", icon: CreditCard, divider: false },
    { key: "thankyou", label: "דף תודה", icon: CheckCircle2, divider: false },
    { key: "emails", label: "הגדרות מיילים", icon: Mail, divider: false },
    { key: "giftcard", label: "גיפט קארד", icon: Gift, divider: false },
  ]

  return (
    <AppLayout>
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm sticky top-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">מראה ועיצוב</h2>
              <p className="text-sm text-gray-500 mt-1">{selectedShop.name}</p>
            </div>
            <nav className="p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.key
                return (
                  <div key={tab.key}>
                    <button
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-colors mb-1 ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 font-medium border-r-2 border-emerald-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-emerald-600" : "text-gray-500"}`} />
                      <span className="text-sm">{tab.label}</span>
                    </button>
                    {tab.divider && <div className="border-t border-gray-200 my-2 mx-2" />}
                  </div>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="space-y-6">
            {/* Logo and Favicon Tab */}
            {activeTab === "logo" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-pink-600" />
                      </div>
                      <div>
                        <CardTitle>לוגו ופאביקון</CardTitle>
                        <CardDescription>העלה ונהל את הלוגו והפאביקון של החנות</CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="prodify-gradient text-white"
                    >
                      <Save className="w-4 h-4 ml-2" />
                      {saving ? "שומר..." : "שמור שינויים"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderSectionContent("logo")}
                </CardContent>
              </Card>
            )}

            {/* Theme Tab */}
            {activeTab === "theme" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Palette className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle>טיפוגרפיה וצבעים</CardTitle>
                        <CardDescription>בחר פונט ועדכן צבעים כלליים</CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="prodify-gradient text-white"
                    >
                      <Save className="w-4 h-4 ml-2" />
                      {saving ? "שומר..." : "שמור שינויים"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderSectionContent("theme")}
                </CardContent>
              </Card>
            )}

            {/* Header Tab */}
            {activeTab === "header" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Layout className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle>הגדרות הדר</CardTitle>
                        <CardDescription>פריסה והתנהגות של ההדר</CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="prodify-gradient text-white"
                    >
                      <Save className="w-4 h-4 ml-2" />
                      {saving ? "שומר..." : "שמור שינויים"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderSectionContent("header")}
                </CardContent>
              </Card>
            )}

            {/* Cart Tab */}
            {activeTab === "cart" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle>התנהגות הוספה לסל</CardTitle>
                        <CardDescription>מה קורה אחרי הוספת מוצר לסל</CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="prodify-gradient text-white"
                    >
                      <Save className="w-4 h-4 ml-2" />
                      {saving ? "שומר..." : "שמור שינויים"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderSectionContent("cart")}
                </CardContent>
              </Card>
            )}

            {/* Category Page Tab */}
            {activeTab === "category" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Grid3x3 className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle>הגדרות עמוד קטגוריה</CardTitle>
                        <CardDescription>התאמה אישית של מראה ותפקודי עמודי הקטגוריות</CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="prodify-gradient text-white"
                    >
                      <Save className="w-4 h-4 ml-2" />
                      {saving ? "שומר..." : "שמור שינויים"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderSectionContent("category")}
                </CardContent>
              </Card>
            )}

            {/* Product Page Tab */}
            {activeTab === "product" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <CardTitle>הגדרות עמוד מוצר</CardTitle>
                        <CardDescription>התאמה אישית של מראה ותפקודי עמודי המוצרים</CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="prodify-gradient text-white"
                    >
                      <Save className="w-4 h-4 ml-2" />
                      {saving ? "שומר..." : "שמור שינויים"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {/* הגדרות תמונה */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">הגדרות תמונה</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">פרופורציית תמונת מוצר</Label>
                          <Select
                            value={settings.productImageRatio}
                            onValueChange={(value) => updateSettings("productImageRatio", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1:1">ריבוע (1:1) - 250x250</SelectItem>
                              <SelectItem value="3:4">מלבן עומד (3:4) - 250x333</SelectItem>
                              <SelectItem value="9:16">מלבן עומד גבוה (9:16) - 250x444</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">מיקום תמונה</Label>
                          <Select
                            value={settings.productImagePosition}
                            onValueChange={(value) => updateSettings("productImagePosition", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">משמאל</SelectItem>
                              <SelectItem value="right">מימין</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">הצג תמונות קטנות במובייל</Label>
                            <p className="text-xs text-gray-500">תמונות ממוזערות מתחת לתמונה הראשית</p>
                          </div>
                          <Switch
                            checked={settings.productShowMobileThumbs}
                            onCheckedChange={(checked) => updateSettings("productShowMobileThumbs", checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">הצג תג הנחה</Label>
                            <p className="text-xs text-gray-500">תג אחוזי הנחה על המוצר</p>
                          </div>
                          <Switch
                            checked={settings.productShowDiscountBadge}
                            onCheckedChange={(checked) => updateSettings("productShowDiscountBadge", checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">הצג כפתורי כמות (+/-)</Label>
                            <p className="text-xs text-gray-500">כפתורי פלוס ומינוס לשינוי כמות</p>
                          </div>
                          <Switch
                            checked={settings.productShowQuantityButtons}
                            onCheckedChange={(checked) => updateSettings("productShowQuantityButtons", checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">הצג כמות במלאי</Label>
                            <p className="text-xs text-gray-500">הצגת כמות זמינה במלאי (זמין: X יחידות)</p>
                          </div>
                          <Switch
                            checked={settings.productShowInventory}
                            onCheckedChange={(checked) => updateSettings("productShowInventory", checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">הצג כפתור מועדפים</Label>
                            <p className="text-xs text-gray-500">כפתור הוספה לרשימת מועדפים</p>
                          </div>
                          <Switch
                            checked={settings.productShowFavoriteButton}
                            onCheckedChange={(checked) => updateSettings("productShowFavoriteButton", checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">הצג כפתור שיתוף</Label>
                            <p className="text-xs text-gray-500">כפתור שיתוף המוצר</p>
                          </div>
                          <Switch
                            checked={settings.productShowShareButton}
                            onCheckedChange={(checked) => updateSettings("productShowShareButton", checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">עיגול פינות תמונות</Label>
                            <p className="text-xs text-gray-500">עיגול עדין לפינות התמונות</p>
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              value={settings.productImageBorderRadius}
                              onChange={(e) => updateSettings("productImageBorderRadius", parseFloat(e.target.value) || 0)}
                              min="0"
                              max="50"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">פדינג תמונה במובייל</Label>
                            <p className="text-xs text-gray-500">הוספת מרווח סביב התמונה במובייל (ברירת מחדל: ברוחב מלא)</p>
                          </div>
                          <Switch
                            checked={settings.productMobileImagePadding}
                            onCheckedChange={(checked) => updateSettings("productMobileImagePadding", checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">תג הנחה עם פינות מעוגלות</Label>
                            <p className="text-xs text-gray-500">עיגול פינות תג ההנחה</p>
                          </div>
                          <Switch
                            checked={settings.productDiscountBadgeRounded}
                            onCheckedChange={(checked) => updateSettings("productDiscountBadgeRounded", checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Add to Cart סטיקי במובייל</Label>
                            <p className="text-xs text-gray-500">כפתור קבוע בתחתית המסך כשהכפתור לא בפריים</p>
                          </div>
                          <Switch
                            checked={settings.productStickyAddToCart}
                            onCheckedChange={(checked) => updateSettings("productStickyAddToCart", checked)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">צבע כפתורים על התמונה</Label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateSettings("productImageButtonsColor", "white")}
                              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                                settings.productImageButtonsColor === "white"
                                  ? "border-emerald-600 bg-emerald-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-300 mx-auto mb-1"></div>
                              <span className="text-xs">לבן</span>
                            </button>
                            <button
                              onClick={() => updateSettings("productImageButtonsColor", "black")}
                              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                                settings.productImageButtonsColor === "black"
                                  ? "border-emerald-600 bg-emerald-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="w-6 h-6 rounded-full bg-black mx-auto mb-1"></div>
                              <span className="text-xs">שחור</span>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">צבע תג הנחה</Label>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { value: "red", label: "אדום", color: "bg-red-500" },
                              { value: "green", label: "ירוק", color: "bg-green-500" },
                              { value: "blue", label: "כחול", color: "bg-blue-500" },
                              { value: "orange", label: "כתום", color: "bg-orange-500" },
                              { value: "black", label: "שחור", color: "bg-black" },
                              { value: "white", label: "לבן", color: "bg-white border" },
                              { value: "transparent", label: "שקוף", color: "bg-transparent border" },
                            ].map((colorOption) => (
                              <button
                                key={colorOption.value}
                                onClick={() => updateSettings("productDiscountBadgeColor", colorOption.value)}
                                className={`p-2 rounded-lg border-2 transition-all ${
                                  settings.productDiscountBadgeColor === colorOption.value
                                    ? "border-emerald-600 bg-emerald-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                                title={colorOption.label}
                              >
                                <div className={`w-6 h-6 rounded-full ${colorOption.color} mx-auto`}></div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* חצי גלריה */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">חצי גלריה</h3>
                      <p className="text-xs text-gray-500">הגדרות חצי הניווט בגלריית התמונות</p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">הצגת חצי ניווט</Label>
                            <p className="text-xs text-gray-500">הצגה או הסתרה של חצי הניווט בגלריה</p>
                          </div>
                          <Switch
                            checked={settings.productShowGalleryArrows}
                            onCheckedChange={(checked) => updateSettings("productShowGalleryArrows", checked)}
                          />
                        </div>

                        {settings.productShowGalleryArrows && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">צבע חצי הניווט</Label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateSettings("productGalleryArrowsColor", "white")}
                                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                                  settings.productGalleryArrowsColor === "white"
                                    ? "border-emerald-600 bg-emerald-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-300 mx-auto mb-1"></div>
                                <span className="text-xs">לבן</span>
                              </button>
                              <button
                                onClick={() => updateSettings("productGalleryArrowsColor", "black")}
                                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                                  settings.productGalleryArrowsColor === "black"
                                    ? "border-emerald-600 bg-emerald-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <div className="w-6 h-6 rounded-full bg-black mx-auto mb-1"></div>
                                <span className="text-xs">שחור</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* רטיו תמונות מוצרים קשורים */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">רטיו תמונות מוצרים קשורים והשלם את הלוק</h3>
                      <p className="text-xs text-gray-500">💡 רטיו זהה לתמונת המוצר הראשית - חל על שני הסליידרים</p>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">יחס גובה-רוחב</Label>
                        <Select
                          value={settings.productRelatedRatio}
                          onValueChange={(value) => updateSettings("productRelatedRatio", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1:1">ריבוע (1:1) - 250x250</SelectItem>
                            <SelectItem value="3:4">מלבן עומד (3:4) - 250x333</SelectItem>
                            <SelectItem value="9:16">מלבן עומד גבוה (9:16) - 250x444</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* צבע רקע מוצרים קשורים */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">צבע רקע מוצרים קשורים</h3>
                      <p className="text-xs text-gray-500">💡 צבע הרקע של סקשן המוצרים הדומים</p>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">צבע רקע</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={settings.productRelatedBgColor}
                            onChange={(e) => updateSettings("productRelatedBgColor", e.target.value)}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.productRelatedBgColor}
                            onChange={(e) => updateSettings("productRelatedBgColor", e.target.value)}
                            placeholder="#f8f9fa"
                            className="flex-1"
                          />
                        </div>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs text-gray-500">צבעים מומלצים:</span>
                          {["#f8f9fa", "#ffffff", "#f3f4f6", "#e5e7eb"].map((color) => (
                            <button
                              key={color}
                              onClick={() => updateSettings("productRelatedBgColor", color)}
                              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-emerald-500"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* צבע רקע השלם את הלוק */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">צבע רקע השלם את הלוק</h3>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">בחר צבע</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={settings.productCompleteLookBgColor}
                            onChange={(e) => updateSettings("productCompleteLookBgColor", e.target.value)}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.productCompleteLookBgColor}
                            onChange={(e) => updateSettings("productCompleteLookBgColor", e.target.value)}
                            placeholder="#f1f3f4"
                            className="flex-1"
                          />
                        </div>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs text-gray-500">צבעים מומלצים:</span>
                          {["#f1f3f4", "#ffffff", "#f8f9fa", "#e5e7eb"].map((color) => (
                            <button
                              key={color}
                              onClick={() => updateSettings("productCompleteLookBgColor", color)}
                              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-emerald-500"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">כותרת הקטע</Label>
                        <Input
                          type="text"
                          value={settings.productCompleteLookTitle}
                          onChange={(e) => updateSettings("productCompleteLookTitle", e.target.value)}
                          placeholder="השלם את הלוק"
                        />
                        <p className="text-xs text-gray-500">הכותרת שתוצג מעל רשימת המוצרים להשלמת הלוק</p>
                      </div>
                    </div>

                    {/* סוג תצוגת תוכן */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">סוג תצוגת תוכן</h3>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">בחר סוג תצוגה</Label>
                        <Select
                          value={settings.productContentDisplay}
                          onValueChange={(value) => updateSettings("productContentDisplay", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="accordion">אקורדיונים - תצוגה מתקפלת של תיאור ופרטים</SelectItem>
                            <SelectItem value="tabs">טאבים - תצוגת לשוניות למעבר בין חלקים</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* חוזקות החנות */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">חוזקות החנות</h3>
                      <p className="text-xs text-gray-500">הוסף מידע על יתרונות החנות שיוצגו בעמוד המוצר</p>
                      
                      <div className="space-y-3">
                        {settings.productStrengths.map((strength, index) => (
                          <div key={strength.id} className="p-4 border rounded-lg bg-gray-50">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs text-gray-600">אייקון</Label>
                                    <Input
                                      type="text"
                                      value={strength.icon}
                                      onChange={(e) => {
                                        const newStrengths = [...settings.productStrengths]
                                        newStrengths[index].icon = e.target.value
                                        updateSettings("productStrengths", newStrengths)
                                      }}
                                      placeholder="ri-truck-line"
                                      className="text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">טקסט</Label>
                                    <Input
                                      type="text"
                                      value={strength.text}
                                      onChange={(e) => {
                                        const newStrengths = [...settings.productStrengths]
                                        newStrengths[index].text = e.target.value
                                        updateSettings("productStrengths", newStrengths)
                                      }}
                                      placeholder="טקסט"
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newStrengths = settings.productStrengths.filter((_, i) => i !== index)
                                  updateSettings("productStrengths", newStrengths)
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        <Button
                          variant="outline"
                          onClick={() => {
                            const newStrengths = [
                              ...settings.productStrengths,
                              {
                                id: Date.now().toString(),
                                icon: "ri-star-line",
                                text: "הוסף טקסט",
                              },
                            ]
                            updateSettings("productStrengths", newStrengths)
                          }}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          הוסף חוזקה
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Checkout Page Tab */}
            {activeTab === "checkout" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle>עמוד קופה</CardTitle>
                        <CardDescription>התאמה אישית של עמוד הקופה - צבעים ועיצוב</CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="prodify-gradient text-white"
                    >
                      <Save className="w-4 h-4 ml-2" />
                      {saving ? "שומר..." : "שמור שינויים"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {/* Colors Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">צבעים</h3>
                      
                      {/* Primary Color */}
                      <div className="space-y-2">
                        <Label htmlFor="checkoutPagePrimaryColor">צבע ראשי</Label>
                        <div className="flex gap-3">
                          <Input
                            id="checkoutPagePrimaryColor"
                            type="color"
                            value={settings.checkoutPagePrimaryColor}
                            onChange={(e) => updateSettings("checkoutPagePrimaryColor", e.target.value)}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.checkoutPagePrimaryColor}
                            onChange={(e) => updateSettings("checkoutPagePrimaryColor", e.target.value)}
                            className="flex-1"
                            placeholder="#9333ea"
                          />
                        </div>
                        <p className="text-sm text-gray-500">צבע לכפתורים וקישורים</p>
                      </div>

                      {/* Background Color */}
                      <div className="space-y-2">
                        <Label htmlFor="checkoutPageBackgroundColor">צבע רקע</Label>
                        <div className="flex gap-3">
                          <Input
                            id="checkoutPageBackgroundColor"
                            type="color"
                            value={settings.checkoutPageBackgroundColor}
                            onChange={(e) => updateSettings("checkoutPageBackgroundColor", e.target.value)}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.checkoutPageBackgroundColor}
                            onChange={(e) => updateSettings("checkoutPageBackgroundColor", e.target.value)}
                            className="flex-1"
                            placeholder="#ffffff"
                          />
                        </div>
                        <p className="text-sm text-gray-500">צבע רקע כללי של העמוד</p>
                      </div>

                      {/* Text Color */}
                      <div className="space-y-2">
                        <Label htmlFor="checkoutPageTextColor">צבע טקסט</Label>
                        <div className="flex gap-3">
                          <Input
                            id="checkoutPageTextColor"
                            type="color"
                            value={settings.checkoutPageTextColor}
                            onChange={(e) => updateSettings("checkoutPageTextColor", e.target.value)}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.checkoutPageTextColor}
                            onChange={(e) => updateSettings("checkoutPageTextColor", e.target.value)}
                            className="flex-1"
                            placeholder="#111827"
                          />
                        </div>
                        <p className="text-sm text-gray-500">צבע טקסט ראשי</p>
                      </div>

                      {/* Section Background Color */}
                      <div className="space-y-2">
                        <Label htmlFor="checkoutPageSectionBgColor">צבע רקע סקשנים</Label>
                        <div className="flex gap-3">
                          <Input
                            id="checkoutPageSectionBgColor"
                            type="color"
                            value={settings.checkoutPageSectionBgColor}
                            onChange={(e) => updateSettings("checkoutPageSectionBgColor", e.target.value)}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.checkoutPageSectionBgColor}
                            onChange={(e) => updateSettings("checkoutPageSectionBgColor", e.target.value)}
                            className="flex-1"
                            placeholder="#f9fafb"
                          />
                        </div>
                        <p className="text-sm text-gray-500">צבע רקע עדין לסקשנים (כמו סיכום הזמנה)</p>
                      </div>

                      {/* Border Color */}
                      <div className="space-y-2">
                        <Label htmlFor="checkoutPageBorderColor">צבע גבולות</Label>
                        <div className="flex gap-3">
                          <Input
                            id="checkoutPageBorderColor"
                            type="color"
                            value={settings.checkoutPageBorderColor}
                            onChange={(e) => updateSettings("checkoutPageBorderColor", e.target.value)}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.checkoutPageBorderColor}
                            onChange={(e) => updateSettings("checkoutPageBorderColor", e.target.value)}
                            className="flex-1"
                            placeholder="#e5e7eb"
                          />
                        </div>
                        <p className="text-sm text-gray-500">צבע גבולות עדין בין סקשנים</p>
                      </div>
                    </div>

                    {/* Newsletter Checkbox Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">checkbox דיוור</h3>
                      
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id="checkoutShowNewsletterCheckbox"
                          checked={settings.checkoutShowNewsletterCheckbox}
                          onCheckedChange={(checked) => 
                            updateSettings("checkoutShowNewsletterCheckbox", checked === true)
                          }
                        />
                        <Label htmlFor="checkoutShowNewsletterCheckbox" className="cursor-pointer">
                          הצג אפשרות קבלת דיוור ומבצעים
                        </Label>
                      </div>

                      {settings.checkoutShowNewsletterCheckbox && (
                        <div className="flex items-center space-x-2 space-x-reverse mr-6">
                          <Checkbox
                            id="checkoutNewsletterDefaultChecked"
                            checked={settings.checkoutNewsletterDefaultChecked}
                            onCheckedChange={(checked) => 
                              updateSettings("checkoutNewsletterDefaultChecked", checked === true)
                            }
                          />
                          <Label htmlFor="checkoutNewsletterDefaultChecked" className="cursor-pointer">
                            מסומן כברירת מחדל
                          </Label>
                        </div>
                      )}
                    </div>

                    {/* Zip Field Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">שדה מיקוד</h3>
                      
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id="checkoutShowZipField"
                          checked={settings.checkoutShowZipField}
                          onCheckedChange={(checked) => 
                            updateSettings("checkoutShowZipField", checked === true)
                          }
                        />
                        <Label htmlFor="checkoutShowZipField" className="cursor-pointer">
                          הצג שדה מיקוד בכתובת משלוח
                        </Label>
                      </div>

                      {settings.checkoutShowZipField && (
                        <div className="flex items-center space-x-2 space-x-reverse mr-6">
                          <Checkbox
                            id="checkoutZipRequired"
                            checked={settings.checkoutZipRequired}
                            onCheckedChange={(checked) => 
                              updateSettings("checkoutZipRequired", checked === true)
                            }
                          />
                          <Label htmlFor="checkoutZipRequired" className="cursor-pointer">
                            שדה חובה
                          </Label>
                        </div>
                      )}
                    </div>

                    {/* Footer Links Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">תפריט פוטר</h3>
                      <p className="text-sm text-gray-500">קישורים שיופיעו בתחתית עמוד הקופה (תקנון, מדיניות פרטיות וכו')</p>
                      
                      <div className="space-y-3">
                        {(settings.checkoutFooterLinks || []).map((link, index) => (
                          <div key={link.id} className="flex gap-2 relative">
                            <Input
                              placeholder="טקסט הקישור"
                              value={link.text}
                              onChange={(e) => {
                                const newLinks = [...(settings.checkoutFooterLinks || [])]
                                newLinks[index].text = e.target.value
                                updateSettings("checkoutFooterLinks", newLinks)
                              }}
                              className="flex-1"
                            />
                            <div className="flex-1 relative">
                              <Input
                                placeholder="הקלד את שם העמוד או הדבק קישור מותאם אישית"
                                value={link.url}
                                onChange={(e) => {
                                  const newLinks = [...(settings.checkoutFooterLinks || [])]
                                  newLinks[index].url = e.target.value
                                  updateSettings("checkoutFooterLinks", newLinks)
                                  // הצג הצעות אם מקלידים
                                  setShowSuggestions({ ...showSuggestions, [index]: e.target.value.length > 0 && !e.target.value.startsWith('http') })
                                }}
                                onFocus={() => {
                                  if (link.url && !link.url.startsWith('http')) {
                                    setShowSuggestions({ ...showSuggestions, [index]: true })
                                  }
                                }}
                                onBlur={() => {
                                  // עיכוב קטן כדי לאפשר לחיצה על הצעה
                                  setTimeout(() => {
                                    setShowSuggestions({ ...showSuggestions, [index]: false })
                                  }, 200)
                                }}
                              />
                              
                              {/* רשימת הצעות */}
                              {showSuggestions[index] && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-10">
                                  {pages
                                    .filter(page => 
                                      link.url === '' || 
                                      page.title.toLowerCase().includes(link.url.toLowerCase()) ||
                                      page.slug.toLowerCase().includes(link.url.toLowerCase())
                                    )
                                    .map(page => (
                                      <button
                                        key={page.id}
                                        type="button"
                                        onClick={() => {
                                          const newLinks = [...(settings.checkoutFooterLinks || [])]
                                          newLinks[index].url = `/pages/${page.slug}`
                                          if (!newLinks[index].text) {
                                            newLinks[index].text = page.title
                                          }
                                          updateSettings("checkoutFooterLinks", newLinks)
                                          setShowSuggestions({ ...showSuggestions, [index]: false })
                                        }}
                                        className="w-full px-3 py-2 text-right hover:bg-gray-50 flex flex-col items-start"
                                      >
                                        <span className="font-medium text-gray-900">{page.title}</span>
                                        <span className="text-xs text-gray-500">/pages/{page.slug}</span>
                                      </button>
                                    ))}
                                  {pages.filter(page => 
                                    link.url === '' || 
                                    page.title.toLowerCase().includes(link.url.toLowerCase()) ||
                                    page.slug.toLowerCase().includes(link.url.toLowerCase())
                                  ).length === 0 && (
                                    <div className="px-3 py-2 text-sm text-gray-500">
                                      לא נמצאו דפים תואמים
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newLinks = (settings.checkoutFooterLinks || []).filter((_, i) => i !== index)
                                updateSettings("checkoutFooterLinks", newLinks)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const newLinks = [
                              ...(settings.checkoutFooterLinks || []),
                              { id: Date.now().toString(), text: "", url: "" }
                            ]
                            updateSettings("checkoutFooterLinks", newLinks)
                          }}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          הוסף קישור
                        </Button>
                      </div>
                    </div>

                    {/* Custom Fields Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">שדות מותאמים אישית</h3>
                      <p className="text-sm text-gray-500">הוסף שדות נוספים לטופס הקופה (ברכה ליום הולדת, תאריך לקבל המתנה, עטיפה כמתנה וכו')</p>
                      
                      <div className="space-y-3">
                        {(settings.checkoutCustomFields || []).map((field, index) => (
                          <div key={field.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <Checkbox
                                  checked={field.enabled}
                                  onCheckedChange={(checked) => {
                                    const newFields = [...(settings.checkoutCustomFields || [])]
                                    newFields[index].enabled = checked === true
                                    updateSettings("checkoutCustomFields", newFields)
                                  }}
                                />
                                <Label className="font-medium">הצג שדה זה</Label>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newFields = (settings.checkoutCustomFields || []).filter((_, i) => i !== index)
                                  updateSettings("checkoutCustomFields", newFields)
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>תווית השדה</Label>
                                <Input
                                  placeholder="לדוגמה: ברכה ליום הולדת"
                                  value={field.label}
                                  onChange={(e) => {
                                    const newFields = [...(settings.checkoutCustomFields || [])]
                                    newFields[index].label = e.target.value
                                    updateSettings("checkoutCustomFields", newFields)
                                  }}
                                />
                              </div>
                              <div>
                                <Label>סוג השדה</Label>
                                <Select
                                  value={field.type}
                                  onValueChange={(value: "text" | "textarea" | "date" | "checkbox") => {
                                    const newFields = [...(settings.checkoutCustomFields || [])]
                                    newFields[index].type = value
                                    updateSettings("checkoutCustomFields", newFields)
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">טקסט קצר</SelectItem>
                                    <SelectItem value="textarea">טקסט ארוך</SelectItem>
                                    <SelectItem value="date">תאריך</SelectItem>
                                    <SelectItem value="checkbox">תיבת סימון</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            {field.type !== "checkbox" && (
                              <div>
                                <Label>מקום להחזיק (placeholder)</Label>
                                <Input
                                  placeholder="לדוגמה: הזן ברכה..."
                                  value={field.placeholder || ""}
                                  onChange={(e) => {
                                    const newFields = [...(settings.checkoutCustomFields || [])]
                                    newFields[index].placeholder = e.target.value
                                    updateSettings("checkoutCustomFields", newFields)
                                  }}
                                />
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <Checkbox
                                checked={field.required}
                                onCheckedChange={(checked) => {
                                  const newFields = [...(settings.checkoutCustomFields || [])]
                                  newFields[index].required = checked === true
                                  updateSettings("checkoutCustomFields", newFields)
                                }}
                              />
                              <Label>שדה חובה</Label>
                            </div>
                          </div>
                        ))}
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const newFields = [
                              ...(settings.checkoutCustomFields || []),
                              { 
                                id: Date.now().toString(), 
                                label: "", 
                                type: "text" as const,
                                placeholder: "",
                                required: false,
                                enabled: true
                              }
                            ]
                            updateSettings("checkoutCustomFields", newFields)
                          }}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          הוסף שדה מותאם אישית
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Thank You Page Tab */}
            {activeTab === "thankyou" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle>דף תודה</CardTitle>
                        <CardDescription>התאמה אישית של דף התודה לאחר תשלום מוצלח</CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="prodify-gradient text-white"
                    >
                      <Save className="w-4 h-4 ml-2" />
                      {saving ? "שומר..." : "שמור שינויים"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {/* בחירת תבנית */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">תבנית</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <button
                          onClick={() => updateSettings("thankYouPageTemplate", "minimal")}
                          className={`p-4 border-2 rounded-lg text-center transition-colors ${
                            settings.thankYouPageTemplate === "minimal"
                              ? "border-emerald-600 bg-emerald-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="text-sm font-medium mb-2">מינימלי</div>
                          <div className="text-xs text-gray-500">עיצוב נקי ופשוט</div>
                        </button>
                        <button
                          onClick={() => updateSettings("thankYouPageTemplate", "detailed")}
                          className={`p-4 border-2 rounded-lg text-center transition-colors ${
                            settings.thankYouPageTemplate === "detailed"
                              ? "border-emerald-600 bg-emerald-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="text-sm font-medium mb-2">מפורט</div>
                          <div className="text-xs text-gray-500">כל פרטי ההזמנה</div>
                        </button>
                        <button
                          onClick={() => updateSettings("thankYouPageTemplate", "celebration")}
                          className={`p-4 border-2 rounded-lg text-center transition-colors ${
                            settings.thankYouPageTemplate === "celebration"
                              ? "border-emerald-600 bg-emerald-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="text-sm font-medium mb-2">חגיגי</div>
                          <div className="text-xs text-gray-500">עם אנימציות</div>
                        </button>
                      </div>
                    </div>

                    {/* צבעים */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">צבעים</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>צבע ראשי</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={settings.thankYouPagePrimaryColor}
                              onChange={(e) => updateSettings("thankYouPagePrimaryColor", e.target.value)}
                              className="w-16 h-10"
                            />
                            <Input
                              type="text"
                              value={settings.thankYouPagePrimaryColor}
                              onChange={(e) => updateSettings("thankYouPagePrimaryColor", e.target.value)}
                              className="flex-1"
                              dir="ltr"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>צבע רקע</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={settings.thankYouPageBackgroundColor}
                              onChange={(e) => updateSettings("thankYouPageBackgroundColor", e.target.value)}
                              className="w-16 h-10"
                            />
                            <Input
                              type="text"
                              value={settings.thankYouPageBackgroundColor}
                              onChange={(e) => updateSettings("thankYouPageBackgroundColor", e.target.value)}
                              className="flex-1"
                              dir="ltr"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>צבע טקסט</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={settings.thankYouPageTextColor}
                              onChange={(e) => updateSettings("thankYouPageTextColor", e.target.value)}
                              className="w-16 h-10"
                            />
                            <Input
                              type="text"
                              value={settings.thankYouPageTextColor}
                              onChange={(e) => updateSettings("thankYouPageTextColor", e.target.value)}
                              className="flex-1"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* אפשרויות תצוגה */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">אפשרויות תצוגה</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">הצג פרטי הזמנה</Label>
                            <p className="text-xs text-gray-500">הצגת מספר הזמנה וסכום</p>
                          </div>
                          <Switch
                            checked={settings.thankYouPageShowOrderDetails}
                            onCheckedChange={(checked) => updateSettings("thankYouPageShowOrderDetails", checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">הצג כפתור המשך לקניות</Label>
                            <p className="text-xs text-gray-500">כפתור חזרה לחנות</p>
                          </div>
                          <Switch
                            checked={settings.thankYouPageShowContinueShopping}
                            onCheckedChange={(checked) => updateSettings("thankYouPageShowContinueShopping", checked)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Bar Tab */}
            {activeTab === "topbar" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle>סרג עליון (טופ בר)</CardTitle>
                        <CardDescription>הודעות וקאונטדאון</CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="prodify-gradient text-white"
                    >
                      <Save className="w-4 h-4 ml-2" />
                      {saving ? "שומר..." : "שמור שינויים"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderSectionContent("topbar")}
                </CardContent>
              </Card>
            )}

            {/* Emails Tab */}
            {activeTab === "emails" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle>הגדרות מיילים</CardTitle>
                        <CardDescription>התאמה אישית של עיצוב המיילים שנשלחים מהחנות</CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="prodify-gradient text-white"
                    >
                      <Save className="w-4 h-4 ml-2" />
                      {saving ? "שומר..." : "שמור שינויים"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">פרטי השולח</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="emailSenderName">שם השולח</Label>
                        <Input
                          id="emailSenderName"
                          type="text"
                          value={settings.emailSenderName}
                          onChange={(e) => updateSettings("emailSenderName", e.target.value)}
                          placeholder={selectedShop?.name || "שם החנות"}
                        />
                        <p className="text-sm text-gray-500">השם שיוצג כשולח המיילים</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">צבעי גרדיאנט</h3>
                      <p className="text-sm text-gray-500">הצבעים שישמשו ליצירת הגרדיאנט במיילים (כותרות וכפתורים)</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="emailColor1">צבע 1</Label>
                          <div className="flex gap-3">
                            <Input
                              id="emailColor1"
                              type="color"
                              value={settings.emailColor1}
                              onChange={(e) => updateSettings("emailColor1", e.target.value)}
                              className="w-20 h-10"
                            />
                            <Input
                              type="text"
                              value={settings.emailColor1}
                              onChange={(e) => updateSettings("emailColor1", e.target.value)}
                              className="flex-1"
                              placeholder="#15b981"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="emailColor2">צבע 2</Label>
                          <div className="flex gap-3">
                            <Input
                              id="emailColor2"
                              type="color"
                              value={settings.emailColor2}
                              onChange={(e) => updateSettings("emailColor2", e.target.value)}
                              className="w-20 h-10"
                            />
                            <Input
                              type="text"
                              value={settings.emailColor2}
                              onChange={(e) => updateSettings("emailColor2", e.target.value)}
                              className="flex-1"
                              placeholder="#10b981"
                            />
                          </div>
                        </div>
                      </div>

                      {/* תצוגה מקדימה של הגרדיאנט */}
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">תצוגה מקדימה:</p>
                        <div
                          className="h-16 rounded-lg flex items-center justify-center text-white font-semibold text-lg"
                          style={{
                            background: `linear-gradient(135deg, ${settings.emailColor1} 0%, ${settings.emailColor2} 100%)`,
                          }}
                        >
                          גרדיאנט מיילים
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gift Card Tab */}
            {activeTab === "giftcard" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle>עיצוב Gift Card</CardTitle>
                        <CardDescription>הגדר את העיצוב של כרטיסי המתנה שנשלחים במייל</CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="prodify-gradient text-white"
                    >
                      <Save className="w-4 h-4 ml-2" />
                      {saving ? "שומר..." : "שמור שינויים"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>סוג רקע</Label>
                        <Select
                          value={settings.giftCardBackgroundType}
                          onValueChange={(value: "gradient" | "image") => updateSettings("giftCardBackgroundType", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gradient">גרדיאנט צבעים</SelectItem>
                            <SelectItem value="image">תמונה</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {settings.giftCardBackgroundType === "gradient" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="giftCardGradientColor1">צבע 1</Label>
                            <div className="flex gap-3">
                              <Input
                                id="giftCardGradientColor1"
                                type="color"
                                value={settings.giftCardGradientColor1}
                                onChange={(e) => updateSettings("giftCardGradientColor1", e.target.value)}
                                className="w-20 h-10"
                              />
                              <Input
                                type="text"
                                value={settings.giftCardGradientColor1}
                                onChange={(e) => updateSettings("giftCardGradientColor1", e.target.value)}
                                className="flex-1"
                                placeholder="#ff9a9e"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="giftCardGradientColor2">צבע 2</Label>
                            <div className="flex gap-3">
                              <Input
                                id="giftCardGradientColor2"
                                type="color"
                                value={settings.giftCardGradientColor2}
                                onChange={(e) => updateSettings("giftCardGradientColor2", e.target.value)}
                                className="w-20 h-10"
                              />
                              <Input
                                type="text"
                                value={settings.giftCardGradientColor2}
                                onChange={(e) => updateSettings("giftCardGradientColor2", e.target.value)}
                                className="flex-1"
                                placeholder="#fecfef"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {settings.giftCardBackgroundType === "image" && (
                        <div className="space-y-2">
                          <Label>תמונת רקע</Label>
                          <div className="flex gap-3">
                            {settings.giftCardBackgroundImage ? (
                              <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                                <img
                                  src={settings.giftCardBackgroundImage}
                                  alt="Gift card background"
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  onClick={() => updateSettings("giftCardBackgroundImage", null)}
                                  className="absolute top-1 left-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  // נשתמש ב-MediaPicker
                                  const input = document.createElement("input")
                                  input.type = "file"
                                  input.accept = "image/*"
                                  input.onchange = async (e: any) => {
                                    const file = e.target.files?.[0]
                                    if (!file || !selectedShop?.id) return
                                    
                                    const formData = new FormData()
                                    formData.append("file", file)
                                    formData.append("entityType", "shops")
                                    formData.append("entityId", selectedShop.id)
                                    formData.append("shopId", selectedShop.id)
                                    formData.append("fileType", "gift-card-background")
                                    
                                    try {
                                      const response = await fetch("/api/files/upload", {
                                        method: "POST",
                                        body: formData,
                                      })
                                      
                                      if (response.ok) {
                                        const data = await response.json()
                                        updateSettings("giftCardBackgroundImage", data.file.path)
                                        toast({
                                          title: "הצלחה",
                                          description: "התמונה הועלתה בהצלחה",
                                        })
                                      } else {
                                        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
                                        console.error("Upload error:", errorData)
                                        throw new Error(errorData.error || "Upload failed")
                                      }
                                    } catch (error) {
                                      toast({
                                        title: "שגיאה",
                                        description: "אירעה שגיאה בהעלאת התמונה",
                                        variant: "destructive",
                                      })
                                    }
                                  }
                                  input.click()
                                }}
                                className="gap-2"
                              >
                                <Upload className="w-4 h-4" />
                                העלה תמונה
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">העלה תמונה שתוצג כרקע של כרטיס המתנה</p>
                          
                          <div className="space-y-2">
                            <Label>מיקום תמונת רקע</Label>
                            <Select
                              value={settings.giftCardBackgroundPosition}
                              onValueChange={(value: "center" | "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right") => updateSettings("giftCardBackgroundPosition", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="center">מרכז</SelectItem>
                                <SelectItem value="top">למעלה</SelectItem>
                                <SelectItem value="bottom">למטה</SelectItem>
                                <SelectItem value="left">שמאל</SelectItem>
                                <SelectItem value="right">ימין</SelectItem>
                                <SelectItem value="top-left">למעלה שמאל</SelectItem>
                                <SelectItem value="top-right">למעלה ימין</SelectItem>
                                <SelectItem value="bottom-left">למטה שמאל</SelectItem>
                                <SelectItem value="bottom-right">למטה ימין</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-gray-500">בחר היכן תוצג תמונת הרקע בכרטיס</p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>מיקום כיתוב</Label>
                        <Select
                          value={settings.giftCardTextPosition}
                          onValueChange={(value: "right" | "left" | "center") => updateSettings("giftCardTextPosition", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="right">ימין (ברירת מחדל)</SelectItem>
                            <SelectItem value="left">שמאל</SelectItem>
                            <SelectItem value="center">מרכז</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-gray-500">הכיתוב תמיד יוצג בצד שנבחר ולא יתנגש עם המיתוג</p>
                      </div>

                      {/* תצוגה מקדימה של Gift Card */}
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg flex justify-center">
                        <div className="w-full max-w-[500px]">
                          <p className="text-sm text-gray-600 mb-2 text-right">תצוגה מקדימה:</p>
                          <div
                            className="w-full h-[315px] rounded-[15px] relative overflow-hidden shadow-xl"
                            style={{
                              ...(settings.giftCardBackgroundType === "gradient"
                                ? {
                                    backgroundImage: `linear-gradient(135deg, ${settings.giftCardGradientColor1} 0%, ${settings.giftCardGradientColor2} 100%)`,
                                  }
                                : settings.giftCardBackgroundImage
                                  ? {
                                      backgroundImage: `url(${settings.giftCardBackgroundImage})`,
                                      backgroundSize: "cover",
                                      backgroundPosition: (settings.giftCardBackgroundPosition || "center").replace("-", " "),
                                      backgroundRepeat: "no-repeat",
                                    }
                                  : {
                                      backgroundColor: "#f0f0f0",
                                    }),
                            }}
                          >
                            <div
                              className="absolute inset-0 flex items-center p-6 z-10"
                              style={{
                                justifyContent: settings.giftCardTextPosition === "right" ? "flex-end" : settings.giftCardTextPosition === "left" ? "flex-start" : "center",
                                textAlign: settings.giftCardTextPosition,
                              }}
                            >
                              <div 
                                className="bg-white/92 backdrop-blur-sm rounded-[10px] p-4 w-[200px] shadow-md text-gray-800"
                                style={{
                                  marginRight: settings.giftCardTextPosition === "right" ? "0" : "auto",
                                  marginLeft: settings.giftCardTextPosition === "left" ? "0" : settings.giftCardTextPosition === "center" ? "auto" : "auto",
                                }}
                              >
                                <h3 className="font-bold text-base mb-2 text-gray-900" style={{ textAlign: settings.giftCardTextPosition }}>כרטיס מתנה</h3>
                                <div className="bg-gray-100 rounded px-3 py-2 text-center border border-dashed border-gray-300 mb-2">
                                  <code className="text-xs font-mono text-gray-800 tracking-wider">ABC12345</code>
                                </div>
                                <p className="text-xs text-gray-600" style={{ textAlign: settings.giftCardTextPosition }}>יתרה נוכחית: ₪100.00</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

