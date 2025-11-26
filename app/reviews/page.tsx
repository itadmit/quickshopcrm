"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Search, Star, CheckCircle2, XCircle, Package } from "lucide-react"

interface Review {
  id: string
  productId: string
  product: {
    id: string
    name: string
  }
  customerId: string | null
  customer: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  } | null
  rating: number
  title: string | null
  comment: string | null
  images: string[]
  videos: string[]
  isApproved: boolean
  isVerified: boolean
  createdAt: string
}

export default function ReviewsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop, shops } = useShop()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [pluginActive, setPluginActive] = useState<boolean | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // בדיקה אם תוסף הביקורות פעיל
  useEffect(() => {
    const checkPlugin = async () => {
      const shopToUseForPlugin = selectedShop || shops[0]
      if (!shopToUseForPlugin) {
        setPluginActive(false)
        return
      }

      try {
        const response = await fetch(`/api/plugins/active?shopId=${shopToUseForPlugin.id}`)
        if (response.ok) {
          const plugins = await response.json()
          const reviewsPlugin = plugins.find((p: any) => p.slug === 'reviews' && p.isActive && p.isInstalled)
          setPluginActive(!!reviewsPlugin)
        } else {
          setPluginActive(false)
        }
      } catch (error) {
        console.error("Error checking reviews plugin:", error)
        setPluginActive(false)
      }
    }

    checkPlugin()
  }, [selectedShop])

  useEffect(() => {
    if (selectedShop && pluginActive) {
      fetchReviews()
    }
  }, [selectedShop, statusFilter, pluginActive])

  const fetchReviews = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        shopId: shopToUse.id,
        ...(statusFilter !== "all" && { isApproved: statusFilter === "approved" ? "true" : "false" }),
      })

      const response = await fetch(`/api/reviews?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReviews(data)
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את הביקורות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/reviews/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: true }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הביקורת אושרה",
        })
        fetchReviews()
      }
    } catch (error) {
      console.error("Error approving review:", error)
    }
  }

  const handleReject = async (id: string) => {
    try {
      const response = await fetch(`/api/reviews/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: false }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הביקורת נדחתה",
        })
        fetchReviews()
      }
    } catch (error) {
      console.error("Error rejecting review:", error)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  const filteredReviews = reviews.filter((review) =>
    review.product.name.toLowerCase().includes(search.toLowerCase()) ||
    review.comment?.toLowerCase().includes(search.toLowerCase())
  )

  // אם אין חנות נבחרת, נשתמש בחנות הראשונה
  const shopToUse = selectedShop || shops[0]
  
  if (!shopToUse) {
    return (
      <AppLayout title="ביקורות">
        <div className="text-center py-12">
          <Star className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            לא נמצאה חנות
          </h3>
          <p className="text-gray-600">אנא צור חנות תחילה</p>
        </div>
      </AppLayout>
    )
  }

  // בדיקה אם תוסף הביקורות פעיל
  if (pluginActive === false) {
    return (
      <AppLayout title="ביקורות">
        <div className="text-center py-12">
          <Star className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            תוסף הביקורות לא פעיל
          </h3>
          <p className="text-gray-600 mb-4">
            יש להתקין ולהפעיל את תוסף הביקורות מהגדרות התוספים
          </p>
          <Button onClick={() => router.push('/settings/plugins')}>
            לניהול תוספים
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="ביקורות">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ביקורות</h1>
            <p className="text-gray-600 mt-1">נהל את כל הביקורות והדירוגים</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="חיפוש לפי מוצר או ביקורת..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הביקורות</SelectItem>
                  <SelectItem value="approved">מאושרות</SelectItem>
                  <SelectItem value="pending">ממתינות</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">טוען ביקורות...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Star className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">אין ביקורות</h3>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {renderStars(review.rating)}
                          <span className="text-sm font-medium text-gray-900">
                            {review.rating}/5
                          </span>
                        </div>
                        {review.isVerified && (
                          <Badge className="bg-blue-100 text-blue-800">
                            רכישה מאומתת
                          </Badge>
                        )}
                        <Badge
                          className={
                            review.isApproved
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {review.isApproved ? "מאושר" : "ממתין"}
                        </Badge>
                      </div>
                      <div className="mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{review.product.name}</span>
                        </div>
                        {review.title && (
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {review.title}
                          </h3>
                        )}
                        {review.comment && (
                          <p className="text-gray-700 mb-2">{review.comment}</p>
                        )}
                        {review.images && review.images.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mt-4 mb-4">
                            {review.images.map((img: string, idx: number) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Review image ${idx + 1}`}
                                className="w-full h-24 object-cover rounded-lg cursor-pointer"
                                onClick={() => window.open(img, '_blank')}
                              />
                            ))}
                          </div>
                        )}
                        {review.videos && review.videos.length > 0 && (
                          <div className="grid grid-cols-1 gap-2 mt-4 mb-4">
                            {review.videos.map((video: string, idx: number) => (
                              <video
                                key={idx}
                                src={video}
                                controls
                                className="w-full max-w-md rounded-lg"
                                preload="metadata"
                              >
                                הדפדפן שלך לא תומך בהצגת וידאו.
                              </video>
                            ))}
                          </div>
                        )}
                        {review.customer && (
                          <p className="text-sm text-gray-500">
                            {review.customer.firstName} {review.customer.lastName} ({review.customer.email})
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(review.createdAt).toLocaleDateString("he-IL")}
                        </p>
                      </div>
                    </div>
                    {!review.isApproved && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(review.id)}
                        >
                          <CheckCircle2 className="w-4 h-4 ml-2" />
                          אישור
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(review.id)}
                        >
                          <XCircle className="w-4 h-4 ml-2" />
                          דחייה
                        </Button>
                      </div>
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

