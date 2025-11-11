"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
import { Shield, Key, Server, CreditCard, Save, Trash2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SuperAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configured, setConfigured] = useState(false)

  // PayPlus Settings
  const [apiKey, setApiKey] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [terminalUid, setTerminalUid] = useState("")
  const [paymentPageUid, setPaymentPageUid] = useState("")
  const [cashierUid, setCashierUid] = useState("")
  const [useProduction, setUseProduction] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated" && session?.user?.role !== "SUPER_ADMIN") {
      toast({
        title: "אין הרשאה",
        description: "דף זה מיועד למנהלי מערכת בלבד",
        variant: "destructive",
      })
      router.push("/dashboard")
      return
    }

    if (status === "authenticated") {
      fetchSettings()
    }
  }, [status, session, router])

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/payplus-settings")
      if (response.ok) {
        const data = await response.json()
        if (data.configured && data.settings) {
          setConfigured(true)
          setApiKey(data.settings.apiKey || "")
          setSecretKey(data.settings.secretKey || "")
          setTerminalUid(data.settings.terminalUid || "")
          setPaymentPageUid(data.settings.paymentPageUid || "")
          setCashierUid(data.settings.cashierUid || "")
          setUseProduction(data.settings.useProduction || false)
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!apiKey || !secretKey || !terminalUid) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות החובה",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/admin/payplus-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          secretKey,
          terminalUid,
          paymentPageUid: paymentPageUid || undefined,
          cashierUid: cashierUid || undefined,
          useProduction,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "הצלחה!",
          description: "הגדרות PayPlus נשמרו בהצלחה",
        })
        setConfigured(true)
        // נקה את השדות הרגישים
        setApiKey("")
        setSecretKey("")
      } else {
        toast({
          title: "שגיאה",
          description: data.error || "לא ניתן לשמור את ההגדרות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת ההגדרות",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הגדרות PayPlus? פעולה זו תשבית את מערכת המנויים!")) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/admin/payplus-settings", {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה!",
          description: "הגדרות PayPlus נמחקו בהצלחה",
        })
        setConfigured(false)
        setApiKey("")
        setSecretKey("")
        setTerminalUid("")
        setPaymentPageUid("")
        setCashierUid("")
        setUseProduction(false)
      } else {
        const data = await response.json()
        toast({
          title: "שגיאה",
          description: data.error || "לא ניתן למחוק את ההגדרות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting settings:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת ההגדרות",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <AppLayout title="לוח בקרת Super Admin">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">טוען...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (session?.user?.role !== "SUPER_ADMIN") {
    return null
  }

  return (
    <AppLayout title="לוח בקרת Super Admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Shield className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">לוח בקרת Super Admin</h1>
            <p className="text-gray-600">ניהול הגדרות גלובליות של Quick Shop</p>
          </div>
        </div>

        {/* Status Alert */}
        {configured && (
          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              מערכת PayPlus מוגדרת ופעילה. מנויי המערכת יכולים לשלם דרך PayPlus.
            </AlertDescription>
          </Alert>
        )}

        {!configured && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              מערכת PayPlus לא מוגדרת. נא להזין את פרטי החיבור כדי לאפשר מנויים.
            </AlertDescription>
          </Alert>
        )}

        {/* PayPlus Settings Card */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <CardTitle>הגדרות PayPlus - מנויי SaaS</CardTitle>
            </div>
            <CardDescription>
              הגדרות אלו משמשות לגביית תשלומי מנוי מלקוחות Quick Shop
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Environment Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-gray-600" />
                <div>
                  <Label className="text-base font-medium">סביבת עבודה</Label>
                  <p className="text-sm text-gray-600">
                    {useProduction ? "Production (ייצור)" : "Sandbox (פיתוח)"}
                  </p>
                </div>
              </div>
              <Switch
                checked={useProduction}
                onCheckedChange={setUseProduction}
              />
            </div>

            {/* API Credentials */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <Key className="h-4 w-4" />
                <span>פרטי API</span>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="apiKey">API Key *</Label>
                  <Input
                    id="apiKey"
                    type="text"
                    placeholder="הזן API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    מ-PayPlus Dashboard {'>'} Settings {'>'} API
                  </p>
                </div>

                <div>
                  <Label htmlFor="secretKey">Secret Key *</Label>
                  <Input
                    id="secretKey"
                    type="text"
                    placeholder="הזן Secret Key"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="terminalUid">Terminal UID *</Label>
                  <Input
                    id="terminalUid"
                    placeholder="הזן Terminal UID"
                    value={terminalUid}
                    onChange={(e) => setTerminalUid(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="paymentPageUid">Payment Page UID (אופציונלי)</Label>
                  <Input
                    id="paymentPageUid"
                    placeholder="הזן Payment Page UID"
                    value={paymentPageUid}
                    onChange={(e) => setPaymentPageUid(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    נדרש ליצירת קישורי תשלום
                  </p>
                </div>

                <div>
                  <Label htmlFor="cashierUid">Cashier UID (אופציונלי)</Label>
                  <Input
                    id="cashierUid"
                    placeholder="הזן Cashier UID"
                    value={cashierUid}
                    onChange={(e) => setCashierUid(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="prodify-gradient text-white"
              >
                <Save className="h-4 w-4 ml-2" />
                {saving ? "שומר..." : "שמור הגדרות"}
              </Button>

              {configured && (
                <Button
                  onClick={handleDelete}
                  disabled={saving}
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  מחק הגדרות
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-blue-800">
                <p className="font-medium">הערות חשובות:</p>
                <ul className="list-disc list-inside space-y-1 mr-2">
                  <li>הגדרות אלו משמשות לגביית תשלומי מנוי מלקוחות המערכת</li>
                  <li>בסביבת Sandbox ניתן לבצע בדיקות ללא חיוב אמיתי</li>
                  <li>בסביבת Production יתבצעו חיובים אמיתיים</li>
                  <li>פרטי ה-API מוצפנים ונשמרים בצורה מאובטחת</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

