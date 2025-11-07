"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Tag, Search, Plus, Calendar, Zap, Percent, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { DiscountsSkeleton } from "@/components/skeletons/DiscountsSkeleton"

interface Discount {
  id: string
  title: string
  type: string
  value: number
  isActive: boolean
  isAutomatic: boolean
  startDate: string | null
  endDate: string | null
  usedCount: number
  maxUses: number | null
  createdAt: string
}

export default function DiscountsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop, loading: shopLoading } = useShop()
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    if (selectedShop && !shopLoading) {
      fetchDiscounts()
    }
  }, [selectedShop, shopLoading])

  const fetchDiscounts = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/discounts?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setDiscounts(data)
      }
    } catch (error) {
      console.error("Error fetching discounts:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את ההנחות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PERCENTAGE: "אחוז",
      FIXED: "סכום קבוע",
      BUY_X_GET_Y: "קנה X קבל Y",
      VOLUME_DISCOUNT: "הנחת כמות",
      NTH_ITEM_DISCOUNT: "הנחה על מוצר N",
    }
    return labels[type] || type
  }

  const filteredDiscounts = discounts.filter((discount) => {
    const matchesSearch = discount.title.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === "all" || discount.type === typeFilter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && discount.isActive) ||
      (statusFilter === "inactive" && !discount.isActive) ||
      (statusFilter === "automatic" && discount.isAutomatic)
    return matchesSearch && matchesType && matchesStatus
  })

  // אם עדיין טוען את החנויות, הצג skeleton
  // חשוב: נציג skeleton כל עוד shopLoading הוא true, גם אם selectedShop עדיין null
  if (shopLoading) {
    return (
      <AppLayout title="הנחות">
        <DiscountsSkeleton />
      </AppLayout>
    )
  }

  // אם אין חנות נבחרת אחרי שהטעינה הסתיימה, זה אומר שאין חנויות
  // רק אם shopLoading הוא false ו-selectedShop הוא null, אז נציג את ההודעה
  if (!selectedShop && !shopLoading) {
    return (
      <AppLayout title="הנחות">
        <div className="text-center py-12">
          <Tag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות זמינה
          </h3>
          <p className="text-gray-600">
            יש ליצור חנות לפני ניהול הנחות
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="הנחות">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">הנחות</h1>
            <p className="text-gray-600 mt-1">
              נהל הנחות אוטומטיות וקופונים
            </p>
          </div>
          <Button
            onClick={() => router.push("/discounts/new")}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            הנחה חדשה
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="חיפוש לפי שם..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="סוג הנחה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  <SelectItem value="PERCENTAGE">אחוז</SelectItem>
                  <SelectItem value="FIXED">סכום קבוע</SelectItem>
                  <SelectItem value="BUY_X_GET_Y">קנה X קבל Y</SelectItem>
                  <SelectItem value="VOLUME_DISCOUNT">הנחת כמות</SelectItem>
                  <SelectItem value="NTH_ITEM_DISCOUNT">הנחה על מוצר N</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="active">פעיל</SelectItem>
                  <SelectItem value="inactive">לא פעיל</SelectItem>
                  <SelectItem value="automatic">אוטומטי</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Discounts List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="h-6 w-32 bg-gray-200 rounded flex-1"></div>
                    <div className="flex flex-col gap-2">
                      <div className="h-5 w-16 bg-gray-200 rounded"></div>
                      <div className="h-5 w-20 bg-gray-200 rounded"></div>
                    </div>
                  </div>

                  {/* Type and Value */}
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-20 bg-gray-200 rounded"></div>
                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  </div>

                  {/* Usage */}
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-16 bg-gray-200 rounded"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-2">
                    <div className="h-9 flex-1 bg-gray-200 rounded"></div>
                    <div className="h-9 flex-1 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredDiscounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Tag className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">אין הנחות</p>
              <Button
                onClick={() => router.push("/discounts/new")}
                className="prodify-gradient text-white"
              >
                <Plus className="w-4 h-4 ml-2" />
                צור הנחה ראשונה
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDiscounts.map((discount) => (
              <Card key={discount.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex-1">{discount.title}</CardTitle>
                    <div className="flex flex-col gap-1 items-center">
                      {discount.isAutomatic && (
                        <Badge className="bg-purple-100 text-purple-800">
                          <Zap className="w-3 h-3 ml-1" />
                          אוטומטי
                        </Badge>
                      )}
                      {discount.isActive ? (
                        <Badge className="bg-green-100 text-green-800">פעיל</Badge>
                      ) : (
                        <Badge variant="secondary">לא פעיל</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Badge variant="outline">{getTypeLabel(discount.type)}</Badge>
                    {discount.type === "PERCENTAGE" && (
                      <span className="mr-2 font-bold text-purple-600">
                        {discount.value}%
                      </span>
                    )}
                    {discount.type === "FIXED" && (
                      <span className="mr-2 font-bold text-purple-600">
                        ₪{discount.value.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {discount.startDate && discount.endDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(discount.startDate), "dd/MM/yyyy", { locale: he })} -{" "}
                      {format(new Date(discount.endDate), "dd/MM/yyyy", { locale: he })}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">שימושים:</span>
                    <span className="font-medium">
                      {discount.usedCount}
                      {discount.maxUses && ` / ${discount.maxUses}`}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/discounts/${discount.id}/edit`)}
                    >
                      ערוך
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/discounts/${discount.id}`)}
                    >
                      צפה
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

