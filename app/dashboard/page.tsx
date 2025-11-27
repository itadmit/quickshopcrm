"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Store, Package, ShoppingBag, TrendingUp, CheckSquare, Calendar, Bell, Clock, AlertCircle, Circle, CheckCircle2, User, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { SalesChart } from "@/components/SalesChart"

interface Stats {
  shops: { total: number; active: number }
  products: { total: number; published: number }
  orders: { total: number; pending: number }
  revenue: { total: number; thisMonth: number }
  recentNotifications: Array<{
    id: string
    title: string
    message: string
    type: string
    isRead: boolean
    createdAt: string
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { selectedShop } = useShop()
  const t = useTranslations()
  const [stats, setStats] = useState<Stats>({
    shops: { total: 0, active: 0 },
    products: { total: 0, published: 0 },
    orders: { total: 0, pending: 0 },
    revenue: { total: 0, thisMonth: 0 },
    recentNotifications: [],
  })
  const [loading, setLoading] = useState(true)
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)

  // הפניית משפיענים לדשבורד שלהם
  useEffect(() => {
    if (session?.user?.role === "INFLUENCER") {
      router.push("/influencer")
    }
  }, [session, router])

  useEffect(() => {
    // טעינת הנתונים מיד - לא מחכים ל-session
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        } else {
          console.error('Failed to fetch stats')
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    async function fetchSubscription() {
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
        // console.error('Error fetching subscription:', error)
      }
    }
    
    // טעינה מיד - לא מחכים ל-session
    fetchStats()
    fetchSubscription()
  }, [])

  // הצגת skeleton רק בזמן טעינה ראשונית
  if (loading) {
    return (
      <AppLayout>
        <DashboardSkeleton />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="pb-24 md:pb-0">
      {/* Subscription Warning */}
      {subscriptionInfo && (subscriptionInfo.isExpiringSoon || !subscriptionInfo.isActive) && (
        <div className={`mb-6 rounded-lg border-2 p-4 ${
          !subscriptionInfo.isActive 
            ? 'bg-red-50 border-red-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              !subscriptionInfo.isActive ? 'text-red-600' : 'text-yellow-600'
            }`} />
            <div className="flex-1">
              <h3 className={`font-semibold mb-1 ${
                !subscriptionInfo.isActive ? 'text-red-900' : 'text-yellow-900'
              }`}>
                {!subscriptionInfo.isActive 
                  ? t('dashboard.subscription.expired')
                  : t('dashboard.subscription.expiringSoon')}
              </h3>
              <p className={`text-sm mb-3 ${
                !subscriptionInfo.isActive ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {!subscriptionInfo.isActive 
                  ? t('dashboard.subscription.expiredDescription')
                  : t('dashboard.subscription.expiringDescription', { days: subscriptionInfo.daysRemaining })}
              </p>
              <Button
                onClick={() => router.push('/settings?tab=subscription')}
                className={!subscriptionInfo.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                size="sm"
              >
                {!subscriptionInfo.isActive ? t('dashboard.subscription.renew') : t('dashboard.subscription.choosePlan')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mt-1">
              {t('dashboard.welcome.greeting', { name: session?.user?.name || t('dashboard.welcome.user') })}
            </h1>
            <h2 className="text-lg md:text-2xl mt-1" style={{
              background: 'linear-gradient(to left, #93f0e1, #6374c5)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'inline-block'
            }}>
              {t('dashboard.welcome.question')}
            </h2>
          </div>
          <div className="hidden md:flex gap-2">
            <Link href="/shops" prefetch={true}>
              <Button variant="outline">
                {t('dashboard.actions.createStore')}
              </Button>
            </Link>
            <Link href="/products" prefetch={true}>
              <Button variant="outline">
                {t('dashboard.actions.addProduct')}
              </Button>
            </Link>
            <Link href="/orders" prefetch={true}>
              <Button variant="outline">
                {t('dashboard.actions.viewOrders')}
              </Button>
            </Link>
            <Link href="/shops" prefetch={true}>
              <Button>
                {t('dashboard.actions.createStoreShort')}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6 mb-4 md:mb-8">
        <Link href="/shops" prefetch={true} className="block">
          <Card className="shadow-sm hover-lift cursor-pointer border-0 md:border">
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                <div className="flex items-center gap-2 md:flex-col md:items-start">
                  <Store className="h-4 w-4 md:h-5 md:w-5 text-emerald-600 flex-shrink-0" />
                  <CardTitle className="text-xs md:text-sm font-medium text-gray-600 md:text-gray-900 leading-tight">
                    {t('dashboard.stats.activeShops')}
                  </CardTitle>
                </div>
                <div className="mt-1 md:mt-2">
                  <div className="text-xl md:text-3xl font-bold text-right md:text-left">{stats.shops.active}</div>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1 text-right md:text-left">
                    סה"כ {stats.shops.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/products" prefetch={true} className="block">
          <Card className="shadow-sm hover-lift cursor-pointer border-0 md:border">
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                <div className="flex items-center gap-2 md:flex-col md:items-start">
                  <Package className="h-4 w-4 md:h-5 md:w-5 text-emerald-600 flex-shrink-0" />
                  <CardTitle className="text-xs md:text-sm font-medium text-gray-600 md:text-gray-900 leading-tight">
                    {t('dashboard.stats.activeProducts')}
                  </CardTitle>
                </div>
                <div className="mt-1 md:mt-2">
                  <div className="text-xl md:text-3xl font-bold text-right md:text-left">{stats.products.published}</div>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1 text-right md:text-left">
                    סה"כ {stats.products.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/orders" prefetch={true} className="block">
          <Card className="shadow-sm hover-lift cursor-pointer border-0 md:border">
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                <div className="flex items-center gap-2 md:flex-col md:items-start">
                  <ShoppingBag className="h-4 w-4 md:h-5 md:w-5 text-emerald-600 flex-shrink-0" />
                  <CardTitle className="text-xs md:text-sm font-medium text-gray-600 md:text-gray-900 leading-tight">
                    {t('dashboard.stats.pendingOrders')}
                  </CardTitle>
                </div>
                <div className="mt-1 md:mt-2">
                  <div className="text-xl md:text-3xl font-bold text-right md:text-left">{stats.orders.pending}</div>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1 text-right md:text-left">
                    סה"כ {stats.orders.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="shadow-sm hover-lift border-0 md:border">
          <CardContent className="p-3 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
              <div className="flex items-center gap-2 md:flex-col md:items-start">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-emerald-600 flex-shrink-0" />
                <CardTitle className="text-xs md:text-sm font-medium text-gray-600 md:text-gray-900 leading-tight">
                  {t('dashboard.stats.revenue')}
                </CardTitle>
              </div>
              <div className="mt-1 md:mt-2">
                <div className="text-xl md:text-3xl font-bold text-right md:text-left">
                  ₪{stats.revenue.thisMonth >= 1000 
                    ? (stats.revenue.thisMonth / 1000).toFixed(0) + 'K'
                    : stats.revenue.thisMonth.toFixed(0)}
                </div>
                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1 text-right md:text-left">
                  ₪{stats.revenue.total >= 1000 
                    ? (stats.revenue.total / 1000).toFixed(0) + 'K'
                    : stats.revenue.total.toFixed(0)} סה"כ
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart */}
      <div className="mb-4 md:mb-6">
        <SalesChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left Column - Quick Actions */}
        <div className="space-y-4 md:space-y-6">
          {/* Quick Actions Card */}
          <Card className="shadow-sm hover-lift hidden md:block">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-emerald-600" />
                  <CardTitle>{t('dashboard.quickActions.title')}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <Link href="/shops/new" prefetch={true} className="block">
                  <div className="p-3 md:p-4 border-0 md:border-2 md:border-gray-200 hover:border-emerald-300 rounded-xl md:rounded-lg cursor-pointer transition-all group shadow-sm md:shadow-none bg-white">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Store className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="font-semibold text-sm md:text-base text-gray-900">{t('dashboard.quickActions.createStore.title')}</h3>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 pr-12">
                      {t('dashboard.quickActions.createStore.description')}
                    </p>
                  </div>
                </Link>

                <Link 
                  href={selectedShop ? "/products/new" : "/products"} 
                  prefetch={true} 
                  className="block"
                >
                  <div className="p-3 md:p-4 border-0 md:border-2 md:border-gray-200 hover:border-blue-300 rounded-xl md:rounded-lg cursor-pointer transition-all group shadow-sm md:shadow-none bg-white">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-sm md:text-base text-gray-900">{t('dashboard.quickActions.addProducts.title')}</h3>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 pr-12">
                      {t('dashboard.quickActions.addProducts.description')}
                    </p>
                  </div>
                </Link>

                <Link href="/orders" prefetch={true} className="block">
                  <div className="p-3 md:p-4 border-0 md:border-2 md:border-gray-200 hover:border-green-300 rounded-xl md:rounded-lg cursor-pointer transition-all group shadow-sm md:shadow-none bg-white">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-sm md:text-base text-gray-900">{t('dashboard.quickActions.manageOrders.title')}</h3>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 pr-12">
                      {t('dashboard.quickActions.manageOrders.description')}
                    </p>
                  </div>
                </Link>

                <Link href="/settings" prefetch={true} className="block">
                  <div className="p-3 md:p-4 border-0 md:border-2 md:border-gray-200 hover:border-orange-300 rounded-xl md:rounded-lg cursor-pointer transition-all group shadow-sm md:shadow-none bg-white">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                      </div>
                      <h3 className="font-semibold text-sm md:text-base text-gray-900">{t('dashboard.quickActions.setupPayments.title')}</h3>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 pr-12">
                      {t('dashboard.quickActions.setupPayments.description')}
                    </p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Notifications */}
        <div className="space-y-4 md:space-y-6">
          {/* Notifications Card */}
          <Card className="shadow-sm hover-lift border-0 md:border">
            <CardHeader className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-600" />
                  <CardTitle>{t('dashboard.notifications.title')}</CardTitle>
                </div>
                <Link href="/notifications" prefetch={true}>
                  <Button 
                    variant="link" 
                    size="sm"
                    className="text-emerald-600 hover:text-emerald-700 p-0 h-auto font-normal"
                  >
                    {t('dashboard.notifications.seeAll')} ←
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recentNotifications.length === 0 ? (
                <div className="text-center py-6">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-4">
                    {t('dashboard.notifications.noNotifications')}
                  </p>
                  <Link href="/notifications" prefetch={true}>
                    <Button 
                      variant="outline" 
                      size="sm"
                    >
                      {t('dashboard.notifications.viewNotifications')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentNotifications.map(notif => {
                    const getNotifIcon = () => {
                      switch (notif.type) {
                        case 'shop': return Store
                        case 'product': return Package
                        case 'order': return ShoppingBag
                        default: return Bell
                      }
                    }
                    const NotifIcon = getNotifIcon()
                    return (
                      <Link 
                        key={notif.id}
                        href="/notifications" 
                        prefetch={true}
                        className={`block p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-r-2 ${notif.isRead ? 'border-gray-200 opacity-60' : 'border-emerald-500'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-full ${notif.isRead ? 'bg-gray-100' : 'bg-emerald-100'}`}>
                            <NotifIcon className={`w-3 h-3 ${notif.isRead ? 'text-gray-600' : 'text-emerald-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm mb-0.5">{notif.title}</div>
                            <div className="text-xs text-gray-600 truncate">{notif.message}</div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </AppLayout>
  )
}
