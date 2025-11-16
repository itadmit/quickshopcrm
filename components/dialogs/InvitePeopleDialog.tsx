"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { UserPlus, CheckSquare } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// כל הפריטים מהסיידבר - זה ההרשאות
const sidebarPermissions = [
  { key: "dashboard", label: "בית", required: true }, // תמיד נדרש
  { key: "tasks", label: "המשימות שלי" },
  { key: "calendar", label: "לוח שנה" },
  { key: "notifications", label: "התראות", required: true }, // תמיד נדרש
  { key: "reports", label: "דוחות ואנליטיקה" },
  { key: "leads", label: "לידים" },
  { key: "clients", label: "לקוחות" },
  { key: "projects", label: "פרויקטים" },
  { key: "quotes", label: "הצעות מחיר" },
  { key: "payments", label: "תשלומים" },
  { key: "settings", label: "הגדרות" },
  { key: "integrations", label: "אינטגרציות" },
  { key: "automations", label: "אוטומציות" },
]

interface InvitePeopleDialogProps {
  triggerButton?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function InvitePeopleDialog({ triggerButton, open: controlledOpen, onOpenChange }: InvitePeopleDialogProps) {
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<"MANAGER" | "USER" | "INFLUENCER">("USER")
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    // ברירת מחדל - כל הפריטים הנדרשים מסומנים
    const defaultPerms: Record<string, boolean> = {}
    sidebarPermissions.forEach((perm) => {
      defaultPerms[perm.key] = perm.required || false
    })
    return defaultPerms
  })

  const handleTogglePermission = (key: string, required?: boolean) => {
    if (required) {
      // פריטים נדרשים לא ניתן לבטל
      return
    }
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // בדיקה האם כל הפריטים שאינם נדרשים מסומנים
  const allNonRequiredSelected = sidebarPermissions
    .filter((perm) => !perm.required)
    .every((perm) => permissions[perm.key])

  const handleSelectAll = () => {
    const allSelected = allNonRequiredSelected
    const newPermissions = { ...permissions }
    
    sidebarPermissions.forEach((perm) => {
      if (!perm.required) {
        newPermissions[perm.key] = !allSelected
      }
    })
    
    setPermissions(newPermissions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast({
        title: "שגיאה",
        description: "אנא הזן אימייל",
        variant: "destructive",
      })
      return
    }

    // בדיקה שיש לפחות פריט אחד נבחר (חוץ מנדרשים) - רק אם זה לא משפיען/ית
    if (role !== "INFLUENCER") {
      const hasAnyPermission = Object.values(permissions).some((allowed) => allowed)
      if (!hasAnyPermission) {
        toast({
          title: "שגיאה",
          description: "אנא בחר לפחות הרשאה אחת",
          variant: "destructive",
        })
        return
      }
    }

    setLoading(true)
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || null,
          role,
          // למשפיענים/יות לא שולחים permissions
          permissions: role === "INFLUENCER" ? {} : permissions,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // בדיקה אם המייל נשלח
        if (data.emailSent === false || data.emailError) {
          toast({
            title: "ההזמנה נוצרה אבל המייל לא נשלח",
            description: data.emailError || "לא ניתן לשלוח מייל. אנא בדוק את הגדרות SendGrid בהגדרות המנהל הראשי.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "ההזמנה נשלחה!",
            description: `הזמנה נשלחה ל-${email}`,
          })
        }
        
        setOpen(false)
        setEmail("")
        setName("")
        setRole("USER")
        // איפוס הרשאות לברירת מחדל
        const defaultPerms: Record<string, boolean> = {}
        sidebarPermissions.forEach((perm) => {
          defaultPerms[perm.key] = perm.required || false
        })
        setPermissions(defaultPerms)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לשלוח הזמנה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending invitation:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשליחת ההזמנה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton && (
        <DialogTrigger asChild>
          {triggerButton}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>הזמן אנשים לצוות</DialogTitle>
          <DialogDescription>
            הזמן חבר צוות חדש. המשתמש יקבל מייל עם קישור להצטרפות.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">אימייל *</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">שם (אופציונלי)</Label>
              <Input
                id="name"
                type="text"
                placeholder="שם המשתמש"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">סוג משתמש *</Label>
              <Select value={role} onValueChange={(value: "MANAGER" | "USER" | "INFLUENCER") => {
                setRole(value)
                // אם משנים למשפיען/ית, מאפסים הרשאות. אם חוזרים למנהל/עובד, מאפסים לברירת מחדל
                if (value === "INFLUENCER") {
                  setPermissions({})
                } else {
                  const defaultPerms: Record<string, boolean> = {}
                  sidebarPermissions.forEach((perm) => {
                    defaultPerms[perm.key] = perm.required || false
                  })
                  setPermissions(defaultPerms)
                }
              }}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="בחר סוג משתמש" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">מנהל</SelectItem>
                  <SelectItem value="USER">עובד</SelectItem>
                  <SelectItem value="INFLUENCER">משפיען/ית</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {role === "INFLUENCER" 
                  ? "משפיענים/יות יקבלו גישה לדשבורד משפיען/ית ייעודי"
                  : "בחר את סוג המשתמש - זה יקבע את ההרשאות והגישה שלו במערכת"}
              </p>
            </div>

            {role !== "INFLUENCER" && (
              <div className="grid gap-2">
                <Label>הרשאות</Label>
                <div className="border rounded-lg p-4 space-y-3 max-h-[300px] overflow-y-auto">
                  <div className="flex items-center gap-3 pb-2 mb-2 border-b">
                    <input
                      type="checkbox"
                      id="select-all"
                      checked={allNonRequiredSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-semibold flex-1 cursor-pointer"
                    >
                      בחר הכל
                    </label>
                  </div>
                  {sidebarPermissions.map((perm) => (
                    <div
                      key={perm.key}
                      className="flex items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        id={`perm-${perm.key}`}
                        checked={permissions[perm.key] || false}
                        onChange={() => handleTogglePermission(perm.key, perm.required)}
                        disabled={perm.required}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
                      />
                      <label
                        htmlFor={`perm-${perm.key}`}
                        className={`text-sm flex-1 cursor-pointer ${perm.required ? "text-gray-500" : ""}`}
                      >
                        {perm.label}
                        {perm.required && (
                          <span className="text-xs text-gray-400 mr-2">(נדרש)</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  בחר את הפריטים שהמשתמש יוכל לראות בסיידבר
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="prodify-gradient text-white"
            >
              <UserPlus className="w-4 h-4 ml-2" />
              {loading ? "שולח..." : "שלח הזמנה"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

