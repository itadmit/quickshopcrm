"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { ArrowRight, Save } from "lucide-react"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"

const PLATFORMS = [
  { value: "FACEBOOK", label: "פייסבוק פיקסל" },
  { value: "GOOGLE_TAG_MANAGER", label: "גוגל טאג מנג'ר" },
  { value: "GOOGLE_ANALYTICS", label: "גוגל אנליטיקס" },
  { value: "TIKTOK", label: "טיקטוק פיקסל" },
]

const ALL_EVENTS = [
  "PageView",
  "ViewContent",
  "SelectVariant",
  "AddToWishlist",
  "RemoveFromWishlist",
  "AddToCart",
  "RemoveFromCart",
  "ViewCart",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
  "SignUp",
  "Login",
  "Search",
]

export default function NewTrackingPixelPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop, loading: shopsLoading } = useShop()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    platform: "",
    pixelId: "",
    accessToken: "",
    isActive: true,
    events: [...ALL_EVENTS] as string[],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedShop) {
      toast({
        title: "שגיאה",
        description: "אנא בחר חנות",
        variant: "destructive",
      })
      return
    }

    if (!formData.platform || !formData.pixelId) {
      toast({
        title: "שגיאה",
        description: "אנא מלא את כל השדות הנדרשים",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/tracking-pixels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShop?.id || "",
          ...formData,
          accessToken: formData.accessToken || null,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "פיקסל נוצר בהצלחה",
        })
        router.push("/tracking-pixels")
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן ליצור פיקסל",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating pixel:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן ליצור פיקסל",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleEvent = (eventName: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(eventName)
        ? prev.events.filter((e: any) => e !== eventName)
        : [...prev.events, eventName],
    }))
  }

  if (shopsLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <FormSkeleton />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            חזרה
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">פיקסל חדש</h1>
          <p className="text-gray-600 mt-2">
            הוסף פיקסל חדש למעקב אחר האירועים בחנות שלך
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>פרטי פיקסל</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="platform">פלטפורמה *</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, platform: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר פלטפורמה" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((platform: any) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pixelId">
                  {formData.platform === "GOOGLE_TAG_MANAGER"
                    ? "Container ID *"
                    : formData.platform === "GOOGLE_ANALYTICS"
                    ? "Measurement ID (GA4) *"
                    : "Pixel ID *"}
                </Label>
                <Input
                  id="pixelId"
                  value={formData.pixelId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, pixelId: e.target.value }))
                  }
                  placeholder={
                    formData.platform === "GOOGLE_TAG_MANAGER"
                      ? "GTM-XXXXXXX"
                      : formData.platform === "GOOGLE_ANALYTICS"
                      ? "G-XXXXXXXXXX"
                      : "הזן Pixel ID"
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="accessToken">
                  {formData.platform === "GOOGLE_ANALYTICS"
                    ? "API Secret (אופציונלי)"
                    : "Access Token (אופציונלי)"}
                </Label>
                <Input
                  id="accessToken"
                  type="password"
                  value={formData.accessToken}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      accessToken: e.target.value,
                    }))
                  }
                  placeholder="הזן Access Token (אופציונלי)"
                />
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    💡 למה להוסיף Access Token?
                  </p>
                  <p className="text-sm text-blue-800 mb-2">
                    הוספת Access Token מאפשרת שליחת אירועים דרך שרת (server-side tracking) במקום ישירות מהדפדפן. זה מספק:
                  </p>
                  <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-2">
                    <li>אמינות גבוהה יותר - אירועים נשלחים גם אם המשתמש חוסם cookies או ad blockers</li>
                    <li>דיוק גבוה יותר - פחות אובדן נתונים, כל האירועים מגיעים למעקב</li>
                    <li>ביצועים טובים יותר - פחות עומס על הדפדפן של המשתמש</li>
                    <li>מעקב מלא - גם אירועים שלא נשלחו מהדפדפן יגיעו למעקב</li>
                  </ul>
                  <div className="text-xs text-blue-700 mt-2">
                    {formData.platform === "FACEBOOK" && (
                      <p>
                        <strong>איך להשיג:</strong> Facebook Business Manager → Events Manager → 
                        בחר את הפיקסל שלך → Settings → Generate Access Token
                      </p>
                    )}
                    {formData.platform === "GOOGLE_ANALYTICS" && (
                      <p>
                        <strong>איך להשיג:</strong> Google Analytics → Admin → Data Streams → 
                        בחר את ה-stream שלך → Measurement Protocol API secrets → Create
                      </p>
                    )}
                    {formData.platform === "TIKTOK" && (
                      <p>
                        <strong>איך להשיג:</strong> TikTok Ads Manager → Assets → Events → 
                        בחר את הפיקסל שלך → Settings → Generate Access Token
                      </p>
                    )}
                    {formData.platform === "GOOGLE_TAG_MANAGER" && (
                      <p>
                        <strong>הערה:</strong> Google Tag Manager לא דורש Access Token לשליחה דרך שרת. 
                        האירועים יישלחו ישירות מהדפדפן דרך dataLayer.
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    <strong>הערה:</strong> אם לא תזין Access Token, האירועים יישלחו ישירות מהדפדפן (client-side) כמו קודם.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive">פעיל</Label>
                  <p className="text-sm text-gray-500">
                    הפיקסל יקבל אירועים רק אם הוא פעיל
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>

              <div>
                <Label>אירועים למעקב</Label>
                <p className="text-sm text-gray-500 mb-3">
                  בחר אירועים למעקב (כל האירועים מסומנים כברירת מחדל)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2" dir="ltr">
                  {ALL_EVENTS.map((event: any) => (
                    <label
                      key={event}
                      className="flex items-center flex-row-reverse gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50 text-left"
                    >
                      <input
                        type="checkbox"
                        checked={formData.events.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="rounded"
                      />
                      <span className="text-sm text-left flex-1">{event}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="prodify-gradient text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  שמור פיקסל
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  ביטול
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppLayout>
  )
}

