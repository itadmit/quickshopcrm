"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Tag,
  Calendar,
  Users,
  Percent,
  DollarSign,
} from "lucide-react"
import { CouponsSkeleton } from "@/components/skeletons/CouponsSkeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Coupon {
  id: string
  code: string
  type: "PERCENTAGE" | "FIXED"
  value: number
  minOrder: number | null
  maxDiscount: number | null
  maxUses: number | null
  usedCount: number
  usesPerCustomer: number | null
  startDate: string | null
  endDate: string | null
  isActive: boolean
  canCombine: boolean
  createdAt: string
  shop: {
    id: string
    name: string
  }
}

export default function CouponsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (selectedShop) {
      fetchCoupons()
    }
  }, [selectedShop])

  const fetchCoupons = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/coupons?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setCoupons(data)
      }
    } catch (error) {
      console.error("Error fetching coupons:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את הקופונים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הקופון?")) return

    try {
      const response = await fetch(`/api/coupons/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הקופון נמחק בהצלחה",
        })
        fetchCoupons()
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו למחוק את הקופון",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting coupon:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הקופון",
        variant: "destructive",
      })
    }
  }

  const handleDuplicate = async (coupon: Coupon) => {
    try {
      const response = await fetch(`/api/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: coupon.shop.id,
          code: `${coupon.code}-COPY`,
          type: coupon.type,
          value: coupon.value,
          minOrder: coupon.minOrder,
          maxDiscount: coupon.maxDiscount,
          maxUses: coupon.maxUses,
          usesPerCustomer: coupon.usesPerCustomer,
          startDate: coupon.startDate,
          endDate: coupon.endDate,
          isActive: coupon.isActive,
          applicableProducts: [],
          applicableCategories: [],
          applicableCustomers: [],
          canCombine: coupon.canCombine,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הקופון שוכפל בהצלחה",
        })
        fetchCoupons()
      }
    } catch (error) {
      console.error("Error duplicating coupon:", error)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "הועתק",
      description: "קוד הקופון הועתק ללוח",
    })
  }

  const getStatusBadge = (coupon: Coupon) => {
    if (!coupon.isActive) {
      return <Badge className="bg-gray-100 text-gray-800 rounded-md">לא פעיל</Badge>
    }

    const now = new Date()
    if (coupon.endDate && new Date(coupon.endDate) < now) {
      return <Badge className="bg-red-100 text-red-800 rounded-md">פג תוקף</Badge>
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return <Badge className="bg-yellow-100 text-yellow-800">נוצל</Badge>
    }

    return <Badge className="bg-green-100 text-green-800">פעיל</Badge>
  }

  const filteredCoupons = coupons.filter((coupon) =>
    coupon.code.toLowerCase().includes(search.toLowerCase())
  )

  if (!selectedShop) {
    return (
      <AppLayout title="קופונים">
        <div className="text-center py-12">
          <Tag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">
            יש לבחור חנות מההדר לפני ניהול קופונים
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="קופונים">
      <div className={`space-y-6 ${isMobile ? "pb-20" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">קופונים</h1>
            <p className="text-gray-600 mt-1">נהל את כל הקופונים וההנחות</p>
          </div>
          <Button
            onClick={() => router.push("/coupons/new")}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            קופון חדש
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="חיפוש לפי קוד קופון..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coupons List */}
        {loading ? (
          <CouponsSkeleton />
        ) : filteredCoupons.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Tag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2 prodify-gradient-text">אין קופונים</h3>
                <p className="text-gray-600 mb-4">
                  התחל ליצור את הקופון הראשון שלך
                </p>
                <Button
                  onClick={() => router.push("/coupons/new")}
                  className="prodify-gradient text-white"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  צור קופון חדש
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        קוד
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
                        תאריך תפוגה
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
                    {filteredCoupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {coupon.code}
                            </code>
                            <button
                              onClick={() => copyCode(coupon.code)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {coupon.type === "PERCENTAGE" ? (
                              <Percent className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <DollarSign className="w-4 h-4 text-emerald-600" />
                            )}
                            <span className="text-sm">
                              {coupon.type === "PERCENTAGE"
                                ? "אחוז"
                                : "סכום קבוע"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium">
                            {coupon.type === "PERCENTAGE"
                              ? `${coupon.value}%`
                              : `₪${coupon.value.toFixed(2)}`}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">
                            {coupon.usedCount}
                            {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                          </span>
                        </td>
                        <td className="p-4">
                          {coupon.endDate ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(coupon.endDate).toLocaleDateString(
                                "he-IL"
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">
                              ללא תאריך תפוגה
                            </span>
                          )}
                        </td>
                        <td className="p-4">{getStatusBadge(coupon)}</td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <span>⋯</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-[160px]">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/coupons/${coupon.id}/edit`)
                                }
                                className="flex flex-row-reverse items-center gap-2 cursor-pointer"
                              >
                                <Edit className="w-4 h-4 flex-shrink-0" />
                                ערוך
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(coupon)}
                                className="flex flex-row-reverse items-center gap-2 cursor-pointer"
                              >
                                <Copy className="w-4 h-4 flex-shrink-0" />
                                שכפל
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(coupon.id)}
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

