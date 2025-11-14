"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
import { Save, Gift, DollarSign, Mail, User, Calendar, MessageSquare } from "lucide-react"

export default function EditGiftCardPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const giftCardId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    code: "",
    amount: "",
    recipientEmail: "",
    recipientName: "",
    senderName: "",
    message: "",
    expiresAt: "",
    isActive: true,
  })

  useEffect(() => {
    if (giftCardId) {
      fetchGiftCard()
    }
  }, [giftCardId])

  const fetchGiftCard = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/gift-cards/${giftCardId}`)
      if (response.ok) {
        const card = await response.json()
        
        let expiresAtFormatted = ""
        if (card.expiresAt) {
          const date = new Date(card.expiresAt)
          expiresAtFormatted = date.toISOString().slice(0, 10)
        }

        setFormData({
          code: card.code || "",
          amount: card.amount?.toString() || "",
          recipientEmail: card.recipientEmail || "",
          recipientName: card.recipientName || "",
          senderName: card.senderName || "",
          message: card.message || "",
          expiresAt: expiresAtFormatted,
          isActive: card.isActive ?? true,
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את כרטיס המתנה",
          variant: "destructive",
        })
        router.push("/gift-cards")
      }
    } catch (error) {
      console.error("Error fetching gift card:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת כרטיס המתנה",
        variant: "destructive",
      })
      router.push("/gift-cards")
    } finally {
      setLoading(false)
    }
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
        code: formData.code || undefined,
        amount: parseFloat(formData.amount),
        recipientEmail: formData.recipientEmail,
        recipientName: formData.recipientName || undefined,
        senderName: formData.senderName || undefined,
        message: formData.message || undefined,
        expiresAt: formData.expiresAt || undefined,
        isActive: formData.isActive,
      }

      const response = await fetch(`/api/gift-cards/${giftCardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "כרטיס המתנה עודכן בהצלחה",
        })
        fetchGiftCard()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בעדכון כרטיס המתנה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating gift card:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון כרטיס המתנה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="עריכת כרטיס מתנה">
        <FormSkeleton />
      </AppLayout>
    )
  }

  if (!selectedShop) {
    return (
      <AppLayout title="עריכת כרטיס מתנה">
        <div className="text-center py-12">
          <Gift className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני עריכת כרטיס מתנה
          </p>
          <Button onClick={() => router.push("/gift-cards")}>
            חזור לרשימת כרטיסי מתנה
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="עריכת כרטיס מתנה">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">עריכת כרטיס מתנה</h1>
            <p className="text-gray-600 mt-1">
              ערוך כרטיס מתנה לחנות: <span className="font-semibold">{selectedShop.name}</span>
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
              {saving ? "שומר..." : "שמור שינויים"}
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
                  <Label htmlFor="code">קוד</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-gray-500">
                    קוד כרטיס המתנה לא ניתן לשינוי
                  </p>
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
                    value={formData.expiresAt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))}
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
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked as boolean }))
                    }
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    כרטיס פעיל
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

