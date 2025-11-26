"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  Loader2,
  FileText,
  Calendar,
  ArrowRight,
} from "lucide-react"
import { DateRangePicker } from "@/components/ui/date-range-picker"

interface TrafficSourcesReport {
  summary: {
    trackedRevenue: number
    totalRevenue: number
    trackedOrders: number
    totalOrders: number
    trackedRevenuePercent: number
    trackedOrdersPercent: number
  }
  trafficSourcesReport: Array<{
    id: string
    name: string
    uniqueId: string
    medium: string | null
    campaign: string | null
    orders: number
    revenue: number
    avgOrder: number
  }>
  utmReport: Array<{
    source: string
    medium: string
    campaign: string
    orders: number
    revenue: number
    avgOrder: number
  }>
}

export default function TrafficSourcesReportsPage() {
  const router = useRouter()
  const { selectedShop } = useShop()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<TrafficSourcesReport | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    if (selectedShop) {
      // הגדרת תאריכים ברירת מחדל (30 יום אחרונים)
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      setEndDate(end.toISOString().split("T")[0])
      setStartDate(start.toISOString().split("T")[0])
    }
  }, [selectedShop])

  useEffect(() => {
    if (selectedShop && startDate && endDate) {
      fetchReport()
    }
  }, [selectedShop, startDate, endDate])

  const fetchReport = async () => {
    if (!selectedShop) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("shopId", selectedShop.id)
      params.append("startDate", startDate)
      params.append("endDate", endDate)

      const response = await fetch(`/api/traffic-sources/reports?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setReport(data)
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את הדוח",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching report:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הדוח",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!selectedShop) {
    return (
      <AppLayout>
        <div className="p-6">
          <p className="text-gray-500">נא לבחור חנות</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/traffic-sources")}
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                חזרה לדשבורד
              </Button>
            </div>
            <h1 className="text-3xl font-bold">מקורות תנועה</h1>
            <p className="text-gray-500 mt-1">
              מעקב אחר מקורות התנועה והפניות לאתר
            </p>
          </div>
        </div>

        {/* Date Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium">סינון תאריכים</span>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={(date) => {
                  setStartDate(date)
                }}
                onEndDateChange={(date) => {
                  setEndDate(date)
                }}
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="p-12">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              </div>
            </CardContent>
          </Card>
        ) : report ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        הכנסות ממקורות מעקב
                      </p>
                      <p className="text-2xl font-bold">
                        ₪{report.summary.trackedRevenue.toFixed(2)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">סה"כ הכנסות</p>
                      <p className="text-2xl font-bold">
                        ₪{report.summary.totalRevenue.toFixed(2)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        הזמנות ממקורות מעקב
                      </p>
                      <p className="text-2xl font-bold">
                        {report.summary.trackedOrders}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">סה"כ הזמנות</p>
                      <p className="text-2xl font-bold">
                        {report.summary.totalOrders}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Percentage Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="w-5 h-5" />
                  אחוזי הפניות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      אחוז הכנסות ממקורות מעקב
                    </span>
                    <span className="text-lg font-bold">
                      {report.summary.trackedRevenuePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(report.summary.trackedRevenuePercent, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      אחוז הזמנות ממקורות מעקב
                    </span>
                    <span className="text-lg font-bold">
                      {report.summary.trackedOrdersPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(report.summary.trackedOrdersPercent, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Traffic Sources Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  דוח מקורות תנועה מפורט
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.trafficSourcesReport.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    אין נתונים לתקופה הנבחרת
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            מקור תנועה
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            קוד ייחודי
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            מקור
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            מדיום
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            קמפיין
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            הזמנות
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            הכנסות
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            ממוצע הזמנה
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {report.trafficSourcesReport.map((source) => (
                          <tr key={source.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">
                              {source.name}
                            </td>
                            <td className="px-6 py-4">
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {source.uniqueId}
                              </code>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {source.uniqueId}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {source.medium || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {source.campaign || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                              {source.orders}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                              ₪{source.revenue.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                              ₪{source.avgOrder.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* UTM Detailed Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  דוח UTM מפורט (כל ההפניות)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.utmReport.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    אין נתונים לתקופה הנבחרת
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            מקור (UTM SOURCE)
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            מדיום (UTM MEDIUM)
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            קמפיין (UTM CAMPAIGN)
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            הזמנות
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            הכנסות
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            ממוצע הזמנה
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {report.utmReport.map((entry, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm">{entry.source}</td>
                            <td className="px-6 py-4 text-sm">{entry.medium}</td>
                            <td className="px-6 py-4 text-sm">{entry.campaign}</td>
                            <td className="px-6 py-4 text-sm font-medium">
                              {entry.orders}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                              ₪{entry.revenue.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                              ₪{entry.avgOrder.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}


