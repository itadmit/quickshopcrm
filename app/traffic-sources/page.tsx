"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Link as LinkIcon,
  Loader2,
  ExternalLink,
  FileText,
  MoreVertical,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

interface TrafficSource {
  id: string
  name: string
  uniqueId: string
  medium: string | null
  campaign: string | null
  referralLink: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    orders: number
  }
}

export default function TrafficSourcesPage() {
  const router = useRouter()
  const { selectedShop } = useShop()
  const { toast } = useToast()
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<TrafficSource | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    uniqueId: "",
    medium: "",
    campaign: "",
    referralLink: "",
  })

  useEffect(() => {
    if (selectedShop) {
      fetchTrafficSources()
    }
  }, [selectedShop])

  const fetchTrafficSources = async () => {
    if (!selectedShop) return
    setLoading(true)
    try {
      const response = await fetch(`/api/traffic-sources?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setTrafficSources(data.trafficSources || [])
      }
    } catch (error) {
      console.error("Error fetching traffic sources:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את מקורות התנועה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (source?: TrafficSource) => {
    if (source) {
      setEditingSource(source)
      setFormData({
        name: source.name,
        uniqueId: source.uniqueId,
        medium: source.medium || "",
        campaign: source.campaign || "",
        referralLink: source.referralLink || "",
      })
    } else {
      setEditingSource(null)
      setFormData({
        name: "",
        uniqueId: "",
        medium: "",
        campaign: "",
        referralLink: "",
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingSource(null)
    setFormData({
      name: "",
      uniqueId: "",
      medium: "",
      campaign: "",
      referralLink: "",
    })
  }

  const handleSubmit = async () => {
    if (!selectedShop) return

    if (!formData.name || !formData.uniqueId) {
      toast({
        title: "שגיאה",
        description: "נא למלא שם ומזהה ייחודי",
        variant: "destructive",
      })
      return
    }

    try {
      const url = editingSource
        ? `/api/traffic-sources/${editingSource.id}`
        : "/api/traffic-sources"
      const method = editingSource ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShop.id,
          ...formData,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: editingSource
            ? "מקור התנועה עודכן בהצלחה"
            : "מקור התנועה נוצר בהצלחה",
        })
        handleCloseDialog()
        fetchTrafficSources()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving traffic source:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירה",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את מקור התנועה הזה?")) {
      return
    }

    try {
      const response = await fetch(`/api/traffic-sources/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "מקור התנועה נמחק בהצלחה",
        })
        fetchTrafficSources()
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו למחוק את מקור התנועה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting traffic source:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקה",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (source: TrafficSource) => {
    try {
      const response = await fetch(`/api/traffic-sources/${source.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !source.isActive,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: `מקור התנועה ${!source.isActive ? "הופעל" : "הושבת"}`,
        })
        fetchTrafficSources()
      }
    } catch (error) {
      console.error("Error toggling traffic source:", error)
    }
  }

  const generateReferralLink = () => {
    if (!selectedShop) return ""
    const baseUrl = selectedShop.domain
      ? `https://${selectedShop.domain}`
      : `https://${selectedShop.slug}.quickshop.co.il`
    
    const params = new URLSearchParams()
    params.append("utm_source", formData.uniqueId)
    if (formData.medium) params.append("utm_medium", formData.medium)
    if (formData.campaign) params.append("utm_campaign", formData.campaign)
    
    return `${baseUrl}?${params.toString()}`
  }

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast({
      title: "הועתק",
      description: "הלינק הועתק ללוח",
    })
  }

  if (!selectedShop) {
    return (
      <AppLayout>
        <div className="p-6">
          <p className="text-gray-500">נא לבחור חנות</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ניהול מקורות תנועה</h1>
            <p className="text-gray-500 mt-1">
              נהל את מקורות התנועה והפניות לאתר שלך
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => router.push("/traffic-sources/reports")} 
              variant="outline"
            >
              <FileText className="w-4 h-4 ml-2" />
              דוחות ואנליטיקה
            </Button>
            <Button onClick={() => handleOpenDialog()} className="prodify-gradient text-white">
              <Plus className="w-4 h-4 ml-2" />
              הוסף מקור תנועה
            </Button>
          </div>
        </div>

        {/* Traffic Sources List */}
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
              </div>
            </CardContent>
          </Card>
        ) : trafficSources.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <LinkIcon className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-500 font-medium">
                    אין מקורות תנועה רשומים
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    הוסף מקור תנועה ראשון!
                  </p>
                </div>
                <Button onClick={() => handleOpenDialog()} variant="outline">
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף מקור תנועה
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        שם
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        מזהה ייחודי
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        מדיום
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        קמפיין
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        לינק הפניה
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        הזמנות
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        תאריך יצירה
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        פעולות
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {trafficSources.map((source) => (
                      <tr key={source.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{source.name}</span>
                            {source.isActive ? (
                              <Badge variant="default" className="bg-green-500">
                                פעיל
                              </Badge>
                            ) : (
                              <Badge variant="secondary">לא פעיל</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {source.uniqueId}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {source.medium || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {source.campaign || "-"}
                        </td>
                        <td className="px-6 py-4">
                          {source.referralLink ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={source.referralLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                צפה בלינק
                              </a>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyLink(source.referralLink!)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {source._count.orders}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(source.createdAt).toLocaleDateString("he-IL")}
                        </td>
                        <td className="px-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleOpenDialog(source)}
                              >
                                <Edit className="w-4 h-4 ml-2" />
                                ערוך
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(source)}
                              >
                                {source.isActive ? "השבת" : "הפעל"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(source.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 ml-2" />
                                מחק
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSource ? "ערוך מקור תנועה" : "הוסף מקור תנועה חדש"}
              </DialogTitle>
              <DialogDescription>
                {editingSource
                  ? "עדכן את פרטי מקור התנועה"
                  : "צור מקור תנועה חדש למעקב אחר הפניות"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>שם מקור התנועה *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="לדוגמה: משפיען אינסטגרם, בלוגר יוטיוב"
                />
              </div>

              <div>
                <Label>מזהה ייחודי (UTM Source) *</Label>
                <Input
                  value={formData.uniqueId}
                  onChange={(e) =>
                    setFormData({ ...formData, uniqueId: e.target.value })
                  }
                  placeholder="לדוגמה: influencer123, blogger_name"
                />
                <p className="text-sm text-gray-500 mt-1">
                  המזהה ישמש ב-UTM Source להפניות
                </p>
              </div>

              <div>
                <Label>מדיום (UTM Medium)</Label>
                <Select
                  value={formData.medium}
                  onValueChange={(value) =>
                    setFormData({ ...formData, medium: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מדיום" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social">Social (רשתות חברתיות)</SelectItem>
                    <SelectItem value="email">Email (אימייל)</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="referral">Referral (הפניה)</SelectItem>
                    <SelectItem value="organic">Organic (אורגני)</SelectItem>
                    <SelectItem value="cpc">CPC (תשלום לפי קליק)</SelectItem>
                    <SelectItem value="display">Display (באנרים)</SelectItem>
                    <SelectItem value="affiliate">Affiliate (שותפים)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>קמפיין (UTM Campaign)</Label>
                <Input
                  value={formData.campaign}
                  onChange={(e) =>
                    setFormData({ ...formData, campaign: e.target.value })
                  }
                  placeholder="לדוגמה: sale, product_review"
                />
              </div>

              <div>
                <Label>לינק הפניה (אופציונלי)</Label>
                <Input
                  value={formData.referralLink}
                  onChange={(e) =>
                    setFormData({ ...formData, referralLink: e.target.value })
                  }
                  placeholder="https://example.com?utm_source=..."
                />
              </div>

              {/* Link Preview */}
              {formData.uniqueId && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <Label className="text-sm font-medium mb-2 block">
                    תצוגה מקדימה של הלינק:
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-white p-2 rounded border break-all">
                      {generateReferralLink()}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(generateReferralLink())}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                ביטול
              </Button>
              <Button onClick={handleSubmit}>
                {editingSource ? "עדכן" : "הוסף מקור תנועה"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

