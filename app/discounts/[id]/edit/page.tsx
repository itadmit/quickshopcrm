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
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Save, Tag, Zap, Percent, DollarSign, Package, Users, Calendar, Plus, X, Search } from "lucide-react"

interface Product {
  id: string
  name: string
  price: number
  images?: string[]
}

interface Category {
  id: string
  name: string
}


interface Customer {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

export default function EditDiscountPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop, shops } = useShop()
  const discountId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Products/Categories state
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [categorySearch, setCategorySearch] = useState("")
  
  // Customers state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [customerSearch, setCustomerSearch] = useState("")
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED" | "BUY_X_GET_Y" | "VOLUME_DISCOUNT" | "NTH_ITEM_DISCOUNT" | "FREE_GIFT",
    value: "",
    buyQuantity: "",
    getQuantity: "",
    getDiscount: "",
    nthItem: "",
    volumeRules: [] as Array<{ quantity: number; discount: number }>,
    minOrderAmount: "",
    maxDiscount: "",
    maxUses: "",
    usesPerCustomer: "1",
    startDate: "",
    endDate: "",
    isActive: true,
    isAutomatic: true, // כל ההנחות הן אוטומטיות (בניגוד לקופונים שדורשים קוד)
    canCombine: false,
    priority: "0",
    target: "ALL_PRODUCTS" as string,
    customerTarget: "ALL_CUSTOMERS" as string,
    giftProductId: "",
    giftCondition: "MIN_ORDER_AMOUNT" as "MIN_ORDER_AMOUNT" | "SPECIFIC_PRODUCT",
    giftConditionProductId: "",
    giftConditionAmount: "",
    giftVariantId: "",
  })
  
  const [giftProductVariants, setGiftProductVariants] = useState<Array<{ id: string; name: string; price: number | null }>>([])
  const [giftProductSearch, setGiftProductSearch] = useState("")
  const [giftProductSearchResults, setGiftProductSearchResults] = useState<Product[]>([])
  const [searchingGiftProduct, setSearchingGiftProduct] = useState(false)
  const [requiredProductSearch, setRequiredProductSearch] = useState("")
  const [requiredProductSearchResults, setRequiredProductSearchResults] = useState<Product[]>([])
  const [searchingRequiredProduct, setSearchingRequiredProduct] = useState(false)

  useEffect(() => {
    if (discountId) {
      fetchDiscount()
    }
  }, [discountId])

  useEffect(() => {
    if (selectedShop) {
      fetchProducts()
      fetchCategories()
      fetchCustomers()
    }
  }, [selectedShop])

  useEffect(() => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) return
    
    if (customerSearch.trim()) {
      const timeoutId = setTimeout(() => {
        searchCustomers(customerSearch)
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      fetchCustomers()
    }
  }, [customerSearch, selectedShop])

  const fetchProducts = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) return
    try {
      const shopToUseForProducts = selectedShop || shops[0]
      const response = await fetch(`/api/products?shopId=${shopToUseForProducts.id}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const fetchCategories = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) return
    try {
      const shopToUseForCategories = selectedShop || shops[0]
      const response = await fetch(`/api/categories?shopId=${shopToUseForCategories.id}`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data || [])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }


  const fetchCustomers = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) return
    try {
      const shopToUseForCustomers = selectedShop || shops[0]
      const response = await fetch(`/api/customers?shopId=${shopToUseForCustomers.id}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
    }
  }

  const searchCustomers = async (searchTerm: string) => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) return
    try {
      const shopToUseForCustomerSearch = selectedShop || shops[0]
      const response = await fetch(`/api/customers?shopId=${shopToUseForCustomerSearch.id}&search=${encodeURIComponent(searchTerm)}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error("Error searching customers:", error)
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  )


  const filteredCustomers = customers.filter(c => {
    const searchLower = customerSearch.toLowerCase()
    const name = `${c.firstName || ""} ${c.lastName || ""}`.trim()
    return (
      c.email.toLowerCase().includes(searchLower) ||
      name.toLowerCase().includes(searchLower)
    )
  })

  // חיפוש מוצר מתנה
  const searchGiftProduct = async (query: string) => {
    const shopToUseForGift = selectedShop || shops[0]
    if (!shopToUseForGift || !query.trim()) {
      setGiftProductSearchResults([])
      return
    }

    setSearchingGiftProduct(true)
    try {
      const response = await fetch(
        `/api/products?shopId=${shopToUseForGift.id}&search=${encodeURIComponent(query)}&status=PUBLISHED&limit=20`
      )
      if (response.ok) {
        const data = await response.json()
        setGiftProductSearchResults(data.products || [])
      }
    } catch (error) {
      console.error("Error searching gift products:", error)
    } finally {
      setSearchingGiftProduct(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (giftProductSearch) {
        searchGiftProduct(giftProductSearch)
      } else {
        setGiftProductSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [giftProductSearch, selectedShop])

  // חיפוש מוצר נדרש
  const searchRequiredProduct = async (query: string) => {
    const shopToUseForRequired = selectedShop || shops[0]
    if (!shopToUseForRequired || !query.trim()) {
      setRequiredProductSearchResults([])
      return
    }

    setSearchingRequiredProduct(true)
    try {
      const response = await fetch(
        `/api/products?shopId=${shopToUseForRequired.id}&search=${encodeURIComponent(query)}&status=PUBLISHED&limit=20`
      )
      if (response.ok) {
        const data = await response.json()
        setRequiredProductSearchResults(data.products || [])
      }
    } catch (error) {
      console.error("Error searching required products:", error)
    } finally {
      setSearchingRequiredProduct(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (requiredProductSearch) {
        searchRequiredProduct(requiredProductSearch)
      } else {
        setRequiredProductSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [requiredProductSearch, selectedShop])

  const fetchDiscount = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/discounts/${discountId}`)
      if (response.ok) {
        const discount = await response.json()
        
        let startDateFormatted = ""
        if (discount.startDate) {
          const date = new Date(discount.startDate)
          startDateFormatted = date.toISOString().slice(0, 16)
        }

        let endDateFormatted = ""
        if (discount.endDate) {
          const date = new Date(discount.endDate)
          endDateFormatted = date.toISOString().slice(0, 16)
        }

        setFormData({
          title: discount.title || "",
          description: discount.description || "",
          type: discount.type || "PERCENTAGE",
          value: discount.value?.toString() || "",
          buyQuantity: discount.buyQuantity?.toString() || "",
          getQuantity: discount.getQuantity?.toString() || "",
          getDiscount: discount.getDiscount?.toString() || "",
          nthItem: discount.nthItem?.toString() || "",
          volumeRules: Array.isArray(discount.volumeRules) ? discount.volumeRules : [],
          minOrderAmount: discount.minOrderAmount?.toString() || "",
          maxDiscount: discount.maxDiscount?.toString() || "",
          maxUses: discount.maxUses?.toString() || "",
          usesPerCustomer: discount.usesPerCustomer?.toString() || "1",
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          isActive: discount.isActive ?? true,
          isAutomatic: discount.isAutomatic ?? false,
          canCombine: discount.canCombine ?? false,
          priority: discount.priority?.toString() || "0",
          target: discount.target || "ALL_PRODUCTS",
          customerTarget: discount.customerTarget || "ALL_CUSTOMERS",
          giftProductId: discount.giftProductId || "",
          giftCondition: discount.giftCondition || "MIN_ORDER_AMOUNT",
          giftConditionProductId: discount.giftConditionProductId || "",
          giftConditionAmount: discount.giftConditionAmount?.toString() || "",
          giftVariantId: discount.giftVariantId || "",
        })
        
        // טעינת מוצרים/קטגוריות/לקוחות נבחרים
        // applicableProducts הוא מערך של מחרוזות (IDs) ולא אובייקטים
        // טעינה לפי ה-target - רק את הרלוונטי
        const target = discount.target || "ALL_PRODUCTS"
        
        if (target === "SPECIFIC_PRODUCTS" && discount.applicableProducts && Array.isArray(discount.applicableProducts) && discount.applicableProducts.length > 0) {
          setSelectedProducts(discount.applicableProducts.filter((p: any) => typeof p === 'string'))
        } else if (target === "EXCLUDE_PRODUCTS" && discount.excludedProducts && Array.isArray(discount.excludedProducts) && discount.excludedProducts.length > 0) {
          setSelectedProducts(discount.excludedProducts.filter((p: any) => typeof p === 'string'))
        }
        
        if (target === "SPECIFIC_CATEGORIES" && discount.applicableCategories && Array.isArray(discount.applicableCategories) && discount.applicableCategories.length > 0) {
          setSelectedCategories(discount.applicableCategories.filter((c: any) => typeof c === 'string'))
        } else if (target === "EXCLUDE_CATEGORIES" && discount.excludedCategories && Array.isArray(discount.excludedCategories) && discount.excludedCategories.length > 0) {
          setSelectedCategories(discount.excludedCategories.filter((c: any) => typeof c === 'string'))
        }
        
        if (target === "SPECIFIC_COLLECTIONS" && discount.applicableCollections && Array.isArray(discount.applicableCollections) && discount.applicableCollections.length > 0) {
          setSelectedCategories(discount.applicableCollections.filter((c: any) => typeof c === 'string'))
        } else if (target === "EXCLUDE_COLLECTIONS" && discount.excludedCollections && Array.isArray(discount.excludedCollections) && discount.excludedCollections.length > 0) {
          setSelectedCategories(discount.excludedCollections.filter((c: any) => typeof c === 'string'))
        }
        
        if (discount.specificCustomers && Array.isArray(discount.specificCustomers) && discount.specificCustomers.length > 0) {
          setSelectedCustomers(discount.specificCustomers.filter((c: any) => typeof c === 'string'))
        }
        
        // טעינת וריאציות של מוצר המתנה אם יש
        if (discount.giftProductId && selectedShop) {
          fetch(`/api/products/${discount.giftProductId}`)
            .then(res => res.json())
            .then(data => setGiftProductVariants(data.variants || []))
            .catch(err => console.error("Error fetching product variants:", err))
        }
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את ההנחה",
          variant: "destructive",
        })
        router.push("/discounts")
      }
    } catch (error) {
      console.error("Error fetching discount:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת ההנחה",
        variant: "destructive",
      })
      router.push("/discounts")
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

    if (!formData.title.trim()) {
      toast({
        title: "שגיאה",
        description: "כותרת ההנחה היא חובה",
        variant: "destructive",
      })
      return
    }

    // Validation לפי סוג ההנחה
    // עבור BUY_X_GET_Y, VOLUME_DISCOUNT, FREE_GIFT - value לא חובה
    if (formData.type !== "FREE_GIFT" && formData.type !== "BUY_X_GET_Y" && formData.type !== "VOLUME_DISCOUNT") {
      if (!formData.value || parseFloat(formData.value) < 0) {
        toast({
          title: "שגיאה",
          description: "ערך ההנחה חייב להיות מספר חיובי",
          variant: "destructive",
        })
        return
      }
    }

    // Validation עבור BUY_X_GET_Y
    if (formData.type === "BUY_X_GET_Y") {
      if (!formData.buyQuantity || !formData.getQuantity) {
        toast({
          title: "שגיאה",
          description: "יש למלא את כל השדות הנדרשים (קנה X וקבל Y)",
          variant: "destructive",
        })
        return
      }
      // getDiscount הוא אופציונלי, אבל אם הוא מוזן, הוא צריך להיות בין 0 ל-100
      if (formData.getDiscount && (parseFloat(formData.getDiscount) < 0 || parseFloat(formData.getDiscount) > 100)) {
        toast({
          title: "שגיאה",
          description: "הנחה על Y חייבת להיות בין 0 ל-100 אחוז",
          variant: "destructive",
        })
        return
      }
    }

    // Validation עבור VOLUME_DISCOUNT
    if (formData.type === "VOLUME_DISCOUNT") {
      if (!formData.volumeRules || formData.volumeRules.length === 0) {
        toast({
          title: "שגיאה",
          description: "יש להוסיף לפחות כלל אחד להנחת כמות",
          variant: "destructive",
        })
        return
      }
      // בדיקה שכל הכללים תקינים
      for (const rule of formData.volumeRules) {
        if (!rule.quantity || rule.quantity < 1) {
          toast({
            title: "שגיאה",
            description: "כמות מינימלית חייבת להיות לפחות 1",
            variant: "destructive",
          })
          return
        }
        if (rule.discount < 0 || rule.discount > 100) {
          toast({
            title: "שגיאה",
            description: "אחוז הנחה חייב להיות בין 0 ל-100",
            variant: "destructive",
          })
          return
        }
      }
    }

    // Validation עבור NTH_ITEM_DISCOUNT
    if (formData.type === "NTH_ITEM_DISCOUNT") {
      if (!formData.nthItem || parseInt(formData.nthItem) < 1) {
        toast({
          title: "שגיאה",
          description: "מספר המוצר חייב להיות לפחות 1",
          variant: "destructive",
        })
        return
      }
      if (!formData.value || parseFloat(formData.value) < 0 || parseFloat(formData.value) > 100) {
        toast({
          title: "שגיאה",
          description: "אחוז הנחה חייב להיות בין 0 ל-100",
          variant: "destructive",
        })
        return
      }
    }

    // Validation עבור FREE_GIFT
    if (formData.type === "FREE_GIFT") {
      if (!formData.giftProductId) {
        toast({
          title: "שגיאה",
          description: "יש לבחור מוצר מתנה",
          variant: "destructive",
        })
        return
      }
      if (formData.giftCondition === "MIN_ORDER_AMOUNT" && (!formData.giftConditionAmount || parseFloat(formData.giftConditionAmount) <= 0)) {
        toast({
          title: "שגיאה",
          description: "יש להזין סכום מינימלי",
          variant: "destructive",
        })
        return
      }
      if (formData.giftCondition === "SPECIFIC_PRODUCT" && !formData.giftConditionProductId) {
        toast({
          title: "שגיאה",
          description: "יש לבחור מוצר נדרש",
          variant: "destructive",
        })
        return
      }
    }

    setSaving(true)

    try {
      const payload: any = {
        shopId: shopToUse.id,
        title: formData.title.trim(),
        description: formData.description || undefined,
        type: formData.type,
        value: (formData.type !== "FREE_GIFT" && formData.type !== "BUY_X_GET_Y" && formData.type !== "VOLUME_DISCOUNT") 
          ? parseFloat(formData.value || "0") 
          : 0,
        buyQuantity: formData.buyQuantity ? parseInt(formData.buyQuantity) : undefined,
        getQuantity: formData.getQuantity ? parseInt(formData.getQuantity) : undefined,
        getDiscount: formData.getDiscount ? parseFloat(formData.getDiscount) : undefined,
        nthItem: formData.nthItem ? parseInt(formData.nthItem) : undefined,
        volumeRules: formData.type === "VOLUME_DISCOUNT" && formData.volumeRules.length > 0 ? formData.volumeRules : undefined,
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : undefined,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
        usesPerCustomer: parseInt(formData.usesPerCustomer),
        startDate: formData.startDate && formData.startDate.trim() !== "" ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate && formData.endDate.trim() !== "" ? new Date(formData.endDate).toISOString() : undefined,
        isActive: formData.isActive,
        isAutomatic: true, // כל ההנחות הן אוטומטיות (בניגוד לקופונים שדורשים קוד)
        canCombine: formData.canCombine,
        priority: parseInt(formData.priority),
        target: formData.target,
        customerTarget: formData.customerTarget,
        applicableProducts: formData.target === "SPECIFIC_PRODUCTS" ? selectedProducts : [],
        applicableCategories: formData.target === "SPECIFIC_CATEGORIES" ? selectedCategories : [],
        applicableCollections: formData.target === "SPECIFIC_COLLECTIONS" ? selectedCategories : [],
        excludedProducts: formData.target === "EXCLUDE_PRODUCTS" ? selectedProducts : [],
        excludedCategories: formData.target === "EXCLUDE_CATEGORIES" ? selectedCategories : [],
        excludedCollections: formData.target === "EXCLUDE_COLLECTIONS" ? selectedCategories : [],
        customerTiers: [],
        specificCustomers: formData.customerTarget === "SPECIFIC_CUSTOMERS" ? selectedCustomers : [],
        // שדות חדשים עבור FREE_GIFT
        giftProductId: formData.type === "FREE_GIFT" ? formData.giftProductId : undefined,
        giftCondition: formData.type === "FREE_GIFT" ? formData.giftCondition : undefined,
        giftConditionProductId: formData.type === "FREE_GIFT" ? formData.giftConditionProductId : undefined,
        giftConditionAmount: formData.type === "FREE_GIFT" && formData.giftCondition === "MIN_ORDER_AMOUNT" ? parseFloat(formData.giftConditionAmount) : undefined,
        giftVariantId: formData.type === "FREE_GIFT" && formData.giftVariantId ? formData.giftVariantId : undefined,
      }

      const response = await fetch(`/api/discounts/${discountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "ההנחה עודכנה בהצלחה",
        })
        fetchDiscount()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת ההנחה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating discount:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת ההנחה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="עריכת הנחה">
        <FormSkeleton />
      </AppLayout>
    )
  }

  // אם אין חנות נבחרת, נשתמש בחנות הראשונה
  const shopToUse = selectedShop || shops[0]
  
  if (!shopToUse) {
    return (
      <AppLayout title="עריכת הנחה">
        <div className="text-center py-12">
          <Tag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני עריכת הנחה
          </p>
          <Button onClick={() => router.push("/discounts")}>
            חזור לרשימת הנחות
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="עריכת הנחה">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">עריכת הנחה</h1>
            <p className="text-gray-600 mt-1">
              ערוך הנחה אוטומטית או קופון
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/discounts")}
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
              {saving ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" dir="rtl">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  פרטי הנחה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">כותרת *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="לדוגמה: הנחה 20% על כל המוצרים"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="תיאור ההנחה..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>סוג הנחה *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">אחוז הנחה</SelectItem>
                      <SelectItem value="FIXED">סכום קבוע</SelectItem>
                      <SelectItem value="BUY_X_GET_Y">קנה X קבל Y</SelectItem>
                      <SelectItem value="VOLUME_DISCOUNT">הנחת כמות</SelectItem>
                      <SelectItem value="NTH_ITEM_DISCOUNT">הנחה על מוצר N</SelectItem>
                      <SelectItem value="FREE_GIFT">קבלת מתנה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* PERCENTAGE / FIXED */}
                {(formData.type === "PERCENTAGE" || formData.type === "FIXED") && (
                  <div className="space-y-2">
                    <Label htmlFor="value">
                      {formData.type === "PERCENTAGE" ? "אחוז הנחה *" : "סכום הנחה *"}
                    </Label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        {formData.type === "PERCENTAGE" ? "%" : "₪"}
                      </span>
                      <Input
                        id="value"
                        type="number"
                        step="0.01"
                        value={formData.value}
                        onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                        placeholder="0.00"
                        className="pr-10"
                      />
                    </div>
                  </div>
                )}

                {/* BUY_X_GET_Y */}
                {formData.type === "BUY_X_GET_Y" && (
                  <div className="space-y-4 p-4 bg-emerald-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="buyQuantity">קנה (X) *</Label>
                        <Input
                          id="buyQuantity"
                          type="number"
                          value={formData.buyQuantity}
                          onChange={(e) => setFormData((prev) => ({ ...prev, buyQuantity: e.target.value }))}
                          placeholder="2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="getQuantity">קבל (Y) *</Label>
                        <Input
                          id="getQuantity"
                          type="number"
                          value={formData.getQuantity}
                          onChange={(e) => setFormData((prev) => ({ ...prev, getQuantity: e.target.value }))}
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="getDiscount">הנחה על Y (%)</Label>
                        <Input
                          id="getDiscount"
                          type="number"
                          step="0.01"
                          value={formData.getDiscount}
                          onChange={(e) => setFormData((prev) => ({ ...prev, getDiscount: e.target.value }))}
                          placeholder="100"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      לדוגמה: קנה 2 קבל 1 בחינם = קנה 2, קבל 1, הנחה 100%
                    </p>
                  </div>
                )}

                {/* NTH_ITEM_DISCOUNT */}
                {formData.type === "NTH_ITEM_DISCOUNT" && (
                  <div className="space-y-4 p-4 bg-emerald-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nthItem">מוצר מספר *</Label>
                        <Input
                          id="nthItem"
                          type="number"
                          value={formData.nthItem}
                          onChange={(e) => setFormData((prev) => ({ ...prev, nthItem: e.target.value }))}
                          placeholder="3"
                        />
                        <p className="text-xs text-gray-500">לדוגמה: 3 = המוצר השלישי</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="value">אחוז הנחה *</Label>
                        <div className="relative">
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                          <Input
                            id="value"
                            type="number"
                            step="0.01"
                            value={formData.value}
                            onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                            placeholder="15"
                            className="pr-10"
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      לדוגמה: 15% הנחה על המוצר השלישי
                    </p>
                  </div>
                )}

                {/* VOLUME_DISCOUNT */}
                {formData.type === "VOLUME_DISCOUNT" && (
                  <div className="space-y-4 p-4 bg-emerald-50 rounded-lg">
                    <Label>הנחת כמות</Label>
                    <p className="text-sm text-gray-600 mb-4">
                      הגדר הנחות לפי כמות פריטים בעגלה (למשל: קנה 3+ קבל 10% הנחה, קנה 5+ קבל 15% הנחה)
                    </p>
                    
                    <div className="space-y-3">
                      {formData.volumeRules.map((rule, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-gray-500">כמות מינימלית</Label>
                              <Input
                                type="number"
                                min="1"
                                value={rule.quantity}
                                onChange={(e) => {
                                  const newRules = [...formData.volumeRules]
                                  newRules[index].quantity = parseInt(e.target.value) || 0
                                  setFormData((prev) => ({ ...prev, volumeRules: newRules }))
                                }}
                                placeholder="3"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">אחוז הנחה</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={rule.discount}
                                  onChange={(e) => {
                                    const newRules = [...formData.volumeRules]
                                    newRules[index].discount = parseFloat(e.target.value) || 0
                                    setFormData((prev) => ({ ...prev, volumeRules: newRules }))
                                  }}
                                  placeholder="10"
                                />
                                <span className="text-sm text-gray-500">%</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newRules = formData.volumeRules.filter((_, i) => i !== index)
                              setFormData((prev) => ({ ...prev, volumeRules: newRules }))
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            volumeRules: [...prev.volumeRules, { quantity: 0, discount: 0 }],
                          }))
                        }}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        הוסף כלל חדש
                      </Button>
                    </div>
                    
                    {formData.volumeRules.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        לחץ על "הוסף כלל חדש" כדי להתחיל
                      </p>
                    )}
                  </div>
                )}

                {/* FREE_GIFT */}
                {formData.type === "FREE_GIFT" && (
                  <div className="space-y-4 p-4 bg-emerald-50 rounded-lg">
                    <Label>קבלת מתנה</Label>
                    <p className="text-sm text-gray-600 mb-4">
                      הגדר מתנה שתתווסף אוטומטית לעגלה כאשר התנאים מתקיימים
                    </p>
                    
                    {/* בחירת מוצר מתנה */}
                    <div className="space-y-2">
                      <Label htmlFor="giftProductId">מוצר מתנה *</Label>
                      
                      {/* שדה חיפוש */}
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="חפש מוצר מתנה..."
                          value={giftProductSearch}
                          onChange={(e) => setGiftProductSearch(e.target.value)}
                          className="pr-10"
                          onFocus={() => {
                            if (giftProductSearch && giftProductSearchResults.length === 0) {
                              searchGiftProduct(giftProductSearch)
                            }
                          }}
                        />
                      </div>

                      {/* רשימת תוצאות חיפוש */}
                      {giftProductSearch && (
                        <div className="border rounded-lg max-h-60 overflow-y-auto">
                          {searchingGiftProduct ? (
                            <div className="p-4 text-center text-sm text-gray-500">מחפש...</div>
                          ) : giftProductSearchResults.length > 0 ? (
                            <div className="p-2 space-y-1">
                              {giftProductSearchResults.map((product: any) => (
                                <div
                                  key={product.id}
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, giftProductId: product.id, giftVariantId: "" }))
                                    setGiftProductSearch("")
                                    setGiftProductSearchResults([])
                                    // טעינת וריאציות של המוצר
                                    if (selectedShop) {
                                      fetch(`/api/products/${product.id}`)
                                        .then(res => res.json())
                                        .then(data => setGiftProductVariants(data.variants || []))
                                        .catch(err => console.error("Error fetching product variants:", err))
                                    }
                                  }}
                                  className={`p-2 rounded cursor-pointer hover:bg-gray-100 transition-colors flex items-center gap-3 ${
                                    formData.giftProductId === product.id ? "bg-blue-50 border border-blue-200" : ""
                                  }`}
                                >
                                  {product.images && product.images.length > 0 && (
                                    <img 
                                      src={product.images[0]} 
                                      alt={product.name}
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{product.name}</div>
                                    <div className="text-xs text-gray-500">₪{product.price}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-sm text-gray-500">לא נמצאו מוצרים</div>
                          )}
                        </div>
                      )}

                      {/* מוצר נבחר */}
                      {formData.giftProductId && !giftProductSearch && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-3 flex-1">
                            {(() => {
                              const selectedProduct = products.find(p => p.id === formData.giftProductId) || 
                                                     giftProductSearchResults.find(p => p.id === formData.giftProductId)
                              return selectedProduct?.images && selectedProduct.images.length > 0 && (
                                <img 
                                  src={selectedProduct.images[0]} 
                                  alt={selectedProduct.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )
                            })()}
                            <div>
                              <div className="font-medium text-sm">
                                {products.find(p => p.id === formData.giftProductId)?.name || 
                                 giftProductSearchResults.find(p => p.id === formData.giftProductId)?.name || 
                                 "מוצר נבחר"}
                              </div>
                              <div className="text-xs text-gray-600">
                                ₪{products.find(p => p.id === formData.giftProductId)?.price || 
                                   giftProductSearchResults.find(p => p.id === formData.giftProductId)?.price || 
                                   0}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, giftProductId: "", giftVariantId: "" }))
                              setGiftProductVariants([])
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* בחירת וריאציה אם יש */}
                    {giftProductVariants.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="giftVariantId">וריאציה (אופציונלי)</Label>
                        <Select
                          value={formData.giftVariantId || undefined}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, giftVariantId: value || "" }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר וריאציה (אופציונלי)" />
                          </SelectTrigger>
                          <SelectContent>
                            {giftProductVariants.map((variant: any) => (
                              <SelectItem key={variant.id} value={variant.id}>
                                {variant.name} {variant.price ? `(${variant.price}₪)` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formData.giftVariantId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData((prev) => ({ ...prev, giftVariantId: "" }))}
                            className="text-xs text-gray-600"
                          >
                            הסר בחירת וריאציה
                          </Button>
                        )}
                        <p className="text-xs text-gray-500">
                          אם לא תבחר וריאציה, הלקוח יוכל לבחור במודל בעת הוספה לעגלה
                        </p>
                      </div>
                    )}

                    {/* תנאי המתנה */}
                    <div className="space-y-2">
                      <Label>תנאי לקבלת המתנה *</Label>
                      <RadioGroup
                        value={formData.giftCondition}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, giftCondition: value as "MIN_ORDER_AMOUNT" | "SPECIFIC_PRODUCT" }))}
                      >
                        <div className="flex items-center gap-3 flex-row-reverse">
                          <Label htmlFor="min-amount" className="cursor-pointer flex-1 text-right">קנייה מעל סכום</Label>
                          <RadioGroupItem value="MIN_ORDER_AMOUNT" id="min-amount" />
                        </div>
                        <div className="flex items-center gap-3 flex-row-reverse">
                          <Label htmlFor="specific-product" className="cursor-pointer flex-1 text-right">קניית מוצר מסוים</Label>
                          <RadioGroupItem value="SPECIFIC_PRODUCT" id="specific-product" />
                        </div>
                      </RadioGroup>
                    </div>

                    {/* סכום מינימלי */}
                    {formData.giftCondition === "MIN_ORDER_AMOUNT" && (
                      <div className="space-y-2">
                        <Label htmlFor="giftConditionAmount">סכום מינימלי (₪) *</Label>
                        <Input
                          id="giftConditionAmount"
                          type="number"
                          step="0.01"
                          value={formData.giftConditionAmount}
                          onChange={(e) => setFormData((prev) => ({ ...prev, giftConditionAmount: e.target.value }))}
                          placeholder="100"
                        />
                      </div>
                    )}

                    {/* מוצר מסוים */}
                    {formData.giftCondition === "SPECIFIC_PRODUCT" && (
                      <div className="space-y-2">
                        <Label htmlFor="giftConditionProductId">מוצר נדרש *</Label>
                        
                        {/* שדה חיפוש */}
                        <div className="relative">
                          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            placeholder="חפש מוצר נדרש..."
                            value={requiredProductSearch}
                            onChange={(e) => setRequiredProductSearch(e.target.value)}
                            className="pr-10"
                            onFocus={() => {
                              if (requiredProductSearch && requiredProductSearchResults.length === 0) {
                                searchRequiredProduct(requiredProductSearch)
                              }
                            }}
                          />
                        </div>

                        {/* רשימת תוצאות חיפוש */}
                        {requiredProductSearch && (
                          <div className="border rounded-lg max-h-60 overflow-y-auto">
                            {searchingRequiredProduct ? (
                              <div className="p-4 text-center text-sm text-gray-500">מחפש...</div>
                            ) : requiredProductSearchResults.length > 0 ? (
                              <div className="p-2 space-y-1">
                                {requiredProductSearchResults
                                  .filter(p => p.id !== formData.giftProductId)
                                  .map((product: any) => (
                                    <div
                                      key={product.id}
                                      onClick={() => {
                                        setFormData((prev) => ({ ...prev, giftConditionProductId: product.id }))
                                        setRequiredProductSearch("")
                                        setRequiredProductSearchResults([])
                                      }}
                                      className={`p-2 rounded cursor-pointer hover:bg-gray-100 transition-colors flex items-center gap-3 ${
                                        formData.giftConditionProductId === product.id ? "bg-blue-50 border border-blue-200" : ""
                                      }`}
                                    >
                                      {product.images && product.images.length > 0 && (
                                        <img 
                                          src={product.images[0]} 
                                          alt={product.name}
                                          className="w-12 h-12 object-cover rounded"
                                        />
                                      )}
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{product.name}</div>
                                        <div className="text-xs text-gray-500">₪{product.price}</div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-500">לא נמצאו מוצרים</div>
                            )}
                          </div>
                        )}

                        {/* מוצר נבחר */}
                        {formData.giftConditionProductId && !requiredProductSearch && (
                          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-3 flex-1">
                              {(() => {
                                const selectedProduct = products.find(p => p.id === formData.giftConditionProductId) || 
                                                       requiredProductSearchResults.find(p => p.id === formData.giftConditionProductId)
                                return selectedProduct?.images && selectedProduct.images.length > 0 && (
                                  <img 
                                    src={selectedProduct.images[0]} 
                                    alt={selectedProduct.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )
                              })()}
                              <div>
                                <div className="font-medium text-sm">
                                  {products.find(p => p.id === formData.giftConditionProductId)?.name || 
                                   requiredProductSearchResults.find(p => p.id === formData.giftConditionProductId)?.name || 
                                   "מוצר נבחר"}
                                </div>
                                <div className="text-xs text-gray-600">
                                  ₪{products.find(p => p.id === formData.giftConditionProductId)?.price || 
                                     requiredProductSearchResults.find(p => p.id === formData.giftConditionProductId)?.price || 
                                     0}
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, giftConditionProductId: "" }))
                                setRequiredProductSearch("")
                                setRequiredProductSearchResults([])
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        <p className="text-xs text-gray-500">
                          המתנה תינתן כאשר הלקוח יוסיף את המוצר הזה לעגלה
                        </p>
                      </div>
                    )}

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>שימו לב:</strong> מוצר המתנה יתווסף אוטומטית לעגלה כאשר התנאים מתקיימים, 
                        המחיר שלו יהיה 0₪, והוא לא ניתן למחיקה או עדכון כמות.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Target Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  החלה על
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ההנחה תחול על:</Label>
                  <RadioGroup
                    value={formData.target}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, target: value }))}
                  >
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="all" className="cursor-pointer flex-1 text-right">כל המוצרים</Label>
                      <RadioGroupItem value="ALL_PRODUCTS" id="all" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="products" className="cursor-pointer flex-1 text-right">מוצרים ספציפיים</Label>
                      <RadioGroupItem value="SPECIFIC_PRODUCTS" id="products" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="categories" className="cursor-pointer flex-1 text-right">קטגוריות ספציפיות</Label>
                      <RadioGroupItem value="SPECIFIC_CATEGORIES" id="categories" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="exclude-products" className="cursor-pointer flex-1 text-right">כל המוצרים חוץ מ-</Label>
                      <RadioGroupItem value="EXCLUDE_PRODUCTS" id="exclude-products" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="exclude-categories" className="cursor-pointer flex-1 text-right">כל המוצרים חוץ מקטגוריות</Label>
                      <RadioGroupItem value="EXCLUDE_CATEGORIES" id="exclude-categories" />
                    </div>
                  </RadioGroup>
                </div>

                {/* Product Selection */}
                {(formData.target === "SPECIFIC_PRODUCTS" || formData.target === "EXCLUDE_PRODUCTS") && (
                  <div className="space-y-3">
                    <Label>בחר מוצרים:</Label>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="חפש מוצרים..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                    <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                      {filteredProducts.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">לא נמצאו מוצרים</p>
                      ) : (
                        filteredProducts.map((product: any) => (
                          <div key={product.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`product-${product.id}`}
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProducts([...selectedProducts, product.id])
                                } else {
                                  setSelectedProducts(selectedProducts.filter(id => id !== product.id))
                                }
                              }}
                            />
                            <Label htmlFor={`product-${product.id}`} className="cursor-pointer flex-1 text-sm">
                              {product.name} ({product.price}₪)
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                    {selectedProducts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedProducts.map((productId) => {
                          const product = products.find(p => p.id === productId)
                          if (!product) return null
                          return (
                            <div key={productId} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                              {product.name}
                              <button
                                onClick={() => setSelectedProducts(selectedProducts.filter(id => id !== productId))}
                                className="hover:bg-blue-200 rounded p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Category Selection */}
                {(formData.target === "SPECIFIC_CATEGORIES" || formData.target === "EXCLUDE_CATEGORIES") && (
                  <div className="space-y-3">
                    <Label>בחר קטגוריות:</Label>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="חפש קטגוריות..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                    <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                      {filteredCategories.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">לא נמצאו קטגוריות</p>
                      ) : (
                        filteredCategories.map((category: any) => (
                          <div key={category.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`category-${category.id}`}
                              checked={selectedCategories.includes(category.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCategories([...selectedCategories, category.id])
                                } else {
                                  setSelectedCategories(selectedCategories.filter(id => id !== category.id))
                                }
                              }}
                            />
                            <Label htmlFor={`category-${category.id}`} className="cursor-pointer flex-1 text-sm">
                              {category.name}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                    {selectedCategories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedCategories.map((categoryId) => {
                          const category = categories.find(c => c.id === categoryId)
                          if (!category) return null
                          return (
                            <div key={categoryId} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                              {category.name}
                              <button
                                onClick={() => setSelectedCategories(selectedCategories.filter(id => id !== categoryId))}
                                className="hover:bg-blue-200 rounded p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Customer Target */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  החלה על לקוחות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ההנחה תחול על:</Label>
                  <RadioGroup
                    value={formData.customerTarget}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, customerTarget: value }))}
                  >
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="all-customers" className="cursor-pointer flex-1 text-right">כל הלקוחות</Label>
                      <RadioGroupItem value="ALL_CUSTOMERS" id="all-customers" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="registered" className="cursor-pointer flex-1 text-right">לקוחות רשומים בלבד</Label>
                      <RadioGroupItem value="REGISTERED_CUSTOMERS" id="registered" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="specific-customers" className="cursor-pointer flex-1 text-right">לקוחות ספציפיים</Label>
                      <RadioGroupItem value="SPECIFIC_CUSTOMERS" id="specific-customers" />
                    </div>
                  </RadioGroup>
                </div>

                {/* Customer Selection */}
                {formData.customerTarget === "SPECIFIC_CUSTOMERS" && (
                  <div className="space-y-3">
                    <Label>בחר לקוחות:</Label>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="חפש לקוח לפי שם או אימייל..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                    <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                      {filteredCustomers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">לא נמצאו לקוחות</p>
                      ) : (
                        filteredCustomers.map((customer: any) => {
                          const name = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.email
                          return (
                            <div key={customer.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`customer-${customer.id}`}
                                checked={selectedCustomers.includes(customer.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCustomers([...selectedCustomers, customer.id])
                                  } else {
                                    setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id))
                                  }
                                }}
                              />
                              <Label htmlFor={`customer-${customer.id}`} className="cursor-pointer flex-1 text-sm">
                                {name} ({customer.email})
                              </Label>
                            </div>
                          )
                        })
                      )}
                    </div>
                    {selectedCustomers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedCustomers.map((customerId) => {
                          const customer = customers.find(c => c.id === customerId)
                          if (!customer) return null
                          const name = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.email
                          return (
                            <div key={customerId} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                              {name}
                              <button
                                onClick={() => setSelectedCustomers(selectedCustomers.filter(id => id !== customerId))}
                                className="hover:bg-blue-200 rounded p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dates & Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  תוקף ושימושים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">תאריך התחלה</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">תאריך סיום</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minOrderAmount">מינימום הזמנה (₪)</Label>
                    <Input
                      id="minOrderAmount"
                      type="number"
                      step="0.01"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  {formData.type === "PERCENTAGE" && (
                    <div className="space-y-2">
                      <Label htmlFor="maxDiscount">מקסימום הנחה (₪)</Label>
                      <Input
                        id="maxDiscount"
                        type="number"
                        step="0.01"
                        value={formData.maxDiscount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, maxDiscount: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxUses">מספר שימושים מקסימלי</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      value={formData.maxUses}
                      onChange={(e) => setFormData((prev) => ({ ...prev, maxUses: e.target.value }))}
                      placeholder="ללא הגבלה"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="usesPerCustomer">שימושים לכל לקוח</Label>
                    <Input
                      id="usesPerCustomer"
                      type="number"
                      value={formData.usesPerCustomer}
                      onChange={(e) => setFormData((prev) => ({ ...prev, usesPerCustomer: e.target.value }))}
                      placeholder="1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>הגדרות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <Label htmlFor="isActive" className="cursor-pointer">
                    הנחה פעילה
                  </Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked as boolean }))
                    }
                  />
                </div>


                <div className="flex items-center justify-center gap-3">
                  <Label htmlFor="canCombine" className="cursor-pointer">
                    ניתן לשלב עם הנחות אחרות
                  </Label>
                  <Switch
                    id="canCombine"
                    checked={formData.canCombine}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, canCombine: checked as boolean }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">עדיפות</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500">
                    הנחות עם עדיפות גבוהה יותר מוחלות קודם
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

