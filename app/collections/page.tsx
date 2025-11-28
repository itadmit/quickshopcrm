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
import { Plus, Search, Edit, Trash2, Copy, FolderOpen, Image as ImageIcon, MoreVertical } from "lucide-react"
import { CollectionsSkeleton } from "@/components/skeletons/CollectionsSkeleton"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  type: "MANUAL" | "AUTOMATIC"
  isPublished?: boolean
  createdAt: string
  _count?: {
    products: number
  }
}

export default function CollectionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop, shops, loading: shopLoading } = useShop()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set())

  useEffect(() => {
    // טעינת הנתונים מיד - לא מחכים ל-selectedShop
    fetchCollections()
  }, [selectedShop])

  const fetchCollections = async () => {
    setLoading(true)
    try {
      const shopToUse = selectedShop || shops[0]
      const params = shopToUse?.id ? `?shopId=${shopToUse.id}` : ''
      const response = await fetch(`/api/collections${params}`)
      if (response.ok) {
        const data = await response.json()
        setCollections(data)
      }
    } catch (error) {
      console.error("Error fetching collections:", error)
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את הקטגוריות",
          variant: "destructive",
        })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הקטגוריה?")) return

    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הקטגוריה נמחקה בהצלחה",
        })
        fetchCollections()
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו למחוק את הקטגוריה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting collection:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הקטגוריה",
        variant: "destructive",
      })
    }
  }

  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(search.toLowerCase())
  )

  // הצגת skeleton רק בזמן טעינה ראשונית
  if (loading) {
    return (
      <AppLayout title="קטגוריות">
        <CollectionsSkeleton />
      </AppLayout>
    )
  }

  // אם אין חנות נבחרת, נשתמש בחנות הראשונה
  const shopToUse = selectedShop || shops[0]
  
  if (!shopToUse && !loading) {
    return (
      <AppLayout title="קטגוריות">
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            לא נמצאה חנות
          </h3>
          <p className="text-gray-600">
            יש לבחור חנות מההדר לפני ניהול קטגוריות
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="קטגוריות">
      <div className={`space-y-6 ${isMobile ? "pb-20" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">קטגוריות</h1>
            <p className="text-gray-600 mt-1">נהל את כל הקטגוריות</p>
          </div>
          <Button
            onClick={() => router.push("/collections/new")}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            קטגוריה חדשה
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="חיפוש לפי שם..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collections Table */}
        {filteredCollections.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2 prodify-gradient-text">אין קטגוריות</h3>
                <p className="text-gray-600 mb-4">
                  התחל ליצור את הקטגוריה הראשונה שלך
                </p>
                <Button
                  onClick={() => router.push("/collections/new")}
                  className="prodify-gradient text-white"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  צור קטגוריה חדשה
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
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-12">
                        <Checkbox
                          checked={selectedCollections.size === filteredCollections.length && filteredCollections.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCollections(new Set(filteredCollections.map((c) => c.id)))
                            } else {
                              setSelectedCollections(new Set())
                            }
                          }}
                        />
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">תמונה</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">שם</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">תיאור</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">סוג</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">סטטוס</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">מוצרים</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCollections.map((collection) => (
                      <tr 
                        key={collection.id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/collections/${collection.slug}`)}
                      >
                        <td 
                          className="px-6 py-4 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedCollections.has(collection.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedCollections)
                              if (checked) {
                                newSelected.add(collection.id)
                              } else {
                                newSelected.delete(collection.id)
                              }
                              setSelectedCollections(newSelected)
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {collection.image ? (
                            <img
                              src={collection.image}
                              alt={collection.name}
                              className="w-12 h-12 object-cover rounded-md"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{collection.name}</div>
                          <div className="text-xs text-gray-500">{collection.slug}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700 max-w-xs truncate">
                            {collection.description || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={collection.type === "AUTOMATIC" ? "default" : "secondary"}
                          >
                            {collection.type === "AUTOMATIC" ? "אוטומטי" : "ידני"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {collection.isPublished ? (
                            <Badge className="bg-green-100 text-green-800">פורסם</Badge>
                          ) : (
                            <Badge variant="secondary">טיוטה</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700">
                            {collection._count?.products || 0}
                          </span>
                        </td>
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-[160px]">
                              <DropdownMenuItem
                                onClick={() => router.push(`/collections/${collection.slug}`)}
                                className="flex flex-row-reverse items-center gap-2 cursor-pointer"
                              >
                                <Edit className="w-4 h-4 flex-shrink-0" />
                                ערוך
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(collection.slug)}
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

