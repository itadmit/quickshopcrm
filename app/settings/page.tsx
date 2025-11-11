"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "next-auth/react"
import { 
  Trash2, 
  AlertTriangle, 
  Database,
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Mail,
  CheckCircle,
  Users,
  Lock,
  Unlock,
  Edit,
  Key,
  Store,
  CreditCard,
  Calendar,
  TrendingUp,
  Save
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/skeletons/TableSkeleton"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Link from "next/link"
import { ShopSettings } from "@/components/ShopSettings"

export default function SettingsPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<"shop" | "general" | "communication" | "security" | "subscription" | "advanced">("shop")

  // Check URL params for tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && ['shop', 'general', 'communication', 'security', 'subscription', 'advanced'].includes(tab)) {
      setActiveTab(tab as any)
    }
  }, [])

  // Load company settings
  useEffect(() => {
    async function loadSettings() {
      setLoadingSettings(true)
      try {
        const response = await fetch('/api/company/settings')
        if (response.ok) {
          const data = await response.json()
          const settings = data.settings || {}
          if (settings.afterProductSave) {
            setAfterProductSave(settings.afterProductSave)
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setLoadingSettings(false)
      }
    }
    loadSettings()
  }, [])
  const [isResetting, setIsResetting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [isTestingEmail, setIsTestingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{connected: boolean; tested: boolean} | null>(null)
  const [afterProductSave, setAfterProductSave] = useState<"stay" | "return">("stay")
  const [loadingSettings, setLoadingSettings] = useState(false)

  const handleResetData = async () => {
    setIsResetting(true)
    try {
      const response = await fetch('/api/admin/reset-data', {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: "הנתונים אופסו!",
          description: "כל הנתונים נמחקו בהצלחה. הדף ירענן עכשיו.",
        })
        
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לאפס את הנתונים",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error resetting data:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה באיפוס הנתונים",
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
      setShowConfirm(false)
    }
  }

  const handleTestEmail = async () => {
    setIsTestingEmail(true)
    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: session?.user?.email,
          subject: 'בדיקת מערכת האימיילים - Quick Shop',
          message: 'זה אימייל בדיקה. אם קיבלת אותו, המערכת עובדת כראוי! ✅',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "אימייל נשלח בהצלחה! ✅",
          description: `אימייל בדיקה נשלח ל-${data.sentTo}. בדוק את תיבת הדואר שלך.`,
        })
        setEmailStatus({ connected: true, tested: true })
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה בשליחת אימייל",
          description: error.details || "לא ניתן לשלוח אימייל",
          variant: "destructive",
        })
        setEmailStatus({ connected: false, tested: true })
      }
    } catch (error) {
      console.error('Error testing email:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בבדיקת האימייל",
        variant: "destructive",
      })
      setEmailStatus({ connected: false, tested: true })
    } finally {
      setIsTestingEmail(false)
    }
  }

  const handleSeedData = async () => {
    setIsSeeding(true)
    try {
      const response = await fetch('/api/admin/seed-data', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "נתוני דמו יובאו בהצלחה!",
          description: `נוצרו ${data.stats.products} מוצרים, ${data.stats.customers} לקוחות, ${data.stats.orders} הזמנות ועוד. הדף ירענן עכשיו.`,
        })
        
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לטעון את נתוני הדמו",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error seeding data:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת נתוני הדמו",
        variant: "destructive",
      })
    } finally {
      setIsSeeding(false)
    }
  }

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'MANAGER'
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userPermissions, setUserPermissions] = useState<Record<string, Record<string, boolean>>>({})
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [changingPassword, setChangingPassword] = useState(false)
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savingCommunication, setSavingCommunication] = useState(false)
  const [savingSecurity, setSavingSecurity] = useState(false)

  const sidebarPermissions = [
    { key: "tasks", label: "משימות", required: false },
    { key: "calendar", label: "לוח שנה", required: false },
    { key: "reports", label: "דוחות", required: false },
    { key: "leads", label: "לידים", required: false },
    { key: "clients", label: "לקוחות", required: false },
    { key: "projects", label: "פרויקטים", required: false },
    { key: "quotes", label: "הצעות מחיר", required: false },
    { key: "payments", label: "תשלומים", required: false },
    { key: "settings", label: "הגדרות", required: false },
    { key: "integrations", label: "אינטגרציות", required: false },
    { key: "automations", label: "אוטומציות", required: false },
  ]

  useEffect(() => {
    if (activeTab === "security" && isAdmin) {
      fetchUsers()
    }
  }, [activeTab, isAdmin])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const usersData = await response.json()
        setUsers(usersData)
        
        // טעינת הרשאות לכל משתמש
        const permissionsPromises = usersData.map((user: any) => 
          fetch(`/api/users/permissions/${user.id}`).then(r => r.json())
        )
        const permissionsResults = await Promise.all(permissionsPromises)
        
        const permissionsMap: Record<string, Record<string, boolean>> = {}
        usersData.forEach((user: any, index: number) => {
          permissionsMap[user.id] = permissionsResults[index]?.permissions || {}
        })
        setUserPermissions(permissionsMap)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleTogglePermission = async (userId: string, permission: string, currentValue: boolean) => {
    // לא ניתן לשנות הרשאות נדרשות
    if (permission === "dashboard" || permission === "notifications") {
      return
    }

    const newPermissions = {
      ...userPermissions[userId],
      [permission]: !currentValue,
    }

    try {
      const response = await fetch(`/api/users/permissions/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: newPermissions }),
      })

      if (response.ok) {
        setUserPermissions({
          ...userPermissions,
          [userId]: newPermissions,
        })
        toast({
          title: "הצלחה",
          description: "ההרשאות עודכנו בהצלחה",
        })
      } else {
        throw new Error('Failed to update permissions')
      }
    } catch (error) {
      console.error('Error updating permissions:', error)
      toast({
        title: "שגיאה",
        description: "לא ניתן היה לעדכן את ההרשאות",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${userName}? פעולה זו בלתי הפיכה!`)) {
      return
    }

    setDeletingUserId(userId)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "המשתמש נמחק בהצלחה",
        })
        // רענון רשימת המשתמשים
        await fetchUsers()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן היה למחוק את המשתמש",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת המשתמש",
        variant: "destructive",
      })
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "שגיאה",
        description: "הסיסמה החדשה חייבת להכיל לפחות 8 תווים",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "שגיאה",
        description: "הסיסמאות החדשות לא תואמות",
        variant: "destructive",
      })
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch('/api/users/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הסיסמה שונתה בהצלחה",
        })
        setShowChangePassword(false)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן היה לשנות את הסיסמה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error changing password:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשינוי הסיסמה",
        variant: "destructive",
      })
    } finally {
      setChangingPassword(false)
    }
  }

  const tabs = [
    { key: "shop", label: "הגדרות חנות", icon: Store },
    { key: "subscription", label: "מנוי", icon: CreditCard },
    { key: "general", label: "כללי", icon: SettingsIcon },
    { key: "communication", label: "תקשורת", icon: Mail },
    { key: "security", label: "אבטחה", icon: Shield },
    ...(isAdmin ? [{ key: "advanced", label: "מתקדם", icon: Database }] : []),
  ]

  return (
    <AppLayout>
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm sticky top-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">הגדרות</h2>
              <p className="text-sm text-gray-500 mt-1">נהל את ההגדרות שלך</p>
            </div>
            <nav className="p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-colors mb-1 ${
                      isActive
                        ? "bg-purple-50 text-purple-700 font-medium border-r-2 border-purple-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-purple-600" : "text-gray-500"}`} />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="space-y-6">

        {/* Shop Settings Tab */}
        {activeTab === "shop" && (
          <ShopSettings />
        )}

        {/* Subscription Tab */}
        {activeTab === "subscription" && <SubscriptionTab />}

        {/* General Tab */}
        {activeTab === "general" && (
          <div className="space-y-6">
            {/* Profile Settings */}
            <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>פרופיל אישי</CardTitle>
                  <CardDescription>עדכן את פרטי המשתמש שלך</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">שם</p>
                  <p className="font-medium">{session?.user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">אימייל</p>
                  <p className="font-medium">{session?.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">תפקיד</p>
                  <p className="font-medium">
                    {session?.user?.role === 'ADMIN' ? 'מנהל' : 
                     session?.user?.role === 'MANAGER' ? 'מנהל צוות' : 'משתמש'}
                  </p>
                </div>
                <Button variant="outline" className="w-full mt-4" disabled>
                  ערוך פרופיל (בקרוב)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>הגדרות מערכת</CardTitle>
                  <CardDescription>הגדרות כלליות למערכת</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">לאחר שמירת שינויים בעריכת מוצר</Label>
                  <RadioGroup
                    value={afterProductSave}
                    onValueChange={(value: "stay" | "return") => setAfterProductSave(value)}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="stay" id="stay" />
                      <Label htmlFor="stay" className="text-sm font-normal cursor-pointer">
                        להישאר בעמוד המוצר
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="return" id="return" />
                      <Label htmlFor="return" className="text-sm font-normal cursor-pointer">
                        לחזור לעמוד המוצרים
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>אינטגרציות</CardTitle>
                  <CardDescription>חיבורים למערכות חיצוניות</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/settings/integrations">
                  <Button variant="outline" className="w-full">
                    נהל אינטגרציות
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                setSavingGeneral(true)
                try {
                  const response = await fetch('/api/company/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      systemSettings: {
                        afterProductSave: afterProductSave,
                      },
                    }),
                  })
                  
                  if (response.ok) {
                    toast({
                      title: "הצלחה",
                      description: "ההגדרות נשמרו בהצלחה",
                    })
                  } else {
                    throw new Error('Failed to save settings')
                  }
                } catch (error) {
                  console.error('Error saving settings:', error)
                  toast({
                    title: "שגיאה",
                    description: "לא ניתן לשמור את ההגדרות",
                    variant: "destructive",
                  })
                } finally {
                  setSavingGeneral(false)
                }
              }}
              disabled={savingGeneral || loadingSettings}
              className="prodify-gradient text-white"
            >
              <Save className="w-4 h-4 ml-2" />
              {savingGeneral ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
          </div>
        )}

        {/* Communication Tab - Email + Notifications */}
        {activeTab === "communication" && (
          <div className="space-y-6">
            {/* Email Configuration */}
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>הגדרות אימייל</CardTitle>
                    <CardDescription>בדיקת חיבור ושליחת אימייל מבחן</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">SMTP Server</span>
                      <span className="text-sm text-gray-600">smtp.gmail.com</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">משתמש</span>
                      <span className="text-sm text-gray-600">quickshopil@gmail.com</span>
                    </div>
                    {emailStatus && (
                      <div className="flex items-center gap-2 mt-2">
                        {emailStatus.connected ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600">החיבור תקין ✅</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600">בעיה בחיבור ❌</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handleTestEmail}
                    disabled={isTestingEmail}
                    className="w-full prodify-gradient text-white"
                  >
                    {isTestingEmail ? "שולח אימייל..." : "שלח אימייל בדיקה"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>התראות</CardTitle>
                    <CardDescription>הגדר העדפות התראות</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">התראות אימייל</span>
                    <Button variant="outline" size="sm" disabled>מופעל</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">התראות דחיפות</span>
                    <Button variant="outline" size="sm" disabled>מופעל</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">סיכומים שבועיים</span>
                    <Button variant="outline" size="sm" disabled>מופעל</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  setSavingCommunication(true)
                  // כאן אפשר להוסיף לוגיקה לשמירה
                  await new Promise(resolve => setTimeout(resolve, 500))
                  toast({
                    title: "הצלחה",
                    description: "ההגדרות נשמרו בהצלחה",
                  })
                  setSavingCommunication(false)
                }}
                disabled={savingCommunication}
                className="prodify-gradient text-white"
              >
                <Save className="w-4 h-4 ml-2" />
                {savingCommunication ? "שומר..." : "שמור שינויים"}
              </Button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-6">
            {/* Security Settings */}
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>אבטחה</CardTitle>
                    <CardDescription>הגדרות אבטחה וסיסמה</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Change Password */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-gray-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">שינוי סיסמה</h3>
                          <p className="text-sm text-gray-500">עדכן את סיסמת החשבון שלך</p>
                        </div>
                      </div>
                      {!showChangePassword && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowChangePassword(true)}
                        >
                          שנה סיסמה
                        </Button>
                      )}
                    </div>
                    {showChangePassword && (
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor="currentPassword">סיסמה נוכחית</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="mt-1"
                            placeholder="הכנס סיסמה נוכחית"
                          />
                        </div>
                        <div>
                          <Label htmlFor="newPassword">סיסמה חדשה</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="mt-1"
                            placeholder="סיסמה חדשה (מינימום 8 תווים)"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirmPassword">אישור סיסמה</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="mt-1"
                            placeholder="הכנס שוב את הסיסמה החדשה"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleChangePassword}
                            disabled={changingPassword}
                            className="prodify-gradient text-white"
                          >
                            {changingPassword ? "משנה..." : "שמור סיסמה"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowChangePassword(false)
                              setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                            }}
                            disabled={changingPassword}
                          >
                            ביטול
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Two Factor Authentication */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-gray-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">אימות דו-שלבי</h3>
                          <p className="text-sm text-gray-500">הוסף שכבת אבטחה נוספת לחשבון שלך</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        בקרוב
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Permissions Management - Only for Admins */}
            {isAdmin && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle>ניהול הרשאות משתמשים</CardTitle>
                      <CardDescription>נהל את ההרשאות של משתמשי החברה</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingUsers ? (
                    <TableSkeleton rows={3} columns={4} />
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      אין משתמשים
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {users.map((user) => {
                        const isAdminUser = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
                        const isEditing = editingUserId === user.id
                        const permissions = userPermissions[user.id] || {}

                        return (
                          <div key={user.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                  <User className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900">{user.name}</h3>
                                  <p className="text-sm text-gray-500">{user.email}</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {user.role === 'ADMIN' ? 'מנהל' : 
                                     user.role === 'SUPER_ADMIN' ? 'מנהל ראשי' :
                                     user.role === 'MANAGER' ? 'מנהל צוות' : 'משתמש'}
                                  </p>
                                </div>
                              </div>
                              {!isAdminUser && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingUserId(isEditing ? null : user.id)}
                                  >
                                    {isEditing ? (
                                      <>
                                        <CheckCircle className="w-4 h-4 ml-2" />
                                        סיים עריכה
                                      </>
                                    ) : (
                                      <>
                                        <Edit className="w-4 h-4 ml-2" />
                                        ערוך הרשאות
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                    disabled={deletingUserId === user.id}
                                  >
                                    {deletingUserId === user.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 ml-2"></div>
                                        מוחק...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="w-4 h-4 ml-2" />
                                        מחק
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>

                            {isAdminUser ? (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-900">
                                  למשתמשים מנהלים יש גישה מלאה לכל ההרשאות
                                </p>
                              </div>
                            ) : isEditing ? (
                              <div className="space-y-3">
                                <div className="border rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto">
                                  {sidebarPermissions.map((perm) => {
                                    const hasPermission = permissions[perm.key] === true
                                    return (
                                      <div
                                        key={perm.key}
                                        className="flex items-center gap-3"
                                      >
                                        <input
                                          type="checkbox"
                                          id={`perm-${user.id}-${perm.key}`}
                                          checked={hasPermission}
                                          onChange={() => handleTogglePermission(user.id, perm.key, hasPermission)}
                                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                        />
                                        <label
                                          htmlFor={`perm-${user.id}-${perm.key}`}
                                          className="text-sm flex-1 cursor-pointer"
                                        >
                                          {perm.label}
                                        </label>
                                      </div>
                                    )
                                  })}
                                </div>
                                <div className="bg-gray-50 border rounded-lg p-3">
                                  <p className="text-xs text-gray-600">
                                    <strong>הערה:</strong> הרשאות "בית" ו"התראות" תמיד פעילות ולא ניתן לשנותן
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {sidebarPermissions.map((perm) => {
                                  const hasPermission = permissions[perm.key] === true
                                  return (
                                    <div
                                      key={perm.key}
                                      className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${
                                        hasPermission
                                          ? 'bg-green-50 text-green-700'
                                          : 'bg-gray-50 text-gray-500'
                                      }`}
                                    >
                                      {hasPermission ? (
                                        <Unlock className="w-3 h-3" />
                                      ) : (
                                        <Lock className="w-3 h-3" />
                                      )}
                                      <span>{perm.label}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  setSavingSecurity(true)
                  // כאן אפשר להוסיף לוגיקה לשמירה
                  await new Promise(resolve => setTimeout(resolve, 500))
                  toast({
                    title: "הצלחה",
                    description: "ההגדרות נשמרו בהצלחה",
                  })
                  setSavingSecurity(false)
                }}
                disabled={savingSecurity}
                className="prodify-gradient text-white"
              >
                <Save className="w-4 h-4 ml-2" />
                {savingSecurity ? "שומר..." : "שמור שינויים"}
              </Button>
            </div>
          </div>
        )}

        {/* Advanced Tab - Only for Admins */}
        {activeTab === "advanced" && isAdmin && (
          <div className="space-y-6">
          {/* Advanced Settings */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Database className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>מתקדם</CardTitle>
                  <CardDescription>
                    פעולות ניהול מתקדמות - זמינות למנהלים בלבד
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      ייבא נתוני דמו
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      ייבא נתוני דמו מקיפים שיכללו מוצרים, הזמנות, לקוחות, קופונים, הנחות ועוד
                    </p>
                    <div className="bg-gray-50 p-3 rounded border mb-3">
                      <p className="text-xs text-gray-700 mb-2">
                        <strong>נתונים שייווצרו:</strong>
                      </p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• 3 קטגוריות (נעליים, חולצות, אביזרים)</li>
                        <li>• 4 מוצרים כולל נעליים נייק וחולצה אדידס עם וריאנטים</li>
                        <li>• 3 קולקציות</li>
                        <li>• 3 לקוחות (VIP, רגיל)</li>
                        <li>• 3 הזמנות עם סטטוסים שונים</li>
                        <li>• 3 קופונים (אחוזים, סכום קבוע, קנה 2 קבל 1)</li>
                        <li>• 3 הנחות (אוטומטיות)</li>
                        <li>• 3 ביקורות מוצרים</li>
                        <li>• 3 כרטיסי מתנה</li>
                        <li>• 3 אשראי חנות</li>
                        <li>• 2 חבילות מוצרים</li>
                        <li>• 3 דפים</li>
                        <li>• 3 פוסטים בבלוג</li>
                        <li>• 3 החזרות</li>
                        <li>• 3 עגלות נטושות</li>
                      </ul>
                    </div>
                    <Button
                      onClick={handleSeedData}
                      disabled={isSeeding}
                    >
                      <Database className="w-4 h-4 ml-2" />
                      {isSeeding ? "מייבא נתונים..." : "ייבא נתוני דמו"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      איפוס כל הנתונים
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      פעולה זו תמחק את כל הנתונים של החנות: מוצרים, הזמנות, לקוחות, קופונים והנחות.
                      הפעולה בלתי הפיכה!
                    </p>
                    
                    {!showConfirm ? (
                      <Button
                        className="bg-red-600 text-white hover:bg-red-700"
                        onClick={() => setShowConfirm(true)}
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        אפס נתונים
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-yellow-900 mb-2">
                            ⚠️ האם אתה בטוח?
                          </p>
                          <p className="text-xs text-yellow-800">
                            פעולה זו תמחק לצמיתות את כל הנתונים של החברה.
                            לא ניתן לשחזר אותם!
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="bg-red-600 text-white hover:bg-red-700"
                            onClick={handleResetData}
                            disabled={isResetting}
                          >
                            {isResetting ? "מוחק..." : "כן, מחק הכל"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowConfirm(false)}
                            disabled={isResetting}
                          >
                            ביטול
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

// Subscription Tab Component
function SubscriptionTab() {
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectingPlan, setSelectingPlan] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    // נחכה שה-session יטען לפני שנבצע fetch
    if (status === 'authenticated') {
      fetchSubscription()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status])

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
      } else {
        // אם אין מנוי או אין הרשאה, זה לא שגיאה - פשוט נשאיר subscription כ-null
        const errorData = await response.json().catch(() => ({}))
        // רק אם זו שגיאה אמיתית (לא 401, 404 או מצב תקין), נציג הודעת שגיאה
        if (response.status !== 401 && response.status !== 404 && response.status >= 500) {
          toast({
            title: "שגיאה",
            description: errorData.error || "לא ניתן לטעון את פרטי המנוי",
            variant: "destructive",
          })
        }
        setSubscription(null)
      }
    } catch (error) {
      // שגיאת רשת או שגיאה לא צפויה - לא נציג הודעת שגיאה
      console.error('Error fetching subscription:', error)
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = async (plan: "BRANDING" | "QUICK_SHOP") => {
    setSelectingPlan(true)
    try {
      // חישוב מחיר
      const basePrice = plan === "BRANDING" ? 299 : 399
      const tax = basePrice * 0.18
      const total = basePrice + tax

      // יצירת תשלום דרך PayPlus (באמצעות ההגדרות הגלובליות)
      const paymentRes = await fetch('/api/subscriptions/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          amount: total,
        }),
      })

      if (paymentRes.ok) {
        const paymentData = await paymentRes.json()
        // PayPlus מחזיר URL לתשלום
        if (paymentData.paymentUrl) {
          // מעבר לדף תשלום PayPlus
          window.location.href = paymentData.paymentUrl
        } else if (paymentData.transactionId) {
          // אם התשלום הושלם מיד (לא אמור לקרות במנויים)
          toast({
            title: "הצלחה!",
            description: "המנוי הופעל בהצלחה",
          })
          await fetchSubscription()
        }
      } else {
        const error = await paymentRes.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן ליצור תשלום",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error selecting plan:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בבחירת מסלול",
        variant: "destructive",
      })
    } finally {
      setSelectingPlan(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm("האם אתה בטוח שברצונך לבטל את המנוי? המנוי יישאר פעיל עד סיום התקופה ששולמה.")) {
      return
    }

    setCancelling(true)
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "המנוי בוטל בהצלחה",
        })
        await fetchSubscription()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן היה לבטל את המנוי",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בביטול המנוי",
        variant: "destructive",
      })
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">מנוי לא נמצא</h3>
            <p className="text-gray-600 mb-6">לא נמצא מנוי פעיל לחשבון שלך</p>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                כדי להתחיל להשתמש במערכת, אנא בחר מסלול מנוי:
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button
                  onClick={() => handleSelectPlan("BRANDING")}
                  disabled={selectingPlan}
                  className="prodify-gradient text-white"
                >
                  {selectingPlan ? "מעבד..." : "מסלול תדמית - 299₪"}
                </Button>
                <Button
                  onClick={() => handleSelectPlan("QUICK_SHOP")}
                  disabled={selectingPlan}
                  className="prodify-gradient text-white"
                >
                  {selectingPlan ? "מעבד..." : "מסלול קוויק שופ - 399₪"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const planLabels: Record<string, string> = {
    TRIAL: "תקופת נסיון",
    BRANDING: "מסלול תדמית",
    QUICK_SHOP: "מסלול קוויק שופ",
  }

  const statusLabels: Record<string, string> = {
    TRIAL: "נסיון",
    ACTIVE: "פעיל",
    EXPIRED: "פג תוקף",
    CANCELLED: "בוטל",
  }

  const statusColors: Record<string, string> = {
    TRIAL: "bg-blue-100 text-blue-800",
    ACTIVE: "bg-green-100 text-green-800",
    EXPIRED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
  }

  const isTrial = subscription.plan === "TRIAL"
  const isActive = subscription.status === "ACTIVE"
  const isExpired = subscription.status === "EXPIRED"
  const isCancelled = subscription.status === "CANCELLED"

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>מנוי נוכחי</CardTitle>
              <CardDescription>פרטי המנוי והסטטוס שלך</CardDescription>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[subscription.status] || statusColors.TRIAL}`}>
              {statusLabels[subscription.status] || "לא ידוע"}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">מסלול</p>
                <p className="font-semibold text-lg">{planLabels[subscription.plan] || subscription.plan}</p>
              </div>
              {subscription.daysRemaining !== undefined && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">ימים נותרים</p>
                  <p className="font-semibold text-lg">
                    {subscription.daysRemaining > 0 ? (
                      <span className="text-green-600">{subscription.daysRemaining} ימים</span>
                    ) : (
                      <span className="text-red-600">פג תוקף</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {isTrial && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">תקופת נסיון פעילה</h4>
                    <p className="text-sm text-blue-800">
                      תקופת הנסיון שלך מסתיימת ב-{new Date(subscription.trialEndDate).toLocaleDateString('he-IL')}
                    </p>
                    {subscription.daysRemaining !== undefined && subscription.daysRemaining <= 3 && (
                      <p className="text-sm text-red-600 mt-2 font-medium">
                        ⚠️ תקופת הנסיון מסתיימת בקרוב! אנא בחר מסלול מנוי להמשך השימוש.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isActive && subscription.subscriptionEndDate && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900 mb-1">מנוי פעיל</h4>
                    <p className="text-sm text-green-800">
                      המנוי שלך תקף עד {new Date(subscription.subscriptionEndDate).toLocaleDateString('he-IL')}
                    </p>
                    {subscription.monthlyPrice && (
                      <p className="text-sm text-green-800 mt-1">
                        מחיר חודשי: {subscription.monthlyPrice}₪ + מעמ 18%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isExpired && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">מנוי פג תוקף</h4>
                    <p className="text-sm text-red-800">
                      המנוי שלך פג תוקף. אנא בחר מסלול מנוי חדש להמשך השימוש.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Selection - Only if Trial or Expired */}
      {(isTrial || isExpired) && (
        <div className="space-y-6">
          {/* Branding Plan */}
          <Card className="shadow-sm border-2">
            <CardHeader>
              <CardTitle className="text-xl">מסלול תדמית</CardTitle>
              <CardDescription>בניית אתר תדמיתי ללא חנות</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-gray-900">299₪</p>
                  <p className="text-sm text-gray-500">+ מעמ 18% = 352.82₪ לחודש</p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>בניית אתר תדמיתי</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>דפים סטטיים ובלוג</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>עיצוב מותאם אישית</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0">✗</span>
                    <span className="text-gray-500">ללא חנות אונליין</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0">✗</span>
                    <span className="text-gray-500">ללא תשלומים</span>
                  </li>
                </ul>
                <Button
                  className="w-full prodify-gradient text-white"
                  onClick={() => handleSelectPlan("BRANDING")}
                  disabled={selectingPlan}
                >
                  {selectingPlan ? "מעבד..." : "בחר מסלול זה"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Shop Plan */}
          <Card className="shadow-sm border-2 border-purple-300 relative">
            <div className="absolute top-4 left-4 bg-purple-600 text-white text-xs px-2 py-1 rounded">
              מומלץ
            </div>
            <CardHeader>
              <CardTitle className="text-xl">מסלול קוויק שופ</CardTitle>
              <CardDescription>חנות אונליין מלאה</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-gray-900">399₪</p>
                  <p className="text-sm text-gray-500">+ מעמ 18% = 470.82₪ לחודש</p>
                  <p className="text-xs text-gray-500 mt-1">+ 0.5% מכל עסקה</p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>כל התכונות של מסלול תדמית</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>חנות אונליין מלאה</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>עגלת קניות ותשלומים</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>ניהול מוצרים והזמנות</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>כל התכונות הזמינות</span>
                  </li>
                </ul>
                <Button
                  className="w-full prodify-gradient text-white"
                  onClick={() => handleSelectPlan("QUICK_SHOP")}
                  disabled={selectingPlan}
                >
                  {selectingPlan ? "מעבד..." : "בחר מסלול זה"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Subscription - Only if Active */}
      {isActive && !isCancelled && (
        <Card className="shadow-sm border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900">ביטול מנוי</CardTitle>
            <CardDescription className="text-red-700">
              המנוי יישאר פעיל עד סיום התקופה ששולמה
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={handleCancelSubscription}
              disabled={cancelling}
            >
              {cancelling ? "מבטל..." : "בטל מנוי"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

