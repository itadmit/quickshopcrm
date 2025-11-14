"use client"

import { useState } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Wrench, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export default function FixProductsPage() {
  const [isFixing, setIsFixing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleFix = async () => {
    setIsFixing(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/fix-product-options", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "שגיאה בתיקון מוצרים")
      }

      setResult(data)

      toast({
        title: "תיקון הושלם!",
        description: `תוקנו ${data.fixed} מוצרים`,
      })
    } catch (error: any) {
      console.error("Error fixing products:", error)
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בתיקון המוצרים",
        variant: "destructive",
      })
    } finally {
      setIsFixing(false)
    }
  }

  return (
    <AppLayout title="תיקון מוצרים">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>תיקון אפשרויות מוצרים</CardTitle>
                <CardDescription>
                  יצירת ProductOptions למוצרים עם variants
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-2">מה הכלי הזה עושה?</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>סורק את כל המוצרים בחנויות שלך</li>
                    <li>מוצא מוצרים שיש להם variants אבל אין להם options</li>
                    <li>יוצר ProductOptions מתאימים מתוך נתוני ה-variants</li>
                    <li>מתקן את בעיית תצוגת הוריאציות במודל המתנה</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleFix}
                disabled={isFixing}
                size="lg"
                className="w-full"
              >
                {isFixing ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    מתקן מוצרים...
                  </>
                ) : (
                  <>
                    <Wrench className="w-5 h-5 ml-2" />
                    הרץ תיקון
                  </>
                )}
              </Button>
            </div>

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-semibold mb-2">תיקון הושלם בהצלחה!</p>
                    <ul className="space-y-1">
                      <li>✅ תוקנו: {result.fixed} מוצרים</li>
                      <li>⏭️ דולגו: {result.skipped} מוצרים (כבר תקינים או ללא variants)</li>
                      {result.errors && result.errors.length > 0 && (
                        <li className="text-red-600">
                          ❌ שגיאות: {result.errors.length}
                        </li>
                      )}
                    </ul>
                    {result.errors && result.errors.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer font-semibold">
                          הצג שגיאות
                        </summary>
                        <ul className="mt-2 space-y-1 text-xs">
                          {result.errors.map((error: string, i: number) => (
                            <li key={i} className="text-red-700">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

