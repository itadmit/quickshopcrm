"use client"

import { useState, useEffect } from "react"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  DollarSign,
  Calendar,
} from "lucide-react"

interface Analytics {
  sales: {
    today: number
    week: number
    month: number
    year: number
    chart: Array<{ date: string; value: number }>
  }
  orders: {
    total: number
    new: number
    pending: number
    conversionRate: number
  }
  customers: {
    new: number
    returning: number
    averageOrderValue: number
  }
  products: {
    topProducts: Array<{
      id: string
      name: string
      sales: number
      revenue: number
    }>
    lowStock: number
    notSelling: number
  }
}

export default function AnalyticsPage() {
  const { selectedShop } = useShop()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("month")
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  useEffect(() => {
    if (selectedShop) {
      fetchAnalytics()
    }
  }, [selectedShop, timeRange])

  const fetchAnalytics = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      // TODO: Implement analytics API
      // const response = await fetch(`/api/analytics?shopId=${selectedShop.id}&timeRange=${timeRange}`)
      // if (response.ok) {
      //   const data = await response.json()
      //   setAnalytics(data)
      // }
      
      // Mock data for now
      setAnalytics({
        sales: {
          today: 0,
          week: 0,
          month: 0,
          year: 0,
          chart: [],
        },
        orders: {
          total: 0,
          new: 0,
          pending: 0,
          conversionRate: 0,
        },
        customers: {
          new: 0,
          returning: 0,
          averageOrderValue: 0,
        },
        products: {
          topProducts: [],
          lowStock: 0,
          notSelling: 0,
        },
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedShop) {
    return (
      <AppLayout title="אנליטיקה">
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">
            יש לבחור חנות מההדר לפני צפייה באנליטיקה
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="אנליטיקה ודוחות">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">אנליטיקה ודוחות</h1>
            <p className="text-gray-600 mt-1">צפה בנתונים וסטטיסטיקות של החנות</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">היום</SelectItem>
              <SelectItem value="week">השבוע</SelectItem>
              <SelectItem value="month">החודש</SelectItem>
              <SelectItem value="year">השנה</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sales Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">מכירות היום</CardTitle>
              <DollarSign className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ₪{analytics?.sales.today.toFixed(2) || "0.00"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">מכירות השבוע</CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ₪{analytics?.sales.week.toFixed(2) || "0.00"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">מכירות החודש</CardTitle>
              <Calendar className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ₪{analytics?.sales.month.toFixed(2) || "0.00"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">מכירות השנה</CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ₪{analytics?.sales.year.toFixed(2) || "0.00"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders & Customers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                הזמנות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">סה"כ הזמנות</span>
                <span className="font-bold">{analytics?.orders.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">הזמנות חדשות</span>
                <span className="font-bold">{analytics?.orders.new || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">הזמנות ממתינות</span>
                <span className="font-bold">{analytics?.orders.pending || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">שיעור המרה</span>
                <span className="font-bold">
                  {analytics?.orders.conversionRate.toFixed(2) || "0.00"}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                לקוחות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">לקוחות חדשים</span>
                <span className="font-bold">{analytics?.customers.new || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">לקוחות חוזרים</span>
                <span className="font-bold">{analytics?.customers.returning || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ערך הזמנה ממוצע</span>
                <span className="font-bold">
                  ₪{analytics?.customers.averageOrderValue.toFixed(2) || "0.00"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              מוצרים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">מלאי נמוך</div>
                <div className="text-2xl font-bold">{analytics?.products.lowStock || 0}</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">לא נמכרים</div>
                <div className="text-2xl font-bold">{analytics?.products.notSelling || 0}</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">מוצרים פופולריים</h3>
              {analytics?.products.topProducts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">אין נתונים</p>
              ) : (
                <div className="space-y-2">
                  {analytics?.products.topProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">#{index + 1}</span>
                        <span className="font-medium">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          {product.sales} מכירות
                        </span>
                        <span className="font-bold">₪{product.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

