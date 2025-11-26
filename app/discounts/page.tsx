"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Tag, Search, Plus, Calendar, Zap, Percent, DollarSign, Edit, Trash2, Power, PowerOff } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { DiscountsSkeleton } from "@/components/skeletons/DiscountsSkeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  const { selectedShop, shops, loading: shopLoading } = useShop()
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedDiscounts, setSelectedDiscounts] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    // טען גם אם אין חנות נבחרת (נשתמש בחנות הראשונה)
    if (!shopLoading) {
      fetchDiscounts()
    }
  }, [selectedShop, shops, shopLoading])

  useEffect(() => {
    // איפוס בחירות כשמשנים פילטרים
    setSelectedDiscounts([])
  }, [search, typeFilter, statusFilter])

  const fetchDiscounts = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) return

    setLoading(true)
    try {
      const response = await fetch(`/api/discounts?shopId=${shopToUse.id}`)
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

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/discounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: currentStatus ? "ההנחה כובתה בהצלחה" : "ההנחה הופעלה בהצלחה",
        })
        fetchDiscounts()
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לעדכן את סטטוס ההנחה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error toggling discount status:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון סטטוס ההנחה",
        variant: "destructive",
      })
    }
  }

  const toggleSelectAll = () => {
    if (selectedDiscounts.length === filteredDiscounts.length) {
      setSelectedDiscounts([])
    } else {
      setSelectedDiscounts(filteredDiscounts.map(d => d.id))
    }
  }

  const toggleSelectDiscount = (discountId: string) => {
    setSelectedDiscounts(prev =>
      prev.includes(discountId)
        ? prev.filter(id => id !== discountId)
        : [...prev, discountId]
    )
  }

  const handleBulkDelete = async () => {
    const count = selectedDiscounts.length
    if (!confirm(`האם אתה בטוח שברצונך למחוק ${count} הנחות?`)) {
      return
    }

    setIsDeleting(true)
    try {
      for (const discountId of selectedDiscounts) {
        const response = await fetch(`/api/discounts/${discountId}`, {
          method: "DELETE",
        })
        if (!response.ok) {
          throw new Error(`Failed to delete discount ${discountId}`)
        }
      }
      setSelectedDiscounts([])
      toast({
        title: "הצלחה",
        description: `${count} הנחות נמחקו בהצלחה`,
      })
      fetchDiscounts()
    } catch (error) {
      console.error("Error deleting discounts:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת ההנחות",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את ההנחה?")) return

    try {
      const response = await fetch(`/api/discounts/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "ההנחה נמחקה בהצלחה",
        })
        fetchDiscounts()
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו למחוק את ההנחה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting discount:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת ההנחה",
        variant: "destructive",
      })
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
  // אם אין חנות נבחרת, נשתמש בחנות הראשונה
  const shopToUse = selectedShop || shops[0]
  
  if (!shopToUse && !shopLoading) {
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
          <div className="flex gap-2">
            {selectedDiscounts.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחק {selectedDiscounts.length} נבחרו
              </Button>
            )}
            <Button
              onClick={() => router.push("/discounts/new")}
              className="prodify-gradient text-white"
            >
              <Plus className="w-4 h-4 ml-2" />
              הנחה חדשה
            </Button>
          </div>
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
          <DiscountsSkeleton />
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
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-right">
                        <Checkbox
                          checked={selectedDiscounts.length === filteredDiscounts.length && filteredDiscounts.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        שם ההנחה
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        סוג
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        ערך
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        שימושים
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        תאריכים
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        סטטוס
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        פעולות
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredDiscounts.map((discount) => (
                      <tr key={discount.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <Checkbox
                            checked={selectedDiscounts.includes(discount.id)}
                            onCheckedChange={() => toggleSelectDiscount(discount.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{discount.title}</span>
                            {discount.isAutomatic && (
                              <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                                <Zap className="w-3 h-3 ml-1" />
                                אוטומטי
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {discount.type === "PERCENTAGE" ? (
                              <Percent className="w-4 h-4 text-emerald-600" />
                            ) : discount.type === "FIXED" ? (
                              <DollarSign className="w-4 h-4 text-emerald-600" />
                            ) : null}
                            <span className="text-sm">{getTypeLabel(discount.type)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium">
                            {discount.type === "PERCENTAGE"
                              ? `${discount.value}%`
                              : discount.type === "FIXED"
                              ? `₪${discount.value.toFixed(2)}`
                              : "-"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">
                            {discount.usedCount}
                            {discount.maxUses ? ` / ${discount.maxUses}` : ""}
                          </span>
                        </td>
                        <td className="p-4">
                          {discount.startDate && discount.endDate ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {format(new Date(discount.startDate), "dd/MM/yyyy", { locale: he })} -{" "}
                              {format(new Date(discount.endDate), "dd/MM/yyyy", { locale: he })}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">ללא תאריכים</span>
                          )}
                        </td>
                        <td className="p-4">
                          {discount.isActive ? (
                            <Badge className="bg-green-100 text-green-800">פעיל</Badge>
                          ) : (
                            <Badge variant="secondary">לא פעיל</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <span>⋯</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-[160px]">
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(discount.id, discount.isActive)}
                                className="flex flex-row-reverse items-center gap-2 cursor-pointer"
                              >
                                {discount.isActive ? (
                                  <>
                                    <PowerOff className="w-4 h-4 flex-shrink-0" />
                                    כבה
                                  </>
                                ) : (
                                  <>
                                    <Power className="w-4 h-4 flex-shrink-0" />
                                    הפעל
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/discounts/${discount.id}/edit`)
                                }
                                className="flex flex-row-reverse items-center gap-2 cursor-pointer"
                              >
                                <Edit className="w-4 h-4 flex-shrink-0" />
                                ערוך
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(discount.id)}
                                className="text-red-600 flex flex-row-reverse items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 flex-shrink-0" />
                                מחק
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

