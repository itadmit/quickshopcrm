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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Save, FolderOpen, Image as ImageIcon, Upload, Search, X, Plus, Filter, Menu, Trash2, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  images: string[]
  status: string
  availability: string
  sku: string | null
}

interface CollectionProduct {
  id: string
  position: number
  product: Product
}

interface CollectionRule {
  field: "title" | "price" | "tag" | "sku" | "status" | "availability"
  condition: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "starts_with" | "ends_with"
  value: string
}

export default function NewCollectionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    type: "MANUAL" as "MANUAL" | "AUTOMATIC",
    isPublished: true, // ברירת מחדל - פורסם
    seoTitle: "",
    seoDescription: "",
  })

  // מוצרים
  const [selectedProducts, setSelectedProducts] = useState<CollectionProduct[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // תנאים אוטומטיים
  const [rules, setRules] = useState<CollectionRule[]>([
    { field: "title", condition: "contains", value: "" }
  ])
  const [matchType, setMatchType] = useState<"all" | "any">("all")

  // תפריטים
  const [addToMenuDialogOpen, setAddToMenuDialogOpen] = useState(false)
  const [navigations, setNavigations] = useState<Array<{ id: string; name: string; location: string }>>([])
  const [loadingNavigations, setLoadingNavigations] = useState(false)
  const [selectedNavigationId, setSelectedNavigationId] = useState<string>("")
  
  // מעקב אם המשתמש ערך את ה-slug ידנית
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  // Preview מוצרים במצב אוטומטי
  const [previewProducts, setPreviewProducts] = useState<Product[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append("file", file)
      formDataObj.append("entityType", "collections")
      formDataObj.append("entityId", "new")
      if (selectedShop?.id) {
        formDataObj.append("shopId", selectedShop.id)
      }

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formDataObj,
      })

      if (response.ok) {
        const data = await response.json()
        setFormData((prev) => ({ ...prev, image: data.file.path }))
        toast({
          title: "הצלחה",
          description: "התמונה הועלתה בהצלחה",
        })
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהעלאת התמונה",
        variant: "destructive",
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const searchProducts = async (query: string) => {
    if (!selectedShop || !query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(
        `/api/products?shopId=${selectedShop.id}&search=${encodeURIComponent(query)}&status=PUBLISHED&limit=20`
      )
      if (response.ok) {
        const data = await response.json()
        // ה-API מחזיר { products: [...], pagination: {...} }
        const products = data.products || data
        // סינון מוצרים שכבר נבחרו
        const filteredProducts = products.filter(
          (p: Product) => !selectedProducts.some(sp => sp.product.id === p.id)
        )
        setSearchResults(filteredProducts)
      }
    } catch (error) {
      console.error("Error searching products:", error)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchProducts(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedShop])

  // טעינת תפריטים
  useEffect(() => {
    if (addToMenuDialogOpen && selectedShop) {
      fetchNavigations()
    }
  }, [addToMenuDialogOpen, selectedShop])

  const fetchNavigations = async () => {
    if (!selectedShop) return

    setLoadingNavigations(true)
    try {
      const response = await fetch(`/api/navigation?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setNavigations(data)
      }
    } catch (error) {
      console.error("Error fetching navigations:", error)
    } finally {
      setLoadingNavigations(false)
    }
  }

  const handleAddToMenu = async () => {
    if (!selectedNavigationId || !formData.name) {
      toast({
        title: "שגיאה",
        description: "יש לבחור תפריט",
        variant: "destructive",
      })
      return
    }

    // נסגור את הדיאלוג - ההוספה תתבצע לאחר יצירת הקולקציה
    setAddToMenuDialogOpen(false)
  }

  const addCollectionToMenu = async (collectionId: string, collectionSlug: string) => {
    if (!selectedNavigationId || !formData.name) {
      return
    }

    try {
      const response = await fetch("/api/navigation/add-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          navigationId: selectedNavigationId,
          collectionId: collectionId,
          label: formData.name,
          type: "COLLECTION",
          url: `/collections/${collectionSlug}`,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הקטגוריה נוספה לתפריט בהצלחה",
        })
        setSelectedNavigationId("")
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא הצלחנו להוסיף את הקטגוריה לתפריט",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding collection to menu:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהוספת הקטגוריה לתפריט",
        variant: "destructive",
      })
    }
  }

  const findMatchingProducts = async () => {
    if (!selectedShop) {
      toast({
        title: "שגיאה",
        description: "יש לבחור חנות מההדר",
        variant: "destructive",
      })
      return
    }

    const activeRules = rules.filter(r => r.value.trim())
    if (activeRules.length === 0) {
      toast({
        title: "שגיאה",
        description: "יש להגדיר לפחות תנאי אחד עם ערך",
        variant: "destructive",
      })
      return
    }

    setLoadingPreview(true)
    try {
      const response = await fetch("/api/collections/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShop.id,
          rules: {
            conditions: activeRules,
            matchType
          }
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPreviewProducts(data.products || [])
        setPreviewCount(data.total || 0)
        toast({
          title: "הצלחה",
          description: `נמצאו ${data.total || 0} מוצרים שמתאימים לתנאים`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא הצלחנו למצוא מוצרים",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error finding matching products:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בחיפוש מוצרים",
        variant: "destructive",
      })
    } finally {
      setLoadingPreview(false)
    }
  }

  const addProduct = (product: Product) => {
    setSelectedProducts(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        position: prev.length,
        product
      }
    ])
    setSearchQuery("")
    setSearchResults([])
  }

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.product.id !== productId))
  }

  const addRule = () => {
    setRules(prev => [
      ...prev,
      { field: "title", condition: "contains", value: "" }
    ])
  }

  const removeRule = (index: number) => {
    setRules(prev => prev.filter((_, i) => i !== index))
  }

  const updateRule = (index: number, updates: Partial<CollectionRule>) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, ...updates } : rule
    ))
  }

  const generateSlug = (name: string) => {
    if (!name) return ""
    
    // עבור עברית - לא צריך toLowerCase, רק להחליף רווחים במקפים
    // עבור אנגלית - להמיר לאותיות קטנות
    let slug = name.trim()
    
    // החלפת רווחים במקפים
    slug = slug.replace(/\s+/g, "-")
    
    // שמירה על עברית, אנגלית (אותיות קטנות), מספרים ומקפים
    // לא נשתמש ב-toLowerCase כדי לא לפגוע בעברית
    slug = slug.replace(/[^\u0590-\u05FFa-z0-9\-]+/g, "")
    
    // החלפת מקפים מרובים במקף אחד
    slug = slug.replace(/-+/g, "-")
    
    // הסרת מקפים מהתחלה וסוף
    slug = slug.replace(/^-+|-+$/g, "")
    
    // המרת אותיות אנגליות לאותיות קטנות (רק אחרי שמירה על עברית)
    slug = slug.split("").map(char => {
      // אם זה תו עברי, נשאיר אותו כמו שהוא
      if (/[\u0590-\u05FF]/.test(char)) {
        return char
      }
      // אם זה אות אנגלית, נמיר לאות קטנה
      if (/[A-Za-z]/.test(char)) {
        return char.toLowerCase()
      }
      return char
    }).join("")
    
    return slug
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

    if (!formData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "שם הקטגוריה הוא חובה",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload: any = {
        shopId: selectedShop.id,
        name: formData.name.trim(),
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description || undefined,
        image: formData.image || undefined,
        type: formData.type,
        isPublished: formData.isPublished,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        productIds: formData.type === "MANUAL" ? selectedProducts.map(p => p.product.id) : [],
      }

      // הוספת rules אם זה אוטומטי
      if (formData.type === "AUTOMATIC") {
        payload.rules = {
          conditions: rules.filter(r => r.value.trim()),
          matchType
        }
      }

      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const collection = await response.json()
        toast({
          title: "הצלחה",
          description: "הקטגוריה נוצרה בהצלחה",
        })
        
        // אם נבחר תפריט, נוסיף את הקטגוריה לתפריט
        if (selectedNavigationId) {
          await addCollectionToMenu(collection.id, collection.slug)
        }
        
        router.push(`/collections/${collection.slug}`)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת הקטגוריה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating collection:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת הקטגוריה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!selectedShop) {
    return (
      <AppLayout title="קטגוריה חדשה">
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני יצירת קטגוריה
          </p>
          <Button onClick={() => router.push("/collections")}>
            חזור לרשימת קטגוריות
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="קטגוריה חדשה">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">קטגוריה חדשה</h1>
            <p className="text-gray-600 mt-1">
              צור קטגוריה חדשה לחנות: <span className="font-semibold">{selectedShop.name}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/collections")}
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
              {saving ? "שומר..." : "שמור קטגוריה"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  מידע בסיסי
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם קטגוריה *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      const newName = e.target.value
                      setFormData((prev) => ({
                        ...prev,
                        name: newName,
                        // עדכן slug רק אם המשתמש לא ערך אותו ידנית
                        slug: slugManuallyEdited ? prev.slug : generateSlug(newName),
                      }))
                    }}
                    placeholder="לדוגמה: קטגוריית קיץ"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true)
                      setFormData((prev) => ({ ...prev, slug: e.target.value }))
                    }}
                    placeholder="קטגוריית-קיץ או summer-category"
                  />
                  <p className="text-xs text-gray-500">
                    כתובת ה-URL של הקטגוריה. תמיכה בעברית ואנגלית.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="תיאור הקטגוריה..."
                    rows={4}
                  />
                </div>

              </CardContent>
            </Card>

            {/* סוג קטגוריה */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  סוג קטגוריה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">איך מוצרים מתווספים לקטגוריה?</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "MANUAL" | "AUTOMATIC") =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">ידני - בחר מוצרים בעצמך</SelectItem>
                      <SelectItem value="AUTOMATIC">אוטומטי - לפי תנאים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === "AUTOMATIC" && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label>תנאי בחירת מוצרים</Label>
                      <Select value={matchType} onValueChange={(v: "all" | "any") => setMatchType(v)}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">כל התנאים (AND)</SelectItem>
                          <SelectItem value="any">אחד מהתנאים (OR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      {rules.map((rule, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <Select
                            value={rule.field}
                            onValueChange={(v: any) => updateRule(index, { field: v })}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="title">כותרת מוצר</SelectItem>
                              <SelectItem value="price">מחיר</SelectItem>
                              <SelectItem value="tag">תג</SelectItem>
                              <SelectItem value="sku">SKU</SelectItem>
                              <SelectItem value="status">סטטוס</SelectItem>
                              <SelectItem value="availability">זמינות</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={rule.condition}
                            onValueChange={(v: any) => updateRule(index, { condition: v })}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">שווה ל</SelectItem>
                              <SelectItem value="not_equals">לא שווה ל</SelectItem>
                              <SelectItem value="contains">מכיל</SelectItem>
                              <SelectItem value="not_contains">לא מכיל</SelectItem>
                              <SelectItem value="greater_than">גדול מ</SelectItem>
                              <SelectItem value="less_than">קטן מ</SelectItem>
                              <SelectItem value="starts_with">מתחיל ב</SelectItem>
                              <SelectItem value="ends_with">מסתיים ב</SelectItem>
                            </SelectContent>
                          </Select>

                          <Input
                            value={rule.value}
                            onChange={(e) => updateRule(index, { value: e.target.value })}
                            placeholder="ערך..."
                            className="flex-1"
                          />

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRule(index)}
                            disabled={rules.length === 1}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addRule}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף תנאי
                    </Button>

                    <Button
                      onClick={findMatchingProducts}
                      disabled={loadingPreview || rules.filter(r => r.value.trim()).length === 0}
                      className="w-full prodify-gradient text-white"
                    >
                      <Eye className="w-4 h-4 ml-2" />
                      {loadingPreview ? "מחפש..." : "מצא מוצרים"}
                    </Button>

                    {previewCount !== null && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900">
                          נמצאו {previewCount} מוצרים שמתאימים לתנאים
                        </p>
                        {previewCount > 50 && (
                          <p className="text-xs text-gray-500 mt-1">
                            מוצגים 50 מוצרים ראשונים
                          </p>
                        )}
                      </div>
                    )}

                    {previewProducts.length > 0 && (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-3">
                        {previewProducts.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center gap-3 p-2 border rounded-lg bg-white"
                          >
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-sm">{product.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-gray-500">
                                  ₪{product.price.toFixed(2)}
                                </p>
                                {product.sku && (
                                  <Badge variant="outline" className="text-xs">
                                    {product.sku}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* מוצרים - רק במצב ידני */}
            {formData.type === "MANUAL" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      מוצרים ({selectedProducts.length})
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSearch(!showSearch)}
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף מוצרים
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* חיפוש מוצרים */}
                  {showSearch && (
                    <div className="space-y-3 pb-4 border-b">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="חפש מוצרים לפי שם או SKU..."
                          className="pr-10"
                        />
                      </div>

                      {searching && (
                        <p className="text-sm text-gray-500">מחפש...</p>
                      )}

                      {searchResults.length > 0 && (
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                          {searchResults.map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                              onClick={() => addProduct(product)}
                            >
                              {product.images?.[0] ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-gray-500">
                                  ₪{product.price.toFixed(2)}
                                  {product.sku && ` • SKU: ${product.sku}`}
                                </p>
                              </div>
                              <Plus className="w-5 h-5 text-gray-400" />
                            </div>
                          ))}
                        </div>
                      )}

                      {searchQuery && !searching && searchResults.length === 0 && (
                        <p className="text-sm text-gray-500">לא נמצאו מוצרים</p>
                      )}
                    </div>
                  )}

                  {/* רשימת מוצרים נבחרים */}
                  {selectedProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>לא נבחרו מוצרים</p>
                      <p className="text-sm mt-1">לחץ על "הוסף מוצרים" כדי להתחיל</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedProducts.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-white"
                        >
                          {item.product.images?.[0] ? (
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          )}

                          <div className="flex-1">
                            <p className="font-medium">{item.product.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-sm text-gray-500">
                                ₪{item.product.price.toFixed(2)}
                              </p>
                              {item.product.sku && (
                                <Badge variant="outline" className="text-xs">
                                  {item.product.sku}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProduct(item.product.id)}
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SEO */}
            <Card>
              <CardHeader>
                <CardTitle>קידום אתרים (SEO)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seoTitle">כותרת SEO</Label>
                  <Input
                    id="seoTitle"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, seoTitle: e.target.value }))}
                    placeholder="כותרת לקידום אתרים"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seoDescription">תיאור SEO</Label>
                  <Textarea
                    id="seoDescription"
                    value={formData.seoDescription}
                    onChange={(e) => setFormData((prev) => ({ ...prev, seoDescription: e.target.value }))}
                    placeholder="תיאור לקידום אתרים"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* סרגל צד */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>סטטוס</CardTitle>
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
              </CardContent>
            </Card>

            {/* תמונה */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  תמונה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.image ? (
                  <div className="relative">
                    <img
                    src={formData.image}
                    alt="קטגוריה"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                    <button
                      onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                      className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-48 cursor-pointer hover:border-gray-400 transition-colors">
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">העלה תמונה</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>מידע</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">סוג</p>
                  <p className="font-medium">
                    {formData.type === "MANUAL" ? "ידני" : "אוטומטי"}
                  </p>
                </div>
                {formData.type === "MANUAL" && (
                  <div>
                    <p className="text-gray-500">מוצרים</p>
                    <p className="font-medium">{selectedProducts.length} מוצרים</p>
                  </div>
                )}
                {formData.type === "AUTOMATIC" && (
                  <div>
                    <p className="text-gray-500">תנאים</p>
                    <p className="font-medium">
                      {rules.filter(r => r.value.trim()).length} תנאים פעילים
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>תפריט</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <p className="text-xs text-gray-500">
                  לאחר שמירת הקטגוריה, תוכל להוסיף אותה לתפריט
                </p>
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
              בחר לאיזה תפריט להוסיף את הקטגוריה. הקטגוריה תתווסף בסוף התפריט.
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
                  className="text-emerald-600 hover:underline"
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

