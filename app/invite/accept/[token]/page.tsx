"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { CheckCircle2, AlertCircle, Loader2, UserPlus } from "lucide-react"

interface Invitation {
  id: string
  email: string
  name: string | null
  role: string
  company: {
    name: string
  }
  inviter: {
    name: string
  }
  permissions: Record<string, boolean>
  endDate: string
  status: string
}

export default function AcceptInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const token = params.token as string

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    fetchInvitation()
  }, [token])

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/${token}`)
      if (response.ok) {
        const data = await response.json()
        setInvitation(data)
        setFormData((prev) => ({ ...prev, name: data.name || "" }))
      } else {
        const errorData = await response.json()
        setError(errorData.error || "ההזמנה לא נמצאה או שפג תוקפה")
      }
    } catch (error) {
      console.error("Error fetching invitation:", error)
      setError("אירעה שגיאה בטעינת ההזמנה")
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.phone || !formData.password) {
      toast({
        title: "שגיאה",
        description: "אנא מלא את כל השדות",
        variant: "destructive",
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "שגיאה",
        description: "הסיסמה חייבת להכיל לפחות 6 תווים",
        variant: "destructive",
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "שגיאה",
        description: "הסיסמאות אינן תואמות",
        variant: "destructive",
      })
      return
    }

    setAccepting(true)
    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          password: formData.password,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה!",
          description: "החשבון נוצר בהצלחה. מועבר להתחברות...",
        })
        setTimeout(() => {
          window.location.href = "/login"
        }, 1500)
      } else {
        const errorData = await response.json()
        toast({
          title: "שגיאה",
          description: errorData.error || "לא ניתן ליצור את החשבון",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error accepting invitation:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת החשבון",
        variant: "destructive",
      })
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  שגיאה
                </h2>
                <p className="text-gray-600 mb-6">{error || "ההזמנה לא נמצאה"}</p>
                <Button onClick={() => router.push("/login")} variant="outline">
                  חזור לדף ההתחברות
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const permissionsCount = Object.values(invitation.permissions).filter(
    (allowed) => allowed
  ).length

  const roleText = invitation.role === "INFLUENCER" 
    ? "משפיען/ית" 
    : invitation.role === "MANAGER" 
    ? "מנהל" 
    : invitation.role === "USER"
    ? "עובד"
    : "משתמש"

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center shadow-lg">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">
              אישור הזמנה להצטרפות
            </CardTitle>
          </CardHeader>
          <CardContent>
          <div className="mb-6 p-4 bg-emerald-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="font-medium text-gray-900">
                {invitation.inviter.name} הזמין אותך להצטרף
              </span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>חברה: {invitation.company.name}</div>
              <div>אימייל: {invitation.email}</div>
              <div>סוג משתמש: {roleText}</div>
              {invitation.role !== "INFLUENCER" && (
                <div>הרשאות: {permissionsCount} פריטים</div>
              )}
              {invitation.role === "INFLUENCER" && (
                <div className="text-emerald-700 font-medium mt-2">
                  תקבל/י גישה לדשבורד משפיען/ית ייעודי
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleAccept} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">שם מלא *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="הזן את שמך המלא"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">טלפון *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
                placeholder="מספר טלפון"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">סיסמה *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                placeholder="לפחות 6 תווים"
                minLength={6}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">אישור סיסמה *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
                required
                placeholder="הזן שוב את הסיסמה"
              />
            </div>

            <div className="pt-4 border-t">
              <Button
                type="submit"
                disabled={accepting}
                className="w-full prodify-gradient text-white"
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    יוצר חשבון...
                  </>
                ) : (
                  "אשר והצטרף"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

