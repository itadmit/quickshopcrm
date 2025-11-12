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
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
import { Save, FileText, Search, X, Package, ExternalLink, Image as ImageIcon, Upload, Plus, Menu, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { MediaPicker } from "@/components/MediaPicker"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface Product {
  id: string
  name: string
  price: number
  images?: string[]
}

export default function EditPagePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop, loading: shopsLoading } = useShop()
  const pageSlug = params.slug as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedProductsData, setSelectedProductsData] = useState<Product[]>([])
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [coupons, setCoupons] = useState<Array<{ id: string; code: string; isActive: boolean }>>([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [originalSlug, setOriginalSlug] = useState("")
  const [addToMenuDialogOpen, setAddToMenuDialogOpen] = useState(false)
  const [navigations, setNavigations] = useState<Array<{ id: string; name: string; location: string }>>([])
  const [loadingNavigations, setLoadingNavigations] = useState(false)
  const [selectedNavigationId, setSelectedNavigationId] = useState<string>("")
  const [pageInMenus, setPageInMenus] = useState<Array<{ navigationId: string; navigationName: string; itemId: string }>>([])
  const [pageId, setPageId] = useState<string>("")
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    template: "STANDARD" as "STANDARD" | "CHOICES_OF",
    displayType: "GRID" as "GRID" | "LIST",
    selectedProducts: [] as string[],
    featuredImage: "",
    couponCode: "",
    seoTitle: "",
    seoDescription: "",
    isPublished: false,
    showInMenu: false,
  })

  useEffect(() => {
    if (pageSlug) {
      fetchPage()
    }
  }, [pageSlug])

  useEffect(() => {
    if (addToMenuDialogOpen && selectedShop) {
      fetchNavigations()
    }
  }, [addToMenuDialogOpen, selectedShop])

  const fetchPage = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/pages/${pageSlug}`)
      if (response.ok) {
        const page = await response.json()
        const selectedProductsIds = Array.isArray(page.selectedProducts) ? page.selectedProducts : []
        
        setPageId(page.id || "")
        setFormData({
          title: page.title || "",
          slug: page.slug || "",
          content: page.content || "",
          template: page.template || "STANDARD",
          displayType: (page.displayType as "GRID" | "LIST") || "GRID",
          selectedProducts: selectedProductsIds,
          featuredImage: page.featuredImage || "",
          couponCode: page.couponCode || "",
          seoTitle: page.seoTitle || "",
          seoDescription: page.seoDescription || "",
          isPublished: page.isPublished ?? false,
          showInMenu: false, // כבר לא משתמשים בזה
        })
        setOriginalSlug(page.slug || "")

        // אם יש מוצרים נבחרים, נטען את הנתונים שלהם
        if (selectedProductsIds.length > 0 && selectedShop) {
          // נטען את המוצרים הנבחרים אחרי שהדף נטען
          setTimeout(() => {
            fetchSelectedProducts(selectedProductsIds)
          }, 100)
        }

        // בדיקה באיזה תפריטים הדף נמצא
        if (selectedShop) {
          checkPageInMenus(page.id || "")
        }
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את הדף",
          variant: "destructive",
        })
        router.push("/pages")
      }
    } catch (error) {
      console.error("Error fetching page:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הדף",
        variant: "destructive",
      })
      router.push("/pages")
    } finally {
      setLoading(false)
    }
  }

  const checkPageInMenus = async (pageIdToCheck: string) => {
    if (!selectedShop || !pageIdToCheck) return

    try {
      const response = await fetch(`/api/navigation?shopId=${selectedShop.id}`)
      if (response.ok) {
        const navs = await response.json()
        const menusWithPage: Array<{ navigationId: string; navigationName: string; itemId: string }> = []
        
        navs.forEach((nav: any) => {
          const items = (nav.items || []) as any[]
          const item = items.find((item: any) => item.id === `page-${pageIdToCheck}`)
          if (item) {
            menusWithPage.push({
              navigationId: nav.id,
              navigationName: nav.name,
              itemId: item.id,
            })
          }
        })
        
        setPageInMenus(menusWithPage)
      }
    } catch (error) {
      console.error("Error checking page in menus:", error)
    }
  }

  const fetchNavigations = async () => {
    if (!selectedShop) return

    setLoadingNavigations(true)
    try {
      const response = await fetch(`/api/navigation?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setNavigations(data || [])
      }
    } catch (error) {
      console.error("Error fetching navigations:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את התפריטים",
        variant: "destructive",
      })
    } finally {
      setLoadingNavigations(false)
    }
  }

  const handleAddToMenu = async () => {
    if (!selectedNavigationId || !pageId || !formData.title) {
      toast({
        title: "שגיאה",
        description: "יש לבחור תפריט",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/navigation/add-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          navigationId: selectedNavigationId,
          pageId: pageId,
          label: formData.title,
          type: "PAGE",
          url: `/pages/${formData.slug}`,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הדף נוסף לתפריט בהצלחה",
        })
        setAddToMenuDialogOpen(false)
        setSelectedNavigationId("")
        // עדכון רשימת התפריטים שהדף נמצא בהם
        if (pageId) {
          checkPageInMenus(pageId)
        }
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא הצלחנו להוסיף את הדף לתפריט",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding page to menu:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהוספת הדף לתפריט",
        variant: "destructive",
      })
    }
  }

  const handleRemoveFromMenu = async (navigationId: string, itemId: string) => {
    try {
      const response = await fetch(`/api/navigation/add-item?navigationId=${navigationId}&itemId=${itemId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הדף הוסר מהתפריט בהצלחה",
        })
        // עדכון רשימת התפריטים שהדף נמצא בהם
        if (pageId) {
          checkPageInMenus(pageId)
        }
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא הצלחנו להסיר את הדף מהתפריט",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error removing page from menu:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהסרת הדף מהתפריט",
        variant: "destructive",
      })
    }
  }

  const fetchSelectedProducts = async (productIds: string[]) => {
    if (!selectedShop || productIds.length === 0) return
    
    try {
      const response = await fetch(`/api/products?shopId=${selectedShop.id}&ids=${productIds.join(",")}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        setSelectedProductsData(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching selected products:", error)
    }
  }

  const fetchProducts = async () => {
    if (!selectedShop || !productSearch.trim()) return
    
    setLoadingProducts(true)
    try {
      const response = await fetch(`/api/products?shopId=${selectedShop.id}&search=${encodeURIComponent(productSearch)}&limit=20&status=PUBLISHED`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    if (selectedShop && formData.template === "CHOICES_OF" && productSearch) {
      const timeoutId = setTimeout(() => {
        fetchProducts()
      }, 300)
      return () => clearTimeout(timeoutId)
    } else if (formData.template === "CHOICES_OF" && !productSearch) {
      setProducts([])
    }
  }, [productSearch, formData.template, selectedShop])

  // טעינת קופונים
  useEffect(() => {
    if (selectedShop) {
      fetchCoupons()
    }
  }, [selectedShop])

  const fetchCoupons = async () => {
    if (!selectedShop) return
    
    setLoadingCoupons(true)
    try {
      const response = await fetch(`/api/coupons?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        // נסנן רק קופונים פעילים
        setCoupons(data.filter((c: any) => c.isActive).map((c: any) => ({ id: c.id, code: c.code, isActive: c.isActive })))
      }
    } catch (error) {
      console.error("Error fetching coupons:", error)
    } finally {
      setLoadingCoupons(false)
    }
  }

  const toggleProductSelection = (productId: string) => {
    setFormData((prev) => {
      const isSelected = prev.selectedProducts.includes(productId)
      const newSelectedProducts = isSelected
        ? prev.selectedProducts.filter((id) => id !== productId)
        : [...prev.selectedProducts, productId]
      
      // עדכון רשימת המוצרים הנבחרים
      if (isSelected) {
        setSelectedProductsData((prev) => prev.filter((p) => p.id !== productId))
      } else {
        const product = products.find((p) => p.id === productId)
        if (product) {
          setSelectedProductsData((prev) => [...prev, product])
        }
      }
      
      return {
        ...prev,
        selectedProducts: newSelectedProducts,
      }
    })
  }

  const getSelectedProductsData = () => {
    // משלב את המוצרים מהחיפוש עם המוצרים שכבר נבחרו
    const fromSearch = products.filter((p) => formData.selectedProducts.includes(p.id))
    const fromSelected = selectedProductsData.filter((p) => formData.selectedProducts.includes(p.id))
    const combined = [...fromSearch, ...fromSelected]
    // הסרת כפילויות
    return combined.filter((p, index, self) => index === self.findIndex((t) => t.id === p.id))
  }

  // הצגת מוצרים נבחרים גם אם הם לא בתוצאות החיפוש
  const getDisplayedProducts = () => {
    const selectedIds = new Set(formData.selectedProducts)
    
    // אם יש חיפוש, נציג את תוצאות החיפוש + מוצרים נבחרים שלא בתוצאות
    if (productSearch.trim()) {
      const searchProducts = products
      const otherSelected = selectedProductsData.filter((p) => selectedIds.has(p.id) && !products.find((sp) => sp.id === p.id))
      return [...searchProducts, ...otherSelected]
    }
    
    // אם אין חיפוש, נציג רק את המוצרים הנבחרים
    return selectedProductsData.filter((p) => selectedIds.has(p.id))
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  const checkSlugAvailability = async (slug: string) => {
    if (!selectedShop || !slug || slug === originalSlug) {
      setSlugAvailable(null)
      return
    }

    setCheckingSlug(true)
    try {
      const response = await fetch(`/api/pages?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        // data הוא array של דפים
        const pages = Array.isArray(data) ? data : []
        // בודקים אם יש דף עם אותו slug (מסננים לפי slug)
        const existingPage = pages.find((p: any) => p.slug === slug)
        setSlugAvailable(!existingPage)
      }
    } catch (error) {
      console.error("Error checking slug:", error)
      setSlugAvailable(null)
    } finally {
      setCheckingSlug(false)
    }
  }

  // בדיקת slug עם debounce
  useEffect(() => {
    if (formData.slug && formData.slug !== originalSlug) {
      const timeoutId = setTimeout(() => {
        checkSlugAvailability(formData.slug)
      }, 500)
      return () => clearTimeout(timeoutId)
    } else {
      setSlugAvailable(null)
    }
  }, [formData.slug, originalSlug, selectedShop])

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
        description: "כותרת הדף היא חובה",
        variant: "destructive",
      })
      return
    }

    if (slugAvailable === false) {
      toast({
        title: "שגיאה",
        description: "הSlug כבר תפוס, יש לבחור slug אחר",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      // ניקוי ה-slug להיות תקין (רק אותיות קטנות, מספרים ומקפים)
      const cleanSlug = (formData.slug || generateSlug(formData.title))
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")

      // ניקוי מוצרים - רק מוצרים שבאמת קיימים
      const validProductIds = getSelectedProductsData().map(p => p.id)

      const payload: any = {
        title: formData.title.trim(),
        slug: cleanSlug,
        content: formData.content || undefined,
        template: formData.template,
        displayType: formData.template === "CHOICES_OF" ? formData.displayType : undefined,
        selectedProducts: formData.template === "CHOICES_OF" ? validProductIds : undefined,
        featuredImage: formData.featuredImage || undefined,
        couponCode: formData.couponCode || undefined,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        isPublished: formData.isPublished,
        showInMenu: false, // כבר לא משתמשים בזה
      }

      const response = await fetch(`/api/pages/${pageSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const updatedPage = await response.json()
        toast({
          title: "הצלחה",
          description: "הדף עודכן בהצלחה",
        })
        // אם ה-slug השתנה, נעבור ל-URL החדש
        if (updatedPage.slug && updatedPage.slug !== pageSlug) {
          router.push(`/pages/${updatedPage.slug}/edit`)
        } else {
          fetchPage()
        }
      } else {
        const error = await response.json()
        console.error("Error updating page:", error)
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בעדכון הדף",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating page:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת הדף",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // טעינה - בזמן שהחנויות נטענות או הדף נטען
  if (shopsLoading || loading) {
    return (
      <AppLayout title="עריכת דף">
        <FormSkeleton />
      </AppLayout>
    )
  }

  // אם אין חנות נבחרת אחרי שהכל נטען
  if (!selectedShop) {
    return (
      <AppLayout title="עריכת דף">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני עריכת דף
          </p>
          <Button onClick={() => router.push("/pages")}>
            חזור לרשימת דפים
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="עריכת דף">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">עריכת דף</h1>
            <p className="text-gray-600 mt-1">
              ערוך דף לחנות: <span className="font-semibold">{selectedShop.name}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {formData.isPublished && formData.slug && (
              <Button
                variant="outline"
                onClick={() => {
                  const url = `/shop/${selectedShop.slug}/pages/${formData.slug}`
                  window.open(url, "_blank")
                }}
                disabled={saving}
              >
                <ExternalLink className="w-4 h-4 ml-2" />
                צפה בחנות
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push("/pages")}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  תוכן הדף
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">כותרת *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                        slug: prev.slug || generateSlug(e.target.value),
                      }))
                    }}
                    placeholder="לדוגמה: אודותינו"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <div className="relative">
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="about-us"
                      className={
                        slugAvailable === false ? "border-red-500" : 
                        slugAvailable === true ? "border-green-500" : ""
                      }
                    />
                    {checkingSlug && (
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                      </div>
                    )}
                    {!checkingSlug && slugAvailable === true && (
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {!checkingSlug && slugAvailable === false && (
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {checkingSlug && (
                    <p className="text-sm text-gray-500">בודק זמינות...</p>
                  )}
                  {slugAvailable === true && (
                    <p className="text-sm text-green-600">✓ {formData.slug} זמין</p>
                  )}
                  {slugAvailable === false && (
                    <p className="text-sm text-red-600">✗ {formData.slug} כבר תפוס</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">טמפלט</Label>
                  <Select
                    value={formData.template}
                    onValueChange={(value: "STANDARD" | "CHOICES_OF") => {
                      setFormData((prev) => ({
                        ...prev,
                        template: value,
                        selectedProducts: value === "STANDARD" ? [] : prev.selectedProducts,
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">דף רגיל</SelectItem>
                      <SelectItem value="CHOICES_OF">הבחירות של...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.template === "CHOICES_OF" && (
                  <div className="space-y-2">
                    <Label htmlFor="displayType">סוג תצוגה</Label>
                    <Select
                      value={formData.displayType}
                      onValueChange={(value: "GRID" | "LIST") => {
                        setFormData((prev) => ({
                          ...prev,
                          displayType: value,
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GRID">רשת (Grid)</SelectItem>
                        <SelectItem value="LIST">שורות (List)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.template === "STANDARD" ? (
                  <div className="space-y-2">
                    <Label htmlFor="content">תוכן</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                      placeholder="תוכן הדף..."
                      rows={15}
                      className="font-sans"
                    />
                    <p className="text-sm text-gray-500">
                      בעתיד יתווסף Rich Text Editor מקצועי
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>חיפוש ובחירת מוצרים</Label>
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="חפש מוצרים..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="pr-10"
                        />
                      </div>
                    </div>

                    {loadingProducts && (
                      <p className="text-sm text-gray-500 text-center py-4">טוען מוצרים...</p>
                    )}

                    {getDisplayedProducts().length > 0 && (
                      <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                        {getDisplayedProducts().map((product) => {
                          const isSelected = formData.selectedProducts.includes(product.id)
                          return (
                            <div
                              key={product.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => {
                                  toggleProductSelection(product.id)
                                }}
                              />
                              <div
                                className="flex items-center gap-3 flex-1 cursor-pointer"
                                onClick={() => toggleProductSelection(product.id)}
                              >
                                {product.images && product.images.length > 0 ? (
                                  <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-12 h-12 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                                    <Package className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{product.name}</p>
                                  <p className="text-xs text-gray-500">₪{product.price}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {formData.selectedProducts.length > 0 && (
                      <div className="space-y-2">
                        <Label>
                          מוצרים נבחרים ({getSelectedProductsData().length})
                          {formData.selectedProducts.length !== getSelectedProductsData().length && (
                            <span className="text-xs text-red-600 mr-1">
                              ({formData.selectedProducts.length - getSelectedProductsData().length} מוצרים נמחקו)
                            </span>
                          )}
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {getSelectedProductsData().map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2"
                            >
                              <span className="text-sm font-medium">{product.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-purple-100"
                                onClick={() => toggleProductSelection(product.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        {formData.selectedProducts.length !== getSelectedProductsData().length && (
                          <p className="text-xs text-gray-500">
                            חלק מהמוצרים שנבחרו נמחקו ולא יוצגו בדף
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  תמונה ראשית
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.featuredImage ? (
                  <div className="relative group">
                    <img
                      src={formData.featuredImage}
                      alt="תמונה ראשית"
                      className="w-full h-64 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => setFormData((prev) => ({ ...prev, featuredImage: "" }))}
                      className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setMediaPickerOpen(true)}
                    className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-64 cursor-pointer hover:border-gray-400 transition-colors w-full"
                  >
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">בחר תמונה ראשית</p>
                    </div>
                  </button>
                )}
                <MediaPicker
                  open={mediaPickerOpen}
                  onOpenChange={setMediaPickerOpen}
                  onSelect={(files) => {
                    if (files.length > 0) {
                      setFormData((prev) => ({ ...prev, featuredImage: files[0] }))
                    }
                    setMediaPickerOpen(false)
                  }}
                  selectedFiles={formData.featuredImage ? [formData.featuredImage] : []}
                  shopId={selectedShop.id}
                  entityType="pages"
                  entityId={formData.slug || pageSlug}
                  multiple={false}
                  title="בחר תמונה ראשית"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>קופון</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="couponCode">קוד קופון (לא חובה)</Label>
                  <Select
                    value={formData.couponCode || undefined}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, couponCode: value || "" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר קופון" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCoupons ? (
                        <div className="px-2 py-1.5 text-sm text-gray-500">טוען קופונים...</div>
                      ) : coupons.length > 0 ? (
                        <>
                          {coupons.map((coupon) => (
                            <SelectItem key={coupon.id} value={coupon.code}>
                              {coupon.code}
                            </SelectItem>
                          ))}
                        </>
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-gray-500">אין קופונים פעילים</div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    הקופון יופעל אוטומטית בעת כניסה לעמוד זה
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  SEO
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seoTitle">כותרת SEO</Label>
                  <Input
                    id="seoTitle"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, seoTitle: e.target.value }))}
                    placeholder="כותרת למנועי חיפוש"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seoDescription">תיאור SEO</Label>
                  <Textarea
                    id="seoDescription"
                    value={formData.seoDescription}
                    onChange={(e) => setFormData((prev) => ({ ...prev, seoDescription: e.target.value }))}
                    placeholder="תיאור קצר למנועי חיפוש"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>הגדרות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isPublished" className="cursor-pointer">
                    פורסם
                  </Label>
                  <Switch
                    id="isPublished"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isPublished: checked as boolean }))
                    }
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>הוסף לתפריט</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddToMenuDialogOpen(true)}
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף לתפריט
                    </Button>
                  </div>
                  
                  {pageInMenus.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">הדף נמצא בתפריטים הבאים:</Label>
                      <div className="space-y-2">
                        {pageInMenus.map((menu) => (
                          <div
                            key={menu.navigationId}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <Menu className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">{menu.navigationName}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFromMenu(menu.navigationId, menu.itemId)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        כדי לשנות את הסדר, עבור לעמוד{" "}
                        <button
                          onClick={() => router.push("/navigation")}
                          className="text-purple-600 hover:underline"
                        >
                          תפריטים
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={addToMenuDialogOpen} onOpenChange={setAddToMenuDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוסף לתפריט</DialogTitle>
            <DialogDescription>
              בחר לאיזה תפריט להוסיף את הדף. הדף יתווסף בסוף התפריט.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingNavigations ? (
              <p className="text-sm text-gray-500 text-center py-4">טוען תפריטים...</p>
            ) : navigations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                אין תפריטים זמינים.{" "}
                <button
                  onClick={() => {
                    setAddToMenuDialogOpen(false)
                    router.push("/navigation")
                  }}
                  className="text-purple-600 hover:underline"
                >
                  צור תפריט חדש
                </button>
              </p>
            ) : (
              <div className="space-y-2">
                <Label>בחר תפריט</Label>
                <Select value={selectedNavigationId} onValueChange={setSelectedNavigationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר תפריט" />
                  </SelectTrigger>
                  <SelectContent>
                    {navigations.map((nav) => {
                      const locationLabels: Record<string, string> = {
                        DESKTOP: "מחשב",
                        MOBILE: "מובייל",
                        FOOTER: "פוטר",
                        CHECKOUT: "צ'ק אאוט",
                        HEADER: "ראשי",
                        SIDEBAR: "סיידבר",
                      }
                      return (
                        <SelectItem key={nav.id} value={nav.id}>
                          {nav.name} ({locationLabels[nav.location] || nav.location})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddToMenuDialogOpen(false)
                setSelectedNavigationId("")
              }}
            >
              ביטול
            </Button>
            <Button
              onClick={handleAddToMenu}
              disabled={!selectedNavigationId || loadingNavigations}
              className="prodify-gradient text-white"
            >
              הוסף לתפריט
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

