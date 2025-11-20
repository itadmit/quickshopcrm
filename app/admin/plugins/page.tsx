"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  Plug,
  Edit,
  Trash2,
  Plus,
  Save,
  X,
  Shield,
  DollarSign,
  Package,
  Search,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Plugin {
  id: string
  slug: string
  name: string
  description?: string
  icon?: string
  version: string
  type: "CORE" | "SCRIPT"
  category: string
  isFree: boolean
  price?: number
  currency: string
  isEditable: boolean
  isDeletable: boolean
  adminNotes?: string
  displayOrder: number
}

export default function AdminPluginsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    isFree: true,
    adminNotes: "",
    displayOrder: 0,
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated" && session?.user?.role !== "SUPER_ADMIN") {
      toast({
        title: "אין הרשאה",
        description: "דף זה מיועד למנהלי מערכת בלבד",
        variant: "destructive",
      })
      router.push("/dashboard")
      return
    }

    if (status === "authenticated") {
      fetchPlugins()
    }
  }, [status, session, router])

  const fetchPlugins = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/plugins")
      if (response.ok) {
        const data = await response.json()
        setPlugins(data)
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את התוספים",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching plugins:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת התוספים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (plugin: Plugin) => {
    if (!plugin.isEditable) {
      toast({
        title: "לא ניתן לערוך",
        description: "תוסף זה לא ניתן לעריכה",
        variant: "destructive",
      })
      return
    }

    setEditingPlugin(plugin)
    setFormData({
      name: plugin.name,
      description: plugin.description || "",
      price: plugin.price?.toString() || "",
      isFree: plugin.isFree,
      adminNotes: plugin.adminNotes || "",
      displayOrder: plugin.displayOrder,
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingPlugin) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/plugins/${editingPlugin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: formData.isFree ? null : parseFloat(formData.price) || 0,
          isFree: formData.isFree,
          adminNotes: formData.adminNotes,
          displayOrder: formData.displayOrder,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "התוסף עודכן בהצלחה",
        })
        setIsDialogOpen(false)
        setEditingPlugin(null)
        await fetchPlugins()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לעדכן את התוסף",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving plugin:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת התוסף",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (plugin: Plugin) => {
    if (!plugin.isDeletable) {
      toast({
        title: "לא ניתן למחוק",
        description: "תוסף זה לא ניתן למחיקה",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`האם אתה בטוח שברצונך למחוק את התוסף "${plugin.name}"?`)) {
      return
    }

    setDeleting(plugin.id)
    try {
      const response = await fetch(`/api/admin/plugins/${plugin.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "התוסף נמחק בהצלחה",
        })
        await fetchPlugins()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן למחוק את התוסף",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting plugin:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת התוסף",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const filteredPlugins = plugins.filter((plugin) =>
    plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plugin.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (status === "loading" || loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  if (session?.user?.role !== "SUPER_ADMIN") {
    return null
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <Shield className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ניהול תוספים</h1>
              <p className="text-gray-600">ערוך, הוסף ומחק תוספים במערכת</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="חפש תוספים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Plugins List */}
        <div className="space-y-4">
          {filteredPlugins.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Plug className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">לא נמצאו תוספים</h3>
                <p className="text-gray-600">אין תוספים זמינים כרגע</p>
              </CardContent>
            </Card>
          ) : (
            filteredPlugins.map((plugin) => (
              <Card key={plugin.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{plugin.name}</h3>
                        <Badge variant="outline">{plugin.slug}</Badge>
                        <Badge 
                          variant="outline"
                          className={plugin.isFree 
                            ? "text-green-600 border-green-600 bg-green-50" 
                            : "text-emerald-700 border-emerald-200 bg-emerald-100"
                          }
                        >
                          {plugin.isFree ? "חינמי" : `₪${plugin.price?.toFixed(2) || "0.00"}/חודש`}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{plugin.description || "ללא תיאור"}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>סוג: {plugin.type === "CORE" ? "ליבה" : "סקריפט"}</span>
                        <span>קטגוריה: {plugin.category}</span>
                        <span>גרסה: {plugin.version}</span>
                        <span>סדר תצוגה: {plugin.displayOrder}</span>
                      </div>
                      {plugin.adminNotes && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                          <strong>הערות אדמין:</strong> {plugin.adminNotes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {plugin.isEditable && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(plugin)}
                        >
                          <Edit className="w-4 h-4 ml-2" />
                          ערוך
                        </Button>
                      )}
                      {plugin.isDeletable && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(plugin)}
                          disabled={deleting === plugin.id}
                        >
                          {deleting === plugin.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 ml-2"></div>
                              מוחק...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 ml-2" />
                              מחק
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>עריכת תוסף</DialogTitle>
              <DialogDescription>ערוך את פרטי התוסף</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">שם התוסף</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="שם התוסף"
                />
              </div>
              <div>
                <Label htmlFor="description">תיאור</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="תיאור התוסף"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isFree}
                    onCheckedChange={(checked) => setFormData({ ...formData, isFree: checked })}
                  />
                  <Label>תוסף חינמי</Label>
                </div>
              </div>
              {!formData.isFree && (
                <div>
                  <Label htmlFor="price">מחיר חודשי (₪)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="adminNotes">הערות אדמין</Label>
                <Textarea
                  id="adminNotes"
                  value={formData.adminNotes}
                  onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
                  placeholder="הערות פנימיות (לא יוצגו למשתמשים)"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="displayOrder">סדר תצוגה</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSave} disabled={saving} className="prodify-gradient text-white">
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    שמור
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

