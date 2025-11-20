"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Plus, Search, Edit, Trash2, FileText, ExternalLink } from "lucide-react"
import { PagesSkeleton } from "@/components/skeletons/PagesSkeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Page {
  id: string
  title: string
  slug: string
  content: string | null
  isPublished: boolean
  createdAt: string
}

export default function PagesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop, loading: shopsLoading } = useShop()
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    // טעינת הנתונים מיד - לא מחכים ל-selectedShop
    fetchPages()
  }, [selectedShop])

  const fetchPages = async () => {
    setLoading(true)
    try {
      const params = selectedShop?.id ? `?shopId=${selectedShop.id}` : ''
      const response = await fetch(`/api/pages${params}`)
      if (response.ok) {
        const data = await response.json()
        setPages(data)
      }
    } catch (error) {
      console.error("Error fetching pages:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את הדפים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הדף?")) return

    try {
      const response = await fetch(`/api/pages/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הדף נמחק בהצלחה",
        })
        fetchPages()
      }
    } catch (error) {
      console.error("Error deleting page:", error)
    }
  }

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(search.toLowerCase())
  )

  // הצגת skeleton רק בזמן טעינה ראשונית
  if (loading || shopsLoading) {
    return (
      <AppLayout title="דפים">
        <PagesSkeleton />
      </AppLayout>
    )
  }

  // אם אין חנות נבחרת אחרי שהכל נטען
  if (!selectedShop) {
    return (
      <AppLayout title="דפים">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">יש לבחור חנות מההדר לפני ניהול דפים</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="דפים">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">דפים</h1>
            <p className="text-gray-600 mt-1">נהל את כל הדפים הסטטיים</p>
          </div>
          <Button
            onClick={() => router.push("/pages/new")}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            דף חדש
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="חיפוש לפי כותרת..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <PagesSkeleton />
        ) : filteredPages.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2 prodify-gradient-text">אין דפים</h3>
                <Button
                  onClick={() => router.push("/pages/new")}
                  className="prodify-gradient text-white"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  צור דף חדש
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
                        כותרת
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        Slug
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        סטטוס
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        תאריך יצירה
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-900">
                        פעולות
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPages.map((page) => (
                      <tr key={page.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-medium">{page.title}</div>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => router.push(`/pages/${page.slug}/edit`)}
                            className="text-sm text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer font-mono"
                          >
                            {page.slug}
                          </button>
                        </td>
                        <td className="p-4">
                          <Badge
                            className={
                              page.isPublished
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {page.isPublished ? "פורסם" : "טיוטה"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-600">
                            {new Date(page.createdAt).toLocaleDateString("he-IL")}
                          </span>
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <span>⋯</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-[160px]">
                              {page.isPublished && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    const url = `/shop/${selectedShop.slug}/pages/${page.slug}`
                                    window.open(url, "_blank")
                                  }}
                                  className="flex flex-row-reverse items-center gap-2 cursor-pointer"
                                >
                                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                  צפה בחנות
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/pages/${page.slug}/edit`)
                                }
                                className="flex flex-row-reverse items-center gap-2 cursor-pointer"
                              >
                                <Edit className="w-4 h-4 flex-shrink-0" />
                                ערוך
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(page.id)}
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

