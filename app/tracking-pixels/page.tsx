"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Facebook,
  Tag,
  BarChart3,
  Music,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TrackingPixel {
  id: string
  platform: string
  pixelId: string
  accessToken: string | null
  isActive: boolean
  events: string[]
  createdAt: string
}

const platformIcons: Record<string, any> = {
  FACEBOOK: Facebook,
  GOOGLE_TAG_MANAGER: Tag,
  GOOGLE_ANALYTICS: BarChart3,
  TIKTOK: Music,
}

const platformNames: Record<string, string> = {
  FACEBOOK: "פייסבוק פיקסל",
  GOOGLE_TAG_MANAGER: "גוגל טאג מנג'ר",
  GOOGLE_ANALYTICS: "גוגל אנליטיקס",
  TIKTOK: "טיקטוק פיקסל",
}

export default function TrackingPixelsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [pixels, setPixels] = useState<TrackingPixel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedShop) {
      fetchPixels()
    }
  }, [selectedShop])

  const fetchPixels = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/tracking-pixels?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setPixels(data)
      }
    } catch (error) {
      console.error("Error fetching pixels:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון פיקסלים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (pixelId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/tracking-pixels/${pixelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: `פיקסל ${!currentStatus ? "הופעל" : "כובה"}`,
        })
        fetchPixels()
      }
    } catch (error) {
      console.error("Error toggling pixel:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן פיקסל",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (pixelId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הפיקסל?")) return

    try {
      const response = await fetch(`/api/tracking-pixels/${pixelId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "פיקסל נמחק בהצלחה",
        })
        fetchPixels()
      }
    } catch (error) {
      console.error("Error deleting pixel:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק פיקסל",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">פיקסלים וקודי מעקב</h1>
            <p className="text-gray-600 mt-2">
              ניהול פיקסלים וקודי מעקב לאינטגרציה עם פלטפורמות שיווק
            </p>
          </div>
          <Button
            onClick={() => router.push("/tracking-pixels/new")}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            פיקסל חדש
          </Button>
        </div>

        {pixels.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                אין פיקסלים
              </h3>
              <p className="text-gray-600 mb-4">
                התחל בהוספת פיקסל חדש למעקב אחר האירועים בחנות שלך
              </p>
              <Button
                onClick={() => router.push("/tracking-pixels/new")}
                className="prodify-gradient text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                הוסף פיקסל חדש
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pixels.map((pixel) => {
              const Icon = platformIcons[pixel.platform] || Tag
              return (
                <Card key={pixel.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <Icon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {platformNames[pixel.platform] || pixel.platform}
                          </CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            ID: {pixel.pixelId}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={pixel.isActive ? "default" : "secondary"}
                        className={
                          pixel.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {pixel.isActive ? "פעיל" : "לא פעיל"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <span className="text-gray-600">אירועים:</span>{" "}
                        <span className="font-medium">
                          {pixel.events.length === 0
                            ? "כל האירועים"
                            : `${pixel.events.length} אירועים`}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        נוצר: {new Date(pixel.createdAt).toLocaleDateString("he-IL")}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/tracking-pixels/${pixel.id}/edit`)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          ערוך
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(pixel.id, pixel.isActive)}
                          className="flex-1"
                        >
                          {pixel.isActive ? (
                            <>
                              <PowerOff className="w-4 h-4 mr-2" />
                              כבה
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4 mr-2" />
                              הפעל
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(pixel.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

