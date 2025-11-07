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
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Save, FileText, Search } from "lucide-react"

export default function NewPagePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    seoTitle: "",
    seoDescription: "",
    isPublished: false,
    showInMenu: false,
  })

  const generateSlug = (title: string) => {
    return title
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

    if (!formData.title.trim()) {
      toast({
        title: "שגיאה",
        description: "כותרת הדף היא חובה",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload: any = {
        shopId: selectedShop.id,
        title: formData.title.trim(),
        slug: formData.slug || generateSlug(formData.title),
        content: formData.content || undefined,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        isPublished: formData.isPublished,
        showInMenu: formData.showInMenu,
      }

      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const page = await response.json()
        toast({
          title: "הצלחה",
          description: "הדף נוצר בהצלחה",
        })
        router.push(`/pages/${page.id}/edit`)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת הדף",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating page:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת הדף",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!selectedShop) {
    return (
      <AppLayout title="דף חדש">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני יצירת דף
          </p>
          <Button onClick={() => router.push("/pages")}>
            חזור לרשימת דפים
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="דף חדש">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">דף חדש</h1>
            <p className="text-gray-600 mt-1">
              צור דף חדש לחנות: <span className="font-semibold">{selectedShop.name}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/pages")}
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
              {saving ? "שומר..." : "שמור דף"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  תוכן הדף
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">כותרת *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                        slug: prev.slug || generateSlug(e.target.value),
                      }))
                    }}
                    placeholder="לדוגמה: אודותינו"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="about-us"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">תוכן</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="תוכן הדף..."
                    rows={15}
                    className="font-sans"
                  />
                  <p className="text-sm text-gray-500">
                    בעתיד יתווסף Rich Text Editor מקצועי
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  SEO
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seoTitle">כותרת SEO</Label>
                  <Input
                    id="seoTitle"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, seoTitle: e.target.value }))}
                    placeholder="כותרת למנועי חיפוש"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seoDescription">תיאור SEO</Label>
                  <Textarea
                    id="seoDescription"
                    value={formData.seoDescription}
                    onChange={(e) => setFormData((prev) => ({ ...prev, seoDescription: e.target.value }))}
                    placeholder="תיאור קצר למנועי חיפוש"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>הגדרות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isPublished" className="cursor-pointer">
                    פורסם
                  </Label>
                  <Switch
                    id="isPublished"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isPublished: checked as boolean }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showInMenu" className="cursor-pointer">
                    הצג בתפריט
                  </Label>
                  <Switch
                    id="showInMenu"
                    checked={formData.showInMenu}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, showInMenu: checked as boolean }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

