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
  const [stats, setStats] = useState<Stats>({
    shops: { total: 0, active: 0 },
    products: { total: 0, published: 0 },
    orders: { total: 0, pending: 0 },
    revenue: { total: 0, thisMonth: 0 },
    recentNotifications: [],
  })
  const [loading, setLoading] = useState(true)
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)

  useEffect(() => {
    // נחכה שה-session יטען לפני שנבצע fetch
    if (status !== 'authenticated') {
      setLoading(false)
      return
    }

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
    
    fetchStats()
    fetchSubscription()
  }, [status])

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
                  ? 'מנוי פג תוקף' 
                  : 'תקופת הנסיון מסתיימת בקרוב'}
              </h3>
              <p className={`text-sm mb-3 ${
                !subscriptionInfo.isActive ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {!subscriptionInfo.isActive 
                  ? 'המנוי שלך פג תוקף. אנא חידש את המנוי כדי להמשיך להשתמש במערכת.'
                  : `נותרו ${subscriptionInfo.daysRemaining} ימים לתקופת הנסיון. אנא בחר מסלול מנוי להמשך השימוש.`}
              </p>
              <Button
                onClick={() => router.push('/settings?tab=subscription')}
                className={!subscriptionInfo.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                size="sm"
              >
                {!subscriptionInfo.isActive ? 'חדש מנוי' : 'בחר מסלול מנוי'}
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
              שלום, {session?.user?.name || 'משתמש'}
            </h1>
            <h2 className="text-2xl mt-1" style={{
              background: 'linear-gradient(to left, #93f0e1, #6374c5)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'inline-block'
            }}>
              איך אני יכול לעזור לך היום?
            </h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/shops')}>
              צור חנות חדשה
            </Button>
            <Button variant="outline" onClick={() => router.push('/products')}>
              הוסף מוצר
            </Button>
            <Button variant="outline" onClick={() => router.push('/orders')}>
              צפה בהזמנות
            </Button>
            <Button onClick={() => router.push('/shops')}>
              + צור חנות
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-sm hover-lift cursor-pointer" onClick={() => router.push('/shops')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">חנויות פעילות</CardTitle>
            <Store className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.shops.active}</div>
            <p className="text-xs text-gray-500 mt-1">
              סה״כ {stats.shops.total} חנויות במערכת
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover-lift cursor-pointer" onClick={() => router.push('/products')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">מוצרים פעילים</CardTitle>
            <Package className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.products.published}</div>
            <p className="text-xs text-gray-500 mt-1">
              סה״כ {stats.products.total} מוצרים
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover-lift cursor-pointer" onClick={() => router.push('/orders')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">הזמנות ממתינות</CardTitle>
            <ShoppingBag className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.orders.pending}</div>
            <p className="text-xs text-gray-500 mt-1">
              סה״כ {stats.orders.total} הזמנות
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">הכנסות</CardTitle>
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
                : stats.revenue.total.toFixed(0)} סה״כ
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
                  <CardTitle>פעולות מהירות</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className="p-4 border-2 border-gray-200 hover:border-purple-300 rounded-lg cursor-pointer transition-all group"
                  onClick={() => router.push('/shops/new')}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Store className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">צרו חנות חדשה</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    התחילו עם תבנית מוכנה או צרו מאפס
                  </p>
                </div>

                <div 
                  className="p-4 border-2 border-gray-200 hover:border-blue-300 rounded-lg cursor-pointer transition-all group"
                  onClick={() => {
                    if (selectedShop) {
                      router.push('/products/new')
                    } else {
                      router.push('/products')
                    }
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">הוסיפו מוצרים</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    התחילו למכור עם קטלוג מוצרים מקצועי
                  </p>
                </div>

                <div 
                  className="p-4 border-2 border-gray-200 hover:border-green-300 rounded-lg cursor-pointer transition-all group"
                  onClick={() => router.push('/orders')}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ShoppingBag className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">נהלו הזמנות</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    צפו וטפלו בהזמנות שלכם
                  </p>
                </div>

                <div 
                  className="p-4 border-2 border-gray-200 hover:border-orange-300 rounded-lg cursor-pointer transition-all group"
                  onClick={() => router.push('/settings')}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">הגדירו תשלומים</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    חברו את שיטת התשלום שלכם
                  </p>
                </div>
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
                <CardTitle>סטטיסטיקות מהירות</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">חנויות פעילות</span>
                  <span className="text-lg font-bold text-purple-600">
                    {stats.shops.active}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">מוצרים פעילים</span>
                  <span className="text-lg font-bold text-blue-600">
                    {stats.products.published}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">הזמנות ממתינות</span>
                  <span className="text-lg font-bold text-cyan-600">
                    {stats.orders.pending}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">הכנסות החודש</span>
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
                  <CardTitle>התראות אחרונות</CardTitle>
                </div>
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => router.push('/notifications')}
                  className="text-purple-600 hover:text-purple-700 p-0 h-auto font-normal"
                >
                  ראה הכל ←
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recentNotifications.length === 0 ? (
                <div className="text-center py-6">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-4">
                    אין התראות חדשות
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/notifications')}
                  >
                    ראה התראות
                  </Button>
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
                      <div 
                        key={notif.id}
                        className={`p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-r-2 ${notif.isRead ? 'border-gray-200 opacity-60' : 'border-purple-500'}`}
                        onClick={() => router.push('/notifications')}
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
                      </div>
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
