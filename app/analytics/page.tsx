"use client"

import { useState, useEffect } from "react"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  DollarSign,
  Calendar,
  Download,
  Eye,
  FileText,
  RotateCcw,
  Tag,
  Star,
  Megaphone,
  CreditCard,
  Truck,
  Crown,
  ShoppingCart,
  Columns,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"

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

type ReportType =
  | "sales"
  | "orders"
  | "customers"
  | "products"
  | "inventory"
  | "returns"
  | "coupons"
  | "discounts"
  | "reviews"
  | "marketing"
  | "payments"
  | "shipping"
  | "vip-customers"
  | "top-products"
  | "abandoned-carts"

interface ReportDefinition {
  type: ReportType
  label: string
  icon: any
  description: string
  defaultColumns: string[]
  availableColumns: Array<{ key: string; label: string }>
}

const REPORTS: ReportDefinition[] = [
  {
    type: "sales",
    label: "דוח מכירות",
    icon: DollarSign,
    description: "מכירות לפי תאריך",
    defaultColumns: ["date", "orderNumber", "customerName", "total", "paymentMethod"],
    availableColumns: [
      { key: "date", label: "תאריך" },
      { key: "orderNumber", label: "מספר הזמנה" },
      { key: "customerName", label: "שם לקוח" },
      { key: "customerEmail", label: "אימייל" },
      { key: "subtotal", label: "סה\"כ לפני מע\"מ" },
      { key: "tax", label: "מע\"מ" },
      { key: "shipping", label: "משלוח" },
      { key: "discount", label: "הנחה" },
      { key: "total", label: "סה\"כ" },
      { key: "paymentMethod", label: "אמצעי תשלום" },
      { key: "status", label: "סטטוס" },
      { key: "itemsCount", label: "מספר פריטים" },
    ],
  },
  {
    type: "orders",
    label: "דוח הזמנות",
    icon: ShoppingBag,
    description: "כל ההזמנות",
    defaultColumns: ["date", "orderNumber", "customerName", "total", "status"],
    availableColumns: [
      { key: "date", label: "תאריך" },
      { key: "orderNumber", label: "מספר הזמנה" },
      { key: "customerName", label: "שם לקוח" },
      { key: "customerEmail", label: "אימייל" },
      { key: "customerPhone", label: "טלפון" },
      { key: "status", label: "סטטוס" },
      { key: "paymentStatus", label: "סטטוס תשלום" },
      { key: "fulfillmentStatus", label: "סטטוס משלוח" },
      { key: "total", label: "סה\"כ" },
      { key: "paymentMethod", label: "אמצעי תשלום" },
      { key: "shippingMethod", label: "שיטת משלוח" },
      { key: "trackingNumber", label: "מספר מעקב" },
      { key: "couponCode", label: "קוד קופון" },
    ],
  },
  {
    type: "customers",
    label: "דוח לקוחות",
    icon: Users,
    description: "לקוחות חדשים וחוזרים",
    defaultColumns: ["date", "email", "firstName", "lastName", "totalSpent", "orderCount"],
    availableColumns: [
      { key: "date", label: "תאריך הרשמה" },
      { key: "email", label: "אימייל" },
      { key: "firstName", label: "שם פרטי" },
      { key: "lastName", label: "שם משפחה" },
      { key: "phone", label: "טלפון" },
      { key: "totalSpent", label: "סה\"כ הוצאה" },
      { key: "orderCount", label: "מספר הזמנות" },
      { key: "tier", label: "רמה" },
      { key: "isSubscribed", label: "רשום לניוזלטר" },
      { key: "ordersInPeriod", label: "הזמנות בתקופה" },
    ],
  },
  {
    type: "products",
    label: "דוח מוצרים",
    icon: Package,
    description: "מוצרים ומכירות",
    defaultColumns: ["name", "sku", "price", "inventoryQty", "status"],
    availableColumns: [
      { key: "name", label: "שם מוצר" },
      { key: "sku", label: "SKU" },
      { key: "price", label: "מחיר" },
      { key: "comparePrice", label: "מחיר לפני הנחה" },
      { key: "cost", label: "עלות" },
      { key: "inventoryQty", label: "כמות במלאי" },
      { key: "status", label: "סטטוס" },
      { key: "availability", label: "זמינות" },
      { key: "category", label: "קטגוריה" },
      { key: "totalSold", label: "סה\"כ נמכר" },
      { key: "totalRevenue", label: "סה\"כ הכנסה" },
      { key: "createdAt", label: "תאריך יצירה" },
    ],
  },
  {
    type: "inventory",
    label: "דוח מלאי",
    icon: Package,
    description: "מצב המלאי",
    defaultColumns: ["name", "sku", "inventoryQty", "lowStockAlert", "status"],
    availableColumns: [
      { key: "name", label: "שם מוצר" },
      { key: "sku", label: "SKU" },
      { key: "inventoryQty", label: "כמות במלאי" },
      { key: "lowStockAlert", label: "התראת מלאי נמוך" },
      { key: "status", label: "סטטוס" },
      { key: "availability", label: "זמינות" },
      { key: "category", label: "קטגוריה" },
      { key: "price", label: "מחיר" },
      { key: "cost", label: "עלות" },
    ],
  },
  {
    type: "returns",
    label: "דוח החזרות",
    icon: RotateCcw,
    description: "החזרות והחזרות כסף",
    defaultColumns: ["date", "orderNumber", "customerName", "status", "refundAmount"],
    availableColumns: [
      { key: "date", label: "תאריך" },
      { key: "orderNumber", label: "מספר הזמנה" },
      { key: "customerName", label: "שם לקוח" },
      { key: "customerEmail", label: "אימייל" },
      { key: "status", label: "סטטוס" },
      { key: "reason", label: "סיבה" },
      { key: "refundAmount", label: "סכום החזרה" },
      { key: "refundMethod", label: "שיטת החזרה" },
    ],
  },
  {
    type: "coupons",
    label: "דוח קופונים",
    icon: Tag,
    description: "שימוש בקופונים",
    defaultColumns: ["code", "type", "value", "usedCount", "isActive"],
    availableColumns: [
      { key: "code", label: "קוד" },
      { key: "type", label: "סוג" },
      { key: "value", label: "ערך" },
      { key: "usedCount", label: "מספר שימושים" },
      { key: "maxUses", label: "מקסימום שימושים" },
      { key: "startDate", label: "תאריך התחלה" },
      { key: "endDate", label: "תאריך סיום" },
      { key: "isActive", label: "פעיל" },
      { key: "influencer", label: "משפיען" },
    ],
  },
  {
    type: "discounts",
    label: "דוח הנחות",
    icon: Tag,
    description: "הנחות אוטומטיות",
    defaultColumns: ["title", "type", "value", "usedCount", "isActive"],
    availableColumns: [
      { key: "title", label: "כותרת" },
      { key: "type", label: "סוג" },
      { key: "value", label: "ערך" },
      { key: "target", label: "יעד" },
      { key: "usedCount", label: "מספר שימושים" },
      { key: "maxUses", label: "מקסימום שימושים" },
      { key: "startDate", label: "תאריך התחלה" },
      { key: "endDate", label: "תאריך סיום" },
      { key: "isActive", label: "פעיל" },
      { key: "isAutomatic", label: "אוטומטי" },
    ],
  },
  {
    type: "reviews",
    label: "דוח ביקורות",
    icon: Star,
    description: "ביקורות מוצרים",
    defaultColumns: ["date", "productName", "customerName", "rating", "isApproved"],
    availableColumns: [
      { key: "date", label: "תאריך" },
      { key: "productName", label: "שם מוצר" },
      { key: "customerName", label: "שם לקוח" },
      { key: "customerEmail", label: "אימייל" },
      { key: "rating", label: "דירוג" },
      { key: "title", label: "כותרת" },
      { key: "comment", label: "תגובה" },
      { key: "isApproved", label: "מאושר" },
      { key: "isVerified", label: "מאומת" },
      { key: "helpfulCount", label: "מספר עזר" },
    ],
  },
  {
    type: "marketing",
    label: "דוח שיווק",
    icon: Megaphone,
    description: "קמפיינים שיווקיים",
    defaultColumns: ["type", "name", "value", "usedCount", "date"],
    availableColumns: [
      { key: "type", label: "סוג" },
      { key: "name", label: "שם" },
      { key: "value", label: "ערך" },
      { key: "usedCount", label: "מספר שימושים" },
      { key: "date", label: "תאריך" },
    ],
  },
  {
    type: "payments",
    label: "דוח תשלומים",
    icon: CreditCard,
    description: "תשלומים והחזרות",
    defaultColumns: ["date", "orderNumber", "customerName", "total", "paymentMethod"],
    availableColumns: [
      { key: "date", label: "תאריך" },
      { key: "orderNumber", label: "מספר הזמנה" },
      { key: "customerName", label: "שם לקוח" },
      { key: "customerEmail", label: "אימייל" },
      { key: "total", label: "סה\"כ" },
      { key: "paymentMethod", label: "אמצעי תשלום" },
      { key: "paymentStatus", label: "סטטוס תשלום" },
      { key: "transactionId", label: "מספר עסקה" },
      { key: "paidAt", label: "תאריך תשלום" },
    ],
  },
  {
    type: "shipping",
    label: "דוח משלוחים",
    icon: Truck,
    description: "משלוחים ומעקב",
    defaultColumns: ["orderNumber", "customerName", "shippingMethod", "trackingNumber", "fulfillmentStatus"],
    availableColumns: [
      { key: "orderNumber", label: "מספר הזמנה" },
      { key: "customerName", label: "שם לקוח" },
      { key: "shippingMethod", label: "שיטת משלוח" },
      { key: "trackingNumber", label: "מספר מעקב" },
      { key: "shippedAt", label: "תאריך משלוח" },
      { key: "deliveredAt", label: "תאריך מסירה" },
      { key: "fulfillmentStatus", label: "סטטוס משלוח" },
      { key: "address", label: "כתובת" },
    ],
  },
  {
    type: "vip-customers",
    label: "דוח לקוחות VIP",
    icon: Crown,
    description: "לקוחות VIP ופרמיום",
    defaultColumns: ["email", "firstName", "lastName", "tier", "totalSpent", "orderCount"],
    availableColumns: [
      { key: "email", label: "אימייל" },
      { key: "firstName", label: "שם פרטי" },
      { key: "lastName", label: "שם משפחה" },
      { key: "phone", label: "טלפון" },
      { key: "tier", label: "רמה" },
      { key: "totalSpent", label: "סה\"כ הוצאה" },
      { key: "orderCount", label: "מספר הזמנות" },
      { key: "periodSpent", label: "הוצאה בתקופה" },
      { key: "periodOrders", label: "הזמנות בתקופה" },
    ],
  },
  {
    type: "top-products",
    label: "דוח מוצרים פופולריים",
    icon: TrendingUp,
    description: "מוצרים מובילים",
    defaultColumns: ["name", "sku", "price", "totalSold", "totalRevenue"],
    availableColumns: [
      { key: "name", label: "שם מוצר" },
      { key: "sku", label: "SKU" },
      { key: "price", label: "מחיר" },
      { key: "category", label: "קטגוריה" },
      { key: "totalSold", label: "סה\"כ נמכר" },
      { key: "totalRevenue", label: "סה\"כ הכנסה" },
      { key: "averageOrderValue", label: "ערך הזמנה ממוצע" },
    ],
  },
  {
    type: "abandoned-carts",
    label: "דוח עגלות נטושות",
    icon: ShoppingCart,
    description: "עגלות שלא הושלמו",
    defaultColumns: ["date", "customerEmail", "itemsCount", "total", "recovered"],
    availableColumns: [
      { key: "date", label: "תאריך" },
      { key: "customerEmail", label: "אימייל לקוח" },
      { key: "customerName", label: "שם לקוח" },
      { key: "itemsCount", label: "מספר פריטים" },
      { key: "total", label: "סה\"כ" },
      { key: "couponCode", label: "קוד קופון" },
      { key: "recovered", label: "שוחזר" },
    ],
  },
]

export default function AnalyticsPage() {
  const { selectedShop, loading: shopLoading } = useShop()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("month")
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  
  // דוחות
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [reportData, setReportData] = useState<any[]>([])
  const [reportLoading, setReportLoading] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [showReportViewer, setShowReportViewer] = useState(false)

  useEffect(() => {
    if (selectedShop) {
      fetchAnalytics()
      // הגדרת תאריכים ברירת מחדל (30 יום אחרונים)
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      setEndDate(end.toISOString().split("T")[0])
      setStartDate(start.toISOString().split("T")[0])
    }
  }, [selectedShop, timeRange])

  const fetchAnalytics = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
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

  const fetchReport = async (reportType: ReportType) => {
    if (!selectedShop) {
      toast({
        title: "שגיאה",
        description: "יש לבחור חנות",
        variant: "destructive",
      })
      return
    }

    const report = REPORTS.find((r) => r.type === reportType)
    if (!report) return

    // דוח מלאי לא צריך תאריכים
    const needsDates = reportType !== "inventory"
    if (needsDates && (!startDate || !endDate)) {
      toast({
        title: "שגיאה",
        description: "יש לבחור תאריכים",
        variant: "destructive",
      })
      return
    }

    // Validation של תאריכים
    if (needsDates && startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        toast({
          title: "שגיאה",
          description: "פורמט תאריך לא תקין",
          variant: "destructive",
        })
        return
      }
      
      if (start > end) {
        toast({
          title: "שגיאה",
          description: "תאריך התחלה חייב להיות לפני תאריך סיום",
          variant: "destructive",
        })
        return
      }
    }

    setReportLoading(true)
    try {
      const params = new URLSearchParams({
        shopId: selectedShop.id,
        reportType,
        ...(needsDates && { startDate, endDate }),
        columns: visibleColumns.length > 0 ? visibleColumns.join(",") : "",
      })

      const response = await fetch(`/api/reports?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data.data || [])
        setShowReportViewer(true)
        
        // אם אין עמודות נבחרות, נשתמש בברירת מחדל
        if (visibleColumns.length === 0) {
          setVisibleColumns(report.defaultColumns)
        }
        
        // הצגת אזהרה אם יש יותר נתונים
        if (data.hasMore) {
          toast({
            title: "התראה",
            description: `הדוח מכיל ${data.total} שורות, מוצגות ${data.returned} שורות בלבד`,
            variant: "default",
          })
        }
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא הצלחנו לטעון את הדוח",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error fetching report:", error)
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בטעינת הדוח",
        variant: "destructive",
      })
    } finally {
      setReportLoading(false)
    }
  }

  const downloadCSV = () => {
    if (reportData.length === 0) {
      toast({
        title: "שגיאה",
        description: "אין נתונים להורדה",
        variant: "destructive",
      })
      return
    }

    const report = REPORTS.find((r) => r.type === selectedReport)
    if (!report) return

    const columns = visibleColumns.length > 0 ? visibleColumns : report.defaultColumns
    if (columns.length === 0) {
      toast({
        title: "שגיאה",
        description: "יש לבחור לפחות עמודה אחת",
        variant: "destructive",
      })
      return
    }

    const headers = columns.map((col) => {
      const colDef = report.availableColumns.find((c) => c.key === col)
      return colDef?.label || col
    })

    const rows = reportData.map((row) =>
      columns.map((col) => {
        const value = row[col] ?? ""
        // טיפול בפסיקים וסימני מרכאות ב-CSV
        if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      })
    )

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n")

    try {
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      const dateStr = selectedReport === "inventory" 
        ? new Date().toISOString().split("T")[0]
        : `${startDate}_${endDate}`
      link.setAttribute("download", `${report.label}_${dateStr}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast({
        title: "הצלחה",
        description: "הדוח הורד בהצלחה",
      })
    } catch (error) {
      console.error("Error downloading CSV:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהורדת הקובץ",
        variant: "destructive",
      })
    }
  }

  const handleReportClick = (reportType: ReportType) => {
    setSelectedReport(reportType)
    const report = REPORTS.find((r) => r.type === reportType)
    if (report) {
      setVisibleColumns(report.defaultColumns)
    }
    fetchReport(reportType)
  }

  if (shopLoading) {
    return (
      <AppLayout title="אנליטיקה">
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">טוען נתונים...</h3>
          <p className="text-gray-600">אנא המתן</p>
        </div>
      </AppLayout>
    )
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

  const currentReport = selectedReport ? REPORTS.find((r) => r.type === selectedReport) : null

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
              <DollarSign className="h-5 w-5 text-emerald-600" />
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
              <TrendingUp className="h-5 w-5 text-emerald-600" />
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
              <Calendar className="h-5 w-5 text-emerald-600" />
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
              <TrendingUp className="h-5 w-5 text-emerald-600" />
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
            </div>
          </CardContent>
        </Card>

        {/* Reports Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              דוחות
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Date Selection - רק אם דוח נבחר וצריך תאריכים */}
            {selectedReport && selectedReport !== "inventory" && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      מתאריך
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full"
                      max={endDate || undefined}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      עד תאריך
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full"
                      min={startDate || undefined}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REPORTS.map((report) => {
                const Icon = report.icon
                return (
                  <button
                    key={report.type}
                    onClick={() => handleReportClick(report.type)}
                    disabled={reportLoading}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-right disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {report.label}
                        </h3>
                        <p className="text-sm text-gray-600">{report.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Report Viewer */}
            {showReportViewer && currentReport && (
              <div className="mt-6 border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{currentReport.label}</h3>
                    <p className="text-sm text-gray-600">
                      {reportData.length} שורות
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Columns className="w-4 h-4 ml-2" />
                          עמודות
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 max-h-96 overflow-y-auto">
                        {currentReport.availableColumns.map((column) => (
                          <DropdownMenuCheckboxItem
                            key={column.key}
                            checked={visibleColumns.includes(column.key)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setVisibleColumns([...visibleColumns, column.key])
                              } else {
                                setVisibleColumns(
                                  visibleColumns.filter((key) => key !== column.key)
                                )
                              }
                            }}
                            className="text-right"
                          >
                            {column.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setVisibleColumns(currentReport.defaultColumns)
                        if (selectedReport) {
                          fetchReport(selectedReport)
                        }
                      }}
                    >
                      <Eye className="w-4 h-4 ml-2" />
                      צפה
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={downloadCSV}
                      disabled={reportData.length === 0}
                    >
                      <Download className="w-4 h-4 ml-2" />
                      הורד CSV
                    </Button>
                  </div>
                </div>

                {reportLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                    <p className="text-gray-600 mt-4">טוען דוח...</p>
                  </div>
                ) : reportData.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">אין נתונים להצגה</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {visibleColumns.map((col) => {
                            const colDef = currentReport.availableColumns.find(
                              (c) => c.key === col
                            )
                            return (
                              <th
                                key={col}
                                className="text-right px-4 py-3 text-sm font-semibold text-gray-900 border-b"
                              >
                                {colDef?.label || col}
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {reportData.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {visibleColumns.map((col) => (
                              <td
                                key={col}
                                className="text-right px-4 py-3 text-sm text-gray-700"
                              >
                                {row[col] ?? "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
