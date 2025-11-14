"use client"

import { signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut } from "lucide-react"

export default function SignOutPage() {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      // התנתקות עם redirect לדף הבית
      await signOut({ 
        redirect: false,
      })
      // מעבר ידני ל-login בלי redirect של NextAuth
      window.location.href = "/login"
    } catch (error) {
      console.error("Error signing out:", error)
      setIsSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <LogOut className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">התנתקות</CardTitle>
          <CardDescription className="text-base">
            האם אתה בטוח שברצונך להתנתק?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full h-12 bg-gradient-to-l from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold"
          >
            {isSigningOut ? "מתנתק..." : "התנתק"}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            disabled={isSigningOut}
            className="w-full h-12"
          >
            ביטול
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

