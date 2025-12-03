"use client"

import { useState, useEffect } from "react"
import { useDebounce } from "use-debounce"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useShop } from "@/components/providers/ShopProvider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Store, 
  Mail, 
  CreditCard, 
  Truck, 
  Palette,
  Upload,
  X,
  Save,
  Edit,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react"

interface ShopData {
  // פרטי בסיס
  name: string
  slug: string
  description: string
  category: string
  isPublished: boolean
  maintenanceMessage: string
  
  // יצירת קשר
  email: string
  phone: string
  address: string
  workingHours: any
  
  // תשלום ומע"מ
  paymentMethods: string[]
  currency: string
  taxEnabled: boolean
  taxRate: number
  pricesIncludeTax: boolean
  showTaxInCart: boolean
  
  // משלוח
  shippingEnabled: boolean
  shippingOptions: {
    fixed: boolean
    fixedCost: number | null
    free: boolean
    freeOver: boolean
    freeOverAmount: number | null
  }
  shippingZones: string[]
  shippingTime: string
  pickupEnabled: boolean
  pickupAddress: string
  pickupCost: number | null
}

const CATEGORIES = [
  "אופנה ובגדים",
  "אלקטרוניקה",
  "בית וגן",
  "בריאות ויופי",
  "ספורט ופנאי",
  "מזון ומשקאות",
  "ספרים ומוזיקה",
  "צעצועים ומשחקים",
  "אחר",
]

const PAYMENT_METHODS = [
  { id: "credit_card", name: "כרטיס אשראי" },
  { id: "payplus", name: "PayPlus" },
  { id: "paypal", name: "PayPal" },
  { id: "bank_transfer", name: "העברה בנקאית" },
  { id: "cash_on_delivery", name: "מזומן בעת משלוח" },
  { id: "store_credit", name: "קרדיט חנות" },
]

const CURRENCIES = [
  { code: "ILS", name: "שקל (₪)" },
  { code: "USD", name: "דולר ($)" },
  { code: "EUR", name: "יורו (€)" },
  { code: "GBP", name: "פאונד (£)" },
]

export function ShopSettings() {
  const router = useRouter()
  const { data: session } = useSession()
  const { selectedShop, shops, loading: shopsLoading } = useShop()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [slugAvailability, setSlugAvailability] = useState<{
    checking: boolean
    available: boolean | null
    error: string | null
  }>({ checking: false, available: null, error: null })
  const [shopData, setShopData] = useState<ShopData>({
    name: "",
    slug: "",
    description: "",
    category: "",
    isPublished: true,
    maintenanceMessage: "אנו עובדים על שיפורים בחנות. אנא חזור מאוחר יותר.",
    email: "",
    phone: "",
    address: "",
    workingHours: null,
    paymentMethods: [],
    currency: "ILS",
    taxEnabled: true,
    taxRate: 18,
    pricesIncludeTax: true,
    showTaxInCart: true,
    shippingEnabled: false,
    shippingOptions: {
      fixed: false,
      fixedCost: null,
      free: false,
      freeOver: false,
      freeOverAmount: null,
    },
    shippingZones: [],
    shippingTime: "",
    pickupEnabled: false,
    pickupAddress: "",
    pickupCost: null,
  })

  // טעינת נתוני החנות
  useEffect(() => {
    if (selectedShop?.id) {
      loadShopData()
    }
  }, [selectedShop])

  // בדיקת זמינות slug עם debounce
  const [debouncedSlug] = useDebounce(shopData.slug, 500)
  
  useEffect(() => {
    // אם ה-slug לא השתנה או זה ה-slug המקורי, לא נבדוק
    if (!debouncedSlug || debouncedSlug.length < 2 || debouncedSlug === selectedShop?.slug) {
      setSlugAvailability({ checking: false, available: null, error: null })
      return
    }

    // בדיקת זמינות
    const checkSlugAvailability = async () => {
      setSlugAvailability({ checking: true, available: null, error: null })
      
      try {
        const response = await fetch(
          `/api/shops/check-slug?slug=${encodeURIComponent(debouncedSlug)}&shopId=${selectedShop?.id || ''}`
        )
        const data = await response.json()
        
        if (response.ok) {
          setSlugAvailability({
            checking: false,
            available: data.available,
            error: data.error || null,
          })
        } else {
          setSlugAvailability({
            checking: false,
            available: false,
            error: data.error || "שגיאה בבדיקת זמינות",
          })
        }
      } catch (error) {
        setSlugAvailability({
          checking: false,
          available: null,
          error: "שגיאה בבדיקת זמינות",
        })
      }
    }

    checkSlugAvailability()
  }, [debouncedSlug, selectedShop?.id, selectedShop?.slug])

  const loadShopData = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse?.id) return
    
    try {
      const response = await fetch(`/api/shops/${shopToUse.id}`)
      if (response.ok) {
        const shop = await response.json()
        
        // המרת נתונים מהפורמט של DB לפורמט של ShopData
        const settings = shop.settings || {}
        const shipping = settings.shipping || {}
        const pickup = settings.pickup || {}
        
        // paymentMethods צריך להיות מערך
        let paymentMethodsArray: string[] = []
        if (Array.isArray(settings.paymentMethods)) {
          paymentMethodsArray = settings.paymentMethods
        } else {
          // ברירת מחדל - ריק
          paymentMethodsArray = []
        }
        
        // הוספת cash_on_delivery אם cashPayment מופעל
        if (settings.cashPayment?.enabled && !paymentMethodsArray.includes('cash_on_delivery')) {
          paymentMethodsArray.push('cash_on_delivery')
        }
        
        // הוספת bank_transfer אם bankTransferPayment מופעל
        if (settings.bankTransferPayment?.enabled && !paymentMethodsArray.includes('bank_transfer')) {
          paymentMethodsArray.push('bank_transfer')
        }
        const shippingOptions = shipping.options || {
          fixed: false,
          fixedCost: null,
          free: false,
          freeOver: false,
          freeOverAmount: null,
        }
        
        setShopData({
          name: shop.name || "",
          slug: shop.slug || "",
          description: shop.description || "",
          category: shop.category || "",
          isPublished: shop.isPublished ?? true,
          maintenanceMessage: shop.settings?.maintenanceMessage || "אנו עובדים על שיפורים בחנות. אנא חזור מאוחר יותר.",
          email: shop.email || "",
          phone: shop.phone || "",
          address: shop.address || "",
          workingHours: shop.workingHours,
          paymentMethods: paymentMethodsArray,
          currency: shop.currency || "ILS",
          taxEnabled: shop.taxEnabled ?? true,
          taxRate: shop.taxRate || 18,
          pricesIncludeTax: shop.pricesIncludeTax ?? true,
          showTaxInCart: settings.showTaxInCart ?? true,
          shippingEnabled: shipping.enabled || false,
          shippingOptions: shippingOptions,
          shippingZones: shipping.zones || [],
          shippingTime: shipping.time || "",
          pickupEnabled: pickup.enabled || false,
          pickupAddress: pickup.address || "",
          pickupCost: pickup.cost || null,
        })
      }
    } catch (error) {
      console.error("Error loading shop data:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את נתוני החנות",
        variant: "destructive",
      })
    }
  }

  const updateShopData = (field: keyof ShopData, value: any) => {
    setShopData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse?.id) {
      toast({
        title: "שגיאה",
        description: "לא נמצאה חנות. אנא צור חנות תחילה.",
        variant: "destructive",
      })
      return
    }

    // ולידציה
    if (!shopData.name || !shopData.description || !shopData.category) {
      toast({
        title: "שגיאה",
        description: "אנא מלא את כל השדות החובה",
        variant: "destructive",
      })
      return
    }

    // ולידציה של slug
    if (!shopData.slug || shopData.slug.length < 2) {
      toast({
        title: "שגיאה",
        description: "ה-slug חייב להכיל לפחות 2 תווים",
        variant: "destructive",
      })
      return
    }

    if (!/^[a-z0-9-]+$/.test(shopData.slug)) {
      toast({
        title: "שגיאה",
        description: "ה-slug יכול להכיל רק אותיות קטנות, מספרים ומקפים",
        variant: "destructive",
      })
      return
    }

    // בדיקה אם ה-slug זמין (אם השתנה)
    if (shopData.slug !== selectedShop?.slug && slugAvailability.available === false) {
      toast({
        title: "שגיאה",
        description: slugAvailability.error || "ה-slug תפוס, אנא בחר אחר",
        variant: "destructive",
      })
      return
    }

    if (!shopData.email || !shopData.phone) {
      toast({
        title: "שגיאה",
        description: "אנא מלא את פרטי יצירת הקשר",
        variant: "destructive",
      })
      return
    }

    if (shopData.pickupEnabled && !shopData.pickupAddress) {
      toast({
        title: "שגיאה",
        description: "אנא מלא את כתובת האיסוף העצמי",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/shops/${shopToUse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: shopData.name,
          slug: shopData.slug,
          description: shopData.description,
          category: shopData.category,
          isPublished: shopData.isPublished,
          email: shopData.email,
          phone: shopData.phone,
          address: shopData.address,
          workingHours: shopData.workingHours,
          currency: shopData.currency,
          taxEnabled: shopData.taxEnabled,
          taxRate: shopData.taxRate,
          pricesIncludeTax: shopData.pricesIncludeTax,
          settings: {
            paymentMethods: shopData.paymentMethods,
            showTaxInCart: shopData.showTaxInCart,
            shipping: {
              enabled: shopData.shippingEnabled,
              options: shopData.shippingOptions,
              zones: shopData.shippingZones,
              time: shopData.shippingTime,
            },
            pickup: {
              enabled: shopData.pickupEnabled,
              address: shopData.pickupAddress,
              cost: shopData.pickupCost,
            },
            maintenanceMessage: shopData.maintenanceMessage,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "שגיאה בעדכון החנות")
      }

      toast({
        title: "הצלחה!",
        description: "ההגדרות נשמרו בהצלחה",
      })

      // רענון נתוני החנות
      if (selectedShop) {
        loadShopData()
      }

    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בשמירת ההגדרות",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }


  // Show skeleton while loading shops
  if (shopsLoading) {
    return (
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // אם אין חנות נבחרת, נשתמש בחנות הראשונה
  const shopToUse = selectedShop || shops[0]
  
  if (!shopToUse) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12">
          <div className="text-center">
            <Store className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">אין חנות נבחרת</h3>
            <p className="text-gray-600 mb-4">אנא בחר חנות מהתפריט למעלה</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">הגדרות החנות</h2>
          <p className="text-gray-500 mt-1">ערוך את הגדרות החנות: {selectedShop?.name || ""}</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="prodify-gradient text-white"
        >
          <Save className="w-4 h-4 ml-2" />
          {saving ? "שומר..." : "שמור שינויים"}
        </Button>
      </div>

      {/* כל הסעיפים בקופסאות נפרדות */}
      <div className="space-y-6">
        {/* פרטי בסיס */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Store className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>פרטי בסיס</CardTitle>
                <CardDescription>פרטי החנות הבסיסיים</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* פרסם חנות - למעלה מעל הכל */}
              <div className="bg-gradient-to-r from-emerald-50 to-pink-50 border-2 border-emerald-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="isPublished" className="text-base font-bold text-gray-900">
                        פרסם חנות
                      </Label>
                      {!shopData.isPublished && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          החנות סגורה
                        </span>
                      )}
                      {shopData.isPublished && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          החנות פעילה
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium">
                      {shopData.isPublished 
                        ? "החנות פעילה וזמינה ללקוחות" 
                        : "החנות במצב תחזוקה ולא זמינה ללקוחות"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!shopData.isPublished && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="border-emerald-300">
                            <Edit className="w-4 h-4 ml-2" />
                            ערוך הודעת תחזוקה
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>ערוך הודעת תחזוקה</DialogTitle>
                            <DialogDescription>
                              הודעה זו תוצג ללקוחות כאשר החנות במצב תחזוקה
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="maintenanceMessage">הודעת תחזוקה</Label>
                              <Textarea
                                id="maintenanceMessage"
                                value={shopData.maintenanceMessage}
                                onChange={(e) => updateShopData("maintenanceMessage", e.target.value)}
                                placeholder="אנו עובדים על שיפורים בחנות. אנא חזור מאוחר יותר."
                                rows={4}
                                className="text-sm"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogTrigger asChild>
                              <Button variant="outline">ביטול</Button>
                            </DialogTrigger>
                            <DialogTrigger asChild>
                              <Button>שמור</Button>
                            </DialogTrigger>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Switch
                      id="isPublished"
                      checked={shopData.isPublished}
                      onCheckedChange={(checked) => updateShopData("isPublished", checked)}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                  שם החנות <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={shopData.name}
                  onChange={(e) => updateShopData("name", e.target.value)}
                  placeholder="לדוגמה: חנות הבגדים שלי"
                  className="h-10 text-sm border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm font-semibold text-gray-700">
                  כתובת URL (Slug) <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="slug"
                    value={shopData.slug}
                    onChange={(e) => {
                      // רק אותיות קטנות, מספרים ומקפים
                      const cleaned = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "")
                        .replace(/-+/g, "-")
                        .replace(/^-+|-+$/g, "")
                      updateShopData("slug", cleaned)
                    }}
                    placeholder="my-shop"
                    className={`h-10 text-sm flex-1 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 ${
                      slugAvailability.available === false ? "border-red-500" : 
                      slugAvailability.available === true ? "border-green-500" : ""
                    }`}
                  />
                  <div className="flex-shrink-0">
                    {slugAvailability.checking ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    ) : slugAvailability.available === true ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : slugAvailability.available === false ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : null}
                  </div>
                </div>
                {shopData.slug && (
                  <p className="text-xs text-gray-500">
                    כתובת החנות: <span className="font-mono">/shop/{shopData.slug}</span>
                  </p>
                )}
                {slugAvailability.error && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {slugAvailability.error}
                  </p>
                )}
                {slugAvailability.available === true && shopData.slug !== selectedShop?.slug && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    ה-slug זמין לשימוש
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                  תיאור קצר <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={shopData.description}
                  onChange={(e) => updateShopData("description", e.target.value)}
                  placeholder="תאר את החנות שלך בכמה מילים..."
                  rows={3}
                  className="text-sm border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                  קטגוריה ראשית <span className="text-red-500">*</span>
                </Label>
                <Select value={shopData.category} onValueChange={(value) => updateShopData("category", value)}>
                  <SelectTrigger className="h-10 text-sm border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat: any) => (
                      <SelectItem key={cat} value={cat} className="text-sm">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* יצירת קשר */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>יצירת קשר</CardTitle>
                <CardDescription>פרטי יצירת קשר עם החנות</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  כתובת אימייל עסקית <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={shopData.email}
                  onChange={(e) => updateShopData("email", e.target.value)}
                  placeholder="shop@example.com"
                  className="h-10 text-sm border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                  מספר טלפון <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={shopData.phone}
                  onChange={(e) => updateShopData("phone", e.target.value)}
                  placeholder="050-1234567"
                  className="h-10 text-sm border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-semibold text-gray-700">
                  כתובת פיזית <span className="text-gray-400 font-normal">(אופציונלי)</span>
                </Label>
                <Input
                  id="address"
                  value={shopData.address}
                  onChange={(e) => updateShopData("address", e.target.value)}
                  placeholder="רחוב, עיר, מיקוד"
                  className="h-10 text-sm border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  שעות פעילות <span className="text-gray-400 font-normal">(אופציונלי)</span>
                </Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">
                    ניתן להגדיר מאוחר יותר בהגדרות החנות
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* משלוח */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>משלוח</CardTitle>
                <CardDescription>הגדרות משלוח ואיסוף עצמי</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <Checkbox
                    id="shippingEnabled"
                    checked={shopData.shippingEnabled}
                    onCheckedChange={(checked) => updateShopData("shippingEnabled", checked)}
                  />
                  <Label htmlFor="shippingEnabled" className="cursor-pointer">
                    החנות מאפשרת משלוחים
                  </Label>
                </div>
              </div>

              {shopData.shippingEnabled && (
                <>
                  <div className="space-y-3">
                    <Label>אפשרויות משלוח</Label>
                    
                    {/* משלוח חינם */}
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="shippingFree"
                        checked={shopData.shippingOptions.free}
                        onCheckedChange={(checked) => 
                          updateShopData("shippingOptions", {
                            ...shopData.shippingOptions,
                            free: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor="shippingFree" className="cursor-pointer">
                        משלוח חינם
                      </Label>
                    </div>

                    {/* משלוח במחיר קבוע */}
                    <div>
                      <div className="flex items-center space-x-2 space-x-reverse mb-2">
                        <Checkbox
                          id="shippingFixed"
                          checked={shopData.shippingOptions.fixed}
                          onCheckedChange={(checked) => 
                            updateShopData("shippingOptions", {
                              ...shopData.shippingOptions,
                              fixed: checked as boolean,
                            })
                          }
                        />
                        <Label htmlFor="shippingFixed" className="cursor-pointer">
                          משלוח במחיר קבוע
                        </Label>
                      </div>
                      {shopData.shippingOptions.fixed && (
                        <div className="mr-6">
                          <Label htmlFor="shippingCost">עלות משלוח (₪)</Label>
                          <Input
                            id="shippingCost"
                            type="number"
                            value={shopData.shippingOptions.fixedCost || ""}
                            onChange={(e) => 
                              updateShopData("shippingOptions", {
                                ...shopData.shippingOptions,
                                fixedCost: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            min="0"
                            className="h-10 text-sm border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* חינם מעל סכום */}
                    <div>
                      <div className="flex items-center space-x-2 space-x-reverse mb-2">
                        <Checkbox
                          id="shippingFreeOver"
                          checked={shopData.shippingOptions.freeOver}
                          onCheckedChange={(checked) => 
                            updateShopData("shippingOptions", {
                              ...shopData.shippingOptions,
                              freeOver: checked as boolean,
                            })
                          }
                        />
                        <Label htmlFor="shippingFreeOver" className="cursor-pointer">
                          חינם מעל סכום
                        </Label>
                      </div>
                      {shopData.shippingOptions.freeOver && (
                        <div className="mr-6">
                          <Label htmlFor="shippingFreeOverAmount">חינם מעל סכום (₪)</Label>
                          <Input
                            id="shippingFreeOverAmount"
                            type="number"
                            value={shopData.shippingOptions.freeOverAmount || ""}
                            onChange={(e) => 
                              updateShopData("shippingOptions", {
                                ...shopData.shippingOptions,
                                freeOverAmount: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            min="0"
                            className="h-10 text-sm border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="shippingTime">זמן משלוח משוער</Label>
                    <Input
                      id="shippingTime"
                      value={shopData.shippingTime}
                      onChange={(e) => updateShopData("shippingTime", e.target.value)}
                      placeholder="לדוגמה: 3-5 ימי עסקים"
                      className="h-10 text-sm border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <Checkbox
                    id="pickupEnabled"
                    checked={shopData.pickupEnabled}
                    onCheckedChange={(checked) => updateShopData("pickupEnabled", checked)}
                  />
                  <Label htmlFor="pickupEnabled" className="cursor-pointer">
                    החנות מאפשרת איסוף עצמי
                  </Label>
                </div>
              </div>

              {shopData.pickupEnabled && (
                <>
                  <div>
                    <Label htmlFor="pickupAddress">
                      כתובת איסוף עצמי <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="pickupAddress"
                      value={shopData.pickupAddress}
                      onChange={(e) => updateShopData("pickupAddress", e.target.value)}
                      placeholder="רחוב, עיר, מיקוד"
                      className="h-10 text-sm border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pickupCost">
                      מחיר איסוף עצמי <span className="text-gray-400 font-normal">(אופציונלי - השאר ריק לחינם)</span>
                    </Label>
                    <Input
                      id="pickupCost"
                      type="number"
                      value={shopData.pickupCost || ""}
                      onChange={(e) => updateShopData("pickupCost", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0 - חינם (ברירת מחדל)"
                      min="0"
                      className="h-10 text-sm border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* תשלום */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>תשלום ומע"מ</CardTitle>
                <CardDescription>שיטות תשלום, מטבע והגדרות מע"מ</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-semibold text-gray-700">
                  מטבע <span className="text-red-500">*</span>
                </Label>
                <Select value={shopData.currency} onValueChange={(value) => updateShopData("currency", value)}>
                  <SelectTrigger className="h-10 text-sm border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                    <SelectValue placeholder="בחר מטבע" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr: any) => (
                      <SelectItem key={curr.code} value={curr.code} className="text-sm">
                        {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  שיטות תשלום <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  בחר את שיטות התשלום שהחנות תתמוך בהן
                </p>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((method: any) => (
                    <div key={method.id} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={`payment-${method.id}`}
                        checked={Array.isArray(shopData.paymentMethods) && shopData.paymentMethods.includes(method.id)}
                        onCheckedChange={(checked) => {
                          const currentMethods = Array.isArray(shopData.paymentMethods) ? shopData.paymentMethods : []
                          if (checked) {
                            updateShopData("paymentMethods", [...currentMethods, method.id])
                          } else {
                            updateShopData("paymentMethods", currentMethods.filter((m: any) => m !== method.id))
                          }
                        }}
                      />
                      <Label htmlFor={`payment-${method.id}`} className="cursor-pointer text-sm">
                        {method.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {(Array.isArray(shopData.paymentMethods) ? shopData.paymentMethods.length : 0) === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    יש לבחור לפחות שיטת תשלום אחת
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 space-x-reverse mb-2">
                      <Checkbox
                        id="taxEnabled"
                        checked={shopData.taxEnabled}
                        onCheckedChange={(checked) => updateShopData("taxEnabled", checked)}
                      />
                      <Label htmlFor="taxEnabled" className="cursor-pointer">
                        הפעל מע"מ
                      </Label>
                    </div>
                    {shopData.taxEnabled && (
                      <div className="mt-2 mr-6 space-y-3">
                        <div>
                          <Label htmlFor="taxRate">אחוז מע"מ</Label>
                          <Input
                            id="taxRate"
                            type="number"
                            value={shopData.taxRate}
                            onChange={(e) => updateShopData("taxRate", parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox
                            id="pricesIncludeTax"
                            checked={shopData.pricesIncludeTax}
                            onCheckedChange={(checked) => updateShopData("pricesIncludeTax", checked)}
                          />
                          <Label htmlFor="pricesIncludeTax" className="cursor-pointer text-sm">
                            המחירים באתר כוללים מע"מ
                          </Label>
                        </div>
                        <p className="text-xs text-gray-500 mr-6">
                          {shopData.pricesIncludeTax 
                            ? "המחירים שמוצגים ללקוחות כבר כוללים מע״מ" 
                            : "המע״מ יתווסף למחיר בעת התשלום"}
                        </p>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox
                            id="showTaxInCart"
                            checked={shopData.showTaxInCart}
                            onCheckedChange={(checked) => updateShopData("showTaxInCart", checked)}
                          />
                          <Label htmlFor="showTaxInCart" className="cursor-pointer text-sm">
                            הצג פירוט מע"מ בעגלה ובצ'ק אאוט
                          </Label>
                        </div>
                        <p className="text-xs text-gray-500 mr-6">
                          {shopData.showTaxInCart 
                            ? "סכום המע״מ יוצג בפירוט בעגלה ובדף התשלום" 
                            : "סכום המע״מ לא יוצג, רק הסכום הכולל"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

