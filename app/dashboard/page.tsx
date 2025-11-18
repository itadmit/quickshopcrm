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
            <h1 className="text-4xl font-bold text-gray-900 mt-1">
              {t('dashboard.welcome.greeting', { name: session?.user?.name || t('dashboard.welcome.user') })}
            </h1>
            <h2 className="text-2xl mt-1" style={{
              background: 'linear-gradient(to left, #93f0e1, #6374c5)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'inline-block'
            }}>
              {t('dashboard.welcome.question')}
            </h2>
          </div>
          <div className="flex gap-2">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/shops" prefetch={true} className="block">
          <Card className="shadow-sm hover-lift cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.stats.activeShops')}</CardTitle>
              <Store className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.shops.active}</div>
              <p className="text-xs text-gray-500 mt-1">
                {t('dashboard.stats.totalShops', { count: stats.shops.total })}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/products" prefetch={true} className="block">
          <Card className="shadow-sm hover-lift cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.stats.activeProducts')}</CardTitle>
              <Package className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.products.published}</div>
              <p className="text-xs text-gray-500 mt-1">
                {t('dashboard.stats.totalProducts', { count: stats.products.total })}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/orders" prefetch={true} className="block">
          <Card className="shadow-sm hover-lift cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.stats.pendingOrders')}</CardTitle>
              <ShoppingBag className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.orders.pending}</div>
              <p className="text-xs text-gray-500 mt-1">
                {t('dashboard.stats.totalOrders', { count: stats.orders.total })}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.revenue')}</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₪{stats.revenue.thisMonth >= 1000 
                ? (stats.revenue.thisMonth / 1000).toFixed(0) + 'K'
                : stats.revenue.thisMonth.toFixed(0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ₪{stats.revenue.total >= 1000 
                ? (stats.revenue.total / 1000).toFixed(0) + 'K'
                : stats.revenue.total.toFixed(0)} {t('dashboard.stats.totalRevenue')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions Card */}
          <Card className="shadow-sm hover-lift">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-purple-600" />
                  <CardTitle>{t('dashboard.quickActions.title')}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/shops/new" prefetch={true} className="block">
                  <div className="p-4 border-2 border-gray-200 hover:border-purple-300 rounded-lg cursor-pointer transition-all group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Store className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{t('dashboard.quickActions.createStore.title')}</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('dashboard.quickActions.createStore.description')}
                    </p>
                  </div>
                </Link>

                <Link 
                  href={selectedShop ? "/products/new" : "/products"} 
                  prefetch={true} 
                  className="block"
                >
                  <div className="p-4 border-2 border-gray-200 hover:border-blue-300 rounded-lg cursor-pointer transition-all group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{t('dashboard.quickActions.addProducts.title')}</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('dashboard.quickActions.addProducts.description')}
                    </p>
                  </div>
                </Link>

                <Link href="/orders" prefetch={true} className="block">
                  <div className="p-4 border-2 border-gray-200 hover:border-green-300 rounded-lg cursor-pointer transition-all group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{t('dashboard.quickActions.manageOrders.title')}</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('dashboard.quickActions.manageOrders.description')}
                    </p>
                  </div>
                </Link>

                <Link href="/settings" prefetch={true} className="block">
                  <div className="p-4 border-2 border-gray-200 hover:border-orange-300 rounded-lg cursor-pointer transition-all group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{t('dashboard.quickActions.setupPayments.title')}</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('dashboard.quickActions.setupPayments.description')}
                    </p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Stats & Notifications */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="shadow-sm hover-lift">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <CardTitle>{t('dashboard.quickStats.title')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('dashboard.quickStats.activeShops')}</span>
                  <span className="text-lg font-bold text-purple-600">
                    {stats.shops.active}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('dashboard.quickStats.activeProducts')}</span>
                  <span className="text-lg font-bold text-blue-600">
                    {stats.products.published}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('dashboard.quickStats.pendingOrders')}</span>
                  <span className="text-lg font-bold text-cyan-600">
                    {stats.orders.pending}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('dashboard.quickStats.monthlyRevenue')}</span>
                  <span className="text-lg font-bold text-orange-600">
                    ₪{stats.revenue.thisMonth >= 1000 
                      ? (stats.revenue.thisMonth / 1000).toFixed(0) + 'K'
                      : stats.revenue.thisMonth.toFixed(0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card className="shadow-sm hover-lift">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-600" />
                  <CardTitle>{t('dashboard.notifications.title')}</CardTitle>
                </div>
                <Link href="/notifications" prefetch={true}>
                  <Button 
                    variant="link" 
                    size="sm"
                    className="text-purple-600 hover:text-purple-700 p-0 h-auto font-normal"
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
                        className={`block p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-r-2 ${notif.isRead ? 'border-gray-200 opacity-60' : 'border-purple-500'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-full ${notif.isRead ? 'bg-gray-100' : 'bg-purple-100'}`}>
                            <NotifIcon className={`w-3 h-3 ${notif.isRead ? 'text-gray-600' : 'text-purple-600'}`} />
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
    </AppLayout>
  )
}
