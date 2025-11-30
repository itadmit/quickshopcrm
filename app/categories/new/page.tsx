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
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Save, FolderOpen, Image as ImageIcon, Upload, Search, X, Plus, Filter, Eye, ChevronUp, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MediaPicker } from "@/components/MediaPicker"
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

interface CategoryProduct {
  id: string
  position: number
  product: Product
}

interface CategoryRule {
  field: "title" | "price" | "tag" | "sku" | "status" | "availability"
  condition: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "starts_with" | "ends_with"
  value: string
}

export default function NewCategoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop, shops } = useShop()
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    type: "MANUAL" as "MANUAL" | "AUTOMATIC",
    isPublished: true,
  })

  // מוצרים
  const [selectedProducts, setSelectedProducts] = useState<CategoryProduct[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // תנאים אוטומטיים
  const [rules, setRules] = useState<CategoryRule[]>([
    { field: "title", condition: "contains", value: "" }
  ])
  const [matchType, setMatchType] = useState<"all" | "any">("all")
  
  // מעקב אם המשתמש ערך את ה-slug ידנית
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  // Preview מוצרים במצב אוטומטי
  const [previewProducts, setPreviewProducts] = useState<Product[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewCount, setPreviewCount] = useState<number | null>(null)

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
        const products = data.products || data
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

  const findMatchingProducts = async () => {
    const shopToUseForMatch = selectedShop || shops[0]
    if (!shopToUseForMatch) {
      toast({
        title: "שגיאה",
        description: "לא נמצאה חנות. אנא צור חנות תחילה.",
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
          shopId: shopToUseForMatch.id,
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
    setSelectedProducts(prev => {
      const newProducts = [
        ...prev,
        {
          id: product.id,
          position: prev.length,
          product
        }
      ]
      return newProducts
    })
    setSearchQuery("")
    setSearchResults([])
  }

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const filtered = prev.filter(p => p.product.id !== productId)
      // עדכון position לאחר הסרה
      return filtered.map((p, index) => ({ ...p, position: index }))
    })
  }

  const moveProduct = (index: number, direction: "up" | "down") => {
    const sortedProducts = [...selectedProducts].sort((a, b) => a.position - b.position)
    
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === sortedProducts.length - 1)
    ) {
      return
    }

    const newIndex = direction === "up" ? index - 1 : index + 1
    ;[sortedProducts[index], sortedProducts[newIndex]] = [sortedProducts[newIndex], sortedProducts[index]]
    
    // עדכון position
    sortedProducts.forEach((p, i) => {
      p.position = i
    })
    
    setSelectedProducts(sortedProducts)
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

  const updateRule = (index: number, updates: Partial<CategoryRule>) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, ...updates } : rule
    ))
  }

  const generateSlug = (name: string) => {
    if (!name) return ""
    
    let slug = name.trim()
    slug = slug.replace(/\s+/g, "-")
    slug = slug.replace(/[^\u0590-\u05FFa-z0-9\-]+/g, "")
    slug = slug.replace(/-+/g, "-")
    slug = slug.replace(/^-+|-+$/g, "")
    
    slug = slug.split("").map(char => {
      if (/[\u0590-\u05FF]/.test(char)) {
        return char
      }
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
        productIds: formData.type === "MANUAL" ? selectedProducts
          .sort((a, b) => a.position - b.position)
          .map(p => p.product.id) : [],
      }

      // הוספת rules אם זה אוטומטי
      if (formData.type === "AUTOMATIC") {
        payload.rules = {
          conditions: rules.filter(r => r.value.trim()),
          matchType
        }
      }

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const category = await response.json()
        toast({
          title: "הצלחה",
          description: "הקטגוריה נוצרה בהצלחה",
        })
        
        router.push(`/categories/${category.slug}`)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת הקטגוריה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating category:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת הקטגוריה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // אם אין חנות נבחרת, נשתמש בחנות הראשונה
  const shopToUse = selectedShop || shops[0]
  
  if (!shopToUse) {
    return (
      <AppLayout title="קטגוריה חדשה">
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            לא נמצאה חנות
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני יצירת קטגוריה
          </p>
          <Button onClick={() => router.push("/categories")}>
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
              onClick={() => router.push("/categories")}
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
                              <SelectItem value="sku">מקט</SelectItem>
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
                          placeholder="חפש מוצרים לפי שם או מקט..."
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
                      {selectedProducts
                        .sort((a, b) => a.position - b.position)
                        .map((item, index) => (
                        <div
                          key={item.product.id}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-white"
                        >
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => moveProduct(index, "up")}
                              disabled={index === 0}
                            >
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => moveProduct(index, "down")}
                              disabled={index === selectedProducts.length - 1}
                            >
                              <ChevronDown className="w-4 h-4 text-gray-400" />
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
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* סרגל צד */}
          <div className="space-y-6">
            {/* סטטוס */}
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
                      setFormData((prev) => ({ ...prev, isPublished: checked }))
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
                <MediaPicker
                  value={formData.image}
                  onChange={(url) => setFormData((prev) => ({ ...prev, image: url || "" }))}
                  entityType="categories"
                  entityId="new"
                  shopId={selectedShop?.id}
                />
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

