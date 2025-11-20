"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Save, FileText, Search, X, Package, Image as ImageIcon, Upload } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { MediaPicker } from "@/components/MediaPicker"

interface Product {
  id: string
  name: string
  price: number
  images?: string[]
}

export default function NewPagePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop, loading: shopsLoading } = useShop()
  const [saving, setSaving] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedProductsData, setSelectedProductsData] = useState<Product[]>([])
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [coupons, setCoupons] = useState<Array<{ id: string; code: string; isActive: boolean }>>([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  
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

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
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

  // טעינת מוצרים לחיפוש
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
          setSelectedProductsData((prev) => {
            // בדיקה שהמוצר לא כבר קיים
            if (prev.find((p) => p.id === productId)) {
              return prev
            }
            return [...prev, product]
          })
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

    setSaving(true)

    try {
      const payload: any = {
        shopId: selectedShop.id,
        title: formData.title.trim(),
        slug: formData.slug || generateSlug(formData.title),
        content: formData.content || undefined,
        template: formData.template,
        displayType: formData.template === "CHOICES_OF" ? formData.displayType : undefined,
        selectedProducts: formData.template === "CHOICES_OF" ? formData.selectedProducts : undefined,
        featuredImage: formData.featuredImage || undefined,
        couponCode: formData.couponCode || undefined,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        isPublished: formData.isPublished,
        showInMenu: false, // כבר לא משתמשים בזה
      }

      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const page = await response.json()
        toast({
          title: "הצלחה",
          description: "הדף נוצר בהצלחה",
        })
        router.push(`/pages/${page.slug || page.id}/edit`)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת הדף",
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

  // טעינה - בזמן שהחנויות נטענות
  if (shopsLoading) {
    return (
      <AppLayout title="דף חדש">
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-emerald-600">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-lg font-medium">טוען...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  // אם אין חנות נבחרת אחרי שהכל נטען
  if (!selectedShop) {
    return (
      <AppLayout title="דף חדש">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני יצירת דף
          </p>
          <Button onClick={() => router.push("/pages")}>
            חזור לרשימת דפים
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="דף חדש">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">דף חדש</h1>
            <p className="text-gray-600 mt-1">
              צור דף חדש לחנות: <span className="font-semibold">{selectedShop.name}</span>
            </p>
          </div>
          <div className="flex gap-2">
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
              {saving ? "שומר..." : "שמור דף"}
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
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="about-us"
                  />
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
                        <Label>מוצרים נבחרים ({formData.selectedProducts.length})</Label>
                        <div className="flex flex-wrap gap-2">
                          {getSelectedProductsData().map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
                            >
                              <span className="text-sm font-medium">{product.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-emerald-100"
                                onClick={() => toggleProductSelection(product.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
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
                  entityId="new"
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

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    כדי להוסיף את הדף לתפריט, שמור את הדף תחילה ואז ערוך אותו.
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

