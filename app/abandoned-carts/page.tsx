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
import { TableSkeleton } from "@/components/skeletons/TableSkeleton"
import { ShoppingBag, Search, Mail, Calendar, DollarSign, Send, MoreVertical, Eye, Package } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { MobileListView, MobileListItem } from "@/components/MobileListView"
import { MobileFilters } from "@/components/MobileFilters"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AbandonedCart {
  id: string
  customerId: string | null
  customer: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  } | null
  items: any
  total: number
  abandonedAt: string
  recoveredAt: string | null
  expiresAt: string
}

export default function AbandonedCartsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop, loading: shopLoading } = useShop()
  const [carts, setCarts] = useState<AbandonedCart[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const isMobile = useMediaQuery("(max-width: 768px)")

  useEffect(() => {
    if (selectedShop) {
      fetchCarts()
    }
  }, [selectedShop])

  const fetchCarts = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/abandoned-carts?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setCarts(data)
      }
    } catch (error) {
      console.error("Error fetching abandoned carts:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את העגלות הנטושות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const sendRecoveryEmail = async (cartId: string) => {
    try {
      const response = await fetch(`/api/abandoned-carts/${cartId}/recover`, {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "אימייל שחזור נשלח בהצלחה",
        })
        fetchCarts()
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לשלוח אימייל שחזור",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending recovery email:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשליחת אימייל שחזור",
        variant: "destructive",
      })
    }
  }

  const calculateTotal = (items: any) => {
    if (!items || !Array.isArray(items)) return 0
    return items.reduce((sum: number, item: any) => sum + (item.price * item.quantity || 0), 0)
  }

  const filteredCarts = carts.filter((cart) => {
    if (!search) return true
    const email = cart.customer?.email || ""
    const name = `${cart.customer?.firstName || ""} ${cart.customer?.lastName || ""}`.trim()
    return (
      email.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase())
    )
  })

  // Convert carts to mobile list format
  const convertToMobileList = (): MobileListItem[] => {
    return filteredCarts.map((cart) => {
      const customerName = cart.customer
        ? `${cart.customer.firstName || ""} ${cart.customer.lastName || ""}`.trim() || "לקוח אורח"
        : "לקוח אורח"
      const customerEmail = cart.customer?.email || ""
      const total = calculateTotal(cart.items)
      const itemsCount = cart.items && Array.isArray(cart.items)
        ? cart.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
        : 0

      const metadata = [
        {
          label: "",
          value: format(new Date(cart.abandonedAt), "dd/MM/yyyy HH:mm", { locale: he }),
          icon: <Calendar className="w-3 h-3 text-gray-400" />,
        },
      ]

      if (customerEmail) {
        metadata.push({
          label: "",
          value: customerEmail,
          icon: <Mail className="w-3 h-3 text-gray-400" />,
        })
      }

      const actions = [
        {
          label: "שלח אימייל שחזור",
          icon: <Send className="w-4 h-4" />,
          onClick: () => sendRecoveryEmail(cart.id),
        },
      ]

      if (cart.customer) {
        actions.push({
          label: "צפה בפרופיל",
          icon: <Eye className="w-4 h-4" />,
          onClick: () => router.push(`/customers/${cart.customer!.id}`),
        })
      }

      return {
        id: cart.id,
        title: customerName,
        subtitle: customerEmail || "לקוח אורח",
        badge: cart.recoveredAt
          ? {
              text: "שוחזר",
              variant: "success" as const,
            }
          : undefined,
        price: `₪${total.toFixed(2)}`,
        metadata,
        badges: [
          {
            text: `${itemsCount} פריטים`,
            variant: "outline" as const,
          },
        ],
        actions,
        className: cart.recoveredAt ? 'bg-gray-50 opacity-75' : 'bg-gray-100',
      }
    })
  }

  // הצגת מסך טעינה בזמן שהנתונים נטענים מהשרת
  if (shopLoading) {
    return (
      <AppLayout title="עגלות נטושות">
        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 mx-auto text-gray-400 mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">טוען נתונים...</h3>
          <p className="text-gray-600">אנא המתן</p>
        </div>
      </AppLayout>
    )
  }

  if (!selectedShop) {
    return (
      <AppLayout title="עגלות נטושות">
        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">
            יש לבחור חנות מההדר לפני צפייה בעגלות נטושות
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="עגלות נטושות">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">עגלות נטושות</h1>
            <p className="text-gray-600 mt-1">
              נהל עגלות קניות שננטשו על ידי לקוחות
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">סה"כ עגלות נטושות</CardTitle>
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{carts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ערך כולל</CardTitle>
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ₪{carts.reduce((sum, cart) => sum + calculateTotal(cart.items), 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">שוחזרו</CardTitle>
              <Mail className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {carts.filter((c) => c.recoveredAt).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search - Desktop */}
        <Card className="hidden md:block">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="חיפוש לפי אימייל או שם לקוח..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Filters - Mobile */}
        <div className="md:hidden">
          <MobileFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="חפש עגלה נטושה..."
            isSearching={loading}
          />
        </div>

        {/* Carts List */}
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : filteredCarts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2 prodify-gradient-text">אין עגלות נטושות</h3>
              <p className="text-gray-600">עדיין לא ננטשו עגלות בחנות שלך</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          לקוח
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          תאריך נטישה
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          פריטים
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          סטטוס
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          סכום
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          פעולות
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCarts.map((cart) => {
                        const customerName = cart.customer
                          ? `${cart.customer.firstName || ""} ${cart.customer.lastName || ""}`.trim() || "לקוח אורח"
                          : "לקוח אורח"
                        const customerEmail = cart.customer?.email || ""
                        const total = calculateTotal(cart.items)
                        const itemsCount = cart.items && Array.isArray(cart.items)
                          ? cart.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
                          : 0

                        return (
                          <tr
                            key={cart.id}
                            className={cn(
                              "hover:bg-gray-50 transition-colors",
                              cart.recoveredAt && "bg-gray-50/50 opacity-75"
                            )}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{customerName}</div>
                                {customerEmail && (
                                  <div className="text-sm text-gray-500">{customerEmail}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(cart.abandonedAt), "dd/MM/yyyy HH:mm", { locale: he })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Package className="w-4 h-4" />
                                {itemsCount} פריטים
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {cart.recoveredAt ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  שוחזר
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-600">
                                  נטוש
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-semibold text-gray-900">
                                ₪{total.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <DropdownMenu dir="rtl">
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {cart.customer && !cart.recoveredAt && (
                                    <DropdownMenuItem
                                      onClick={() => sendRecoveryEmail(cart.id)}
                                      className="cursor-pointer"
                                    >
                                      <Send className="w-4 h-4 ml-2" />
                                      שלח אימייל שחזור
                                    </DropdownMenuItem>
                                  )}
                                  {cart.customer && (
                                    <DropdownMenuItem
                                      onClick={() => router.push(`/customers/${cart.customer!.id}`)}
                                      className="cursor-pointer"
                                    >
                                      <Eye className="w-4 h-4 ml-2" />
                                      צפה בפרופיל לקוח
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Mobile List View */}
            <div className="md:hidden">
              <MobileListView
                items={convertToMobileList()}
                emptyState={{
                  icon: <ShoppingBag className="w-16 h-16 mx-auto text-gray-400" />,
                  title: "אין עגלות נטושות",
                  description: "עדיין לא ננטשו עגלות בחנות שלך",
                }}
              />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}

