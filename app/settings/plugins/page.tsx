"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { useShop } from "@/components/providers/ShopProvider"
import {
  Plug,
  Search,
  CheckCircle2,
  XCircle,
  Settings,
  Download,
  Trash2,
  Power,
  PowerOff,
  CreditCard,
  Calendar,
  Sparkles,
  TrendingUp,
  Package,
  MessageSquare,
  ShoppingBag,
  DollarSign,
  Globe,
  Zap,
  Filter,
  X,
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
  subscription?: {
    id: string
    status: string
    monthlyPrice: number
    nextBillingDate?: string
  }
  config?: any
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

const categoryIcons: Record<string, any> = {
  ANALYTICS: TrendingUp,
  MARKETING: Sparkles,
  PAYMENT: CreditCard,
  INVENTORY: Package,
  COMMUNICATION: MessageSquare,
  OPERATIONS: ShoppingBag,
  CUSTOMIZATION: Settings,
}

export default function PluginsPage() {
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [installing, setInstalling] = useState<string | null>(null)
  const [activating, setActivating] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<string | null>(null)

  useEffect(() => {
    fetchPlugins()
  }, [selectedShop])

  const fetchPlugins = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedShop?.id) {
        params.append("shopId", selectedShop.id)
      }
      const response = await fetch(`/api/plugins?${params}`)
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

  const handleInstall = async (plugin: Plugin) => {
    if (!plugin.isFree && !plugin.subscription) {
      // רכישת תוסף בתשלום
      setInstalling(plugin.slug)
      try {
        const params = new URLSearchParams()
        if (selectedShop?.id) params.append("shopId", selectedShop.id)
        const response = await fetch(`/api/plugins/${plugin.slug}/subscribe?${params}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        if (response.ok) {
          const data = await response.json()
          
          // אם יש paymentLink - מעבר לדף תשלום
          if (data.paymentLink) {
            window.location.href = data.paymentLink
            return
          }

          // אם אין paymentLink - התוסף הופעל ישירות
          toast({
            title: "הצלחה",
            description: data.message || `התוסף "${plugin.name}" הופעל בהצלחה`,
          })
          await fetchPlugins()
          // עדכון ה-sidebar
          window.dispatchEvent(new Event('plugin-updated'))
        } else {
          const error = await response.json()
          toast({
            title: "שגיאה",
            description: error.error || "לא ניתן לרכוש את התוסף",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error subscribing to plugin:", error)
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה ברכישת התוסף",
          variant: "destructive",
        })
      } finally {
        setInstalling(null)
      }
      return
    }

    setInstalling(plugin.slug)
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
        await fetchPlugins()
        // עדכון ה-sidebar
        window.dispatchEvent(new Event('plugin-updated'))
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
    } finally {
      setInstalling(null)
    }
  }

  const handleActivate = async (plugin: Plugin) => {
    if (!plugin.isFree && !plugin.subscription) {
      toast({
        title: "שגיאה",
        description: "יש להירשם למנוי כדי להפעיל תוסף בתשלום",
        variant: "destructive",
      })
      return
    }

    setActivating(plugin.slug)
    try {
      const params = new URLSearchParams()
      if (selectedShop?.id) params.append("shopId", selectedShop.id)
      const response = await fetch(`/api/plugins/${plugin.slug}/activate?${params}`, {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: `התוסף "${plugin.name}" הופעל בהצלחה`,
        })
        await fetchPlugins()
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
      setActivating(null)
    }
  }

  const handleDeactivate = async (plugin: Plugin) => {
    setDeactivating(plugin.slug)
    try {
      const params = new URLSearchParams()
      if (selectedShop?.id) params.append("shopId", selectedShop.id)
      const response = await fetch(`/api/plugins/${plugin.slug}/activate?${params}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: `התוסף "${plugin.name}" בוטל בהצלחה`,
        })
        await fetchPlugins()
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
      setDeactivating(null)
    }
  }

  const handleUninstall = async (plugin: Plugin) => {
    if (!confirm(`האם אתה בטוח שברצונך להסיר את התוסף "${plugin.name}"?`)) {
      return
    }

    try {
      const params = new URLSearchParams()
      if (selectedShop?.id) params.append("shopId", selectedShop.id)
      const response = await fetch(`/api/plugins/${plugin.slug}?${params}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: `התוסף "${plugin.name}" הוסר בהצלחה`,
        })
        // רענון רשימת התוספים
        await fetchPlugins()
        // עדכון ה-sidebar
        window.dispatchEvent(new Event('plugin-updated'))
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

  const filteredPlugins = plugins.filter((plugin) => {
    const matchesSearch =
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.slug.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = !selectedCategory || plugin.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(plugins.map((p) => p.category)))

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">מרקטפלייס תוספים</h1>
              <p className="text-gray-600 mt-2">גלה והתקן תוספים להרחבת הפונקציונליות</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">מרקטפלייס תוספים</h1>
            <p className="text-gray-600 mt-2">גלה והתקן תוספים להרחבת הפונקציונליות</p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="חפש תוספים..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  <Filter className="w-4 h-4 ml-2" />
                  הכל
                </Button>
                {categories.map((category) => {
                  const Icon = categoryIcons[category] || Plug
                  return (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                    >
                      <Icon className="w-4 h-4 ml-2" />
                      {categoryLabels[category] || category}
                    </Button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plugins Grid */}
        {filteredPlugins.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Plug className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">לא נמצאו תוספים</h3>
              <p className="text-gray-600">
                {searchQuery || selectedCategory
                  ? "נסה לשנות את החיפוש או הסינון"
                  : "אין תוספים זמינים כרגע"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlugins.map((plugin) => {
              const CategoryIcon = categoryIcons[plugin.category] || Plug
              return (
                <Card key={plugin.slug} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {plugin.icon ? (
                          <img src={plugin.icon} alt={plugin.name} className="w-10 h-10 rounded-lg" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <CategoryIcon className="w-5 h-5 text-emerald-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <CardTitle className="text-lg">{plugin.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {categoryLabels[plugin.category] || plugin.category}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                plugin.type === "CORE" 
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                                  : "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                            >
                              {plugin.type === "CORE" ? "ליבה" : "סקריפט"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-sm">{plugin.description || "ללא תיאור"}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-3 flex-1">
                      {/* Pricing */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">מחיר:</span>
                        <div className="flex items-center gap-2">
                          {plugin.isFree ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              חינמי
                            </Badge>
                          ) : (
                            <span className="font-semibold text-gray-900">
                              ₪{plugin.price?.toFixed(2) || "0.00"}/חודש
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Subscription Status */}
                      {plugin.subscription && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900">מנוי פעיל</span>
                          </div>
                          {plugin.subscription.nextBillingDate && (
                            <p className="text-xs text-green-700">
                              חיוב הבא: {new Date(plugin.subscription.nextBillingDate).toLocaleDateString("he-IL")}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">סטטוס:</span>
                        {plugin.isInstalled ? (
                          plugin.isActive ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3 ml-1" />
                              פעיל
                            </Badge>
                          ) : (
                            <Badge variant="outline">מותקן</Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            לא מותקן
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 mt-4 pt-4 border-t">
                      {!plugin.isInstalled ? (
                        <Button
                          onClick={() => handleInstall(plugin)}
                          disabled={installing === plugin.slug}
                          className="w-full prodify-gradient text-white"
                        >
                          {installing === plugin.slug ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                              מתקין...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 ml-2" />
                              התקן
                            </>
                          )}
                        </Button>
                      ) : (
                        <>
                          {plugin.isActive ? (
                            <Button
                              variant="outline"
                              onClick={() => handleDeactivate(plugin)}
                              disabled={deactivating === plugin.slug}
                              className="w-full"
                            >
                              {deactivating === plugin.slug ? (
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
                              onClick={() => handleActivate(plugin)}
                              disabled={activating === plugin.slug}
                              className="w-full prodify-gradient text-white"
                            >
                              {activating === plugin.slug ? (
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
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" asChild>
                              <Link href={`/settings/plugins/${plugin.slug}`}>
                                <Settings className="w-4 h-4 ml-1" />
                                הגדרות
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleUninstall(plugin)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
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

