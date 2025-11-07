"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Save, FolderOpen, Image as ImageIcon, Upload } from "lucide-react"

export default function NewCollectionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    type: "MANUAL" as "MANUAL" | "AUTOMATIC",
    isPublished: false,
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append("file", file)
      formDataObj.append("entityType", "collections")
      formDataObj.append("entityId", "new")
      if (selectedShop?.id) {
        formDataObj.append("shopId", selectedShop.id)
      }

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formDataObj,
      })

      if (response.ok) {
        const data = await response.json()
        setFormData((prev) => ({ ...prev, image: data.file.path }))
        toast({
          title: "הצלחה",
          description: "התמונה הועלתה בהצלחה",
        })
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהעלאת התמונה",
        variant: "destructive",
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  const handleSubmit = async () => {
    if (!selectedShop) {
      toast({
        title: "שגיאה",
        description: "יש לבחור חנות מההדר",
        variant: "destructive",
      })
      return
    }

    if (!formData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "שם הקולקציה הוא חובה",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload: any = {
        shopId: selectedShop.id,
        name: formData.name.trim(),
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description || undefined,
        image: formData.image || undefined,
        type: formData.type,
        productIds: [],
      }

      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const collection = await response.json()
        toast({
          title: "הצלחה",
          description: "הקולקציה נוצרה בהצלחה",
        })
        router.push(`/collections/${collection.id}/edit`)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת הקולקציה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating collection:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת הקולקציה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!selectedShop) {
    return (
      <AppLayout title="קולקציה חדשה">
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני יצירת קולקציה
          </p>
          <Button onClick={() => router.push("/collections")}>
            חזור לרשימת קולקציות
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="קולקציה חדשה">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">קולקציה חדשה</h1>
            <p className="text-gray-600 mt-1">
              צור קולקציה חדשה לחנות: <span className="font-semibold">{selectedShop.name}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/collections")}
              disabled={saving}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="prodify-gradient text-white"
            >
              <Save className="w-4 h-4 ml-2" />
              {saving ? "שומר..." : "שמור קולקציה"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  מידע בסיסי
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם קולקציה *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                        slug: prev.slug || generateSlug(e.target.value),
                      }))
                    }}
                    placeholder="לדוגמה: קולקציית קיץ"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="summer-collection"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="תיאור הקולקציה..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">סוג קולקציה</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "MANUAL" | "AUTOMATIC") =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">ידני</SelectItem>
                      <SelectItem value="AUTOMATIC">אוטומטי</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  תמונה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.image ? (
                  <div className="relative">
                    <img
                      src={formData.image}
                      alt="קולקציה"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                      className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-64 cursor-pointer hover:border-gray-400 transition-colors">
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">העלה תמונה</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>סטטוס</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="isPublished"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isPublished: checked as boolean }))
                    }
                  />
                  <Label htmlFor="isPublished" className="cursor-pointer">
                    פורסם
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

