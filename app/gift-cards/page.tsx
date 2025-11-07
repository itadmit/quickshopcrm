"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Search, Gift, Copy, Calendar } from "lucide-react"
import { GiftCardsSkeleton } from "@/components/skeletons/GiftCardsSkeleton"

interface GiftCard {
  id: string
  code: string
  amount: number
  balance: number
  recipientEmail: string
  recipientName: string | null
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

export default function GiftCardsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (selectedShop) {
      fetchGiftCards()
    }
  }, [selectedShop])

  const fetchGiftCards = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/gift-cards?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setGiftCards(data)
      }
    } catch (error) {
      console.error("Error fetching gift cards:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את כרטיסי המתנה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "הועתק",
      description: "קוד כרטיס המתנה הועתק ללוח",
    })
  }

  const filteredGiftCards = giftCards.filter(
    (card) =>
      card.code.toLowerCase().includes(search.toLowerCase()) ||
      card.recipientEmail.toLowerCase().includes(search.toLowerCase())
  )

  if (!selectedShop) {
    return (
      <AppLayout title="כרטיסי מתנה">
        <div className="text-center py-12">
          <Gift className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">
            יש לבחור חנות מההדר לפני ניהול כרטיסי מתנה
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="כרטיסי מתנה">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">כרטיסי מתנה</h1>
            <p className="text-gray-600 mt-1">נהל את כל כרטיסי המתנה</p>
          </div>
          <Button
            onClick={() => router.push("/gift-cards/new")}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            כרטיס מתנה חדש
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="חיפוש לפי קוד או אימייל..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <GiftCardsSkeleton />
        ) : filteredGiftCards.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Gift className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2 prodify-gradient-text">אין כרטיסי מתנה</h3>
                <Button
                  onClick={() => router.push("/gift-cards/new")}
                  className="prodify-gradient text-white"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  צור כרטיס מתנה חדש
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
                        סכום
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        יתרה
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        נמען
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        תאריך תפוגה
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        סטטוס
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredGiftCards.map((card) => (
                      <tr key={card.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {card.code}
                            </code>
                            <button
                              onClick={() => copyCode(card.code)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium">
                            ₪{card.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">
                            ₪{card.balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div>{card.recipientName || "ללא שם"}</div>
                            <div className="text-gray-500">{card.recipientEmail}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          {card.expiresAt ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(card.expiresAt).toLocaleDateString("he-IL")}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">ללא תאריך תפוגה</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge
                            className={
                              card.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {card.isActive ? "פעיל" : "לא פעיל"}
                          </Badge>
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

