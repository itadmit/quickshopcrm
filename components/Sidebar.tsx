"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations, useLocale } from "next-intl"
import { cn } from "@/lib/utils"
import {
  Home,
  Settings,
  Sparkles,
  Inbox,
  Plug,
  Package,
  ShoppingCart,
  Users,
  Tag,
  FolderOpen,
  Gift,
  ShoppingBag,
  FileText,
  Menu,
  BookOpen,
  Star,
  RotateCcw,
  CreditCard,
  Boxes,
  Webhook,
  TrendingUp,
  Warehouse,
  ScanLine,
  Palette,
  Shield,
  DollarSign,
  Workflow,
  Mail,
  Sliders,
  Plus,
  Ruler,
  Edit,
  X,
  Bell,
  Image,
  Megaphone,
  Crown,
} from "lucide-react"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"

// Menu items structure - labels will be translated in component
const getMenuItems = (t: any) => [
  { icon: Home, labelKey: "sidebar.home", href: "/dashboard", permission: "dashboard" },
  { icon: Inbox, labelKey: "sidebar.notifications", href: "/notifications", hasBadge: true, permission: "notifications" },
]

const getInfluencerItems = (t: any) => [
  { icon: TrendingUp, labelKey: "sidebar.influencerDashboard", href: "/influencer", permission: "influencer" },
]

const getSalesItems = (t: any) => [
  { icon: Package, labelKey: "sidebar.products", href: "/products", permission: "products" },
  { icon: FolderOpen, labelKey: "sidebar.categories", href: "/categories", permission: "categories" },
  { icon: ShoppingCart, labelKey: "sidebar.orders", href: "/orders", permission: "orders" },
  { icon: Users, labelKey: "sidebar.contacts", href: "/contacts", permission: "customers" },
  { icon: Warehouse, labelKey: "sidebar.inventory", href: "/inventory", permission: "inventory" },
  { icon: Edit, labelKey: "sidebar.quickEdit", href: "/products/bulk-edit", permission: "products" },
]

const getMarketingItems = (t: any) => [
  { icon: Tag, labelKey: "sidebar.discounts", href: "/discounts", permission: "discounts" },
  { icon: Tag, labelKey: "sidebar.coupons", href: "/coupons", permission: "coupons" },
  { icon: Gift, labelKey: "sidebar.giftCards", href: "/gift-cards", permission: "gift_cards" },
  { icon: ShoppingBag, labelKey: "sidebar.abandonedCarts", href: "/abandoned-carts", permission: "abandoned_carts" },
  { icon: Bell, labelKey: "sidebar.waitlist", href: "/waitlist", permission: "products" },
]

const getContentItems = (t: any) => [
  { icon: FileText, labelKey: "sidebar.pages", href: "/pages", permission: "pages" },
  { icon: Menu, labelKey: "sidebar.navigation", href: "/navigation", permission: "navigation" },
  { icon: BookOpen, labelKey: "sidebar.blog", href: "/blog", permission: "blog" },
  { icon: Megaphone, labelKey: "sidebar.popups", href: "/popups", permission: "settings" },
  { icon: Image, labelKey: "sidebar.media", href: "/media", permission: "media" },
  { icon: Palette, labelKey: "sidebar.appearance", href: "/appearance", permission: "settings" },
  { icon: Sparkles, labelKey: "sidebar.customize", href: "/customize", permission: "settings" },
]

const getCustomerServiceItems = (t: any) => [
  { icon: Star, labelKey: "sidebar.reviews", href: "/reviews", permission: "reviews" },
  { icon: RotateCcw, labelKey: "sidebar.returns", href: "/returns", permission: "returns" },
  { icon: CreditCard, labelKey: "sidebar.storeCredits", href: "/store-credits", permission: "store_credits" },
]

const getProductItems = (t: any) => [
  { icon: Ruler, labelKey: "sidebar.sizeCharts", href: "/size-charts", permission: "products" },
  { icon: Sliders, labelKey: "sidebar.customFields", href: "/settings/custom-fields", permission: "settings" },
  { icon: Plus, labelKey: "sidebar.productAddons", href: "/settings/product-addons", permission: "settings" },
]

const getSystemItems = (t: any) => [
  { icon: TrendingUp, labelKey: "sidebar.analytics", href: "/analytics", permission: "analytics" },
  { icon: Workflow, labelKey: "sidebar.automations", href: "/automations", permission: "automations" },
  { icon: Webhook, labelKey: "sidebar.webhooks", href: "/webhooks", permission: "webhooks" },
  { icon: ScanLine, labelKey: "sidebar.trackingPixels", href: "/tracking-pixels", permission: "tracking_pixels" },
]

const getSettingsItems = (t: any) => [
  { icon: Settings, labelKey: "sidebar.settings", href: "/settings", permission: "settings" },
  { icon: Sliders, labelKey: "sidebar.orderStatuses", href: "/settings/order-statuses", permission: "settings" },
  { icon: Plug, labelKey: "sidebar.integrations", href: "/settings/integrations", permission: "integrations" },
  { icon: TrendingUp, labelKey: "sidebar.trafficSources", href: "/traffic-sources", permission: "settings" },
]

const getSuperAdminItems = (t: any) => [
  { icon: Shield, labelKey: "sidebar.superAdmin.payplusSettings", href: "/admin", permission: "super_admin" },
  { icon: Mail, labelKey: "sidebar.superAdmin.sendgridSettings", href: "/admin/sendgrid", permission: "super_admin" },
  { icon: DollarSign, labelKey: "sidebar.superAdmin.commissions", href: "/admin/commissions", permission: "super_admin" },
  { icon: Plug, labelKey: "sidebar.superAdmin.pluginManagement", href: "/admin/plugins", permission: "super_admin" },
]

interface SidebarProps {
  hideLogo?: boolean
}

export function Sidebar({ hideLogo = false }: SidebarProps = {}) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const t = useTranslations()
  const locale = useLocale()
  const isRTL = locale === 'he'
  const [unreadCount, setUnreadCount] = useState(0)
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [loadingPermissions, setLoadingPermissions] = useState(true)
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)
  const [pluginMenuItems, setPluginMenuItems] = useState<any[]>([])
  const [hideTrialCard, setHideTrialCard] = useState(false)
  
  // קבלת החנות הנוכחית מ-localStorage או context
  const [currentShopId, setCurrentShopId] = useState<string | null>(null)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedShopData = localStorage.getItem('selectedShopData')
      if (savedShopData) {
        try {
          const shop = JSON.parse(savedShopData)
          setCurrentShopId(shop.id)
        } catch (err) {
          console.error('Error loading shop from localStorage:', err)
        }
      }
    }
  }, [])
  
  // Get menu items with translations
  const menuItems = getMenuItems(t)
  const influencerItems = getInfluencerItems(t)
  const salesItems = getSalesItems(t)
  const marketingItems = getMarketingItems(t)
  const contentItems = getContentItems(t)
  const customerServiceItems = getCustomerServiceItems(t)
  const productItems = getProductItems(t)
  const systemItems = getSystemItems(t)
  const settingsItems = getSettingsItems(t)
  const superAdminItems = getSuperAdminItems(t)

  const fetchPermissions = useCallback(async () => {
    try {
      const response = await fetch('/api/users/permissions', {
        cache: 'no-store', // Don't cache - always fetch fresh
      })
      if (response.ok) {
        const data = await response.json()
        setPermissions(data.permissions || {})
      } else {
        // אם יש שגיאה, נניח שהמשתמש הוא ADMIN ויש לו כל ההרשאות
        setPermissions({
          dashboard: true,
          notifications: true,
          products: true,
          orders: true,
          customers: true,
          inventory: true,
          discounts: true,
          coupons: true,
          categories: true,
          gift_cards: true,
          abandoned_carts: true,
          pages: true,
          navigation: true,
          blog: true,
          media: true,
          reviews: true,
          returns: true,
          store_credits: true,
          analytics: true,
          webhooks: true,
          settings: true,
          integrations: true,
          tracking_pixels: true,
        })
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
      // אם יש שגיאה, נניח שהמשתמש הוא ADMIN ויש לו כל ההרשאות
      setPermissions({
        dashboard: true,
        notifications: true,
        products: true,
        orders: true,
        customers: true,
        inventory: true,
        discounts: true,
        coupons: true,
        categories: true,
        gift_cards: true,
        abandoned_carts: true,
        pages: true,
        navigation: true,
        blog: true,
        media: true,
        reviews: true,
        returns: true,
        store_credits: true,
        analytics: true,
        webhooks: true,
        settings: true,
        integrations: true,
        tracking_pixels: true,
      })
    } finally {
      setLoadingPermissions(false)
    }
  }, [])

  useEffect(() => {
    // נחכה שה-session יטען לפני שנבצע fetch
    if (status === 'authenticated') {
      // הרצה מקבילית של כל הבקשות במקום סדרתית
      Promise.all([
        fetchPermissions(),
        fetchUnreadCount(),
        fetchSubscriptionInfo(),
        fetchActivePlugins()
      ]).catch(err => console.error('Error loading sidebar data:', err))
    }
    
    // טעינת הגדרת הסתרת כרטיס Trial
    if (typeof window !== 'undefined') {
      const hidden = localStorage.getItem('hide-trial-card')
      setHideTrialCard(hidden === 'true')
    }
  }, [status, currentShopId, fetchPermissions])

  useEffect(() => {
    // רענון כל 30 שניות - רק אם מחובר
    if (status !== 'authenticated') return
    
    const interval = setInterval(() => {
      fetchUnreadCount()
      fetchSubscriptionInfo()
      fetchActivePlugins() // עדכון תוספים כל 30 שניות
    }, 30000)
    return () => clearInterval(interval)
  }, [status, currentShopId])

  // האזנה ל-events של עדכון תוספים
  useEffect(() => {
    if (status !== 'authenticated') return

    const handlePluginUpdate = () => {
      fetchActivePlugins()
    }

    // האזנה ל-custom event
    window.addEventListener('plugin-updated', handlePluginUpdate)
    // האזנה גם ל-navigation events (כשעוברים בין דפים)
    window.addEventListener('focus', handlePluginUpdate)

    return () => {
      window.removeEventListener('plugin-updated', handlePluginUpdate)
      window.removeEventListener('focus', handlePluginUpdate)
    }
  }, [status])

  const fetchSubscriptionInfo = async () => {
    try {
      const response = await fetch('/api/subscriptions/check', {
        cache: 'force-cache',
        next: { revalidate: 120 } // Revalidate every 2 minutes
      })
      if (response.ok) {
        const data = await response.json()
        setSubscriptionInfo(data)
      } else if (response.status === 401) {
        // אם המשתמש לא מאומת, לא ננסה שוב
        return
      }
    } catch (error) {
      // לא נדפיס שגיאות בקונסול - זה נורמלי כשאין מנוי או בעיות אימות
      // console.error('Error fetching subscription info:', error)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications count:', error)
    }
  }

  const fetchActivePlugins = async () => {
    try {
      // בניית URL עם shopId אם יש
      const url = currentShopId 
        ? `/api/plugins?shopId=${currentShopId}` 
        : '/api/plugins'
        
      const response = await fetch(url, {
        cache: 'force-cache', // Cache plugins data
        next: { revalidate: 60 } // Revalidate every 60 seconds
      })
      if (response.ok) {
        const plugins = await response.json()
        // מסננים רק תוספים פעילים שיש להם menuItem
        const menuItems = plugins
          .filter((p: any) => p.isActive && p.isInstalled && p.metadata?.menuItem)
          .map((p: any) => ({
            ...p.metadata.menuItem,
            pluginSlug: p.slug,
          }))
        setPluginMenuItems(menuItems)
      }
    } catch (error) {
      console.error('Error fetching active plugins:', error)
    }
  }

  // פונקציה לבדיקה אם פריט מורשה
  const hasPermission = (permission?: string) => {
    if (!permission) return true // אם אין permission מוגדר, נציג
    // אם עדיין טוען, נציג הכל (לא נחכה)
    if (loadingPermissions) return true
    // אם אין הרשאות כלל, נציג הכל (לצורך בדיקה)
    if (Object.keys(permissions).length === 0) return true
    return permissions[permission] === true
  }

  // פונקציה להסתרת כרטיס ה-Trial
  const handleHideTrialCard = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hide-trial-card', 'true')
      setHideTrialCard(true)
    }
  }

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'}
      className={cn(
        "w-full h-full bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col border-gray-200",
        !hideLogo && "md:w-64",
        isRTL ? 'border-l' : 'border-r'
      )}
    >
      {/* Logo - Hidden on mobile when hideLogo is true */}
      {!hideLogo && (
        <div className="h-16 border-b border-gray-200 flex items-center justify-center px-4 py-2">
          <Link href="/dashboard" className="flex items-center justify-center overflow-visible">
            <span 
              className="text-2xl font-pacifico text-gray-900 block" 
              style={{ letterSpacing: '2px', lineHeight: '1.5', paddingBottom: '4px' }}
            >
              Quick Shop
            </span>
          </Link>
        </div>
      )}

      {/* Main Navigation */}
      <div 
        className={cn("flex-1 overflow-y-auto p-4 sidebar-scroll", hideLogo && "pt-4")}
      >
        <Accordion 
          storageKey="sidebar-accordions" 
          className="space-y-1"
          defaultValue={[
            "sales",
            "marketing", 
            "content",
            "customerService",
            "additionalProducts",
            "system",
            "settings",
            "influencer",
            "superAdmin"
          ]}
        >
          {/* Primary Menu - Hidden only for INFLUENCER role (not SUPER_ADMIN) */}
          {(session as any)?.user?.role !== "INFLUENCER" && (
            <nav className="space-y-1 mb-2">
              {menuItems
                .filter((item) => hasPermission(item.permission))
                .map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={(item as any).disabled ? "#" : item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-gray-700 hover:bg-gray-200",
                        (item as any).disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1">{t(item.labelKey)}</span>
                      {item.hasBadge && unreadCount > 0 && (
                        <span className="prodify-gradient text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
            </nav>
          )}

          {/* Influencer Menu - Only for INFLUENCER role */}
          {(session as any)?.user?.role === "INFLUENCER" && (
            <AccordionItem id="influencer">
              <AccordionTrigger>{t("sidebar.sections.influencer")}</AccordionTrigger>
              <AccordionContent>
                <nav className="space-y-1">
                  {influencerItems
                    .filter((item) => hasPermission(item.permission))
                    .map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className="flex-1">{t(item.labelKey)}</span>
                        </Link>
                      )
                    })}
                </nav>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Sales Section - Hidden for INFLUENCER role */}
          {(session as any)?.user?.role !== "INFLUENCER" && (
            <AccordionItem id="sales">
              <AccordionTrigger>{t("sidebar.sections.sales")}</AccordionTrigger>
              <AccordionContent>
                <nav className="space-y-1">
                  {salesItems
                    .filter((item) => hasPermission(item.permission))
                    .map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span>{t(item.labelKey)}</span>
                        </Link>
                      )
                    })}
                </nav>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Marketing Section - Hidden for INFLUENCER role */}
          {(session as any)?.user?.role !== "INFLUENCER" && (
            <AccordionItem id="marketing">
              <AccordionTrigger>{t("sidebar.sections.marketing")}</AccordionTrigger>
              <AccordionContent>
                <nav className="space-y-1">
                  {marketingItems
                    .filter((item) => hasPermission(item.permission))
                    .map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span>{t(item.labelKey)}</span>
                        </Link>
                      )
                    })}
                  {/* תוספים עם menuItem בקטע שיווק */}
                  {pluginMenuItems
                    .filter((item: any) => item.section === 'marketing' && hasPermission(item.permission))
                    .map((item: any) => {
                      // מציאת האייקון לפי שם
                      const iconMap: Record<string, any> = {
                        'Crown': Crown,
                        'Boxes': Boxes,
                        'Star': Star,
                      }
                      const IconComponent = iconMap[item.icon] || Tag
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Link
                          key={`plugin-${item.pluginSlug}`}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          <IconComponent className="w-5 h-5 flex-shrink-0" />
                          <span>{item.labelKey ? t(item.labelKey) : (item.label || '')}</span>
                        </Link>
                      )
                    })}
                </nav>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Content Section - Hidden for INFLUENCER role */}
          {(session as any)?.user?.role !== "INFLUENCER" && (
            <AccordionItem id="content">
              <AccordionTrigger>{t("sidebar.sections.content")}</AccordionTrigger>
              <AccordionContent>
                <nav className="space-y-1">
                  {contentItems
                    .filter((item) => hasPermission(item.permission))
                    .map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span>{t(item.labelKey)}</span>
                        </Link>
                      )
                    })}
                </nav>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Customer Service Section - Hidden for INFLUENCER role */}
          {(session as any)?.user?.role !== "INFLUENCER" && (
            <AccordionItem id="customerService">
              <AccordionTrigger>{t("sidebar.sections.customerService")}</AccordionTrigger>
              <AccordionContent>
                <nav className="space-y-1">
                  {customerServiceItems
                    .filter((item) => hasPermission(item.permission))
                    .map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span>{t(item.labelKey)}</span>
                        </Link>
                      )
                    })}
                </nav>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Products Section - Hidden for INFLUENCER role */}
          {(session as any)?.user?.role !== "INFLUENCER" && (
            <AccordionItem id="additionalProducts">
              <AccordionTrigger>{t("sidebar.sections.additionalProducts")}</AccordionTrigger>
              <AccordionContent>
                <nav className="space-y-1">
                  {productItems
                    .filter((item) => hasPermission(item.permission))
                    .map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span>{t(item.labelKey)}</span>
                        </Link>
                      )
                    })}
                  {/* תוספים עם menuItem */}
                  {pluginMenuItems
                    .filter((item: any) => item.section === 'productItems' && hasPermission(item.permission))
                    .map((item: any) => {
                      // מציאת האייקון לפי שם
                      const IconComponent = item.icon === 'Boxes' ? Boxes : Boxes
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Link
                          key={`plugin-${item.pluginSlug}`}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          <IconComponent className="w-5 h-5 flex-shrink-0" />
                          <span>{item.labelKey ? t(item.labelKey) : (item.label || '')}</span>
                        </Link>
                      )
                    })}
                </nav>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* System Section - Hidden for INFLUENCER role */}
          {(session as any)?.user?.role !== "INFLUENCER" && (
            <AccordionItem id="system">
              <AccordionTrigger>{t("sidebar.sections.system")}</AccordionTrigger>
              <AccordionContent>
                <nav className="space-y-1">
                  {systemItems
                    .filter((item) => hasPermission(item.permission))
                    .map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span>{t(item.labelKey)}</span>
                        </Link>
                      )
                    })}
                </nav>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Settings Section - Hidden for INFLUENCER role */}
          {(session as any)?.user?.role !== "INFLUENCER" && (
            <AccordionItem id="settings">
              <AccordionTrigger>{t("sidebar.sections.settings")}</AccordionTrigger>
              <AccordionContent>
                <nav className="space-y-1">
                  {settingsItems
                    .filter((item) => hasPermission(item.permission))
                    .map((item) => {
                      const Icon = item.icon
                      // בדיקה מדויקת - אם pathname הוא בדיוק ה-href, או מתחיל ב-href + '/'
                      // אבל רק אם זה לא חלק מ-href אחר יותר ארוך
                      const isActive = pathname === item.href ||
                        (pathname.startsWith(item.href + '/') &&
                         !settingsItems.some(otherItem =>
                           otherItem.href !== item.href &&
                           pathname.startsWith(otherItem.href + '/') &&
                           otherItem.href.length > item.href.length
                         ))
                      // אם אנחנו ב-integrations, רק אינטגרציות יסומן (לא הגדרות)
                      const isIntegrationsPage = pathname.startsWith('/settings/integrations')
                      const finalIsActive = isIntegrationsPage && item.href === '/settings'
                        ? false
                        : isActive

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            finalIsActive
                              ? "bg-gray-200 text-gray-900"
                              : "text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span>{t(item.labelKey)}</span>
                        </Link>
                      )
                    })}
                </nav>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Super Admin Section - Only for SUPER_ADMIN */}
          {(session as any)?.user?.role === "SUPER_ADMIN" && (
            <AccordionItem id="superAdmin">
              <AccordionTrigger className="text-red-600">{t("sidebar.sections.superAdmin")}</AccordionTrigger>
              <AccordionContent>
                <nav className="space-y-1">
                  {superAdminItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                          isActive
                            ? "bg-red-100 text-red-900"
                            : "text-red-700 hover:bg-red-50"
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span>{t(item.labelKey)}</span>
                      </Link>
                    )
                  })}
                </nav>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>

      {/* Bottom Section - Trial Period */}
      {!hideTrialCard && (
        <div className="p-4 border-t border-gray-200">
          <div className="rounded-xl p-4 text-white text-sm relative" style={{
            background: 'linear-gradient(135deg, #15b981 0%, #10b981 100%)'
          }}>
            {/* כפתור סגירה */}
            <button
              onClick={handleHideTrialCard}
              className="absolute top-3 left-3 text-white/60 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors"
              title="הסתר כרטיס"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-pacifico text-lg" style={{ letterSpacing: '1px' }}>Quick Shop</span>
            </div>
            <p className="text-white/80 text-xs mb-3">
              {t("sidebar.trial.title")}
            </p>
            {subscriptionInfo && subscriptionInfo.isTrial && subscriptionInfo.daysRemaining !== undefined && (
              <div className="mb-3 pb-3 border-b border-white/20">
                <p className="text-white/90 text-xs font-medium mb-1">
                  {subscriptionInfo.daysRemaining > 0 ? (
                    <>
                      {t("sidebar.trial.daysRemaining", { count: subscriptionInfo.daysRemaining })}
                    </>
                  ) : (
                    <span className="text-red-200">{t("sidebar.trial.trialEnded")}</span>
                  )}
                </p>
                {subscriptionInfo.daysRemaining <= 3 && subscriptionInfo.daysRemaining > 0 && (
                  <p className="text-yellow-200 text-xs">
                    {t("sidebar.trial.timeRunningOut")}
                  </p>
                )}
              </div>
            )}
            <button 
              onClick={() => window.location.href = '/settings?tab=subscription'}
              className="w-full bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            >
              {t("sidebar.trial.trialPeriod")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

