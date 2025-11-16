"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useShop } from "@/components/providers/ShopProvider"
import {
  ArrowRight,
  Save,
  Settings,
  Plug,
  Power,
  PowerOff,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Download,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface Plugin {
  id?: string
  slug: string
  name: string
  description?: string
  icon?: string
  version: string
  type: "CORE" | "SCRIPT"
  category: string
  isInstalled: boolean
  isActive: boolean
  isFree: boolean
  price?: number
  config?: any
  definition?: any
}

const categoryLabels: Record<string, string> = {
  ANALYTICS: "אנליטיקה",
  MARKETING: "שיווק",
  PAYMENT: "תשלום",
  INVENTORY: "מלאי",
  COMMUNICATION: "תקשורת",
  OPERATIONS: "פעילות",
  CUSTOMIZATION: "התאמה אישית",
}

export default function PluginSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const slug = params.slug as string

  const [plugin, setPlugin] = useState<Plugin | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [config, setConfig] = useState<any>({})

  useEffect(() => {
    fetchPlugin()
  }, [slug, selectedShop?.id])

  const fetchPlugin = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedShop?.id) {
        params.append("shopId", selectedShop.id)
      }
      const response = await fetch(`/api/plugins/${slug}?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPlugin(data)
        setConfig(data.config || data.definition?.defaultConfig || {})
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לטעון את התוסף",
          variant: "destructive",
        })
        router.push("/settings/plugins")
      }
    } catch (error) {
      console.error("Error fetching plugin:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת התוסף",
        variant: "destructive",
      })
      router.push("/settings/plugins")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!plugin) return

    // אם התוסף לא מותקן, צריך להתקין אותו קודם
    if (!plugin.isInstalled) {
      toast({
        title: "שגיאה",
        description: "יש להתקין את התוסף לפני שמירת הגדרות",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const params = new URLSearchParams()
      if (selectedShop?.id) params.append("shopId", selectedShop.id)
      const response = await fetch(`/api/plugins/${slug}?${params}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "ההגדרות נשמרו בהצלחה",
        })
        await fetchPlugin()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לשמור את ההגדרות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving config:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת ההגדרות",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleActivate = async () => {
    if (!plugin) return

    // אם התוסף לא מותקן, צריך להתקין אותו קודם
    if (!plugin.isInstalled) {
      toast({
        title: "שגיאה",
        description: "יש להתקין את התוסף לפני הפעלה",
        variant: "destructive",
      })
      return
    }

    if (!plugin.isFree && !plugin.isInstalled) {
      toast({
        title: "שגיאה",
        description: "יש להירשם למנוי כדי להפעיל תוסף בתשלום",
        variant: "destructive",
      })
      return
    }

    setActivating(true)
    try {
      const params = new URLSearchParams()
      if (selectedShop?.id) params.append("shopId", selectedShop.id)
      const response = await fetch(`/api/plugins/${slug}/activate?${params}`, {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: `התוסף "${plugin.name}" הופעל בהצלחה`,
        })
        await fetchPlugin()
        // עדכון ה-sidebar
        window.dispatchEvent(new Event('plugin-updated'))
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן להפעיל את התוסף",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error activating plugin:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהפעלת התוסף",
        variant: "destructive",
      })
    } finally {
      setActivating(false)
    }
  }

  const handleDeactivate = async () => {
    if (!plugin) return

    setDeactivating(true)
    try {
      const params = new URLSearchParams()
      if (selectedShop?.id) params.append("shopId", selectedShop.id)
      const response = await fetch(`/api/plugins/${slug}/activate?${params}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: `התוסף "${plugin.name}" בוטל בהצלחה`,
        })
        await fetchPlugin()
        // עדכון ה-sidebar
        window.dispatchEvent(new Event('plugin-updated'))
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לבטל את התוסף",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deactivating plugin:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בביטול התוסף",
        variant: "destructive",
      })
    } finally {
      setDeactivating(false)
    }
  }

  const handleUninstall = async () => {
    if (!plugin) return

    if (!confirm(`האם אתה בטוח שברצונך להסיר את התוסף "${plugin.name}"?`)) {
      return
    }

    try {
      const params = new URLSearchParams()
      if (selectedShop?.id) params.append("shopId", selectedShop.id)
      const response = await fetch(`/api/plugins/${slug}?${params}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: `התוסף "${plugin.name}" הוסר בהצלחה`,
        })
        // רענון הדף כדי לעדכן את המצב
        await fetchPlugin()
        // עדכון ה-sidebar
        window.dispatchEvent(new Event('plugin-updated'))
        router.push("/settings/plugins")
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן להסיר את התוסף",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error uninstalling plugin:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהסרת התוסף",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  if (!plugin) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">תוסף לא נמצא</h3>
            <p className="text-gray-600 mb-4">התוסף המבוקש לא נמצא במערכת</p>
            <Button variant="outline" asChild>
              <Link href="/settings/plugins">
                <ArrowRight className="w-4 h-4 ml-2 rotate-180" />
                חזור למרקטפלייס
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  // אם התוסף לא מותקן, נציג הודעה ונחזיר למרקטפלייס
  if (!plugin.isInstalled) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">התוסף לא מותקן</h3>
            <p className="text-gray-600 mb-4">
              יש להתקין את התוסף "{plugin.name}" לפני גישה להגדרות
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href="/settings/plugins">
                  <ArrowRight className="w-4 h-4 ml-2 rotate-180" />
                  חזור למרקטפלייס
                </Link>
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/plugins", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        slug: plugin.slug,
                        shopId: selectedShop?.id,
                      }),
                    })

                    if (response.ok) {
                      toast({
                        title: "הצלחה",
                        description: `התוסף "${plugin.name}" הותקן בהצלחה`,
                      })
                      router.push(`/settings/plugins/${plugin.slug}`)
                    } else {
                      const error = await response.json()
                      toast({
                        title: "שגיאה",
                        description: error.error || "לא ניתן להתקין את התוסף",
                        variant: "destructive",
                      })
                    }
                  } catch (error) {
                    console.error("Error installing plugin:", error)
                    toast({
                      title: "שגיאה",
                      description: "אירעה שגיאה בהתקנת התוסף",
                      variant: "destructive",
                    })
                  }
                }}
                className="prodify-gradient text-white"
              >
                <Download className="w-4 h-4 ml-2" />
                התקן עכשיו
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm sticky top-6">
            <div className="p-4 border-b border-gray-200">
              <Link href="/settings/plugins" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3">
                <ArrowRight className="w-4 h-4 rotate-180" />
                חזור למרקטפלייס
              </Link>
              <h2 className="text-lg font-semibold text-gray-900">הגדרות תוסף</h2>
              <p className="text-sm text-gray-500 mt-1">{plugin.name}</p>
            </div>
            <nav className="p-2">
              <div className="px-4 py-3 rounded-lg bg-purple-50 text-purple-700 font-medium border-r-2 border-purple-600">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 flex-shrink-0 text-purple-600" />
                  <span className="text-sm">הגדרות</span>
                </div>
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                {plugin.icon ? (
                  <img src={plugin.icon} alt={plugin.name} className="w-10 h-10 rounded-lg" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Plug className="w-5 h-5 text-purple-600" />
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{plugin.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {categoryLabels[plugin.category] || plugin.category}
                    </Badge>
                    <Badge 
                      variant="outline"
                      className="text-xs bg-purple-100 text-purple-700 border-purple-200"
                    >
                      {plugin.type === "CORE" ? "ליבה" : "סקריפט"}
                    </Badge>
                    {plugin.isActive ? (
                      <Badge className="text-xs bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 ml-1" />
                        פעיל
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        לא פעיל
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mt-2">{plugin.description || "ללא תיאור"}</p>
            </div>

            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>סטטוס התוסף</CardTitle>
                <CardDescription>ניהול הפעלה וכיבוי של התוסף</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">מצב נוכחי</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {plugin.isActive ? "התוסף פעיל ופועל" : "התוסף כבוי"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {plugin.isActive ? (
                      <Button
                        variant="outline"
                        onClick={handleDeactivate}
                        disabled={deactivating}
                      >
                        {deactivating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 ml-2"></div>
                            מבטל...
                          </>
                        ) : (
                          <>
                            <PowerOff className="w-4 h-4 ml-2" />
                            בטל
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleActivate}
                        disabled={activating}
                        className="prodify-gradient text-white"
                      >
                        {activating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                            מפעיל...
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4 ml-2" />
                            הפעל
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuration Card */}
            <Card>
              <CardHeader>
                <CardTitle>הגדרות התוסף</CardTitle>
                <CardDescription>התאם את התוסף לצרכים שלך</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!plugin.isInstalled && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900 mb-1">
                          התוסף לא מותקן
                        </p>
                        <p className="text-xs text-yellow-800">
                          יש להתקין את התוסף לפני שמירת הגדרות. ההגדרות יישמרו לאחר ההתקנה.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Google Analytics Config */}
                {plugin.slug === "google-analytics" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="trackingId">מזהה מעקב (Tracking ID)</Label>
                      <Input
                        id="trackingId"
                        value={config.trackingId || ""}
                        onChange={(e) => setConfig({ ...config, trackingId: e.target.value })}
                        placeholder="UA-XXXXXXXXX-X או G-XXXXXXXXXX"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        המזהה שתקבל מ-Google Analytics
                      </p>
                    </div>
                  </div>
                )}

                {/* WhatsApp Floating Button Config */}
                {plugin.slug === "whatsapp-floating" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="phoneNumber">מספר טלפון</Label>
                      <Input
                        id="phoneNumber"
                        value={config.phoneNumber || ""}
                        onChange={(e) => setConfig({ ...config, phoneNumber: e.target.value })}
                        placeholder="972501234567"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        מספר טלפון בפורמט בינלאומי (ללא +)
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="defaultMessage">הודעה ברירת מחדל</Label>
                      <Input
                        id="defaultMessage"
                        value={config.defaultMessage || ""}
                        onChange={(e) => setConfig({ ...config, defaultMessage: e.target.value })}
                        placeholder="שלום, אני מעוניין במוצר"
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">מיקום</Label>
                      <select
                        id="position"
                        value={config.position || "bottom-right"}
                        onChange={(e) => setConfig({ ...config, position: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="bottom-right">ימין תחתון</option>
                        <option value="bottom-left">שמאל תחתון</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Saturday Shutdown Config */}
                {plugin.slug === "saturday-shutdown" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.enabled !== false}
                        onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                      />
                      <Label>הפעל כיבוי אוטומטי בשבת</Label>
                    </div>
                    <div>
                      <Label htmlFor="message">הודעת כיבוי</Label>
                      <Textarea
                        id="message"
                        value={config.message || ""}
                        onChange={(e) => setConfig({ ...config, message: e.target.value })}
                        placeholder="האתר סגור בשבת. נשמח לראותכם מחר!"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {/* Cash on Delivery Config */}
                {plugin.slug === "cash-on-delivery" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.enabled !== false}
                        onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                      />
                      <Label>הפעל תשלום במזומן</Label>
                    </div>
                    <div>
                      <Label htmlFor="label">תווית</Label>
                      <Input
                        id="label"
                        value={config.label || ""}
                        onChange={(e) => setConfig({ ...config, label: e.target.value })}
                        placeholder="תשלום במזומן"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">תיאור</Label>
                      <Input
                        id="description"
                        value={config.description || ""}
                        onChange={(e) => setConfig({ ...config, description: e.target.value })}
                        placeholder="תשלום במזומן בעת המשלוח"
                      />
                    </div>
                  </div>
                )}

                {/* Generic Config - אם אין הגדרות ספציפיות */}
                {!["google-analytics", "whatsapp-floating", "saturday-shutdown", "cash-on-delivery"].includes(plugin.slug) && (
                  <div className="text-center py-8 text-gray-500">
                    <Info className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>לתוסף זה אין הגדרות נוספות</p>
                  </div>
                )}

                {/* Save Button */}
                {plugin.isInstalled && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      onClick={handleSaveConfig}
                      disabled={saving}
                      className="prodify-gradient text-white"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                          שומר...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 ml-2" />
                          שמור הגדרות
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plugin Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>מידע על התוסף</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">גרסה:</span>
                    <span className="text-sm font-medium">{plugin.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">סוג:</span>
                    <span className="text-sm font-medium">
                      {plugin.type === "CORE" ? "ליבה" : "סקריפט"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">קטגוריה:</span>
                    <span className="text-sm font-medium">
                      {categoryLabels[plugin.category] || plugin.category}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">מחיר:</span>
                    <span className="text-sm font-medium">
                      {plugin.isFree ? "חינמי" : `₪${plugin.price?.toFixed(2) || "0.00"}/חודש`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            {plugin.isInstalled && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-900">אזור מסוכן</CardTitle>
                  <CardDescription className="text-red-700">
                    פעולות בלתי הפיכות
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={handleUninstall}
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    הסר תוסף
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

