"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useShop } from "@/components/providers/ShopProvider"
import {
  Store,
  Plus,
  Search,
  Eye,
  Edit,
  ExternalLink,
  Package,
  ShoppingCart,
  Users,
  Globe,
  Calendar,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { ShopsSkeleton } from "@/components/skeletons/ShopsSkeleton"

interface Shop {
  id: string
  name: string
  slug: string
  domain: string | null
  description: string | null
  logo: string | null
  category: string | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
  _count: {
    products: number
    orders: number
    customers: number
  }
}

export default function ShopsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { setSelectedShop } = useShop()
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    // טעינת הנתונים מיד
    fetchShops()
  }, [])

  const fetchShops = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/shops")
      if (response.ok) {
        const data = await response.json()
        setShops(data || [])
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את החנויות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching shops:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת החנויות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleShopClick = (shop: Shop) => {
    setSelectedShop(shop)
    router.push("/dashboard")
  }

  const filteredShops = shops.filter((shop) =>
    shop.name.toLowerCase().includes(search.toLowerCase()) ||
    shop.slug.toLowerCase().includes(search.toLowerCase()) ||
    (shop.description && shop.description.toLowerCase().includes(search.toLowerCase()))
  )

  // הצגת skeleton רק בזמן טעינה ראשונית
  if (loading) {
    return (
      <AppLayout title="חנויות">
        <ShopsSkeleton />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="חנויות">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">חנויות</h1>
            <p className="text-gray-500 mt-1">נהל את כל החנויות שלך במקום אחד</p>
          </div>
          <Button
            onClick={() => router.push("/onboarding")}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            חנות חדשה
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="חפש חנויות..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Shops Grid */}
        {filteredShops.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {search ? "לא נמצאו חנויות" : "אין חנויות"}
              </h3>
              <p className="text-gray-500 mb-6">
                {search
                  ? "נסה לחפש עם מילות מפתח אחרות"
                  : "התחל ביצירת חנות חדשה"}
              </p>
              {!search && (
                <Button
                  onClick={() => router.push("/onboarding")}
                  className="prodify-gradient text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  צור חנות חדשה
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShops.map((shop) => (
              <Card
                key={shop.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleShopClick(shop)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {shop.logo ? (
                        <img
                          src={shop.logo}
                          alt={shop.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                          <Store className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                          {shop.name}
                        </CardTitle>
                        {shop.category && (
                          <p className="text-sm text-gray-500 mt-1">{shop.category}</p>
                        )}
                      </div>
                    </div>
                    {shop.isPublished ? (
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        פעילה
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                        טיוטה
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {shop.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {shop.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {shop._count.products}
                      </div>
                      <div className="text-xs text-gray-500">מוצרים</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {shop._count.orders}
                      </div>
                      <div className="text-xs text-gray-500">הזמנות</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {shop._count.customers}
                      </div>
                      <div className="text-xs text-gray-500">לקוחות</div>
                    </div>
                  </div>

                  {/* Domain */}
                  {shop.domain && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <Globe className="w-4 h-4" />
                      <span className="truncate">{shop.domain}</span>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                    <Calendar className="w-4 h-4" />
                    <span>
                      נוצר ב-{format(new Date(shop.createdAt), "dd/MM/yyyy", { locale: he })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleShopClick(shop)
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      ניהול
                    </Button>
                    {shop.isPublished && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`/shop/${shop.slug}`, "_blank")
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        צפייה
                      </Button>
                    )}
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

