"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { TableSkeleton } from "@/components/skeletons/TableSkeleton"
import {
  Package,
  Search,
  AlertTriangle,
  Edit,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

interface InventoryItem {
  id: string
  name: string
  sku: string | null
  inventoryQty: number
  lowStockAlert: number | null
  status: string
  availability: string
}

export default function InventoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "low" | "out">("all")

  useEffect(() => {
    if (selectedShop) {
      fetchInventory()
    }
  }, [selectedShop])

  const fetchInventory = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/products?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setItems(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching inventory:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את המלאי",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateInventory = async (productId: string, newQty: number) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryQty: newQty,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "המלאי עודכן בהצלחה",
        })
        fetchInventory()
      }
    } catch (error) {
      console.error("Error updating inventory:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון המלאי",
        variant: "destructive",
      })
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase())

    if (filter === "low") {
      return (
        matchesSearch &&
        item.lowStockAlert !== null &&
        item.inventoryQty <= item.lowStockAlert
      )
    }
    if (filter === "out") {
      return matchesSearch && item.inventoryQty === 0
    }
    return matchesSearch
  })

  const lowStockCount = items.filter(
    (item) =>
      item.lowStockAlert !== null && item.inventoryQty <= item.lowStockAlert
  ).length

  const outOfStockCount = items.filter((item) => item.inventoryQty === 0).length

  if (!selectedShop) {
    return (
      <AppLayout title="מלאי">
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">
            יש לבחור חנות מההדר לפני ניהול מלאי
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="מלאי">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">מלאי</h1>
            <p className="text-gray-600 mt-1">נהל את המלאי של כל המוצרים</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">סה"כ מוצרים</CardTitle>
              <Package className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{items.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">מלאי נמוך</CardTitle>
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {lowStockCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">אזל מהמלאי</CardTitle>
              <TrendingDown className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {outOfStockCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="חיפוש לפי שם או SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  onClick={() => setFilter("all")}
                >
                  הכל
                </Button>
                <Button
                  variant={filter === "low" ? "default" : "outline"}
                  onClick={() => setFilter("low")}
                >
                  מלאי נמוך
                </Button>
                <Button
                  variant={filter === "out" ? "default" : "outline"}
                  onClick={() => setFilter("out")}
                >
                  אזל מהמלאי
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        מוצר
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        SKU
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        מלאי נוכחי
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        התראת מלאי נמוך
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
                    {filteredItems.map((item) => {
                      const isLowStock =
                        item.lowStockAlert !== null &&
                        item.inventoryQty <= item.lowStockAlert
                      const isOutOfStock = item.inventoryQty === 0

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-gray-50 ${
                            isOutOfStock
                              ? "bg-red-50"
                              : isLowStock
                              ? "bg-yellow-50"
                              : ""
                          }`}
                        >
                          <td className="p-4">
                            <div className="font-medium">{item.name}</div>
                          </td>
                          <td className="p-4">
                            <code className="text-sm text-gray-600">
                              {item.sku || "-"}
                            </code>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={item.inventoryQty}
                                onChange={(e) => {
                                  const newQty = parseInt(e.target.value) || 0
                                  updateInventory(item.id, newQty)
                                }}
                                className="w-24"
                              />
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm">
                              {item.lowStockAlert !== null
                                ? item.lowStockAlert
                                : "-"}
                            </span>
                          </td>
                          <td className="p-4">
                            {isOutOfStock ? (
                              <Badge className="bg-red-100 text-red-800">
                                אזל מהמלאי
                              </Badge>
                            ) : isLowStock ? (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                מלאי נמוך
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">
                                במלאי
                              </Badge>
                            )}
                          </td>
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(`/products/${item.id}/edit`)
                              }
                            >
                              <Edit className="w-4 h-4 ml-2" />
                              ערוך
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
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

