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
import { useToast } from "@/components/ui/use-toast"
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
  // שלב 1
  name: string
  slug: string
  description: string
  category: string
  logo: string | null
  favicon: string | null
  isPublished: boolean
  
  // שלב 2
  email: string
  phone: string
  address: string
  workingHours: any
  
  // שלב 3
  paymentMethods: string[]
  currency: string
  taxEnabled: boolean
  taxRate: number
  pricesIncludeTax: boolean
  
  // שלב 4
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
  
  // שלב 5
  theme: string
  primaryColor: string
  secondaryColor: string
  autoOpenCartAfterAdd: boolean
  
  // הגדרות לוגו
  logoWidthMobile: number
  logoWidthDesktop: number
  logoPaddingMobile: number
  logoPaddingDesktop: number
  
  // תחזוקה
  maintenanceMessage: string
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

const THEMES = [
  { id: "default", name: "ברירת מחדל", description: "תבנית נקייה ומינימליסטית" },
  { id: "modern", name: "מודרני", description: "תבנית מודרנית עם אנימציות" },
  { id: "classic", name: "קלאסי", description: "תבנית קלאסית ומסורתית" },
  { id: "bold", name: "בולט", description: "תבנית בולטת וצבעונית" },
]

export function ShopSettings() {
  const router = useRouter()
  const { data: session } = useSession()
  const { selectedShop, loading: shopsLoading } = useShop()
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
    logo: null,
    favicon: null,
    isPublished: true,
    email: "",
    phone: "",
    address: "",
    workingHours: null,
    paymentMethods: [],
    currency: "ILS",
    taxEnabled: true,
    taxRate: 18,
    pricesIncludeTax: true,
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
    theme: "default",
    primaryColor: "#000000",
    secondaryColor: "#333333",
    autoOpenCartAfterAdd: true,
    logoWidthMobile: 85,
    logoWidthDesktop: 135,
    logoPaddingMobile: 0,
    logoPaddingDesktop: 0,
    maintenanceMessage: "אנו עובדים על שיפורים בחנות. אנא חזור מאוחר יותר.",
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
    if (!selectedShop?.id) return
    
    try {
      const response = await fetch(`/api/shops/${selectedShop.id}`)
      if (response.ok) {
        const shop = await response.json()
        
        // המרת נתונים מהפורמט של DB לפורמט של ShopData
        const settings = shop.settings || {}
        const shipping = settings.shipping || {}
        const pickup = settings.pickup || {}
        const paymentMethods = settings.paymentMethods || []
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
          logo: shop.logo,
          favicon: shop.favicon,
          isPublished: shop.isPublished ?? true,
          email: shop.email || "",
          phone: shop.phone || "",
          address: shop.address || "",
          workingHours: shop.workingHours,
          paymentMethods: paymentMethods,
          currency: shop.currency || "ILS",
          taxEnabled: shop.taxEnabled ?? true,
          taxRate: shop.taxRate || 18,
          pricesIncludeTax: shop.pricesIncludeTax ?? true,
          shippingEnabled: shipping.enabled || false,
          shippingOptions: shippingOptions,
          shippingZones: shipping.zones || [],
          shippingTime: shipping.time || "",
          pickupEnabled: pickup.enabled || false,
          pickupAddress: pickup.address || "",
          pickupCost: pickup.cost || null,
          theme: shop.theme || "default",
          primaryColor: shop.themeSettings?.primaryColor || "#000000",
          secondaryColor: shop.themeSettings?.secondaryColor || "#333333",
          autoOpenCartAfterAdd: shop.settings?.autoOpenCartAfterAdd !== undefined ? shop.settings.autoOpenCartAfterAdd : true,
          logoWidthMobile: shop.themeSettings?.logoWidthMobile || 85,
          logoWidthDesktop: shop.themeSettings?.logoWidthDesktop || 135,
          logoPaddingMobile: shop.themeSettings?.logoPaddingMobile || 0,
          logoPaddingDesktop: shop.themeSettings?.logoPaddingDesktop || 0,
          maintenanceMessage: shop.settings?.maintenanceMessage || "אנו עובדים על שיפורים בחנות. אנא חזור מאוחר יותר.",
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
    if (!selectedShop?.id) {
      toast({
        title: "שגיאה",
        description: "אנא בחר חנות",
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
      const response = await fetch(`/api/shops/${selectedShop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: shopData.name,
          slug: shopData.slug,
          description: shopData.description,
          category: shopData.category,
          logo: shopData.logo,
          favicon: shopData.favicon,
          isPublished: shopData.isPublished,
          email: shopData.email,
          phone: shopData.phone,
          address: shopData.address,
          workingHours: shopData.workingHours,
          currency: shopData.currency,
          taxEnabled: shopData.taxEnabled,
          taxRate: shopData.taxRate,
          pricesIncludeTax: shopData.pricesIncludeTax,
          theme: shopData.theme,
          themeSettings: {
            primaryColor: shopData.primaryColor,
            secondaryColor: shopData.secondaryColor,
            logoWidthMobile: shopData.logoWidthMobile,
            logoWidthDesktop: shopData.logoWidthDesktop,
            logoPaddingMobile: shopData.logoPaddingMobile,
            logoPaddingDesktop: shopData.logoPaddingDesktop,
          },
          settings: {
            paymentMethods: shopData.paymentMethods,
            autoOpenCartAfterAdd: shopData.autoOpenCartAfterAdd,
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

      // שליחת event לעדכון צבעים בדפי הפרונט
      window.dispatchEvent(new Event('themeUpdated'))
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

  if (!selectedShop) {
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
          <p className="text-gray-500 mt-1">ערוך את הגדרות החנות: {selectedShop.name}</p>
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
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Store className="w-5 h-5 text-purple-600" />
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
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
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
                          <Button variant="outline" size="sm" className="border-purple-300">
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
                  className="h-10 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
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
                    className={`h-10 text-sm flex-1 border-gray-300 focus:border-purple-500 focus:ring-purple-500 ${
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
                  className="text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                  קטגוריה ראשית <span className="text-red-500">*</span>
                </Label>
                <Select value={shopData.category} onValueChange={(value) => updateShopData("category", value)}>
                  <SelectTrigger className="h-10 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-sm">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    לוגו החנות <span className="text-gray-400 font-normal">(אופציונלי)</span>
                  </Label>
                  <div className="mt-2 flex items-center gap-4">
                    {shopData.logo ? (
                      <div className="relative group">
                        <img 
                          src={shopData.logo} 
                          alt="Logo" 
                          className="w-28 h-28 object-cover rounded-xl shadow-md ring-2 ring-purple-100 transition-transform group-hover:scale-105" 
                        />
                        <button
                          onClick={async () => {
                            // מחיקת הקובץ מהשרת (S3) אם זה URL של S3
                            if (shopData.logo && shopData.logo.startsWith('https://') && shopData.logo.includes('.s3.')) {
                              try {
                                const response = await fetch(`/api/files/delete?path=${encodeURIComponent(shopData.logo)}`, {
                                  method: 'DELETE',
                                })
                                if (response.ok) {
                                  toast({
                                    title: "הצלחה",
                                    description: "הלוגו נמחק מהשרת",
                                  })
                                } else {
                                  toast({
                                    title: "אזהרה",
                                    description: "הלוגו הוסר מהתצוגה, אך לא נמחק מהשרת",
                                    variant: "destructive",
                                  })
                                }
                              } catch (error) {
                                console.error('Error deleting file:', error)
                                toast({
                                  title: "אזהרה",
                                  description: "הלוגו הוסר מהתצוגה, אך לא נמחק מהשרת",
                                  variant: "destructive",
                                })
                              }
                            }
                            updateShopData("logo", null)
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all hover:scale-110"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all duration-200 group">
                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-purple-500 transition-colors mb-2" />
                        <span className="text-sm font-medium text-gray-600 group-hover:text-purple-600">העלה לוגו</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              try {
                                const formData = new FormData()
                                formData.append("file", file)
                                formData.append("entityType", "shops")
                                formData.append("entityId", selectedShop?.id || "new")
                                formData.append("fileType", "logo")
                                if (selectedShop?.id) {
                                  formData.append("shopId", selectedShop.id)
                                }

                                const response = await fetch("/api/files/upload", {
                                  method: "POST",
                                  body: formData,
                                })

                                if (response.ok) {
                                  const data = await response.json()
                                  updateShopData("logo", data.file.path)
                                  toast({
                                    title: "הצלחה",
                                    description: "הלוגו הועלה בהצלחה",
                                  })
                                } else {
                                  throw new Error("Failed to upload")
                                }
                              } catch (error) {
                                toast({
                                  title: "שגיאה",
                                  description: "אירעה שגיאה בהעלאת הלוגו",
                                  variant: "destructive",
                                })
                              }
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* הגדרות גודל ופדינג לוגו */}
                {shopData.logo && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900">הגדרות תצוגת לוגו</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* רוחב לוגו מובייל */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="logoWidthMobile" className="text-sm font-medium text-gray-700">
                            רוחב לוגו - מובייל
                          </Label>
                          <span className="text-sm text-gray-600">{shopData.logoWidthMobile}px</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            id="logoWidthMobile"
                            type="range"
                            value={shopData.logoWidthMobile}
                            onChange={(e) => updateShopData("logoWidthMobile", parseFloat(e.target.value))}
                            min="20"
                            max="300"
                            step="5"
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                          <Input
                            type="number"
                            value={shopData.logoWidthMobile}
                            onChange={(e) => updateShopData("logoWidthMobile", parseFloat(e.target.value) || 85)}
                            min="20"
                            max="300"
                            className="w-16 h-8 text-xs text-center"
                          />
                        </div>
                        <p className="text-xs text-gray-500">ברירת מחדל: 85px</p>
                      </div>

                      {/* רוחב לוגו מחשב */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="logoWidthDesktop" className="text-sm font-medium text-gray-700">
                            רוחב לוגו - מחשב
                          </Label>
                          <span className="text-sm text-gray-600">{shopData.logoWidthDesktop}px</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            id="logoWidthDesktop"
                            type="range"
                            value={shopData.logoWidthDesktop}
                            onChange={(e) => updateShopData("logoWidthDesktop", parseFloat(e.target.value))}
                            min="30"
                            max="500"
                            step="5"
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                          <Input
                            type="number"
                            value={shopData.logoWidthDesktop}
                            onChange={(e) => updateShopData("logoWidthDesktop", parseFloat(e.target.value) || 135)}
                            min="30"
                            max="500"
                            className="w-16 h-8 text-xs text-center"
                          />
                        </div>
                        <p className="text-xs text-gray-500">ברירת מחדל: 135px</p>
                      </div>

                      {/* פדינג לוגו מובייל */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="logoPaddingMobile" className="text-sm font-medium text-gray-700">
                            פדינג לוגו - מובייל
                          </Label>
                          <span className="text-sm text-gray-600">{shopData.logoPaddingMobile}px</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            id="logoPaddingMobile"
                            type="range"
                            value={shopData.logoPaddingMobile}
                            onChange={(e) => updateShopData("logoPaddingMobile", parseFloat(e.target.value))}
                            min="0"
                            max="100"
                            step="2"
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                          <Input
                            type="number"
                            value={shopData.logoPaddingMobile}
                            onChange={(e) => updateShopData("logoPaddingMobile", parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            className="w-16 h-8 text-xs text-center"
                          />
                        </div>
                        <p className="text-xs text-gray-500">ברירת מחדל: 0px</p>
                      </div>

                      {/* פדינג לוגו מחשב */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="logoPaddingDesktop" className="text-sm font-medium text-gray-700">
                            פדינג לוגו - מחשב
                          </Label>
                          <span className="text-sm text-gray-600">{shopData.logoPaddingDesktop}px</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            id="logoPaddingDesktop"
                            type="range"
                            value={shopData.logoPaddingDesktop}
                            onChange={(e) => updateShopData("logoPaddingDesktop", parseFloat(e.target.value))}
                            min="0"
                            max="100"
                            step="2"
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                          <Input
                            type="number"
                            value={shopData.logoPaddingDesktop}
                            onChange={(e) => updateShopData("logoPaddingDesktop", parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            className="w-16 h-8 text-xs text-center"
                          />
                        </div>
                        <p className="text-xs text-gray-500">ברירת מחדל: 0px</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Favicon (אייקון דפדפן) <span className="text-gray-400 font-normal">(אופציונלי)</span>
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  האייקון שמוצג בכרטיסיית הדפדפן. מומלץ: 32x32 או 64x64 פיקסלים (PNG, SVG או ICO)
                </p>
                <div className="mt-2 flex items-center gap-4">
                  {shopData.favicon ? (
                    <div className="relative group">
                      <img 
                        src={shopData.favicon} 
                        alt="Favicon" 
                        className="w-16 h-16 object-contain rounded-lg shadow-md ring-2 ring-purple-100 transition-transform group-hover:scale-105" 
                      />
                      <button
                        onClick={async () => {
                          // מחיקת הקובץ מהשרת (S3) אם זה URL של S3
                          if (shopData.favicon && shopData.favicon.startsWith('https://') && shopData.favicon.includes('.s3.')) {
                            try {
                              const response = await fetch(`/api/files/delete?path=${encodeURIComponent(shopData.favicon)}`, {
                                method: 'DELETE',
                              })
                              if (response.ok) {
                                toast({
                                  title: "הצלחה",
                                  description: "ה-Favicon נמחק מהשרת",
                                })
                              } else {
                                toast({
                                  title: "אזהרה",
                                  description: "ה-Favicon הוסר מהתצוגה, אך לא נמחק מהשרת",
                                  variant: "destructive",
                                })
                              }
                            } catch (error) {
                              console.error('Error deleting file:', error)
                              toast({
                                title: "אזהרה",
                                description: "ה-Favicon הוסר מהתצוגה, אך לא נמחק מהשרת",
                                variant: "destructive",
                              })
                            }
                          }
                          updateShopData("favicon", null)
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all hover:scale-110"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all duration-200 group">
                      <Upload className="w-6 h-6 text-gray-400 group-hover:text-purple-500 transition-colors mb-1" />
                      <span className="text-xs font-medium text-gray-600 group-hover:text-purple-600 text-center px-2">העלה Favicon</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/png,image/svg+xml,image/x-icon,.ico"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            try {
                              const formData = new FormData()
                              formData.append("file", file)
                              formData.append("entityType", "shops")
                              formData.append("entityId", selectedShop?.id || "new")
                              formData.append("fileType", "favicon")
                              if (selectedShop?.id) {
                                formData.append("shopId", selectedShop.id)
                              }

                              const response = await fetch("/api/files/upload", {
                                method: "POST",
                                body: formData,
                              })

                              if (response.ok) {
                                const data = await response.json()
                                updateShopData("favicon", data.file.path)
                                toast({
                                  title: "הצלחה",
                                  description: "ה-Favicon הועלה בהצלחה",
                                })
                              } else {
                                throw new Error("Failed to upload")
                              }
                            } catch (error) {
                              toast({
                                title: "שגיאה",
                                description: "אירעה שגיאה בהעלאת ה-Favicon",
                                variant: "destructive",
                              })
                            }
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
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
                  className="h-10 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
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
                  className="h-10 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
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
                  className="h-10 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
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

        {/* תשלום */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>תשלום</CardTitle>
                <CardDescription>הגדרות תשלום ומע"מ</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>שיטות תשלום</Label>
                <div className="mt-2 space-y-3">
                  {["אשראי", "העברה בנקאית", "מזומן בהזמנה"].map((method) => (
                    <div key={method} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={method}
                        checked={shopData.paymentMethods.includes(method)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateShopData("paymentMethods", [...shopData.paymentMethods, method])
                          } else {
                            updateShopData("paymentMethods", shopData.paymentMethods.filter((m) => m !== method))
                          }
                        }}
                      />
                      <Label htmlFor={method} className="cursor-pointer">
                        {method}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="currency">מטבע</Label>
                <Select value={shopData.currency} onValueChange={(value) => updateShopData("currency", value)}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ILS">₪ שקל ישראלי</SelectItem>
                    <SelectItem value="USD">$ דולר אמריקאי</SelectItem>
                    <SelectItem value="EUR">€ יורו</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  </div>
                )}
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
                            className="h-10 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
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
                            className="h-10 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
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
                      className="h-10 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
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
                      className="h-10 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
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
                      className="h-10 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* עיצוב */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                <Palette className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <CardTitle>עיצוב</CardTitle>
                <CardDescription>תבנית עיצוב וצבעים</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>תבנית עיצוב</Label>
                <div className="mt-2 space-y-4">
                  {THEMES.map((theme) => (
                    <div
                      key={theme.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        shopData.theme === theme.id
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => updateShopData("theme", theme.id)}
                    >
                      <h3 className="font-semibold">{theme.name}</h3>
                      <p className="text-sm text-gray-600">{theme.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="primaryColor">צבע ראשי</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="primaryColor"
                      type="color"
                      value={shopData.primaryColor}
                      onChange={(e) => updateShopData("primaryColor", e.target.value)}
                      className="w-16 h-10 rounded border"
                    />
                    <Input
                      value={shopData.primaryColor}
                      onChange={(e) => updateShopData("primaryColor", e.target.value)}
                      className="flex-1 h-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="secondaryColor">צבע משני</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="secondaryColor"
                      type="color"
                      value={shopData.secondaryColor}
                      onChange={(e) => updateShopData("secondaryColor", e.target.value)}
                      className="w-16 h-10 rounded border"
                    />
                    <Input
                      value={shopData.secondaryColor}
                      onChange={(e) => updateShopData("secondaryColor", e.target.value)}
                      className="flex-1 h-10 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* הגדרות עגלה */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>פתיחת עגלה אוטומטית</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      פתח את העגלה מהצד אוטומטית אחרי הוספת מוצר
                    </p>
                  </div>
                  <Switch
                    checked={shopData.autoOpenCartAfterAdd}
                    onCheckedChange={(checked) => updateShopData("autoOpenCartAfterAdd", checked)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

