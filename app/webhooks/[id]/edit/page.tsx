"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
import { Save, Webhook, Globe, X } from "lucide-react"

const AVAILABLE_EVENTS = [
  "order.created",
  "order.updated",
  "order.paid",
  "order.shipped",
  "order.delivered",
  "order.cancelled",
  "customer.created",
  "customer.updated",
  "product.created",
  "product.updated",
  "cart.abandoned",
  "cart.recovered",
]

export default function EditWebhookPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop, shops } = useShop()
  const webhookId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    url: "",
    events: [] as string[],
    isActive: true,
  })

  useEffect(() => {
    if (webhookId) {
      fetchWebhook()
    }
  }, [webhookId])

  const fetchWebhook = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/webhooks/${webhookId}`)
      if (response.ok) {
        const webhook = await response.json()
        
        setFormData({
          url: webhook.url || "",
          events: webhook.events || [],
          isActive: webhook.isActive ?? true,
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את ה-Webhook",
          variant: "destructive",
        })
        router.push("/webhooks")
      }
    } catch (error) {
      console.error("Error fetching webhook:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת ה-Webhook",
        variant: "destructive",
      })
      router.push("/webhooks")
    } finally {
      setLoading(false)
    }
  }

  const toggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }))
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

    if (!formData.url.trim()) {
      toast({
        title: "שגיאה",
        description: "URL הוא חובה",
        variant: "destructive",
      })
      return
    }

    if (!formData.url.startsWith("http://") && !formData.url.startsWith("https://")) {
      toast({
        title: "שגיאה",
        description: "URL חייב להתחיל ב-http:// או https://",
        variant: "destructive",
      })
      return
    }

    if (formData.events.length === 0) {
      toast({
        title: "שגיאה",
        description: "יש לבחור לפחות אירוע אחד",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload: any = {
        shopId: selectedShop.id,
        url: formData.url.trim(),
        events: formData.events,
        isActive: formData.isActive,
      }

      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "ה-Webhook עודכן בהצלחה",
        })
        fetchWebhook()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת ה-Webhook",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating webhook:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת ה-Webhook",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="עריכת Webhook">
        <FormSkeleton />
      </AppLayout>
    )
  }

  // אם אין חנות נבחרת, נשתמש בחנות הראשונה
  const shopToUse = selectedShop || shops[0]
  
  if (!shopToUse) {
    return (
      <AppLayout title="עריכת Webhook">
        <div className="text-center py-12">
          <Webhook className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            לא נמצאה חנות
          </h3>
          <p className="text-gray-600 mb-4">
            אנא צור חנות תחילה
          </p>
          <Button onClick={() => router.push("/webhooks")}>
            חזור לרשימת Webhooks
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="עריכת Webhook">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">עריכת Webhook</h1>
            <p className="text-gray-600 mt-1">
              ערוך Webhook לקבלת עדכונים על אירועים בחנות
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/webhooks")}
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
              {saving ? "שומר..." : "שמור"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  פרטי Webhook
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com/webhook"
                  />
                  <p className="text-sm text-gray-500">
                    כתובת ה-URL שיקבל את ה-Webhook
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>אירועים *</Label>
                  <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg">
                    {AVAILABLE_EVENTS.map((event) => (
                      <div
                        key={event}
                        className="flex items-center space-x-2 space-x-reverse"
                      >
                        <Checkbox
                          id={event}
                          checked={formData.events.includes(event)}
                          onCheckedChange={() => toggleEvent(event)}
                        />
                        <Label
                          htmlFor={event}
                          className="cursor-pointer text-sm flex-1"
                        >
                          {event}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.events.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.events.map((event) => (
                        <Badge
                          key={event}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {event}
                          <button
                            onClick={() => toggleEvent(event)}
                            className="hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked as boolean }))
                    }
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Webhook פעיל
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>מידע</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-600">
                <p>
                  Webhook מאפשר לקבל עדכונים בזמן אמת על אירועים בחנות.
                </p>
                <p>
                  כאשר אירוע נבחר מתרחש, המערכת תשלח POST request ל-URL שצוין.
                </p>
                <p>
                  ה-Webhook יכלול את פרטי האירוע ב-JSON format.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

