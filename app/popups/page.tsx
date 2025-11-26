"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Popup {
  id: string
  name: string
  isActive: boolean
  displayFrequency: string
  displayLocation: string
  trigger: string
  createdAt: string
  updatedAt: string
}

export default function PopupsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop, shops, loading: shopLoading } = useShop()
  const [popups, setPopups] = useState<Popup[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [popupToDelete, setPopupToDelete] = useState<string | null>(null)

  useEffect(() => {
    if (selectedShop) {
      fetchPopups()
    } else if (!shopLoading) {
      setLoading(false)
    }
  }, [selectedShop, shopLoading])

  const fetchPopups = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) return

    setLoading(true)
    try {
      const response = await fetch(`/api/popups?shopId=${shopToUse.id}`)
      if (response.ok) {
        const data = await response.json()
        setPopups(data)
      }
    } catch (error) {
      console.error("Error fetching popups:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הפופאפים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!popupToDelete) return

    try {
      const response = await fetch(`/api/popups/${popupToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הפופאפ נמחק בהצלחה",
        })
        fetchPopups()
      } else {
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה במחיקת הפופאפ",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting popup:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הפופאפ",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setPopupToDelete(null)
    }
  }

  const toggleActive = async (popup: Popup) => {
    try {
      const response = await fetch(`/api/popups/${popup.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !popup.isActive,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: `הפופאפ ${!popup.isActive ? "הופעל" : "הושבת"} בהצלחה`,
        })
        fetchPopups()
      }
    } catch (error) {
      console.error("Error toggling popup:", error)
    }
  }

  if (shopLoading) {
    return (
      <AppLayout title="פופאפים">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">טוען...</p>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  // אם אין חנות נבחרת, נשתמש בחנות הראשונה
  const shopToUse = selectedShop || shops[0]
  
  if (!shopToUse) {
    return (
      <AppLayout title="פופאפים">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">לא נמצאה חנות</p>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="פופאפים">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">פופאפים</h1>
            <p className="text-gray-600 mt-1">
              ניהול פופאפים לחנות: <span className="font-semibold">{selectedShop.name}</span>
            </p>
          </div>
          <Button
            onClick={() => router.push("/popups/new")}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            פופאפ חדש
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">טוען...</p>
            </CardContent>
          </Card>
        ) : popups.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">אין פופאפים עדיין</p>
              <Button
                onClick={() => router.push("/popups/new")}
                className="prodify-gradient text-white"
              >
                <Plus className="w-4 h-4 ml-2" />
                צור פופאפ ראשון
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popups.map((popup) => (
              <Card key={popup.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{popup.name}</CardTitle>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge variant={popup.isActive ? "default" : "secondary"}>
                          {popup.isActive ? (
                            <>
                              <Eye className="w-3 h-3 ml-1" />
                              פעיל
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 ml-1" />
                              לא פעיל
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p>
                      <span className="font-medium">תדירות:</span>{" "}
                      {popup.displayFrequency === "every-visit" && "בכל כניסה"}
                      {popup.displayFrequency === "once-daily" && "פעם ביום"}
                      {popup.displayFrequency === "once-weekly" && "פעם בשבוע"}
                      {popup.displayFrequency === "once-monthly" && "פעם בחודש"}
                    </p>
                    <p>
                      <span className="font-medium">מיקום:</span>{" "}
                      {popup.displayLocation === "all-pages" ? "כל העמודים" : "עמודים ספציפיים"}
                    </p>
                    <p>
                      <span className="font-medium">טריגר:</span>{" "}
                      {popup.trigger === "on-load" && "בטעינת העמוד"}
                      {popup.trigger === "on-exit-intent" && "בניסיון יציאה"}
                      {popup.trigger === "on-scroll" && "בגלילה"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/popups/${popup.id}/edit`)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 ml-2" />
                      ערוך
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(popup)}
                    >
                      {popup.isActive ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPopupToDelete(popup.id)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת פופאפ</DialogTitle>
            <DialogDescription>
              האם אתה בטוח שברצונך למחוק את הפופאפ הזה? פעולה זו לא ניתנת לביטול.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setPopupToDelete(null)
              }}
            >
              ביטול
            </Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              מחק
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

