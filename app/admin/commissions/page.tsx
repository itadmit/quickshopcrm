"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Store, CreditCard, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"

interface CommissionData {
  companyId: string
  companyName: string
  ownerName: string
  ownerEmail: string
  plan: string
  status: string
  totalSales: number
  commissionRate: string
  commissionAmount: number
  lastCommissionDate: string
  hasToken: boolean
}

export default function CommissionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<CommissionData[]>([])
  const [totalCommissions, setTotalCommissions] = useState(0)
  const [chargingCompanyId, setChargingCompanyId] = useState<string | null>(null)

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
      fetchCommissions()
    }
  }, [status, session, router])

  const fetchCommissions = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/commissions")
      if (res.ok) {
        const data = await res.json()
        setCompanies(data.companies)
        setTotalCommissions(data.totalCommissions)
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון נתוני עמלות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching commissions:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הנתונים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChargeCommission = async (company: CommissionData) => {
    if (!company.hasToken) {
      toast({
        title: "אין Token",
        description: `לא שמור Token עבור ${company.companyName}. החנות צריכה לשלם לפחות פעם אחת.`,
        variant: "destructive",
      })
      return
    }

    if (company.commissionAmount <= 0) {
      toast({
        title: "אין סכום לגבייה",
        description: `אין עמלות לגביה עבור ${company.companyName}`,
      })
      return
    }

    const confirmed = confirm(
      `האם לגבות ${company.commissionAmount.toFixed(2)}₪ מ-${company.companyName}?`
    )
    if (!confirmed) return

    setChargingCompanyId(company.companyId)
    try {
      const res = await fetch("/api/admin/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.companyId,
          amount: company.commissionAmount,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: "הצלחה!",
          description: data.message,
        })
        fetchCommissions() // רענון הנתונים
      } else {
        toast({
          title: "שגיאה",
          description: data.error || "לא ניתן לגבות עמלה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error charging commission:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בגבייה",
        variant: "destructive",
      })
    } finally {
      setChargingCompanyId(null)
    }
  }

  if (status === "loading" || loading) {
    return (
      <AppLayout title="גביית עמלות">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">טוען נתונים...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (session?.user?.role !== "SUPER_ADMIN") {
    return null
  }

  return (
    <AppLayout title="גביית עמלות מחנויות">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">גביית עמלות</h1>
              <p className="text-gray-600">ניהול עמלות 0.5% ממכירות החנויות</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">סה"כ עמלות לגבייה</p>
            <p className="text-3xl font-bold text-green-600">
              ₪{totalCommissions.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            המערכת גובה 0.5% עמלה מכל מכירה בחנויות. העמלה נגבית אוטומטית באמצעות Token
            שנשמר בתשלום המנוי הראשון.
          </AlertDescription>
        </Alert>

        {/* Companies List */}
        <div className="grid gap-4">
          {companies.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Store className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">אין חנויות עם מנויים פעילים</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            companies.map((company: any) => (
              <Card key={company.companyId} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    {/* Company Info */}
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-100 rounded-lg">
                        <Store className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{company.companyName}</h3>
                          <Badge
                            variant={company.status === "ACTIVE" ? "default" : "secondary"}
                          >
                            {company.plan}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {company.ownerName} • {company.ownerEmail}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>מכירות: ₪{company.totalSales.toLocaleString()}</span>
                          <span>•</span>
                          <span>עמלה: {company.commissionRate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Commission Amount & Action */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">עמלה לגבייה</p>
                        <p className="text-2xl font-bold text-green-600">
                          ₪{company.commissionAmount.toFixed(2)}
                        </p>
                        {company.hasToken ? (
                          <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Token זמין</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                            <XCircle className="h-3 w-3" />
                            <span>אין Token</span>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleChargeCommission(company)}
                        disabled={
                          !company.hasToken ||
                          company.commissionAmount <= 0 ||
                          chargingCompanyId === company.companyId
                        }
                        className="prodify-gradient text-white"
                      >
                        {chargingCompanyId === company.companyId ? (
                          "גובה..."
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 ml-2" />
                            גבה עמלה
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  )
}

