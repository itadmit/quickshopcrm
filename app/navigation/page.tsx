"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Save, Menu, Plus, Trash2, GripVertical } from "lucide-react"

interface NavigationItem {
  id: string
  label: string
  type: "PAGE" | "CATEGORY" | "COLLECTION" | "EXTERNAL"
  url: string | null
  position: number
  parentId: string | null
  children?: NavigationItem[]
}

interface Navigation {
  id: string
  name: string
  type: "HEADER" | "FOOTER" | "SIDEBAR"
  items: NavigationItem[]
}

export default function NavigationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [navigation, setNavigation] = useState<Navigation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedShop) {
      fetchNavigation()
    }
  }, [selectedShop])

  const fetchNavigation = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      // נחפש תפריט HEADER ספציפי
      const response = await fetch(`/api/navigation?shopId=${selectedShop.id}&location=HEADER`)
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          // המרת location ל-type עבור הממשק
          const nav = data[0]
          setNavigation({
            ...nav,
            type: nav.location || "HEADER",
          })
        } else {
          // יצירת navigation ברירת מחדל
          setNavigation({
            id: "",
            name: "תפריט ראשי",
            type: "HEADER",
            items: [],
          })
        }
      }
    } catch (error) {
      console.error("Error fetching navigation:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את התפריט",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedShop || !navigation) return

    setSaving(true)
    try {
      const method = navigation.id ? "PUT" : "POST"
      const url = navigation.id
        ? `/api/navigation/${navigation.id}`
        : "/api/navigation"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShop.id,
          name: navigation.name,
          location: navigation.type, // type הוא HEADER/FOOTER/SIDEBAR שזה בעצם location
          items: navigation.items,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "התפריט נשמר בהצלחה",
        })
        fetchNavigation()
      }
    } catch (error) {
      console.error("Error saving navigation:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת התפריט",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addItem = () => {
    if (!navigation) return

    const newItem: NavigationItem = {
      id: `temp-${Date.now()}`,
      label: "פריט חדש",
      type: "PAGE",
      url: null,
      position: navigation.items.length,
      parentId: null,
    }

    setNavigation({
      ...navigation,
      items: [...navigation.items, newItem],
    })
  }

  const removeItem = (id: string) => {
    if (!navigation) return

    setNavigation({
      ...navigation,
      items: navigation.items.filter((item) => item.id !== id),
    })
  }

  const updateItem = (id: string, updates: Partial<NavigationItem>) => {
    if (!navigation) return

    setNavigation({
      ...navigation,
      items: navigation.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })
  }

  if (!selectedShop) {
    return (
      <AppLayout title="תפריט ניווט">
        <div className="text-center py-12">
          <Menu className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">יש לבחור חנות מההדר לפני ניהול תפריט</p>
        </div>
      </AppLayout>
    )
  }

  if (loading) {
    return (
      <AppLayout title="תפריט ניווט">
        <div className="text-center py-12">
          <p className="text-gray-600">טוען תפריט...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="תפריט ניווט">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">תפריט ניווט</h1>
            <p className="text-gray-600 mt-1">נהל את תפריט הניווט של החנות</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={addItem}
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף פריט
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="prodify-gradient text-white"
            >
              <Save className="w-4 h-4 ml-2" />
              {saving ? "שומר..." : "שמור תפריט"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Menu className="w-5 h-5" />
              פריטי תפריט
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {navigation && navigation.items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">אין פריטים בתפריט</p>
                <Button onClick={addItem} variant="outline">
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף פריט ראשון
                </Button>
              </div>
            ) : (
              navigation?.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <GripVertical className="w-5 h-5 text-gray-400" />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>תווית</Label>
                      <Input
                        value={item.label}
                        onChange={(e) =>
                          updateItem(item.id, { label: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>סוג</Label>
                      <Select
                        value={item.type}
                        onValueChange={(value: any) =>
                          updateItem(item.id, { type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PAGE">דף</SelectItem>
                          <SelectItem value="CATEGORY">קטגוריה</SelectItem>
                          <SelectItem value="COLLECTION">Collection</SelectItem>
                          <SelectItem value="EXTERNAL">קישור חיצוני</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={item.url || ""}
                        onChange={(e) =>
                          updateItem(item.id, { url: e.target.value })
                        }
                        placeholder="/page-slug"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

