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
import { Checkbox } from "@/components/ui/checkbox"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
import { Save, FolderOpen, Image as ImageIcon, Upload, Search, X, Plus, Trash2, GripVertical, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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
  field: "title" | "price" | "tag" | "vendor" | "type"
  condition: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "starts_with" | "ends_with"
  value: string
}

export default function EditCollectionPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop, shops } = useShop()
  const collectionSlug = params.slug as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [collectionId, setCollectionId] = useState<string>("")
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    type: "MANUAL" as "MANUAL" | "AUTOMATIC",
    isPublished: false,
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

  useEffect(() => {
    if (collectionSlug) {
      fetchCollection()
    }
  }, [collectionSlug])

  const fetchCollection = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/collections/${collectionSlug}`)
      if (response.ok) {
        const collection = await response.json()
        setCollectionId(collection.id)
        setFormData({
          name: collection.name || "",
          slug: collection.slug || "",
          description: collection.description || "",
          image: collection.image || "",
          type: collection.type || "MANUAL",
          isPublished: collection.isPublished ?? false,
          seoTitle: collection.seoTitle || "",
          seoDescription: collection.seoDescription || "",
        })
        
        if (collection.products) {
          setSelectedProducts(collection.products)
        }

        if (collection.rules) {
          const rulesData = collection.rules as any
          if (rulesData.conditions) {
            setRules(rulesData.conditions)
          }
          if (rulesData.matchType) {
            setMatchType(rulesData.matchType)
          }
        }
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את הקטגוריה",
          variant: "destructive",
        })
        router.push("/collections")
      }
    } catch (error) {
      console.error("Error fetching collection:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הקטגוריה",
        variant: "destructive",
      })
      router.push("/collections")
    } finally {
      setLoading(false)
    }
  }

  const searchProducts = async (query: string) => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse || !query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(
        `/api/products?shopId=${shopToUse.id}&search=${encodeURIComponent(query)}&status=PUBLISHED&limit=20`
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

  const moveProduct = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === selectedProducts.length - 1)
    ) {
      return
    }

    const newProducts = [...selectedProducts]
    const newIndex = direction === "up" ? index - 1 : index + 1
    ;[newProducts[index], newProducts[newIndex]] = [newProducts[newIndex], newProducts[index]]
    
    // עדכון position
    newProducts.forEach((p, i) => {
      p.position = i
    })
    
    setSelectedProducts(newProducts)
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append("file", file)
      formDataObj.append("entityType", "collections")
      formDataObj.append("entityId", collectionId || "temp")
      const shopToUseForUpload = selectedShop || shops[0]
      if (shopToUseForUpload?.id) {
        formDataObj.append("shopId", shopToUseForUpload.id)
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

  const generateSlug = (name: string) => {
    if (!name) return ""
    
    // עבור עברית - לא צריך toLowerCase, רק להחליף רווחים במקפים
    // עבור אנגלית - להמיר לאותיות קטנות
    let slug = name.trim()
    
    // החלפת רווחים במקפים
    slug = slug.replace(/\s+/g, "-")
    
    // שמירה על עברית, אנגלית (אותיות קטנות), מספרים ומקפים
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
    const shopToUseForSave = selectedShop || shops[0]
    if (!shopToUseForSave) {
      toast({
        title: "שגיאה",
        description: "לא נמצאה חנות. אנא צור חנות תחילה.",
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
        shopId: shopToUseForSave.id,
        name: formData.name.trim(),
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description || undefined,
        image: formData.image || undefined,
        type: formData.type,
        isPublished: formData.isPublished ?? false,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        productIds: selectedProducts.map(p => p.product.id),
      }

      // הוספת rules אם זה אוטומטי
      if (formData.type === "AUTOMATIC") {
        payload.rules = {
          conditions: rules.filter(r => r.value.trim()),
          matchType
        }
      }

      const response = await fetch(`/api/collections/${collectionSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const updated = await response.json()
        toast({
          title: "הצלחה",
          description: "הקטגוריה עודכנה בהצלחה",
        })
        
        // חזרה לעמוד הקטגוריות אחרי שמירה מוצלחת
        router.push("/collections")
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בעדכון הקטגוריה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating collection:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון הקטגוריה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="עריכת קטגוריה">
        <FormSkeleton />
      </AppLayout>
    )
  }

  // אם אין חנות נבחרת, נשתמש בחנות הראשונה
  const shopToUse = selectedShop || shops[0]
  
  if (!shopToUse) {
    return (
      <AppLayout title="עריכת קטגוריה">
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            לא נמצאה חנות
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני עריכת קטגוריה
          </p>
          <Button onClick={() => router.push("/collections")}>
            חזור לרשימת קטגוריות
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="עריכת קטגוריה">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">עריכת קטגוריה</h1>
            <p className="text-gray-600 mt-1">
              ערוך קטגוריה: <span className="font-semibold">{formData.name}</span>
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
              {saving ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* מידע בסיסי */}
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
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="summer-collection"
                  />
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
                              <SelectItem value="vendor">ספק</SelectItem>
                              <SelectItem value="type">סוג</SelectItem>
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
                          placeholder="חפש מוצרים לפי שם או מקט..."
                          className="pr-10"
                        />
                      </div>

                      {searching && (
                        <p className="text-sm text-gray-500">מחפש...</p>
                      )}

                      {searchResults.length > 0 && (
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                          {searchResults.map((product: any) => (
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
                                  {product.sku && ` • מקט: ${product.sku}`}
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
                      {selectedProducts.map((item, index) => (
                        <div
                          key={item.product.id}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-white"
                        >
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => moveProduct(index, "up")}
                              disabled={index === 0}
                            >
                              <GripVertical className="w-4 h-4 text-gray-400" />
                            </Button>
                          </div>

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
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                      className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-64 cursor-pointer hover:border-gray-400 transition-colors">
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
            {/* סטטוס פרסום */}
            <Card>
              <CardHeader>
                <CardTitle>פרסום</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublished" className="cursor-pointer">
                      פרסם קטגוריה
                    </Label>
                    <p className="text-sm text-gray-500">
                      {formData.isPublished 
                        ? "הקטגוריה מוצגת בחנות" 
                        : "הקטגוריה בסטטוס טיוטה"}
                    </p>
                  </div>
                  <Checkbox
                    id="isPublished"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isPublished: checked as boolean }))
                    }
                  />
                </div>
                {formData.isPublished ? (
                  <Badge className="bg-green-100 text-green-800">פורסם</Badge>
                ) : (
                  <Badge variant="secondary">טיוטה</Badge>
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
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
