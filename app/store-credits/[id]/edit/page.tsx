"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
import { Save, CreditCard, User, DollarSign, Calendar } from "lucide-react"

interface Customer {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

export default function EditStoreCreditPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const storeCreditId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  
  const [formData, setFormData] = useState({
    customerId: "",
    amount: "",
    expiresAt: "",
    notes: "",
  })

  useEffect(() => {
    if (selectedShop) {
      fetchCustomers()
    }
    if (storeCreditId) {
      fetchStoreCredit()
    }
  }, [selectedShop, storeCreditId])

  const fetchStoreCredit = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/store-credits/${storeCreditId}`)
      if (response.ok) {
        const credit = await response.json()
        
        let expiresAtFormatted = ""
        if (credit.expiresAt) {
          const date = new Date(credit.expiresAt)
          expiresAtFormatted = date.toISOString().slice(0, 10)
        }

        setFormData({
          customerId: credit.customerId || "",
          amount: credit.amount?.toString() || "",
          expiresAt: expiresAtFormatted,
          notes: credit.notes || "",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את קרדיט בחנות",
          variant: "destructive",
        })
        router.push("/store-credits")
      }
    } catch (error) {
      console.error("Error fetching store credit:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת קרדיט בחנות",
        variant: "destructive",
      })
      router.push("/store-credits")
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/customers?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedShop) {
      toast({
        title: "שגיאה",
        description: "יש לבחור חנות מההדר",
        variant: "destructive",
      })
      return
    }

    if (!formData.customerId) {
      toast({
        title: "שגיאה",
        description: "יש לבחור לקוח",
        variant: "destructive",
      })
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "שגיאה",
        description: "סכום חייב להיות חיובי",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload: any = {
        shopId: selectedShop.id,
        customerId: formData.customerId,
        amount: parseFloat(formData.amount),
        expiresAt: formData.expiresAt || undefined,
        notes: formData.notes || undefined,
      }

      const response = await fetch(`/api/store-credits/${storeCreditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "קרדיט בחנות עודכן בהצלחה",
        })
        fetchStoreCredit()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בעדכון קרדיט בחנות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating store credit:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון קרדיט בחנות",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="עריכת קרדיט בחנות">
        <FormSkeleton />
      </AppLayout>
    )
  }

  if (!selectedShop) {
    return (
      <AppLayout title="עריכת קרדיט בחנות">
        <div className="text-center py-12">
          <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני עריכת קרדיט בחנות
          </p>
          <Button onClick={() => router.push("/store-credits")}>
            חזור לרשימת קרדיט בחנות
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="עריכת קרדיט בחנות">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">עריכת קרדיט בחנות</h1>
            <p className="text-gray-600 mt-1">
              ערוך קרדיט בחנות ללקוח
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/store-credits")}
              disabled={saving}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="prodify-gradient text-white"
            >
              <Save className="w-4 h-4 ml-2" />
              {saving ? "שומר..." : "שמור"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  פרטי קרדיט בחנות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerId">לקוח *</Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, customerId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר לקוח" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.firstName} {customer.lastName} ({customer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">סכום *</Label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">₪</span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="100.00"
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">תאריך תפוגה</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))}
                  />
                  <p className="text-sm text-gray-500">
                    השאר ריק אם אין תאריך תפוגה
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">הערות</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="סיבה להענקת הקרדיט..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>מידע</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-600">
                <p>
                  קרדיט בחנות מאפשר ללקוח להשתמש בכסף בחנות שלך.
                </p>
                <p>
                  הלקוח יוכל להשתמש בקרדיט בתשלום על הזמנות.
                </p>
                <p>
                  אם יש כבר קרדיט ללקוח, הסכום יתווסף ליתרה הקיימת.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

