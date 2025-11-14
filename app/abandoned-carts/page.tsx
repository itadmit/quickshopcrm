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
import { ShoppingBag, Search, Mail, Calendar, DollarSign, Send } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"

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
              <ShoppingBag className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{carts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ערך כולל</CardTitle>
              <DollarSign className="h-5 w-5 text-purple-600" />
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
              <Mail className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {carts.filter((c) => c.recoveredAt).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="חיפוש לפי אימייל או שם לקוח..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Carts List */}
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : filteredCarts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">אין עגלות נטושות</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCarts.map((cart) => (
              <Card key={cart.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        {cart.customer ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold">
                                {cart.customer.firstName} {cart.customer.lastName}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{cart.customer.email}</p>
                          </div>
                        ) : (
                          <div>
                            <span className="text-sm text-gray-500">לקוח אורח</span>
                          </div>
                        )}
                        {cart.recoveredAt && (
                          <Badge className="bg-green-100 text-green-800">
                            שוחזר
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          ננטש: {format(new Date(cart.abandonedAt), "dd/MM/yyyy HH:mm", { locale: he })}
                        </div>
                        {cart.items && Array.isArray(cart.items) && (
                          <div>
                            <p className="text-sm font-medium mb-1">פריטים:</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {cart.items.map((item: any, index: number) => (
                                <li key={index}>
                                  {item.name} x{item.quantity} - ₪{(item.price * item.quantity).toFixed(2)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="text-lg font-bold">
                          סה"כ: ₪{calculateTotal(cart.items).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {cart.customer && !cart.recoveredAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendRecoveryEmail(cart.id)}
                        >
                          <Send className="w-4 h-4 ml-2" />
                          שלח אימייל שחזור
                        </Button>
                      )}
                      {cart.customer && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/customers/${cart.customer!.id}`)}
                        >
                          צפה בפרופיל לקוח
                        </Button>
                      )}
                    </div>
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

