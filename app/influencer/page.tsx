"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Tag,
  Copy,
  Check,
  ExternalLink,
  Package,
  BarChart3,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface InfluencerStats {
  coupons: Array<{
    id: string
    code: string
    type: string
    value: number
    usedCount: number
    maxUses: number | null
    isActive: boolean
    startDate: Date | null
    endDate: Date | null
    shop: {
      id: string
      name: string
      slug: string
    }
  }>
  totalOrders: number
  totalRevenue: number
  totalDiscount: number
  averageOrderValue: number
  orders: Array<any>
  topProducts: Array<{
    id: string
    name: string
    image: string | null
    quantitySold: number
    revenue: number
  }>
  monthlyChartData: Array<{
    month: string
    revenue: number
    orders: number
  }>
}

export default function InfluencerDashboard() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<InfluencerStats | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/influencer/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else if (response.status === 403) {
        toast({
          title: "שגיאה",
          description: "אין לך הרשאות לצפות בדף זה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הנתונים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, code: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(code)
      toast({
        title: "הועתק!",
        description: "הקישור הועתק ללוח",
      })
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן להעתיק",
        variant: "destructive",
      })
    }
  }

  const generateCouponLink = (coupon: any) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    return `${baseUrl}/shop/${coupon.shop.slug}?coupon=${coupon.code}`
  }

  if (loading) {
    return (
      <AppLayout title="דשבורד משפיען">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">טוען נתונים...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!stats) {
    return (
      <AppLayout title="דשבורד משפיען">
        <div className="text-center py-12">
          <Tag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין נתונים זמינים
          </h3>
          <p className="text-gray-600">
            לא נמצאו קופונים המשויכים אליך
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="דשבורד משפיען">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">דשבורד משפיען</h1>
          <p className="text-gray-600 mt-1">
            כל הנתונים והסטטיסטיקות שלך במקום אחד
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">סך הכנסות</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₪{(stats.totalRevenue || 0).toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">הזמנות</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.totalOrders}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ממוצע הזמנה</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₪{(stats.averageOrderValue || 0).toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">סך הנחות</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₪{(stats.totalDiscount || 0).toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Tag className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Coupons with Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              הקופונים שלי
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats.coupons || stats.coupons.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                עדיין אין לך קופונים משוייכים
              </p>
            ) : (
              <div className="space-y-4">
                {stats.coupons.map((coupon: any) => {
                  const link = generateCouponLink(coupon)
                  const isCopied = copiedCode === coupon.code

                  return (
                    <div
                      key={coupon.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {coupon.code}
                            </h3>
                            <Badge
                              className={coupon.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}
                              variant={coupon.isActive ? "outline" : "secondary"}
                            >
                              {coupon.isActive ? "פעיל" : "לא פעיל"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            חנות: {coupon.shop.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            שימושים: {coupon.usedCount}
                            {coupon.maxUses && ` / ${coupon.maxUses}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-600">
                            {coupon.type === "PERCENTAGE"
                              ? `${coupon.value}%`
                              : `₪${coupon.value}`}
                          </p>
                          <p className="text-xs text-gray-500">הנחה</p>
                        </div>
                      </div>

                      {/* Coupon Link */}
                      <div className="bg-gray-100 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          הלינק המקודד שלך:
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white border rounded px-3 py-2 text-sm text-gray-700 truncate font-mono">
                            {link}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(link, coupon.code)}
                            className="flex-shrink-0"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-4 h-4 ml-1" />
                                הועתק
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 ml-1" />
                                העתק
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(link, "_blank")}
                            className="flex-shrink-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          שתף את הלינק הזה עם הקהל שלך - הקופון יופעל אוטומטית
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        {stats.topProducts && stats.topProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                מוצרים מובילים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topProducts.map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 p-3 border rounded-lg"
                  >
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {product.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        נמכרו: {product.quantitySold} יחידות
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">
                        ₪{(product.revenue || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">הכנסות</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders */}
        {stats.orders && stats.orders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                הזמנות אחרונות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        מספר הזמנה
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        לקוח
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        קופון
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        סכום
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        הנחה
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        תאריך
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.orders.slice(0, 10).map((order: any) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {order.customerName}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <Badge variant="outline">{order.couponCode}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold">
                          ₪{(order.total || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-green-600">
                          -₪{(order.discount || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString("he-IL")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
