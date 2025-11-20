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
import { CreditCard, Search, User, DollarSign, Plus, Calendar } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"

interface StoreCredit {
  id: string
  customerId: string
  customer: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  }
  balance: number
  expiresAt: string | null
  notes: string | null
  createdAt: string
}

export default function StoreCreditsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [credits, setCredits] = useState<StoreCredit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (selectedShop) {
      fetchCredits()
    }
  }, [selectedShop])

  const fetchCredits = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/store-credits?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setCredits(data)
      }
    } catch (error) {
      console.error("Error fetching store credits:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את קרדיט בחנות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredCredits = credits.filter((credit) => {
    if (!search) return true
    const email = credit.customer?.email || ""
    const name = `${credit.customer?.firstName || ""} ${credit.customer?.lastName || ""}`.trim()
    return (
      email.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase())
    )
  })

  const totalBalance = credits.reduce((sum, credit) => sum + credit.balance, 0)

  if (!selectedShop) {
    return (
      <AppLayout title="קרדיט בחנות">
        <div className="text-center py-12">
          <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">
            יש לבחור חנות מההדר לפני ניהול קרדיט בחנות
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="קרדיט בחנות">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">קרדיט בחנות</h1>
            <p className="text-gray-600 mt-1">נהל קרדיט בחנות ללקוחות</p>
          </div>
          <Button
            onClick={() => router.push("/store-credits/new")}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף קרדיט
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">סה"כ לקוחות עם קרדיט</CardTitle>
              <User className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{credits.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">סה"כ יתרה</CardTitle>
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₪{totalBalance.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">יתרה ממוצעת</CardTitle>
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ₪{credits.length > 0 ? (totalBalance / credits.length).toFixed(2) : "0.00"}
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

        {/* Credits List */}
        {loading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : filteredCredits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">אין קרדיט בחנות</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCredits.map((credit) => (
              <Card key={credit.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold">
                              {credit.customer.firstName} {credit.customer.lastName}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{credit.customer.email}</p>
                        </div>
                        <Badge
                          className={
                            credit.balance > 0
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          יתרה: ₪{credit.balance.toFixed(2)}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {credit.expiresAt && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            תפוגה: {format(new Date(credit.expiresAt), "dd/MM/yyyy", { locale: he })}
                          </div>
                        )}
                        {credit.notes && (
                          <p className="text-sm text-gray-600">{credit.notes}</p>
                        )}
                        <div className="text-xs text-gray-500">
                          נוצר: {format(new Date(credit.createdAt), "dd/MM/yyyy", { locale: he })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/store-credits/${credit.id}/edit`)}
                      >
                        ערוך
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/customers/${credit.customer.id}`)}
                      >
                        צפה בפרופיל לקוח
                      </Button>
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

