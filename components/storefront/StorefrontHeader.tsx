"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ShoppingCart,
  User,
  Heart,
  Search,
  Menu,
  X,
  ChevronDown,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { SlideOutCart } from "./SlideOutCart"
import { SearchDialog } from "./SearchDialog"
import { useShopTheme } from "@/hooks/useShopTheme"
import { useCart } from "@/hooks/useCart"
import { useNavigation } from "@/hooks/useNavigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet"

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
}

interface NavigationItem {
  type: "link" | "page" | "category" | "collection"
  label: string
  url?: string
  pageId?: string
  pageSlug?: string
  categoryId?: string
  collectionId?: string
  children?: NavigationItem[]
}

interface Navigation {
  id: string
  name: string
  location: string
  items: NavigationItem[]
}

interface ThemeSettings {
  primaryColor: string
  secondaryColor: string
  logoWidthMobile: number
  logoWidthDesktop: number
  logoPaddingMobile: number
  logoPaddingDesktop: number
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
}

interface StorefrontHeaderProps {
  slug: string
  shop: Shop | null
  navigation?: Navigation | null
  cartItemCount?: number
  onCartUpdate?: () => void
  onOpenCart?: (callback: () => void) => void
  cartRefreshKey?: number
  theme?: ThemeSettings
}

const DEFAULT_THEME: ThemeSettings = {
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
  topBarEnabled: false,
  topBarBgColor: "#000000",
  topBarTextColor: "#ffffff",
  countdownEnabled: false,
  countdownEndDate: "",
  countdownText: "הצעה מוגבלת!",
  messagesEnabled: false,
  messagesType: "rotating",
  messages: [],
  messagesSpeed: 3000,
  messagesTextColor: "#ffffff",
  messagesFontSize: 14,
}

export function StorefrontHeader({ slug, shop, navigation: initialNavigation, cartItemCount: propCartItemCount, onCartUpdate, onOpenCart, cartRefreshKey, theme: themeProp }: StorefrontHeaderProps) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [messageWraps, setMessageWraps] = useState(false)
  const messageRef = useRef<HTMLDivElement>(null)
  
  // שימוש ב-hook לטעינת ניווט - HEADER לדסקטופ, MOBILE למובייל
  const { navigation: desktopNavigation } = useNavigation(slug, "HEADER", initialNavigation)
  const { navigation: mobileNavigation } = useNavigation(slug, "MOBILE", null)
  
  // שימוש בתפריט הנכון לפי גודל המסך
  const navigation = desktopNavigation
  
  // שימוש בטמפלה מה-props או fallback ל-hook אם לא סופק
  const themeFromHook = useShopTheme(slug)
  
  // גודל לוגו קבוע - נקבע פעם אחת בהתחלה ולא משתנה
  // אם יש themeProp (מהשרת), נשתמש בו, אחרת נשתמש ב-theme מה-hook או DEFAULT
  const [logoSizes] = useState(() => ({
    mobile: themeProp?.logoWidthMobile || themeFromHook.theme?.logoWidthMobile || DEFAULT_THEME.logoWidthMobile,
    desktop: themeProp?.logoWidthDesktop || themeFromHook.theme?.logoWidthDesktop || DEFAULT_THEME.logoWidthDesktop,
  }))
  
  // אם יש theme prop, נשתמש בו. אחרת נשתמש ב-hook או ב-default
  // חשוב: תמיד משתמשים ב-DEFAULT_THEME כבסיס כדי למנוע undefined
  // useMemo למניעת יצירת אובייקט חדש בכל render
  const theme = useMemo(() => ({
    primaryColor: themeProp?.primaryColor || themeFromHook.theme?.primaryColor || DEFAULT_THEME.primaryColor,
    secondaryColor: themeProp?.secondaryColor || themeFromHook.theme?.secondaryColor || DEFAULT_THEME.secondaryColor,
    logoWidthMobile: themeProp?.logoWidthMobile || themeFromHook.theme?.logoWidthMobile || DEFAULT_THEME.logoWidthMobile,
    logoWidthDesktop: themeProp?.logoWidthDesktop || themeFromHook.theme?.logoWidthDesktop || DEFAULT_THEME.logoWidthDesktop,
    logoPaddingMobile: themeProp?.logoPaddingMobile || themeFromHook.theme?.logoPaddingMobile || DEFAULT_THEME.logoPaddingMobile,
    logoPaddingDesktop: themeProp?.logoPaddingDesktop || themeFromHook.theme?.logoPaddingDesktop || DEFAULT_THEME.logoPaddingDesktop,
    headerLayout: themeProp?.headerLayout || themeFromHook.theme?.headerLayout || DEFAULT_THEME.headerLayout,
    stickyHeader: themeProp?.stickyHeader !== undefined ? themeProp.stickyHeader : (themeFromHook.theme?.stickyHeader !== undefined ? themeFromHook.theme.stickyHeader : DEFAULT_THEME.stickyHeader),
    transparentHeader: themeProp?.transparentHeader !== undefined ? themeProp.transparentHeader : (themeFromHook.theme?.transparentHeader !== undefined ? themeFromHook.theme.transparentHeader : DEFAULT_THEME.transparentHeader),
    logoColorOnScroll: themeProp?.logoColorOnScroll || themeFromHook.theme?.logoColorOnScroll || DEFAULT_THEME.logoColorOnScroll,
    headerMobilePadding: themeProp?.headerMobilePadding || themeFromHook.theme?.headerMobilePadding || 16,
    // Top bar settings
    topBarEnabled: themeProp?.topBarEnabled ?? themeFromHook.theme?.topBarEnabled ?? DEFAULT_THEME.topBarEnabled,
    topBarBgColor: themeProp?.topBarBgColor || themeFromHook.theme?.topBarBgColor || DEFAULT_THEME.topBarBgColor,
    topBarTextColor: themeProp?.topBarTextColor || themeFromHook.theme?.topBarTextColor || DEFAULT_THEME.topBarTextColor,
    countdownEnabled: themeProp?.countdownEnabled ?? themeFromHook.theme?.countdownEnabled ?? DEFAULT_THEME.countdownEnabled,
    countdownEndDate: themeProp?.countdownEndDate || themeFromHook.theme?.countdownEndDate || DEFAULT_THEME.countdownEndDate,
    countdownText: themeProp?.countdownText || themeFromHook.theme?.countdownText || DEFAULT_THEME.countdownText,
    messagesEnabled: themeProp?.messagesEnabled ?? themeFromHook.theme?.messagesEnabled ?? DEFAULT_THEME.messagesEnabled,
    messagesType: themeProp?.messagesType || themeFromHook.theme?.messagesType || DEFAULT_THEME.messagesType,
    messages: themeProp?.messages || themeFromHook.theme?.messages || DEFAULT_THEME.messages,
    messagesSpeed: themeProp?.messagesSpeed || themeFromHook.theme?.messagesSpeed || DEFAULT_THEME.messagesSpeed,
    messagesTextColor: themeProp?.messagesTextColor || themeFromHook.theme?.messagesTextColor || DEFAULT_THEME.messagesTextColor,
    messagesFontSize: themeProp?.messagesFontSize || themeFromHook.theme?.messagesFontSize || DEFAULT_THEME.messagesFontSize,
    // Mobile side menu settings
    mobileSideMenuShowSearch: themeProp?.mobileSideMenuShowSearch !== undefined ? themeProp.mobileSideMenuShowSearch : (themeFromHook.theme?.mobileSideMenuShowSearch !== undefined ? themeFromHook.theme.mobileSideMenuShowSearch : true),
    mobileSideMenuTitle: themeProp?.mobileSideMenuTitle || themeFromHook.theme?.mobileSideMenuTitle || "תפריט",
    mobileSideMenuShowAuthLinks: themeProp?.mobileSideMenuShowAuthLinks !== undefined ? themeProp.mobileSideMenuShowAuthLinks : (themeFromHook.theme?.mobileSideMenuShowAuthLinks !== undefined ? themeFromHook.theme.mobileSideMenuShowAuthLinks : true),
  }), [
    themeProp?.primaryColor,
    themeProp?.secondaryColor,
    themeProp?.logoWidthMobile,
    themeProp?.logoWidthDesktop,
    themeProp?.logoPaddingMobile,
    themeProp?.logoPaddingDesktop,
    themeProp?.headerLayout,
    themeProp?.stickyHeader,
    themeProp?.transparentHeader,
    themeProp?.logoColorOnScroll,
    themeProp?.topBarEnabled,
    themeProp?.topBarBgColor,
    themeProp?.topBarTextColor,
    themeProp?.countdownEnabled,
    themeProp?.countdownEndDate,
    themeProp?.countdownText,
    themeProp?.messagesEnabled,
    themeProp?.messagesType,
    themeProp?.messages,
    themeProp?.messagesSpeed,
    themeProp?.messagesTextColor,
    themeProp?.messagesFontSize,
    themeFromHook.theme?.primaryColor,
    themeFromHook.theme?.secondaryColor,
    themeFromHook.theme?.logoWidthMobile,
    themeFromHook.theme?.logoWidthDesktop,
    themeFromHook.theme?.logoPaddingMobile,
    themeFromHook.theme?.logoPaddingDesktop,
    themeFromHook.theme?.headerLayout,
    themeFromHook.theme?.stickyHeader,
    themeFromHook.theme?.transparentHeader,
    themeFromHook.theme?.logoColorOnScroll,
    themeFromHook.theme?.topBarEnabled,
    themeFromHook.theme?.topBarBgColor,
    themeFromHook.theme?.topBarTextColor,
    themeFromHook.theme?.countdownEnabled,
    themeFromHook.theme?.countdownEndDate,
    themeFromHook.theme?.countdownText,
    themeFromHook.theme?.messagesEnabled,
    themeFromHook.theme?.messagesType,
    themeFromHook.theme?.messages,
    themeFromHook.theme?.messagesSpeed,
    themeFromHook.theme?.messagesTextColor,
    themeFromHook.theme?.messagesFontSize,
  ])
  
  // שימוש ב-useCart לקבלת מספר פריטים בעגלה
  const { cart } = useCart(slug, customerId)
  const clientCartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
  const cartItemCount = mounted ? (clientCartItemCount || propCartItemCount || 0) : (propCartItemCount || 0)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // חשיפת פונקציה לפתיחת עגלה
  useEffect(() => {
    if (onOpenCart) {
      onOpenCart(() => {
        setCartOpen(true)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // ריצה פעם אחת בלבד בעת mount
  
  useEffect(() => {
    const customerData = localStorage.getItem(`storefront_customer_${slug}`)
    if (customerData) {
      try {
        const parsed = JSON.parse(customerData)
        setCustomerId(parsed.id)
      } catch (error) {
        console.error("Error parsing customer data:", error)
      }
    }
  }, [slug])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/shop/${slug}/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const renderNavigationItem = (item: NavigationItem, index: number) => {
    const hasChildren = item.children && item.children.length > 0

      if (item.type === "link") {
        return (
          <Link
            key={index}
            href={item.url || "#"}
            className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            {item.label}
          </Link>
        )
      } else if (item.type === "page") {
        // שימוש ב-pageSlug אם קיים, אחרת ב-pageId (תאימות לאחור)
        const pageIdentifier = item.pageSlug || item.pageId
        return (
          <Link
            key={index}
            href={`/shop/${slug}/pages/${pageIdentifier}`}
            className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            {item.label}
          </Link>
        )
      } else if (item.type === "category") {
        return (
          <Link
            key={index}
            href={`/shop/${slug}/categories/${item.categoryId}`}
            className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            {item.label}
          </Link>
        )
      } else if (item.type === "collection") {
        return (
          <Link
            key={index}
            href={`/shop/${slug}/collections/${item.collectionId}`}
            className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            {item.label}
          </Link>
        )
      }
    return null
  }

  // פונקציה נפרדת לתפריט מובייל עם סגנון שונה
  const renderMobileNavigationItem = (item: NavigationItem, index: number) => {
    const linkClassName = "block px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-gray-50 transition-colors rounded-lg text-base font-medium"
    
    if (item.type === "link") {
      return (
        <Link
          key={index}
          href={item.url || "#"}
          className={linkClassName}
        >
          {item.label}
        </Link>
      )
    } else if (item.type === "page") {
      const pageIdentifier = item.pageSlug || item.pageId
      return (
        <Link
          key={index}
          href={`/shop/${slug}/pages/${pageIdentifier}`}
          className={linkClassName}
        >
          {item.label}
        </Link>
      )
    } else if (item.type === "category") {
      return (
        <Link
          key={index}
          href={`/shop/${slug}/categories/${item.categoryId}`}
          className={linkClassName}
        >
          {item.label}
        </Link>
      )
    } else if (item.type === "collection") {
      return (
        <Link
          key={index}
          href={`/shop/${slug}/collections/${item.collectionId}`}
          className={linkClassName}
        >
          {item.label}
        </Link>
      )
    }
    return null
  }

  // שימוש בהגדרות ההדר מה-theme
  const headerLayout = theme.headerLayout || DEFAULT_THEME.headerLayout
  const stickyHeader = theme.stickyHeader !== undefined ? theme.stickyHeader : DEFAULT_THEME.stickyHeader
  const transparentHeader = theme.transparentHeader !== undefined ? theme.transparentHeader : DEFAULT_THEME.transparentHeader
  
  // State למעקב אחרי גלילה - אם ההדר שקוף, הוא יהפוך לאטום בעת גלילה
  const [isScrolled, setIsScrolled] = useState(false)
  
  // Top bar state
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [nextMessageIndex, setNextMessageIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)
  
  // טיפול בגלילה - אם ההדר שקוף, הוא יהפוך לאטום בעת גלילה
  useEffect(() => {
    if (!transparentHeader) {
      setIsScrolled(false)
      return
    }
    
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset
      setIsScrolled(scrollY > 50) // משנה לאטום אחרי 50px גלילה
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [transparentHeader])
  
  // בדיקה אם ההודעה יורדת שורה במובייל
  useEffect(() => {
    if (!messageRef.current || !theme.messagesEnabled || !theme.messages || theme.messages.length === 0) {
      return
    }
    
    const checkWrap = () => {
      if (messageRef.current) {
        const element = messageRef.current
        const isMobile = window.innerWidth < 768 // md breakpoint
        if (isMobile) {
          // בודק אם הגובה גדול מהגובה המינימלי (מעיד על ירידת שורה)
          const minHeight = (theme.messagesFontSize || DEFAULT_THEME.messagesFontSize) * 1.5
          setMessageWraps(element.scrollHeight > minHeight * 1.2)
        } else {
          setMessageWraps(false)
        }
      }
    }
    
    checkWrap()
    window.addEventListener('resize', checkWrap)
    
    // בדיקה מחדש כשההודעה משתנה
    const interval = setInterval(checkWrap, 100)
    
    return () => {
      window.removeEventListener('resize', checkWrap)
      clearInterval(interval)
    }
  }, [theme.messagesEnabled, theme.messages, theme.messagesFontSize, currentMessageIndex, isAnimating])

  // טיפול בהודעות מתחלפות
  useEffect(() => {
    if (!theme.topBarEnabled || !theme.messagesEnabled || theme.messagesType !== "rotating" || !theme.messages || theme.messages.length === 0) {
      return
    }
    
    // מאתחל את ההודעה הבאה בהתחלה
    if (theme.messages.length > 0) {
      setNextMessageIndex((currentMessageIndex + 1) % theme.messages.length)
    }
    
    const interval = setInterval(() => {
      // מחשב את ההודעה הבאה לפני האנימציה
      const nextIndex = (currentMessageIndex + 1) % theme.messages!.length
      setNextMessageIndex(nextIndex)
      
      // מתחיל את האנימציה - ההודעה הנוכחית עולה למעלה וההודעה הבאה נכנסת מלמטה
      setIsAnimating(true)
      
      // אחרי שהאנימציה מתחילה, משנה את ההודעה
      setTimeout(() => {
        setCurrentMessageIndex(nextIndex)
        // מסיים את האנימציה - ההודעה החדשה נכנסת למקום
        setTimeout(() => {
          setIsAnimating(false)
        }, 50)
      }, 300)
    }, theme.messagesSpeed || 3000)
    
    return () => clearInterval(interval)
  }, [theme.topBarEnabled, theme.messagesEnabled, theme.messagesType, theme.messages, theme.messagesSpeed, currentMessageIndex])
  
  // טיפול בקאונטדאון
  useEffect(() => {
    if (!theme.topBarEnabled || !theme.countdownEnabled || !theme.countdownEndDate) {
      setCountdown(null)
      return
    }
    
    const updateCountdown = () => {
      const endDate = new Date(theme.countdownEndDate!).getTime()
      const now = new Date().getTime()
      const distance = endDate - now
      
      if (distance < 0) {
        setCountdown(null)
        return
      }
      
      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      })
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    
    return () => clearInterval(interval)
  }, [theme.topBarEnabled, theme.countdownEnabled, theme.countdownEndDate])
  
  // Helper function לטופ בר
  const renderTopBar = () => {
    if (!theme.topBarEnabled) {
      return null
    }
    
    const hasContent = (theme.countdownEnabled && countdown) || (theme.messagesEnabled && theme.messages && theme.messages.length > 0)
    
    if (!hasContent) {
      return null
    }
    
    const showCountdown = theme.countdownEnabled && countdown
    const showMessages = theme.messagesEnabled && theme.messages && theme.messages.length > 0
    
    return (
      <div 
        className="w-full text-center py-2 px-4"
        style={{
          backgroundColor: theme.topBarBgColor || DEFAULT_THEME.topBarBgColor,
          color: theme.topBarTextColor || DEFAULT_THEME.topBarTextColor,
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 flex-wrap md:flex-nowrap">
          {/* קאונטדאון */}
          {showCountdown && (
            <div className="flex items-center gap-2">
              <span>{theme.countdownText || DEFAULT_THEME.countdownText}</span>
              <span className="font-bold">
                {countdown.days > 0 && `${countdown.days}:`}
                {String(countdown.hours).padStart(2, '0')}:
                {String(countdown.minutes).padStart(2, '0')}:
                {String(countdown.seconds).padStart(2, '0')}
              </span>
            </div>
          )}
          
          {/* קו הפרדה - מוצג רק אם יש גם שעון וגם הודעות - נסתר במובייל */}
          {showCountdown && showMessages && (
            <div 
              className={`opacity-50 hidden md:block w-px h-4`}
              style={{
                backgroundColor: theme.topBarTextColor || DEFAULT_THEME.topBarTextColor,
              }}
            />
          )}
          
          {/* הודעות */}
          {showMessages && (
            <div 
              ref={messageRef}
              className="text-center relative overflow-hidden"
              style={{
                color: theme.messagesTextColor || theme.topBarTextColor || DEFAULT_THEME.topBarTextColor,
                fontSize: `${theme.messagesFontSize || DEFAULT_THEME.messagesFontSize}px`,
                minHeight: `${(theme.messagesFontSize || DEFAULT_THEME.messagesFontSize) * 1.5}px`,
              }}
            >
              {theme.messagesType === "rotating" ? (
                <div className="relative w-full">
                  {/* ההודעה הנוכחית - יוצאת למעלה */}
                  <div
                    key={`current-${currentMessageIndex}`}
                    className="transition-all ease-in-out"
                    style={{
                      transitionDuration: '600ms',
                      transform: isAnimating ? 'translateY(-100%)' : 'translateY(0)',
                      opacity: isAnimating ? 0 : 1,
                    }}
                  >
                    {theme.messages[currentMessageIndex]}
                  </div>
                  {/* ההודעה הבאה - נכנסת מלמטה */}
                  {isAnimating && theme.messages.length > 1 && (
                    <div
                      key={`next-${nextMessageIndex}`}
                      className="transition-all ease-in-out absolute top-0 left-0 right-0"
                      style={{
                        transitionDuration: '600ms',
                        transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
                        opacity: isAnimating ? 1 : 0,
                      }}
                    >
                      {theme.messages[nextMessageIndex]}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {theme.messages.map((msg, idx) => (
                    <span key={idx}>
                      {msg}
                      {idx < theme.messages!.length - 1 && " • "}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
  
  // Helper function ללוגו
  const renderLogo = (className?: string) => (
    <Link href={`/shop/${slug}`} className={`flex items-center gap-3 group ${className || ''}`}>
      {shop?.logo ? (
        <>
          {/* Logo for Mobile */}
          <div 
            className="flex items-center justify-center md:hidden"
            style={{
              width: `${logoSizes.mobile * 2}px`,
              height: `${logoSizes.mobile}px`,
              flexShrink: 0,
            }}
          >
            <img
              src={shop.logo}
              alt={shop?.name || "Shop"}
              style={{
                maxWidth: `${logoSizes.mobile * 2}px`,
                maxHeight: `${logoSizes.mobile}px`,
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
              }}
              loading="eager"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement
                target.style.display = "none"
              }}
            />
          </div>
          {/* Logo for Desktop */}
          <div 
            className="hidden md:flex md:items-center md:justify-center"
            style={{
              width: `${logoSizes.desktop * 2}px`,
              height: `${logoSizes.desktop}px`,
              flexShrink: 0,
            }}
          >
            <img
              src={shop.logo}
              alt={shop?.name || "Shop"}
              style={{
                maxWidth: `${logoSizes.desktop * 2}px`,
                maxHeight: `${logoSizes.desktop}px`,
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
              }}
              loading="eager"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement
                target.style.display = "none"
              }}
            />
          </div>
        </>
      ) : (
        <h1 className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
          {shop?.name || "חנות"}
        </h1>
      )}
    </Link>
  )

  // Helper function לניווט
  const renderNavigation = (className?: string) => (
    <nav className={`hidden md:flex items-center gap-6 flex-1 justify-center ${className || ''}`} style={{ minHeight: '24px' }}>
      {!navigation || !navigation.items || !Array.isArray(navigation.items) || navigation.items.length === 0 ? (
        <>
          {[60, 80, 70, 90].map((width, index) => (
            <div
              key={index}
              className="h-4 bg-gray-200 rounded animate-pulse"
              style={{ width: `${width}px` }}
            />
          ))}
        </>
      ) : (
        navigation.items.map((item, index) => renderNavigationItem(item, index))
      )}
    </nav>
  )

  // Helper function לכפתורים (Search, Account, Cart)
  const renderActions = () => (
    <div className="flex items-center gap-1 md:gap-4">
      {/* Search */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSearchOpen(true)}
        className="p-2"
      >
        <Search className="w-5 h-5 text-gray-700" />
      </Button>

      {/* Account */}
      {mounted ? (
        <Link href={customerId ? `/shop/${slug}/account` : `/shop/${slug}/login`}>
          <Button variant="ghost" size="sm" className="p-2">
            <User className="w-5 h-5 text-gray-700" />
          </Button>
        </Link>
      ) : (
        <Button variant="ghost" size="sm" className="p-2">
          <User className="w-5 h-5 text-gray-700" />
        </Button>
      )}

      {/* Cart */}
      <Button
        variant="ghost"
        size="sm"
        className="p-2 relative"
        onClick={() => setCartOpen(true)}
      >
        <ShoppingCart className="w-5 h-5 text-gray-700" />
        {cartItemCount > 0 && (
          <span
            suppressHydrationWarning
            className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {cartItemCount > 9 ? "9+" : cartItemCount}
          </span>
        )}
      </Button>

    </div>
  )

  return (
    <>
      {/* Top Bar */}
      {renderTopBar()}
      
      <header 
        className={`z-50 transition-all duration-300 ${stickyHeader ? 'sticky top-0' : ''} ${
          transparentHeader && !isScrolled 
            ? 'bg-transparent border-transparent' 
            : 'bg-white border-b border-gray-200'
        }`}
        style={{ minHeight: '80px' }}
      >
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          style={{
            paddingLeft: typeof window !== 'undefined' && window.innerWidth < 768 
              ? `${theme.headerMobilePadding ?? 16}px` 
              : undefined,
            paddingRight: typeof window !== 'undefined' && window.innerWidth < 768 
              ? `${theme.headerMobilePadding ?? 16}px` 
              : undefined,
          }}
        >
        {/* פריסה במובייל - תבנית קבועה: לוגו במרכז, המבורגר מימין, אייקונים משמאל */}
        <div className="md:hidden flex items-center justify-between py-4" style={{ minHeight: '64px' }} dir="rtl">
          {/* מימין (RTL) - המבורגר (תפריט) */}
          <div className="flex items-center gap-2 flex-1 justify-start">
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </Button>
          </div>
          
          {/* במרכז - לוגו */}
          <div className="flex-1 flex justify-center">
            {renderLogo()}
          </div>
          
          {/* משמאל (RTL) - אייקונים (חיפוש, חשבון, עגלה) */}
          <div className="flex items-center gap-1 flex-1 justify-end">
            {renderActions()}
          </div>
        </div>

        {/* פריסה בדסקטופ - לפי headerLayout */}
        <div className="hidden md:block">
          {headerLayout === "logo-center-menu-below" ? (
            // פריסה: לוגו במרכז, תפריט למטה
            <div className="py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1" />
                {renderLogo()}
                <div className="flex-1 flex justify-end">
                  {renderActions()}
                </div>
              </div>
              <div className="flex justify-center">
                {renderNavigation("hidden md:flex")}
              </div>
            </div>
          ) : headerLayout === "logo-right" ? (
            // פריסה: לוגו מימין, תפריט במרכז
            <div className="flex items-center justify-between py-4" style={{ minHeight: '64px' }}>
              {renderNavigation()}
              {renderLogo()}
              {renderActions()}
            </div>
          ) : (
            // פריסה ברירת מחדל: לוגו משמאל, תפריט במרכז
            <div className="flex items-center justify-between py-4" style={{ minHeight: '64px' }}>
              {renderLogo()}
              {renderNavigation()}
              {renderActions()}
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Cart */}
      {mounted && (
        <SlideOutCart
          slug={slug}
          isOpen={cartOpen}
          onClose={() => {
            setCartOpen(false)
            if (onCartUpdate) {
              onCartUpdate()
            }
          }}
          customerId={customerId}
          onCartUpdate={onCartUpdate}
          refreshKey={cartRefreshKey}
        />
      )}

      {/* Search Dialog */}
      {mounted && (
        <SearchDialog
          slug={slug}
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {/* Mobile Side Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} side="right">
        <SheetContent onClose={() => setMobileMenuOpen(false)} className="w-full max-w-sm">
          <SheetHeader>
            <SheetTitle>{theme.mobileSideMenuTitle || "תפריט"}</SheetTitle>
          </SheetHeader>
          <SheetBody className="p-0">
            <div className="flex flex-col h-full">
              {/* Mobile Search */}
              {(theme.mobileSideMenuShowSearch !== false) && (
                <div className="p-4 border-b">
                  <form onSubmit={handleSearch}>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        type="text"
                        placeholder="חיפוש מוצרים..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-10 w-full"
                      />
                    </div>
                  </form>
                </div>
              )}

              {/* Mobile Navigation */}
              <div className="flex-1 overflow-y-auto p-4">
                <nav className="space-y-1">
                  {!mobileNavigation || !mobileNavigation.items || !Array.isArray(mobileNavigation.items) || mobileNavigation.items.length === 0 ? (
                    // אם אין תפריט מובייל, נשתמש בתפריט דסקטופ
                    !desktopNavigation || !desktopNavigation.items || !Array.isArray(desktopNavigation.items) || desktopNavigation.items.length === 0 ? (
                      // Skeleton loader לתפריט מובייל
                      <>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <div
                            key={index}
                            className="h-10 bg-gray-200 rounded animate-pulse mb-2"
                          />
                        ))}
                      </>
                    ) : (
                      desktopNavigation.items.map((item, index) => (
                        <div key={index} onClick={() => setMobileMenuOpen(false)} className="block">
                          {renderMobileNavigationItem(item, index)}
                        </div>
                      ))
                    )
                  ) : (
                    mobileNavigation.items.map((item, index) => (
                      <div key={index} onClick={() => setMobileMenuOpen(false)} className="block">
                        {renderMobileNavigationItem(item, index)}
                      </div>
                    ))
                  )}
                </nav>
              </div>

              {/* Mobile Account Links */}
              {mounted && (theme.mobileSideMenuShowAuthLinks !== false) && (
                <div className="p-4 border-t space-y-2">
                  {customerId ? (
                    <Link
                      href={`/shop/${slug}/account`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-gray-700 hover:text-purple-600 transition-colors rounded-lg hover:bg-gray-50"
                    >
                      חשבון שלי
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/shop/${slug}/login`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-3 py-2 text-gray-700 hover:text-purple-600 transition-colors rounded-lg hover:bg-gray-50"
                      >
                        התחברות
                      </Link>
                      <Link
                        href={`/shop/${slug}/register`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-3 py-2 text-gray-700 hover:text-purple-600 transition-colors rounded-lg hover:bg-gray-50"
                      >
                        הרשמה
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
      </header>
    </>
  )
}

