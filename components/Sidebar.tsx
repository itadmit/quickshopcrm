"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
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
} from "lucide-react"

const menuItems = [
  { icon: Home, label: "בית", href: "/dashboard", permission: "dashboard" },
  { icon: Inbox, label: "התראות", href: "/notifications", hasBadge: true, permission: "notifications" },
]

// פריטים למשפיענים/יות
const influencerItems = [
  { icon: TrendingUp, label: "דשבורד משפיען/ית", href: "/influencer", permission: "influencer" },
]

const salesItems = [
  { icon: Package, label: "מוצרים", href: "/products", permission: "products" },
  { icon: ShoppingCart, label: "הזמנות", href: "/orders", permission: "orders" },
  { icon: Users, label: "לקוחות", href: "/customers", permission: "customers" },
  { icon: Warehouse, label: "מלאי", href: "/inventory", permission: "inventory" },
]

const marketingItems = [
  { icon: Tag, label: "הנחות", href: "/discounts", permission: "discounts" },
  { icon: Tag, label: "קופונים", href: "/coupons", permission: "coupons" },
  { icon: FolderOpen, label: "קולקציות", href: "/collections", permission: "collections" },
  { icon: Gift, label: "כרטיסי מתנה", href: "/gift-cards", permission: "gift_cards" },
  { icon: ShoppingBag, label: "עגלות נטושות", href: "/abandoned-carts", permission: "abandoned_carts" },
]

const contentItems = [
  { icon: FileText, label: "דפים", href: "/pages", permission: "pages" },
  { icon: Menu, label: "תפריט ניווט", href: "/navigation", permission: "navigation" },
  { icon: BookOpen, label: "בלוג", href: "/blog", permission: "blog" },
  { icon: Palette, label: "מראה ועיצוב", href: "/appearance", permission: "settings" },
  { icon: Sparkles, label: "התאמה אישית", href: "/customize", permission: "settings" },
]

const customerServiceItems = [
  { icon: Star, label: "ביקורות", href: "/reviews", permission: "reviews" },
  { icon: RotateCcw, label: "החזרים", href: "/returns", permission: "returns" },
  { icon: CreditCard, label: "אשראי בחנות", href: "/store-credits", permission: "store_credits" },
]

const productItems = [
  { icon: Boxes, label: "חבילות מוצרים", href: "/bundles", permission: "bundles" },
]

const systemItems = [
  { icon: TrendingUp, label: "אנליטיקה", href: "/analytics", permission: "analytics" },
  { icon: Workflow, label: "אוטומציות", href: "/automations", permission: "automations" },
  { icon: Webhook, label: "Webhooks", href: "/webhooks", permission: "webhooks" },
  { icon: ScanLine, label: "פיקסלים וקודי מעקב", href: "/tracking-pixels", permission: "tracking_pixels" },
]

const settingsItems = [
  { icon: Settings, label: "הגדרות", href: "/settings", permission: "settings" },
  { icon: Plug, label: "אינטגרציות", href: "/settings/integrations", permission: "integrations" },
  { icon: Sliders, label: "שדות מותאמים", href: "/settings/custom-fields", permission: "settings" },
  { icon: Plus, label: "תוספות למוצרים", href: "/settings/product-addons", permission: "settings" },
]

const superAdminItems = [
  { icon: Shield, label: "הגדרות PayPlus", href: "/admin/payplus", permission: "super_admin" },
  { icon: Mail, label: "הגדרות SendGrid", href: "/admin/sendgrid", permission: "super_admin" },
  { icon: DollarSign, label: "גביית עמלות", href: "/admin/commissions", permission: "super_admin" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [unreadCount, setUnreadCount] = useState(0)
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [loadingPermissions, setLoadingPermissions] = useState(true)
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)

  useEffect(() => {
    // נחכה שה-session יטען לפני שנבצע fetch
    if (status === 'authenticated') {
      fetchPermissions()
      fetchUnreadCount()
      fetchSubscriptionInfo()
    }
  }, [status])

  useEffect(() => {
    // רענון כל 30 שניות - רק אם מחובר
    if (status !== 'authenticated') return
    
    const interval = setInterval(() => {
      fetchUnreadCount()
      fetchSubscriptionInfo()
    }, 30000)
    return () => clearInterval(interval)
  }, [status])

  const fetchSubscriptionInfo = async () => {
    try {
      const response = await fetch('/api/subscriptions/check')
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

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/users/permissions')
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
          collections: true,
          gift_cards: true,
          abandoned_carts: true,
          pages: true,
          navigation: true,
          blog: true,
          reviews: true,
          returns: true,
          store_credits: true,
          bundles: true,
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
        collections: true,
        gift_cards: true,
        abandoned_carts: true,
        pages: true,
        navigation: true,
        blog: true,
        reviews: true,
        returns: true,
        store_credits: true,
        bundles: true,
        analytics: true,
        webhooks: true,
        settings: true,
        integrations: true,
        tracking_pixels: true,
      })
    } finally {
      setLoadingPermissions(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const notifications = await response.json()
        const unread = notifications.filter((n: any) => !n.isRead).length
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error('Error fetching notifications count:', error)
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

  return (
    <div className="w-64 h-screen bg-gradient-to-b from-gray-50 to-gray-100 border-l border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-center px-4 py-2">
        <Link href="/dashboard" className="flex items-center justify-center overflow-visible">
          <span 
            className="text-2xl font-pacifico prodify-gradient-text block" 
            style={{ letterSpacing: '2px', lineHeight: '1.5', paddingBottom: '4px' }}
          >
            Quick Shop
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Influencer Menu - Only for INFLUENCER role */}
        {(session as any)?.user?.role === "INFLUENCER" && (
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              משפיען/ית
            </h3>
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
                          ? "bg-purple-100 text-purple-700"
                          : "text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  )
                })}
            </nav>
          </div>
        )}

        {/* Primary Menu - Hidden only for INFLUENCER role (not SUPER_ADMIN) */}
        {(session as any)?.user?.role !== "INFLUENCER" && (
        <nav className="space-y-1">
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
                      ? "bg-purple-100 text-purple-700"
                      : "text-gray-700 hover:bg-gray-200",
                    (item as any).disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
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

        {/* Sales Section - Hidden for INFLUENCER role */}
        {(session as any)?.user?.role !== "INFLUENCER" && (
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            מכירות
          </h3>
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
                        ? "bg-purple-100 text-purple-700"
                        : "text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
          </nav>
        </div>
        )}

        {/* Marketing Section - Hidden for INFLUENCER role */}
        {(session as any)?.user?.role !== "INFLUENCER" && (
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            שיווק והנחות
          </h3>
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
                        ? "bg-purple-100 text-purple-700"
                        : "text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
          </nav>
        </div>
        )}

        {/* Content Section - Hidden for INFLUENCER role */}
        {(session as any)?.user?.role !== "INFLUENCER" && (
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            תוכן
          </h3>
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
                        ? "bg-purple-100 text-purple-700"
                        : "text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
          </nav>
        </div>
        )}

        {/* Customer Service Section - Hidden for INFLUENCER role */}
        {(session as any)?.user?.role !== "INFLUENCER" && (
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            שירות לקוחות
          </h3>
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
                        ? "bg-purple-100 text-purple-700"
                        : "text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
          </nav>
        </div>
        )}

        {/* Products Section - Hidden for INFLUENCER role */}
        {(session as any)?.user?.role !== "INFLUENCER" && (
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            מוצרים נוספים
          </h3>
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
                        ? "bg-purple-100 text-purple-700"
                        : "text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
          </nav>
        </div>
        )}

        {/* System Section - Hidden for INFLUENCER role */}
        {(session as any)?.user?.role !== "INFLUENCER" && (
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            מערכת
          </h3>
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
                        ? "bg-purple-100 text-purple-700"
                        : "text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
          </nav>
        </div>
        )}

        {/* Settings Section - Hidden for INFLUENCER role */}
        {(session as any)?.user?.role !== "INFLUENCER" && (
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            הגדרות
          </h3>
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
                    <span>{item.label}</span>
                  </Link>
                )
              })}
          </nav>
        </div>
        )}

        {/* Super Admin Section - Only for SUPER_ADMIN */}
        {(session as any)?.user?.role === "SUPER_ADMIN" && (
          <div className="mt-6">
            <h3 className="px-3 text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
              Super Admin
            </h3>
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
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Section - Trial Period */}
      <div className="p-4 border-t border-gray-200">
        <div className="rounded-xl p-4 text-white text-sm" style={{
          background: 'linear-gradient(135deg, #6f65e2 0%, #b965e2 100%)'
        }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="font-pacifico text-lg" style={{ letterSpacing: '1px' }}>Quick Shop</span>
          </div>
          <p className="text-white/80 text-xs mb-3">
            מערכת ליצירה וניהול חנויות אונליין
          </p>
          {subscriptionInfo && subscriptionInfo.isTrial && subscriptionInfo.daysRemaining !== undefined && (
            <div className="mb-3 pb-3 border-b border-white/20">
              <p className="text-white/90 text-xs font-medium mb-1">
                {subscriptionInfo.daysRemaining > 0 ? (
                  <>
                    נותרו לך <span className="font-bold text-white">{subscriptionInfo.daysRemaining}</span> ימי נסיון
                  </>
                ) : (
                  <span className="text-red-200">תקופת הנסיון הסתיימה</span>
                )}
              </p>
              {subscriptionInfo.daysRemaining <= 3 && subscriptionInfo.daysRemaining > 0 && (
                <p className="text-yellow-200 text-xs">
                  ⚠️ הזמן נגמר בקרוב!
                </p>
              )}
            </div>
          )}
          <button 
            onClick={() => window.location.href = '/settings?tab=subscription'}
            className="w-full bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            תקופת הנסיון
          </button>
        </div>
      </div>
    </div>
  )
}

