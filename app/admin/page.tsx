"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Switch } from "@/components/ui/switch"
import { Shield, Key, Server, CreditCard, Save, Trash2, AlertCircle, Mail, Send } from "lucide-react"
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

  // SendGrid Settings
  const [sendgridConfigured, setSendgridConfigured] = useState(false)
  const [sendgridApiKey, setSendgridApiKey] = useState("")
  const [sendgridFromEmail, setSendgridFromEmail] = useState("no-reply@my-quickshop.com")
  const [sendgridFromName, setSendgridFromName] = useState("Quick Shop")
  const [savingSendgrid, setSavingSendgrid] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState("")
  const [sendingTestEmail, setSendingTestEmail] = useState(false)

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
      fetchSendgridSettings()
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

  const fetchSendgridSettings = async () => {
    try {
      const response = await fetch("/api/admin/sendgrid-settings")
      if (response.ok) {
        const data = await response.json()
        if (data.configured && data.settings) {
          setSendgridConfigured(true)
          setSendgridFromEmail(data.settings.fromEmail || "no-reply@my-quickshop.com")
          setSendgridFromName(data.settings.fromName || "Quick Shop")
        } else {
          // אם אין הגדרות, נגדיר את הערכים ברירת המחדל
          setSendgridConfigured(false)
          setSendgridFromEmail("no-reply@my-quickshop.com")
          setSendgridFromName("Quick Shop")
        }
      }
    } catch (error) {
      console.error("Error fetching SendGrid settings:", error)
      // גם במקרה של שגיאה, נגדיר את הערכים ברירת המחדל
      setSendgridConfigured(false)
      setSendgridFromEmail("no-reply@my-quickshop.com")
      setSendgridFromName("Quick Shop")
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

  const handleSaveSendgrid = async () => {
    if (!sendgridApiKey) {
      toast({
        title: "שגיאה",
        description: "נא למלא את שדה API Key",
        variant: "destructive",
      })
      return
    }

    setSavingSendgrid(true)
    try {
      const response = await fetch("/api/admin/sendgrid-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: sendgridApiKey,
          fromEmail: sendgridFromEmail,
          fromName: sendgridFromName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "הצלחה!",
          description: "הגדרות SendGrid נשמרו בהצלחה",
        })
        setSendgridConfigured(true)
        setSendgridApiKey("")
      } else {
        toast({
          title: "שגיאה",
          description: data.error || "לא ניתן לשמור את ההגדרות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving SendGrid settings:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת ההגדרות",
        variant: "destructive",
      })
    } finally {
      setSavingSendgrid(false)
    }
  }

  const handleDeleteSendgrid = async () => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הגדרות SendGrid? פעולה זו תשבית את שליחת המיילים!")) {
      return
    }

    setSavingSendgrid(true)
    try {
      const response = await fetch("/api/admin/sendgrid-settings", {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה!",
          description: "הגדרות SendGrid נמחקו בהצלחה",
        })
        setSendgridConfigured(false)
        setSendgridApiKey("")
        setSendgridFromEmail("no-reply@my-quickshop.com")
        setSendgridFromName("Quick Shop")
      } else {
        const data = await response.json()
        toast({
          title: "שגיאה",
          description: data.error || "לא ניתן למחוק את ההגדרות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting SendGrid settings:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת ההגדרות",
        variant: "destructive",
      })
    } finally {
      setSavingSendgrid(false)
    }
  }

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      toast({
        title: "שגיאה",
        description: "נא להזין כתובת אימייל תקינה",
        variant: "destructive",
      })
      return
    }

    setSendingTestEmail(true)
    try {
      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmailAddress,
          subject: "בדיקת SendGrid - Quick Shop",
          message: "זה מייל בדיקה ממערכת Quick Shop. אם קיבלת את המייל הזה, מערכת SendGrid עובדת כראוי! ✅",
        }),
      })

      if (response.ok) {
        toast({
          title: "מייל נשלח!",
          description: `מייל בדיקה נשלח ל-${testEmailAddress}`,
        })
        setTestEmailAddress("")
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לשלוח את המייל",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending test email:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשליחת המייל",
        variant: "destructive",
      })
    } finally {
      setSendingTestEmail(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <AppLayout title="לוח בקרת Super Admin">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
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
          <div className="p-3 bg-emerald-100 rounded-lg">
            <Shield className="h-6 w-6 text-emerald-600" />
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
              <CreditCard className="h-5 w-5 text-emerald-600" />
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

        {/* SendGrid Settings Card */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-emerald-600" />
              <CardTitle>הגדרות SendGrid - שליחת מיילים</CardTitle>
            </div>
            <CardDescription>
              הגדרות אלו משמשות לשליחת מיילים בשם Quick Shop לכל המשתמשים במערכת
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Alert */}
            {sendgridConfigured && (
              <Alert className="border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  מערכת SendGrid מוגדרת ופעילה. מיילים נשלחים דרך SendGrid בשם Quick Shop.
                </AlertDescription>
              </Alert>
            )}

            {!sendgridConfigured && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  מערכת SendGrid לא מוגדרת. נא להזין את פרטי החיבור כדי לאפשר שליחת מיילים.
                </AlertDescription>
              </Alert>
            )}

            {/* API Credentials */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <Key className="h-4 w-4" />
                <span>פרטי API</span>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="sendgridApiKey">SendGrid API Key *</Label>
                  <Input
                    id="sendgridApiKey"
                    type="text"
                    placeholder="הזן SendGrid API Key"
                    value={sendgridApiKey}
                    onChange={(e) => setSendgridApiKey(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    מ-SendGrid Dashboard {'>'} Settings {'>'} API Keys
                  </p>
                </div>

                <div>
                  <Label htmlFor="sendgridFromEmail">כתובת אימייל שולח</Label>
                  <Input
                    id="sendgridFromEmail"
                    type="email"
                    placeholder="no-reply@my-quickshop.com"
                    value={sendgridFromEmail}
                    onChange={(e) => setSendgridFromEmail(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    כתובת האימייל שממנה יישלחו המיילים (חייב להיות מאומת ב-SendGrid)
                  </p>
                </div>

                <div>
                  <Label htmlFor="sendgridFromName">שם השולח</Label>
                  <Input
                    id="sendgridFromName"
                    type="text"
                    placeholder="Quick Shop"
                    value={sendgridFromName}
                    onChange={(e) => setSendgridFromName(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    השם שיוצג כשולח המייל
                  </p>
                </div>
              </div>
            </div>

            {/* Test Email Section */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-gray-700 font-medium mb-4">
                <Send className="h-4 w-4" />
                <span>בדיקת מייל</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <Label htmlFor="testEmailAddress">כתובת אימייל לבדיקה</Label>
                  <Input
                    id="testEmailAddress"
                    type="email"
                    placeholder="example@email.com"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !sendingTestEmail) {
                        handleSendTestEmail()
                      }
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    הזן כתובת אימייל לשליחת מייל בדיקה
                  </p>
                </div>
                <div className="flex flex-col">
                  <Label className="opacity-0 pointer-events-none">שלח</Label>
                  <Button
                    onClick={handleSendTestEmail}
                    disabled={sendingTestEmail || !testEmailAddress || !testEmailAddress.includes("@")}
                    variant="outline"
                    className="mt-1"
                  >
                    <Send className="h-4 w-4 ml-2" />
                    {sendingTestEmail ? "שולח..." : "שלח מייל בדיקה"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSaveSendgrid}
                disabled={savingSendgrid}
                className="prodify-gradient text-white"
              >
                <Save className="h-4 w-4 ml-2" />
                {savingSendgrid ? "שומר..." : "שמור הגדרות"}
              </Button>

              {sendgridConfigured && (
                <Button
                  onClick={handleDeleteSendgrid}
                  disabled={savingSendgrid}
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
                  <li>מיילים נשלחים דרך SendGrid בשם Quick Shop</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

