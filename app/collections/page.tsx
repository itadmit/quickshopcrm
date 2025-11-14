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
import { Plus, Search, Edit, Trash2, Copy, FolderOpen, Image as ImageIcon } from "lucide-react"
import { CollectionsSkeleton } from "@/components/skeletons/CollectionsSkeleton"
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
  isPublished: boolean
  createdAt: string
  _count?: {
    products: number
  }
}

export default function CollectionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    // טעינת הנתונים מיד - לא מחכים ל-selectedShop
    fetchCollections()
  }, [selectedShop])

  const fetchCollections = async () => {
    setLoading(true)
    try {
      const params = selectedShop?.id ? `?shopId=${selectedShop.id}` : ''
      const response = await fetch(`/api/collections${params}`)
      if (response.ok) {
        const data = await response.json()
        setCollections(data)
      }
    } catch (error) {
      console.error("Error fetching collections:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את הקולקציות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הקולקציה?")) return

    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הקולקציה נמחקה בהצלחה",
        })
        fetchCollections()
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו למחוק את הקולקציה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting collection:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הקולקציה",
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
      <AppLayout title="קולקציות">
        <CollectionsSkeleton />
      </AppLayout>
    )
  }

  if (!selectedShop) {
    return (
      <AppLayout title="קולקציות">
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">
            יש לבחור חנות מההדר לפני ניהול קולקציות
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="קולקציות">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">קולקציות</h1>
            <p className="text-gray-600 mt-1">נהל את כל הקולקציות</p>
          </div>
          <Button
            onClick={() => router.push("/collections/new")}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            קולקציה חדשה
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

        {/* Collections List */}
        {filteredCollections.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2 prodify-gradient-text">אין קולקציות</h3>
                <p className="text-gray-600 mb-4">
                  התחל ליצור את הקולקציה הראשונה שלך
                </p>
                <Button
                  onClick={() => router.push("/collections/new")}
                  className="prodify-gradient text-white"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  צור קולקציה חדשה
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCollections.map((collection) => (
              <Card key={collection.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {collection.image ? (
                    <img
                      src={collection.image}
                      alt={collection.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded-t-lg flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {collection.name}
                      </h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <span>⋯</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[160px]">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/collections/${collection.slug}`)
                            }
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
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {collection.description || "אין תיאור"}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          collection.type === "AUTOMATIC"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {collection.type === "AUTOMATIC" ? "אוטומטי" : "ידני"}
                      </Badge>
                      {collection.isPublished && (
                        <Badge className="bg-green-100 text-green-800">
                          פורסם
                        </Badge>
                      )}
                      <span className="text-sm text-gray-500 mr-auto">
                        {collection._count?.products || 0} מוצרים
                      </span>
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

