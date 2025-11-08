"use client"

import { useState, useEffect } from "react"
import { useDebounce } from "use-debounce"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { 
  Store, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  CreditCard, 
  Truck, 
  Palette, 
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  X,
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
}

const STEPS = [
  { id: 1, title: "פרטי בסיס", icon: Store },
  { id: 2, title: "יצירת קשר", icon: Mail },
  { id: 3, title: "תשלום", icon: CreditCard },
  { id: 4, title: "משלוח", icon: Truck },
  { id: 5, title: "עיצוב", icon: Palette },
  { id: 6, title: "סיום", icon: CheckCircle2 },
]

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

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
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
    email: "",
    phone: "",
    address: "",
    workingHours: null,
    paymentMethods: [],
    currency: "ILS",
    taxEnabled: true,
    taxRate: 18,
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
  })

  // בדיקה אם יש חנות קיימת
  useEffect(() => {
    if (!session) return
    
    async function checkExistingShop() {
      try {
        const response = await fetch("/api/shops")
        if (response.ok) {
          const shops = await response.json()
          if (shops.length > 0) {
            // יש חנות קיימת, מעבר לדשבורד
            router.push("/dashboard")
          }
        }
      } catch (error) {
        console.error("Error checking shops:", error)
      }
    }
    checkExistingShop()
  }, [router, session])

  // בדיקת זמינות slug עם debounce
  const [debouncedSlug] = useDebounce(shopData.slug, 500)
  
  useEffect(() => {
    // אם ה-slug ריק או קצר מדי, לא נבדוק
    if (!debouncedSlug || debouncedSlug.length < 2) {
      setSlugAvailability({ checking: false, available: null, error: null })
      return
    }

    // בדיקת זמינות
    const checkSlugAvailability = async () => {
      setSlugAvailability({ checking: true, available: null, error: null })
      
      try {
        const response = await fetch(
          `/api/shops/check-slug?slug=${encodeURIComponent(debouncedSlug)}`
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
  }, [debouncedSlug])

  const updateShopData = (field: keyof ShopData, value: any) => {
    setShopData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    // ולידציה לפי שלב
    if (currentStep === 1) {
      if (!shopData.name || !shopData.description || !shopData.category) {
        toast({
          title: "שגיאה",
          description: "אנא מלא את כל השדות החובה",
          variant: "destructive",
        })
        return
      }
      // בדיקת slug חובה
      if (!shopData.slug || shopData.slug.length < 2) {
        toast({
          title: "שגיאה",
          description: "אנא הזן כתובת URL (Slug) תקינה",
          variant: "destructive",
        })
        return
      }
      // בדיקה שה-slug פנוי
      if (slugAvailability.checking) {
        toast({
          title: "אנא המתן",
          description: "בודקים את זמינות ה-slug...",
          variant: "default",
        })
        return
      }
      if (slugAvailability.available === false) {
        toast({
          title: "שגיאה",
          description: slugAvailability.error || "ה-slug תפוס, אנא בחר אחר",
          variant: "destructive",
        })
        return
      }
      if (slugAvailability.available !== true && shopData.slug.length >= 2) {
        toast({
          title: "אנא המתן",
          description: "בודקים את זמינות ה-slug...",
          variant: "default",
        })
        return
      }
    } else if (currentStep === 2) {
      if (!shopData.email || !shopData.phone) {
        toast({
          title: "שגיאה",
          description: "אנא מלא את כל השדות החובה",
          variant: "destructive",
        })
        return
      }
    } else if (currentStep === 4) {
      if (shopData.pickupEnabled && !shopData.pickupAddress) {
        toast({
          title: "שגיאה",
          description: "אנא מלא את כתובת האיסוף העצמי",
          variant: "destructive",
        })
        return
      }
    }

    if (currentStep < 6) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      // ולידציה של slug לפני יצירת החנות
      if (!shopData.slug || shopData.slug.length < 2) {
        toast({
          title: "שגיאה",
          description: "אנא הזן כתובת URL (Slug) תקינה",
          variant: "destructive",
        })
        setLoading(false)
        return
      }
      
      if (slugAvailability.checking || slugAvailability.available !== true) {
        toast({
          title: "שגיאה",
          description: slugAvailability.error || "אנא המתן לבדיקת זמינות ה-slug או בחר slug אחר",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const slug = shopData.slug.trim()

      // יצירת החנות
      const response = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: shopData.name,
          slug,
          description: shopData.description,
          category: shopData.category,
          logo: shopData.logo,
          email: shopData.email,
          phone: shopData.phone,
          address: shopData.address,
          workingHours: shopData.workingHours,
          currency: shopData.currency,
          taxEnabled: shopData.taxEnabled,
          taxRate: shopData.taxRate,
          theme: shopData.theme,
          themeSettings: {
            primaryColor: shopData.primaryColor,
            secondaryColor: shopData.secondaryColor,
          },
          settings: {
            paymentMethods: shopData.paymentMethods,
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
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "שגיאה ביצירת החנות")
      }

      toast({
        title: "הצלחה!",
        description: "החנות נוצרה בהצלחה",
      })

      // מעבר לדשבורד
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה ביצירת החנות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1)
    }
  }

  const progress = (currentStep / STEPS.length) * 100

  return (
    <AppLayout hideSidebar hideHeader>
      <div className="min-h-full" style={{ backgroundColor: '#f7f9fe' }}>
        {/* Mobile Layout */}
        <div className="md:hidden flex items-start justify-center p-4 py-4">
          <div className="w-full max-w-2xl">
            {/* Logo */}
            <div className="mb-4 text-center">
              <h1 className="text-2xl font-pacifico prodify-gradient-text mb-1 whitespace-nowrap overflow-visible" style={{ letterSpacing: '2px', lineHeight: '1.5' }}>
                Quick Shop
              </h1>
              <p className="text-xs text-gray-500 whitespace-nowrap">מערכת ניהול חנויות אונליין</p>
              {session?.user?.name && (
                <p className="text-sm font-medium text-gray-700 mt-2">שלום, {session.user.name}</p>
              )}
            </div>
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-600">
                  שלב {currentStep} מתוך {STEPS.length}
                </span>
                <span className="text-xs font-bold text-purple-600">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 right-0 h-full prodify-gradient rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

          {/* Steps Indicator - Mobile */}
          <div className="md:hidden mb-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
            <div className="flex items-center gap-3 min-w-max">
              {STEPS.map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep === step.id
                const isCompleted = currentStep > step.id
                
                return (
                  <div key={step.id} className="flex items-center gap-2 flex-shrink-0 snap-center">
                    <div className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 overflow-visible p-2.5 ${
                          isActive
                            ? "prodify-gradient text-white shadow-md"
                            : isCompleted
                            ? "bg-green-500 text-white shadow-sm"
                            : "bg-white text-gray-400 border-2 border-gray-200"
                        }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : ''}`} />
                      </div>
                      <span className={`mt-1.5 text-[10px] font-medium text-center transition-colors whitespace-nowrap ${
                        isActive 
                          ? "font-bold text-purple-600" 
                          : isCompleted
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}>
                        {step.title}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`w-6 h-0.5 rounded-full transition-all duration-500 flex-shrink-0 ${
                        isCompleted 
                          ? "bg-gradient-to-l from-green-500 to-green-400" 
                          : "bg-gray-200"
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

            {/* Step Content */}
            <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100 px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 break-words whitespace-normal">
                {currentStep === 1 && "פרטי החנות הבסיסיים"}
                {currentStep === 2 && "פרטי יצירת קשר"}
                {currentStep === 3 && "הגדרות תשלום"}
                {currentStep === 4 && "הגדרות משלוח"}
                {currentStep === 5 && "עיצוב ראשוני"}
                {currentStep === 6 && "החנות שלך מוכנה!"}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600 break-words whitespace-normal">
                {currentStep === 1 && "מלא את הפרטים הבסיסיים של החנות שלך"}
                {currentStep === 2 && "איך הלקוחות יכולים ליצור איתך קשר?"}
                {currentStep === 3 && "הגדר את שיטות התשלום והמיסים"}
                {currentStep === 4 && "הגדר את אפשרויות המשלוח"}
                {currentStep === 5 && "בחר את העיצוב הראשוני של החנות"}
                {currentStep === 6 && "החנות שלך מוכנה לשימוש!"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 px-4 sm:px-6">
              {/* שלב 1: פרטי בסיס */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                      שם החנות <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={shopData.name}
                      onChange={(e) => {
                        updateShopData("name", e.target.value)
                        // אם המשתמש לא ערך את ה-slug ידנית, נצור slug אוטומטי מהשם
                        if (!slugManuallyEdited) {
                          const autoSlug = e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-+|-+$/g, "")
                          updateShopData("slug", autoSlug)
                        }
                      }}
                      placeholder="לדוגמה: חנות הבגדים שלי"
                      className="h-10 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug" className="text-sm font-semibold text-gray-700">
                      כתובת URL (Slug) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
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
                          setSlugManuallyEdited(true) // סימן שהמשתמש ערך את ה-slug ידנית
                        }}
                        placeholder="my-shop"
                        className={`h-10 text-sm pr-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500 ${
                          slugAvailability.available === false ? "border-red-500" : 
                          slugAvailability.available === true ? "border-green-500" : ""
                        }`}
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex-shrink-0">
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
                        כתובת החנות תהיה: <span className="font-mono">/shop/{shopData.slug}</span>
                      </p>
                    )}
                    {slugAvailability.error && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {slugAvailability.error}
                      </p>
                    )}
                    {slugAvailability.available === true && (
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
                      <SelectTrigger className="h-12 text-base border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                        <SelectValue placeholder="בחר קטגוריה" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className="text-base">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                            onClick={() => updateShopData("logo", null)}
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
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const reader = new FileReader()
                                reader.onload = (e) => {
                                  updateShopData("logo", e.target?.result as string)
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* שלב 2: יצירת קשר */}
              {currentStep === 2 && (
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
              )}

              {/* שלב 3: תשלום */}
              {currentStep === 3 && (
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
                      <SelectTrigger>
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
                      <div className="mt-2">
                        <Label htmlFor="taxRate">אחוז מע"מ</Label>
                        <Input
                          id="taxRate"
                          type="number"
                          value={shopData.taxRate}
                          onChange={(e) => updateShopData("taxRate", parseFloat(e.target.value) || 0)}
                          min="0"
                          max="100"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* שלב 4: משלוח */}
              {currentStep === 4 && (
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
              )}

              {/* שלב 5: עיצוב */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div>
                    <Label>תבנית עיצוב</Label>
                    <div className="mt-2 grid grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-4">
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
                          className="flex-1"
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
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* שלב 6: סיום */}
              {currentStep === 6 && (
                <div className="text-center py-6">
                  <div className="mb-4">
                    <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-3 animate-bounce" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-900">החנות שלך מוכנה! 🎉</h2>
                  <p className="text-base text-gray-600 mb-6 max-w-md mx-auto">
                    החנות <span className="font-semibold text-purple-600">"{shopData.name}"</span> נוצרה בהצלחה. 
                    <br />אתה יכול להתחיל להוסיף מוצרים ולהתחיל למכור!
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.open(`/shop/${shopData.slug}`, "_blank")
                      }}
                      className="h-12 px-6 border-2 border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-all"
                    >
                      פתח את החנות
                    </Button>
                    <Button 
                      onClick={() => router.push("/dashboard")} 
                      className="h-12 px-8 prodify-gradient text-white font-semibold transition-all"
                    >
                      עבור לדשבורד
                    </Button>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              {currentStep < 6 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex gap-3 order-2 sm:order-1">
                    {currentStep > 1 && (
                      <Button 
                        variant="outline" 
                        onClick={handleBack}
                        className="h-11 px-4 sm:px-6 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all flex-1 sm:flex-initial"
                      >
                        <ArrowRight className="w-4 h-4 ml-2" />
                        חזור
                      </Button>
                    )}
                    {currentStep < 5 && (
                      <Button 
                        variant="ghost" 
                        onClick={handleSkip}
                        className="h-11 px-4 sm:px-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
                      >
                        דלג
                      </Button>
                    )}
                  </div>
                  <Button
                    onClick={currentStep === 5 ? handleFinish : handleNext}
                    disabled={loading}
                    className="h-11 px-6 sm:px-8 prodify-gradient text-white font-semibold transition-all duration-200 order-1 sm:order-2 w-full sm:w-auto"
                  >
                    {loading ? "שומר..." : currentStep === 5 ? "סיים והמשך" : "המשך"}
                    <ArrowLeft className="w-4 h-4 mr-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Desktop Layout - Wide with Sidebar */}
        <div className="hidden md:flex p-6 lg:p-8">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-12 gap-8 lg:gap-12">
            {/* Left Sidebar - Steps & Progress */}
            <div className="col-span-12 lg:col-span-4 xl:col-span-3">
              <div className="sticky top-6">
                {/* Logo */}
                <div className="mb-4 text-center lg:text-right">
                  <h1 className="text-2xl lg:text-3xl font-pacifico prodify-gradient-text mb-1 whitespace-nowrap overflow-visible" style={{ letterSpacing: '2px', lineHeight: '1.5' }}>
                    Quick Shop
                  </h1>
                  <p className="text-xs lg:text-sm text-gray-500 whitespace-nowrap">מערכת ניהול חנויות אונליין</p>
                  {session?.user?.name && (
                    <p className="text-sm lg:text-base font-medium text-gray-700 mt-2">שלום, {session.user.name}</p>
                  )}
                </div>
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-600">
                      שלב {currentStep} מתוך {STEPS.length}
                    </span>
                    <span className="text-sm font-bold text-purple-600">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 right-0 h-full prodify-gradient rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Steps List - Vertical */}
                <div className="space-y-0">
                  {STEPS.map((step, index) => {
                    const Icon = step.icon
                    const isActive = currentStep === step.id
                    const isCompleted = currentStep > step.id
                    
                    return (
                      <div key={step.id} className="relative">
                        <div className="flex items-start gap-4 pb-6">
                          <div className="relative flex flex-col items-center">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 overflow-visible p-2.5 flex-shrink-0 z-10 ${
                                isActive
                                  ? "prodify-gradient text-white shadow-md"
                                  : isCompleted
                                  ? "bg-green-500 text-white shadow-sm"
                                  : "bg-white text-gray-400 border-2 border-gray-200"
                              }`}
                            >
                              <Icon className={`w-5 h-5 flex-shrink-0`} />
                            </div>
                            {index < STEPS.length - 1 && (
                              <div className={`absolute top-12 w-0.5 h-16 transition-all duration-500 ${
                                isCompleted 
                                  ? "bg-gradient-to-b from-green-500 to-green-400" 
                                  : "bg-gray-200"
                              }`} />
                            )}
                          </div>
                          <div className="flex-1 pt-1">
                            <div className={`text-sm font-medium transition-colors ${
                              isActive 
                                ? "font-bold text-purple-600" 
                                : isCompleted
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}>
                              {step.title}
                            </div>
                            {isActive && (
                              <div className="text-xs text-gray-500 mt-1">
                                {currentStep === 1 && "מלא את הפרטים הבסיסיים"}
                                {currentStep === 2 && "פרטי יצירת קשר"}
                                {currentStep === 3 && "הגדרות תשלום"}
                                {currentStep === 4 && "הגדרות משלוח"}
                                {currentStep === 5 && "עיצוב ראשוני"}
                                {currentStep === 6 && "החנות מוכנה!"}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right Content - Form */}
            <div className="col-span-12 lg:col-span-8 xl:col-span-9">
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-100 px-6 lg:px-8">
                  <CardTitle className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1 break-words whitespace-normal">
                    {currentStep === 1 && "פרטי החנות הבסיסיים"}
                    {currentStep === 2 && "פרטי יצירת קשר"}
                    {currentStep === 3 && "הגדרות תשלום"}
                    {currentStep === 4 && "הגדרות משלוח"}
                    {currentStep === 5 && "עיצוב ראשוני"}
                    {currentStep === 6 && "החנות שלך מוכנה!"}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 break-words whitespace-normal">
                    {currentStep === 1 && "מלא את הפרטים הבסיסיים של החנות שלך"}
                    {currentStep === 2 && "איך הלקוחות יכולים ליצור איתך קשר?"}
                    {currentStep === 3 && "הגדר את שיטות התשלום והמיסים"}
                    {currentStep === 4 && "הגדר את אפשרויות המשלוח"}
                    {currentStep === 5 && "בחר את העיצוב הראשוני של החנות"}
                    {currentStep === 6 && "החנות שלך מוכנה לשימוש!"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 px-6 lg:px-8">
                  {/* שלב 1: פרטי בסיס */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                          שם החנות <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={shopData.name}
                          onChange={(e) => {
                            updateShopData("name", e.target.value)
                            // אם המשתמש לא ערך את ה-slug ידנית, נצור slug אוטומטי מהשם
                            if (!slugManuallyEdited) {
                              const autoSlug = e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, "-")
                                .replace(/^-+|-+$/g, "")
                              updateShopData("slug", autoSlug)
                            }
                          }}
                          placeholder="לדוגמה: חנות הבגדים שלי"
                          className="h-10 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="slug-desktop" className="text-sm font-semibold text-gray-700">
                          כתובת URL (Slug) <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="slug-desktop"
                            value={shopData.slug}
                            onChange={(e) => {
                              // רק אותיות קטנות, מספרים ומקפים
                              const cleaned = e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9-]/g, "")
                                .replace(/-+/g, "-")
                                .replace(/^-+|-+$/g, "")
                              updateShopData("slug", cleaned)
                              setSlugManuallyEdited(true) // סימן שהמשתמש ערך את ה-slug ידנית
                            }}
                            placeholder="my-shop"
                            className={`h-10 text-sm pr-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500 ${
                              slugAvailability.available === false ? "border-red-500" : 
                              slugAvailability.available === true ? "border-green-500" : ""
                            }`}
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex-shrink-0">
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
                            כתובת החנות תהיה: <span className="font-mono">/shop/{shopData.slug}</span>
                          </p>
                        )}
                        {slugAvailability.error && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {slugAvailability.error}
                          </p>
                        )}
                        {slugAvailability.available === true && (
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
                              <SelectItem key={cat} value={cat} className="text-base">
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

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
                                onClick={() => updateShopData("logo", null)}
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
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    const reader = new FileReader()
                                    reader.onload = (e) => {
                                      updateShopData("logo", e.target?.result as string)
                                    }
                                    reader.readAsDataURL(file)
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* שלב 2: יצירת קשר */}
                  {currentStep === 2 && (
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
                  )}

                  {/* שלב 3: תשלום */}
                  {currentStep === 3 && (
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
                          <SelectTrigger>
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
                          <div className="mt-2">
                            <Label htmlFor="taxRate">אחוז מע"מ</Label>
                            <Input
                              id="taxRate"
                              type="number"
                              value={shopData.taxRate}
                              onChange={(e) => updateShopData("taxRate", parseFloat(e.target.value) || 0)}
                              min="0"
                              max="100"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* שלב 4: משלוח */}
                  {currentStep === 4 && (
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
                                id="shippingFree-desktop"
                                checked={shopData.shippingOptions.free}
                                onCheckedChange={(checked) => 
                                  updateShopData("shippingOptions", {
                                    ...shopData.shippingOptions,
                                    free: checked as boolean,
                                  })
                                }
                              />
                              <Label htmlFor="shippingFree-desktop" className="cursor-pointer">
                                משלוח חינם
                              </Label>
                            </div>

                            {/* משלוח במחיר קבוע */}
                            <div>
                              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                                <Checkbox
                                  id="shippingFixed-desktop"
                                  checked={shopData.shippingOptions.fixed}
                                  onCheckedChange={(checked) => 
                                    updateShopData("shippingOptions", {
                                      ...shopData.shippingOptions,
                                      fixed: checked as boolean,
                                    })
                                  }
                                />
                                <Label htmlFor="shippingFixed-desktop" className="cursor-pointer">
                                  משלוח במחיר קבוע
                                </Label>
                              </div>
                              {shopData.shippingOptions.fixed && (
                                <div className="mr-6">
                                  <Label htmlFor="shippingCost-desktop">עלות משלוח (₪)</Label>
                                  <Input
                                    id="shippingCost-desktop"
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
                                  id="shippingFreeOver-desktop"
                                  checked={shopData.shippingOptions.freeOver}
                                  onCheckedChange={(checked) => 
                                    updateShopData("shippingOptions", {
                                      ...shopData.shippingOptions,
                                      freeOver: checked as boolean,
                                    })
                                  }
                                />
                                <Label htmlFor="shippingFreeOver-desktop" className="cursor-pointer">
                                  חינם מעל סכום
                                </Label>
                              </div>
                              {shopData.shippingOptions.freeOver && (
                                <div className="mr-6">
                                  <Label htmlFor="shippingFreeOverAmount-desktop">חינם מעל סכום (₪)</Label>
                                  <Input
                                    id="shippingFreeOverAmount-desktop"
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
                            <Label htmlFor="shippingTime-desktop">זמן משלוח משוער</Label>
                            <Input
                              id="shippingTime-desktop"
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
                            id="pickupEnabled-desktop"
                            checked={shopData.pickupEnabled}
                            onCheckedChange={(checked) => updateShopData("pickupEnabled", checked)}
                          />
                          <Label htmlFor="pickupEnabled-desktop" className="cursor-pointer">
                            החנות מאפשרת איסוף עצמי
                          </Label>
                        </div>
                      </div>

                      {shopData.pickupEnabled && (
                        <>
                          <div>
                            <Label htmlFor="pickupAddress-desktop">
                              כתובת איסוף עצמי <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="pickupAddress-desktop"
                              value={shopData.pickupAddress}
                              onChange={(e) => updateShopData("pickupAddress", e.target.value)}
                              placeholder="רחוב, עיר, מיקוד"
                              className="h-10 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <Label htmlFor="pickupCost-desktop">
                              מחיר איסוף עצמי <span className="text-gray-400 font-normal">(אופציונלי - השאר ריק לחינם)</span>
                            </Label>
                            <Input
                              id="pickupCost-desktop"
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
                  )}

                  {/* שלב 5: עיצוב */}
                  {currentStep === 5 && (
                    <div className="space-y-4">
                      <div>
                        <Label>תבנית עיצוב</Label>
                        <div className="mt-2 grid grid-cols-2 gap-4">
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

                      <div className="grid grid-cols-2 gap-4">
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
                              className="flex-1"
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
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* שלב 6: סיום */}
                  {currentStep === 6 && (
                    <div className="text-center py-6">
                      <div className="mb-4">
                        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-3 animate-bounce" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2 text-gray-900">החנות שלך מוכנה! 🎉</h2>
                      <p className="text-base text-gray-600 mb-6 max-w-md mx-auto">
                        החנות <span className="font-semibold text-purple-600">"{shopData.name}"</span> נוצרה בהצלחה. 
                        <br />אתה יכול להתחיל להוסיף מוצרים ולהתחיל למכור!
                      </p>
                      <div className="flex gap-4 justify-center">
                        <Button
                          variant="outline"
                          onClick={() => {
                            window.open(`/shop/${shopData.slug}`, "_blank")
                          }}
                          className="h-12 px-6 border-2 border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-all"
                        >
                          פתח את החנות
                        </Button>
                        <Button 
                          onClick={() => router.push("/dashboard")} 
                          className="h-12 px-8 prodify-gradient text-white font-semibold transition-all"
                        >
                          עבור לדשבורד
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  {currentStep < 6 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex gap-3">
                        {currentStep > 1 && (
                          <Button 
                            variant="outline" 
                            onClick={handleBack}
                            className="h-11 px-6 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all"
                          >
                            <ArrowRight className="w-4 h-4 ml-2" />
                            חזור
                          </Button>
                        )}
                        {currentStep < 5 && (
                          <Button 
                            variant="ghost" 
                            onClick={handleSkip}
                            className="h-11 px-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
                          >
                            דלג
                          </Button>
                        )}
                      </div>
                      <Button
                        onClick={currentStep === 5 ? handleFinish : handleNext}
                        disabled={loading}
                        className="h-11 px-8 prodify-gradient text-white font-semibold transition-all duration-200"
                      >
                        {loading ? "שומר..." : currentStep === 5 ? "סיים והמשך" : "המשך"}
                        <ArrowLeft className="w-4 h-4 mr-2" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

