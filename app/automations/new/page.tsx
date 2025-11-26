"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import dynamic from "next/dynamic"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  Workflow,
  Save,
  X,
  Play,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Mail,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Dynamic import עם loading state לספרייה הכבדה
const AutomationFlowBuilder = dynamic(() => import("@/components/AutomationFlowBuilder"), {
  loading: () => (
    <Card>
      <CardContent className="p-8">
        <div className="flex items-center justify-center">
          <Workflow className="w-6 h-6 animate-spin text-gray-400" />
          <span className="mr-2 text-gray-500">טוען בונה זרימה...</span>
        </div>
      </CardContent>
    </Card>
  ),
  ssr: false,
})

export default function NewAutomationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const { selectedShop, shops } = useShop()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [trigger, setTrigger] = useState<{ type: string; filters?: any } | null>(null)
  const [conditions, setConditions] = useState<any[]>([])
  const [actions, setActions] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [sendingTestEmail, setSendingTestEmail] = useState(false)

  const eventTypes = [
    // Order events
    { value: "order.created", label: "הזמנה נוצרה" },
    { value: "order.paid", label: "הזמנה שולמה" },
    { value: "order.shipped", label: "הזמנה נשלחה" },
    
    // Cart events
    { value: "cart.abandoned", label: "עגלה ננטשה" },
    { value: "cart.recovered", label: "עגלה שוחזרה" },
    
    // Customer events
    { value: "customer.created", label: "לקוח נוצר" },
    { value: "customer.registered", label: "לקוח נרשם" },
    { value: "customer.logged_in", label: "לקוח התחבר" },
    { value: "customer.updated", label: "לקוח עודכן" },
    { value: "customer.tier_upgraded", label: "לקוח עלה רמה" },
  ]

  const handleSave = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) {
      toast({
        title: "שגיאה",
        description: "לא נמצאה חנות. אנא צור חנות תחילה.",
        variant: "destructive",
      })
      return
    }

    if (!name.trim()) {
      toast({
        title: "שגיאה",
        description: "שם האוטומציה חובה",
        variant: "destructive",
      })
      return
    }

    if (!trigger) {
      toast({
        title: "שגיאה",
        description: "יש לבחור טריגר",
        variant: "destructive",
      })
      return
    }

    if (actions.length === 0) {
      toast({
        title: "שגיאה",
        description: "יש להוסיף לפחות אקשן אחד",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const response = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shopToUse.id,
          name,
          description,
          isActive,
          trigger,
          conditions: conditions.length > 0 ? conditions : null,
          actions,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "הצלחה",
          description: "האוטומציה נוצרה בהצלחה",
        })
        router.push(`/automations/${data.id}`)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן ליצור את האוטומציה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating automation:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת האוטומציה",
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
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">לא נמצאה חנות</p>
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
            <h1 className="text-3xl font-bold text-gray-900">אוטומציה חדשה</h1>
            <p className="text-gray-500 mt-1">בנה אוטומציה חדשה לניהול אירועים בחנות שלך</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <X className="w-4 h-4 ml-2" />
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Workflow className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  שמור
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>פרטים בסיסיים</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
                onClick={() => {
                  // טעינת טמפלט לדוגמא - עגלה נטושה
                  setName("שחזור עגלה נטושה")
                  setDescription("אוטומציה לשחזור עגלות נטושות - שולחת מייל תזכורת ואם ההזמנה לא שולמה, יוצר קופון")
                  setTrigger({ type: "cart.abandoned" })
                  setConditions([
                    {
                      field: "order.status",
                      operator: "equals",
                      value: "COMPLETED",
                      thenActions: [
                        {
                          type: "end",
                          config: {}
                        }
                      ],
                      elseActions: [
                        {
                          type: "create_coupon",
                          config: {
                            type: "PERCENTAGE",
                            value: 10,
                            maxUses: 1,
                            usesPerCustomer: 1,
                            uniquePerCustomer: true
                          }
                        },
                        {
                          type: "send_email",
                          config: {
                            toType: "customer",
                            to: "{{customer.email}}",
                            subject: "קופון הנחה מיוחד בשבילך!",
                            template: `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #15b981 0%, #10b981 100%); padding: 30px 20px; text-align: center; color: white; }
    .content { padding: 30px 20px; color: #333; line-height: 1.6; }
    .coupon { background: #f0f9ff; border: 2px dashed #15b981; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .coupon-code { font-size: 32px; font-weight: bold; color: #15b981; margin: 10px 0; }
    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #15b981 0%, #10b981 100%); color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; }
    .footer { background-color: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>קופון הנחה מיוחד בשבילך!</h1>
    </div>
    <div class="content">
      <p>שלום {{customer.name}},</p>
      <p>אנחנו רוצים לראות אותך חוזר! קבל קופון הנחה של 10% על הקנייה הבאה שלך:</p>
      <div class="coupon">
        <div class="coupon-code">{{coupon.code}}</div>
        <p>10% הנחה</p>
      </div>
      <p>השתמש בקופון בקופה כדי לקבל את ההנחה!</p>
      <a href="{{cart.checkoutUrl}}" class="button">השלם את הקנייה</a>
    </div>
    <div class="footer">
      <p>הודעה זו נשלחה אוטומטית מ-Quick Shop</p>
    </div>
  </div>
</body>
</html>`
                          }
                        },
                        {
                          type: "end",
                          config: {}
                        }
                      ]
                    }
                  ])
                  setActions([
                    {
                      type: "delay",
                      config: { amount: 10, unit: "minutes" }
                    },
                    {
                      type: "send_email",
                      config: {
                        toType: "customer",
                        to: "{{customer.email}}",
                        subject: "השלמת הקנייה שלך ב-{{shop.name}}",
                        template: `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #15b981 0%, #10b981 100%); padding: 30px 20px; text-align: center; color: white; }
    .content { padding: 30px 20px; color: #333; line-height: 1.6; }
    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #15b981 0%, #10b981 100%); color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; }
    .footer { background-color: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>שלום {{customer.name}}!</h1>
    </div>
    <div class="content">
      <p>שמנו לב שהשארת עגלת קניות ב-{{shop.name}}.</p>
      <p>אנחנו כאן כדי לעזור לך להשלים את הקנייה!</p>
      <a href="{{cart.checkoutUrl}}" class="button">השלם את הקנייה</a>
    </div>
    <div class="footer">
      <p>הודעה זו נשלחה אוטומטית מ-Quick Shop</p>
    </div>
  </div>
</body>
</html>`
                      }
                    },
                    {
                      type: "delay",
                      config: { amount: 24, unit: "hours" }
                    }
                  ])
                  toast({
                    title: "טמפלט נטען",
                    description: "טמפלט לדוגמא נטען בהצלחה. ניתן לערוך אותו לפי הצורך.",
                  })
                }}
              >
                <Play className="w-4 h-4 ml-2" />
                טען טמפלט לדוגמא
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">שם האוטומציה *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: שליחת מייל לאחר הזמנה"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="תיאור קצר של האוטומציה..."
                className="mt-1"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Flow Builder */}
        <AutomationFlowBuilder
          trigger={trigger}
          onTriggerChange={setTrigger}
          conditions={conditions}
          onConditionsChange={setConditions}
          actions={actions}
          onActionsChange={setActions}
          eventTypes={eventTypes}
        />
      </div>
    </AppLayout>
  )
}

