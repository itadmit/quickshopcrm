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
import { Mail, Key, Save, Trash2, AlertCircle, Send } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SendGridSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [savingSendgrid, setSavingSendgrid] = useState(false)
  const [sendgridConfigured, setSendgridConfigured] = useState(false)
  const [sendgridApiKey, setSendgridApiKey] = useState("")
  const [sendgridFromEmail, setSendgridFromEmail] = useState("no-reply@my-quickshop.com")
  const [sendgridFromName, setSendgridFromName] = useState("Quick Shop")
  const [testEmailAddress, setTestEmailAddress] = useState("")
  const [sendingTestEmail, setSendingTestEmail] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      if (session?.user?.role !== "SUPER_ADMIN") {
        router.push("/dashboard")
        return
      }
      fetchSendgridSettings()
    }
  }, [status, session, router])

  const fetchSendgridSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/sendgrid-settings")
      if (response.ok) {
        const data = await response.json()
        if (data.configured && data.settings) {
          setSendgridConfigured(true)
          setSendgridFromEmail(data.settings.fromEmail || "no-reply@my-quickshop.com")
          setSendgridFromName(data.settings.fromName || "Quick Shop")
        } else {
          setSendgridConfigured(false)
          setSendgridFromEmail("no-reply@my-quickshop.com")
          setSendgridFromName("Quick Shop")
        }
      }
    } catch (error) {
      console.error("Error fetching SendGrid settings:", error)
      setSendgridConfigured(false)
      setSendgridFromEmail("no-reply@my-quickshop.com")
      setSendgridFromName("Quick Shop")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSendgrid = async () => {
    if (!sendgridApiKey) {
      toast({
        title: "שגיאה",
        description: "אנא הזן SendGrid API Key",
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

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הגדרות SendGrid נשמרו בהצלחה",
        })
        setSendgridConfigured(true)
        setSendgridApiKey("")
        await fetchSendgridSettings()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לשמור את ההגדרות",
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
          title: "הצלחה",
          description: "הגדרות SendGrid נמחקו בהצלחה",
        })
        setSendgridConfigured(false)
        setSendgridApiKey("")
        setSendgridFromEmail("no-reply@my-quickshop.com")
        setSendgridFromName("Quick Shop")
        await fetchSendgridSettings()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן למחוק את ההגדרות",
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
        description: "אנא הזן כתובת אימייל תקינה",
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

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "מייל בדיקה נשלח!",
          description: `מייל נשלח ל-${testEmailAddress}. אנא בדוק את תיבת הדואר הנכנס.`,
        })
        setTestEmailAddress("")
      } else {
        toast({
          title: "שגיאה",
          description: data.error || data.details || "לא ניתן לשלוח מייל בדיקה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending test email:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשליחת מייל הבדיקה",
        variant: "destructive",
      })
    } finally {
      setSendingTestEmail(false)
    }
  }

  if (loading || status === "loading") {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">טוען...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">הגדרות SendGrid</h1>
          <p className="text-gray-600">הגדרות אלו משמשות לשליחת מיילים בשם Quick Shop לכל המשתמשים במערכת</p>
        </div>

        {/* SendGrid Settings Card */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
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
                  <li>כתובת האימייל השולח חייבת להיות מאומתת ב-SendGrid לפני השימוש</li>
                  <li>API Key חייב להיות עם הרשאות Mail Send</li>
                  <li>מיילים נשלחים דרך SendGrid בשם Quick Shop</li>
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

