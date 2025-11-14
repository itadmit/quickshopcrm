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
import { BookOpen, Search, Plus, Edit, Calendar, Eye } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  _count: {
    comments: number
  }
}

export default function BlogPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop, loading: shopLoading } = useShop()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (selectedShop) {
      fetchPosts()
    }
  }, [selectedShop])

  const fetchPosts = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/blog/posts?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setPosts(data)
      }
    } catch (error) {
      console.error("Error fetching blog posts:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את הפוסטים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(search.toLowerCase())
  )

  // הצגת מסך טעינה בזמן שהנתונים נטענים מהשרת
  if (shopLoading) {
    return (
      <AppLayout title="בלוג">
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">טוען נתונים...</h3>
          <p className="text-gray-600">אנא המתן</p>
        </div>
      </AppLayout>
    )
  }

  if (!selectedShop) {
    return (
      <AppLayout title="בלוג">
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">
            יש לבחור חנות מההדר לפני ניהול בלוג
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="בלוג">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">בלוג</h1>
            <p className="text-gray-600 mt-1">נהל פוסטים בבלוג</p>
          </div>
          <Button
            onClick={() => router.push("/blog/new")}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            פוסט חדש
          </Button>
        </div>

        {/* Search */}
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

        {/* Posts List */}
        {loading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">אין פוסטים</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{post.title}</h3>
                        {post.isPublished ? (
                          <Badge className="bg-green-100 text-green-800">פורסם</Badge>
                        ) : (
                          <Badge variant="secondary">טיוטה</Badge>
                        )}
                      </div>

                      {post.excerpt && (
                        <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(post.createdAt), "dd/MM/yyyy", { locale: he })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {post._count.comments} תגובות
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/blog/${post.id}/edit`)}
                      >
                        <Edit className="w-4 h-4 ml-2" />
                        ערוך
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

