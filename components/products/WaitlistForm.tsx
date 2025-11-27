"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Bell, Mail, Loader2, CheckCircle2 } from "lucide-react"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { cn } from "@/lib/utils"

interface WaitlistFormProps {
  shopId: string
  productId: string
  variantId?: string | null
  customerId?: string | null
  theme?: any
  className?: string
}

export function WaitlistForm({
  shopId,
  productId,
  variantId,
  customerId,
  theme,
  className,
}: WaitlistFormProps) {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes("@")) {
      toast({
        title: "שגיאה",
        description: "אנא הכנס כתובת אימייל תקינה",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shopId,
          productId,
          variantId: variantId || null,
          email,
          customerId: customerId || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "שגיאה בהרשמה לרשימת המתנה")
      }

      setIsSuccess(true)
      setEmail("")
      toast({
        title: "נרשמת בהצלחה!",
        description: "נעדכן אותך ברגע שהמוצר יחזור למלאי",
        variant: "default",
      })
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה בהרשמה לרשימת המתנה",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className={cn("rounded-lg border p-4 bg-green-50 border-green-200", className)}>
        <div className="flex items-center gap-2 text-green-800">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">נרשמת בהצלחה לרשימת המתנה!</span>
        </div>
        <p className="text-xs text-green-700 mt-2">
          נעדכן אותך ברגע שהמוצר יחזור למלאי
        </p>
      </div>
    )
  }

  return (
    <div className={cn("rounded-lg border border-gray-200 p-4 bg-gray-50", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-5 h-5 text-gray-700" />
        <span className="text-sm font-semibold text-gray-900">
          עדכנו אותי ברגע שהמוצר יחזור למלאי
        </span>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="email"
            placeholder="הכניסו את כתובת האימייל שלכם"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pr-10"
            required
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !email}
          className="rounded-sm h-10 px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap"
          style={{
            backgroundColor: theme?.primaryColor || "#000000",
            color: theme?.primaryTextColor || "#ffffff",
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              שולח...
            </>
          ) : (
            "שליחה"
          )}
        </button>
      </form>
    </div>
  )
}


