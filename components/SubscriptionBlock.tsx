"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CreditCard, Lock } from "lucide-react"

interface SubscriptionBlockProps {
  subscriptionInfo?: {
    isActive: boolean
    daysRemaining: number
    subscription?: {
      status: string
      plan: string
    } | null
  } | null
}

export function SubscriptionBlock({ subscriptionInfo }: SubscriptionBlockProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // בדיקה אם יש מנוי פעיל
    async function checkSubscription() {
      try {
        const response = await fetch('/api/subscriptions/check')
        if (response.ok) {
          const data = await response.json()
          setIsLoading(false)
          // אם המנוי פעיל, לא נציג את המסך
          if (data.isActive) {
            return
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error)
      }
      setIsLoading(false)
    }
    checkSubscription()
  }, [])

  if (isLoading) {
    return null
  }

  // אם יש מנוי פעיל, לא נציג את המסך
  if (subscriptionInfo?.isActive) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-2xl shadow-2xl border-2 border-red-200">
        <CardHeader className="text-center pb-4 border-b border-gray-200">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-red-900 mb-2">
            מנוי פג תוקף
          </CardTitle>
          <CardDescription className="text-lg text-gray-700">
            הגישה למערכת חסומה עד לחידוש המנוי
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">
                  המנוי שלך פג תוקף
                </h3>
                <p className="text-sm text-red-800">
                  כדי להמשיך להשתמש במערכת, אנא חידש את המנוי שלך. 
                  לאחר התשלום, הגישה תתאפשר מחדש באופן מיידי.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-gray-900 mb-2">מה קורה עכשיו?</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span>הגישה לכל הדפים חסומה (חוץ מהגדרות)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span>החנות שלך עדיין פעילה ונראית ללקוחות</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">•</span>
                <span>לאחר חידוש המנוי, הגישה תתאפשר מיד</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => router.push('/settings?tab=subscription')}
              className="flex-1 h-12 text-lg font-semibold prodify-gradient text-white"
              size="lg"
            >
              <CreditCard className="w-5 h-5 ml-2" />
              חידוש מנוי עכשיו
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/settings?tab=subscription')}
              className="flex-1 h-12 text-lg border-2 border-gray-300 hover:border-gray-400"
              size="lg"
            >
              צפה במסלולים
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 pt-2">
            יש לך שאלות? צור קשר עם התמיכה שלנו
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

