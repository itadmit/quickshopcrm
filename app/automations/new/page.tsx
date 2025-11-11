"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  Workflow,
  Save,
  X,
  Play,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import AutomationFlowBuilder from "@/components/AutomationFlowBuilder"

export default function NewAutomationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [trigger, setTrigger] = useState<{ type: string; filters?: any } | null>(null)
  const [conditions, setConditions] = useState<any[]>([])
  const [actions, setActions] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const eventTypes = [
    { value: "order.created", label: "הזמנה נוצרה" },
    { value: "order.paid", label: "הזמנה שולמה" },
    { value: "order.shipped", label: "הזמנה נשלחה" },
    { value: "order.delivered", label: "הזמנה נמסרה" },
    { value: "order.cancelled", label: "הזמנה בוטלה" },
    { value: "cart.abandoned", label: "עגלה ננטשה" },
    { value: "customer.created", label: "לקוח נוצר" },
    { value: "customer.subscribed", label: "לקוח נרשם לניוזלטר" },
    { value: "product.created", label: "מוצר נוצר" },
    { value: "product.updated", label: "מוצר עודכן" },
    { value: "inventory.low_stock", label: "מלאי נמוך" },
    { value: "inventory.out_of_stock", label: "מלאי אזל" },
  ]

  const handleSave = async () => {
    if (!selectedShop) {
      toast({
        title: "שגיאה",
        description: "אנא בחר חנות",
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
          shopId: selectedShop.id,
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

  if (!selectedShop) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">אנא בחר חנות</p>
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
            <CardTitle>פרטים בסיסיים</CardTitle>
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

