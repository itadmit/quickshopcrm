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
import { Boxes, Search, Plus, Package, DollarSign } from "lucide-react"

interface Bundle {
  id: string
  name: string
  description: string | null
  price: number
  comparePrice: number | null
  isActive: boolean
  products: Array<{
    product: {
      id: string
      name: string
    }
    quantity: number
  }>
  createdAt: string
}

export default function BundlesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop, loading: shopLoading } = useShop()
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (selectedShop) {
      fetchBundles()
    }
  }, [selectedShop])

  const fetchBundles = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/bundles?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setBundles(data)
      }
    } catch (error) {
      console.error("Error fetching bundles:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את חבילות המוצרים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredBundles = bundles.filter((bundle) =>
    bundle.name.toLowerCase().includes(search.toLowerCase())
  )

  if (shopLoading) {
    return (
      <AppLayout title="חבילות מוצרים">
        <div className="text-center py-12">
          <Boxes className="w-16 h-16 mx-auto text-gray-400 mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">טוען נתונים...</h3>
          <p className="text-gray-600">אנא המתן</p>
        </div>
      </AppLayout>
    )
  }

  if (!selectedShop) {
    return (
      <AppLayout title="חבילות מוצרים">
        <div className="text-center py-12">
          <Boxes className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">
            יש לבחור חנות מההדר לפני ניהול חבילות מוצרים
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="חבילות מוצרים">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">חבילות מוצרים</h1>
            <p className="text-gray-600 mt-1">
              ניהול חבילות מוצרים - מוצרים שמורכבים מכמה מוצרים יחד
            </p>
          </div>
          <Button
            onClick={() => router.push("/bundles/new")}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            חבילה חדשה
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="חפש חבילות..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Bundles List */}
        {loading ? (
          <TableSkeleton />
        ) : filteredBundles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Boxes className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                אין חבילות מוצרים
              </h3>
              <p className="text-gray-600 mb-4">
                {search ? "לא נמצאו חבילות התואמות לחיפוש" : "עדיין לא נוצרו חבילות מוצרים"}
              </p>
              {!search && (
                <Button
                  onClick={() => router.push("/bundles/new")}
                  className="prodify-gradient text-white"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  צור חבילה ראשונה
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBundles.map((bundle) => (
              <Card key={bundle.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex-1">{bundle.name}</CardTitle>
                    {bundle.isActive ? (
                      <Badge className="bg-green-100 text-green-800">פעיל</Badge>
                    ) : (
                      <Badge variant="secondary">לא פעיל</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bundle.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {bundle.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">מחיר:</span>
                      <span className="font-bold text-lg">₪{bundle.price.toFixed(2)}</span>
                    </div>
                    {bundle.comparePrice && bundle.comparePrice > bundle.price && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">מחיר מקורי:</span>
                        <span className="text-sm text-gray-400 line-through">
                          ₪{bundle.comparePrice.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      מוצרים ({bundle.products.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {bundle.products.slice(0, 3).map((item) => (
                        <Badge key={item.product.id} variant="secondary">
                          {item.product.name} (x{item.quantity})
                        </Badge>
                      ))}
                      {bundle.products.length > 3 && (
                        <Badge variant="secondary">
                          +{bundle.products.length - 3} נוספים
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/bundles/${bundle.id}/edit`)}
                    >
                      ערוך
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/bundles/${bundle.id}`)}
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

