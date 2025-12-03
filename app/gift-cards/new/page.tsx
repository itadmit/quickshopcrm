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
import { Checkbox } from "@/components/ui/checkbox"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Save, Gift, DollarSign, Mail, User, Calendar, MessageSquare } from "lucide-react"

export default function NewGiftCardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop, shops } = useShop()
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    code: "",
    amount: "",
    recipientEmail: "",
    recipientName: "",
    senderName: "",
    message: "",
    endDate: "",
    sendEmail: true, // ברירת מחדל - לשלוח מייל
  })

  const handleSubmit = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) {
      toast({
        title: "שגיאה",
        description: "יש לבחור חנות מההדר",
        variant: "destructive",
      })
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "שגיאה",
        description: "סכום חייב להיות חיובי",
        variant: "destructive",
      })
      return
    }

    if (!formData.recipientEmail) {
      toast({
        title: "שגיאה",
        description: "אימייל נמען הוא חובה",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload: any = {
        shopId: shopToUse.id,
        code: formData.code || undefined,
        amount: parseFloat(formData.amount),
        recipientEmail: formData.recipientEmail,
        recipientName: formData.recipientName || undefined,
        senderName: formData.senderName || undefined,
        message: formData.message || undefined,
        expiresAt: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        sendEmail: formData.sendEmail, // האם לשלוח מייל
      }

      const response = await fetch("/api/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "כרטיס המתנה נוצר בהצלחה",
        })
        router.push("/gift-cards")
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת כרטיס המתנה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating gift card:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת כרטיס המתנה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // אם אין חנות נבחרת, נשתמש בחנות הראשונה
  const shopToUse = selectedShop || shops[0]
  
  if (!shopToUse) {
    return (
      <AppLayout title="כרטיס מתנה חדש">
        <div className="text-center py-12">
          <Gift className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            לא נמצאה חנות
          </h3>
          <p className="text-gray-600 mb-4">
            אנא צור חנות תחילה
          </p>
          <Button onClick={() => router.push("/gift-cards")}>
            חזור לרשימת כרטיסי מתנה
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="כרטיס מתנה חדש">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">כרטיס מתנה חדש</h1>
            <p className="text-gray-600 mt-1">
              צור כרטיס מתנה לחנות: <span className="font-semibold">{selectedShop?.name || "לא נבחרה חנות"}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/gift-cards")}
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
              {saving ? "שומר..." : "שמור כרטיס מתנה"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  פרטי כרטיס מתנה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">קוד (אופציונלי)</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="השאר ריק ליצירה אוטומטית"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">סכום *</Label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">₪</span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="100.00"
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">תאריך תפוגה</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  פרטי נמען
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">אימייל נמען *</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, recipientEmail: e.target.value }))}
                    placeholder="recipient@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientName">שם נמען</Label>
                  <Input
                    id="recipientName"
                    value={formData.recipientName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, recipientName: e.target.value }))}
                    placeholder="שם הנמען"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senderName">שם שולח</Label>
                  <Input
                    id="senderName"
                    value={formData.senderName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, senderName: e.target.value }))}
                    placeholder="שם השולח"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">הודעה אישית</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="הודעה אישית לנמען..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="sendEmail"
                      checked={formData.sendEmail}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, sendEmail: !!checked }))}
                    />
                    <Label htmlFor="sendEmail" className="cursor-pointer">
                      שלח מייל לנמען עם פרטי כרטיס המתנה
                    </Label>
                  </div>
                  <p className="text-sm text-gray-500 mr-6">
                    אם מסומן, מייל עם פרטי כרטיס המתנה יישלח אוטומטית לנמען
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

