"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Trash2, Mail, Package, Eye, Loader2, Search } from "lucide-react"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { AppLayout } from "@/components/AppLayout"
import Link from "next/link"

interface WaitlistItem {
  id: string
  email: string
  createdAt: string
  notifiedAt: string | null
  product: {
    id: string
    name: string
    slug: string
    images: string[]
  }
  variant: {
    id: string
    name: string
    option1: string | null
    option1Value: string | null
    option2: string | null
    option2Value: string | null
    option3: string | null
    option3Value: string | null
  } | null
  customer: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  } | null
}

export default function WaitlistPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShop, setSelectedShop] = useState<any>(null)
  const [shops, setShops] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.companyId) {
      loadShops()
    }
  }, [session])

  useEffect(() => {
    if (selectedShop?.id) {
      loadWaitlist()
    }
  }, [selectedShop])

  const loadShops = async () => {
    try {
      const response = await fetch("/api/shops")
      if (response.ok) {
        const data = await response.json()
        setShops(data)
        if (data.length > 0) {
          setSelectedShop(data[0])
        }
      }
    } catch (error) {
      console.error("Error loading shops:", error)
    }
  }

  const loadWaitlist = async () => {
    if (!selectedShop?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/waitlist?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setWaitlist(data)
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את רשימת ההמתנה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading waitlist:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת רשימת ההמתנה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הרשומה?")) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`/api/waitlist/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setWaitlist(waitlist.filter((item) => item.id !== id))
        toast({
          title: "הצלחה",
          description: "הרשומה נמחקה בהצלחה",
        })
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן למחוק את הרשומה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting waitlist item:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הרשומה",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getVariantDisplay = (variant: WaitlistItem["variant"]) => {
    if (!variant) return null
    
    const parts: string[] = []
    if (variant.option1 && variant.option1Value) {
      parts.push(`${variant.option1}: ${variant.option1Value}`)
    }
    if (variant.option2 && variant.option2Value) {
      parts.push(`${variant.option2}: ${variant.option2Value}`)
    }
    if (variant.option3 && variant.option3Value) {
      parts.push(`${variant.option3}: ${variant.option3Value}`)
    }
    
    return parts.length > 0 ? parts.join(", ") : variant.name
  }

  const filteredWaitlist = waitlist.filter((item) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      item.email.toLowerCase().includes(searchLower) ||
      item.product.name.toLowerCase().includes(searchLower) ||
      (item.variant && getVariantDisplay(item.variant)?.toLowerCase().includes(searchLower))
    )
  })

  if (!session) {
    return null
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">רשימת המתנה</h1>
        </div>

        {/* בחירת חנות */}
        {shops.length > 1 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">בחר חנות:</label>
                <select
                  value={selectedShop?.id || ""}
                  onChange={(e) => {
                    const shop = shops.find((s) => s.id === e.target.value)
                    setSelectedShop(shop)
                  }}
                  className="flex-1 max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* חיפוש */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="חפש לפי אימייל, שם מוצר או וריאציה..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* רשימת המתנה */}
        <Card>
          <CardHeader>
            <CardTitle>
              רשימת המתנה ({filteredWaitlist.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filteredWaitlist.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? "לא נמצאו תוצאות" : "אין רשומות ברשימת ההמתנה"}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredWaitlist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* תמונת מוצר */}
                    {item.product.images && item.product.images.length > 0 && (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}

                    {/* פרטי המוצר */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {item.product.name}
                          </h3>
                          {item.variant && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                מידה: {getVariantDisplay(item.variant)}
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              <span>{item.email}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="w-4 h-4" />
                              <span>{formatDate(item.createdAt)}</span>
                            </div>
                            {item.notifiedAt && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                נשלח מייל
                              </Badge>
                            )}
                            {!item.notifiedAt && (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                ממתין
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* כפתורים */}
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/shop/${selectedShop?.slug}/products/${item.product.id}`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            צפה במוצר
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}


