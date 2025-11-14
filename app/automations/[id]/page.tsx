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
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Switch } from "@/components/ui/switch"
import {
  Workflow,
  Save,
  X,
  Play,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import AutomationFlowBuilder from "@/components/AutomationFlowBuilder"
import { Badge } from "@/components/ui/badge"

export default function EditAutomationPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [trigger, setTrigger] = useState<{ type: string; filters?: any } | null>(null)
  const [conditions, setConditions] = useState<any[]>([])
  const [actions, setActions] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])

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

  useEffect(() => {
    if (params.id) {
      fetchAutomation()
    }
  }, [params.id])

  const fetchAutomation = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/automations/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setName(data.name)
        setDescription(data.description || "")
        setIsActive(data.isActive)
        setTrigger(data.trigger)
        setConditions(data.conditions || [])
        setActions(data.actions || [])
        setLogs(data.logs || [])
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את האוטומציה",
          variant: "destructive",
        })
        router.push("/automations")
      }
    } catch (error) {
      console.error("Error fetching automation:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת האוטומציה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
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
      const response = await fetch(`/api/automations/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          isActive,
          trigger,
          conditions: conditions.length > 0 ? conditions : null,
          actions,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "האוטומציה עודכנה בהצלחה",
        })
        fetchAutomation()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לעדכן את האוטומציה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating automation:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון האוטומציה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    try {
      const response = await fetch(`/api/automations/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testPayload: {
            orderId: "test-order-id",
            orderNumber: "TEST-001",
            total: 100,
            customerEmail: "test@example.com",
          },
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "האוטומציה הופעלה לבדיקה",
        })
        fetchAutomation()
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן להריץ את האוטומציה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error testing automation:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהרצת האוטומציה",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
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
            <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
            <p className="text-gray-500 mt-1">
              ערוך את האוטומציה שלך
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <X className="w-4 h-4 ml-2" />
              חזרה
            </Button>
            <Button variant="outline" onClick={handleTest}>
              <Play className="w-4 h-4 ml-2" />
              הרץ בדיקה
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
                  שמור שינויים
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
            <div className="flex items-center gap-2">
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label>האוטומציה פעילה</Label>
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

        {/* Logs */}
        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>היסטוריית הרצות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.slice(0, 10).map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {log.status === "success" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : log.status === "failed" ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <div className="font-medium">{log.eventType}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(log.createdAt).toLocaleString("he-IL")}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        log.status === "success"
                          ? "default"
                          : log.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {log.status === "success"
                        ? "הצליח"
                        : log.status === "failed"
                        ? "נכשל"
                        : "דולג"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

