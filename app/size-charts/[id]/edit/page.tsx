"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { Save, Ruler, Image as ImageIcon, FileText, Globe, FolderOpen, Package, Search, X } from "lucide-react"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { MediaPicker } from "@/components/MediaPicker"
import { Badge } from "@/components/ui/badge"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
}

export default function EditSizeChartPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const sizeChartId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    content: "",
    imageUrl: "",
    displayType: "global" as "global" | "categories" | "products",
    categoryIds: [] as string[],
    productIds: [] as string[],
    isActive: true,
    useImage: false,
  })

  useEffect(() => {
    if (sizeChartId) {
      fetchSizeChart()
    }
    if (selectedShop) {
      fetchCategories()
    }
  }, [sizeChartId, selectedShop])

  useEffect(() => {
    if (productSearch.trim() && selectedShop) {
      const timeoutId = setTimeout(() => {
        searchProducts(productSearch)
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setProductSearchResults([])
    }
  }, [productSearch, selectedShop])

  const fetchSizeChart = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/size-charts/${sizeChartId}`)
      if (response.ok) {
        const sizeChart = await response.json()
        setFormData({
          name: sizeChart.name || "",
          content: sizeChart.content || "",
          imageUrl: sizeChart.imageUrl || "",
          displayType: sizeChart.displayType || "global",
          categoryIds: sizeChart.categoryIds || [],
          productIds: sizeChart.productIds || [],
          isActive: sizeChart.isActive ?? true,
          useImage: !!sizeChart.imageUrl,
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את טבלת המידות",
          variant: "destructive",
        })
        router.push("/size-charts")
      }
    } catch (error) {
      console.error("Error fetching size chart:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת טבלת המידות",
        variant: "destructive",
      })
      router.push("/size-charts")
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    if (!selectedShop) return
    try {
      const response = await fetch(`/api/categories?shopId=${selectedShop?.id || ""}`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data || [])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const searchProducts = async (searchTerm: string) => {
    if (!selectedShop) return
    setLoadingProducts(true)
    try {
      const response = await fetch(
        `/api/products?shopId=${selectedShop?.id || ""}&search=${encodeURIComponent(searchTerm)}&limit=20`
      )
      if (response.ok) {
        const data = await response.json()
        setProductSearchResults(data.products || [])
      }
    } catch (error) {
      console.error("Error searching products:", error)
    } finally {
      setLoadingProducts(false)
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

    if (!formData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "שם טבלת המידות הוא חובה",
        variant: "destructive",
      })
      return
    }

    if (!formData.useImage && (!formData.content || !formData.content.trim())) {
      toast({
        title: "שגיאה",
        description: "יש להזין תוכן או לבחור תמונה",
        variant: "destructive",
      })
      return
    }

    if (formData.useImage && !formData.imageUrl) {
      toast({
        title: "שגיאה",
        description: "יש לבחור תמונה",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload: any = {
        name: formData.name,
        content: formData.useImage ? null : (formData.content?.trim() || null),
        imageUrl: formData.useImage ? (formData.imageUrl || null) : null,
        displayType: formData.displayType,
        categoryIds: formData.displayType === "categories" ? formData.categoryIds : [],
        productIds: formData.displayType === "products" ? formData.productIds : [],
        isActive: formData.isActive,
      }

      const response = await fetch(`/api/size-charts/${sizeChartId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "טבלת המידות עודכנה בהצלחה",
        })
        router.push("/size-charts")
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בעדכון טבלת המידות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating size chart:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון טבלת המידות",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id: any) => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }))
  }

  const toggleProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id: any) => id !== productId)
        : [...prev.productIds, productId],
    }))
  }

  const removeProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      productIds: prev.productIds.filter((id: any) => id !== productId),
    }))
  }

  if (loading) {
    return (
      <AppLayout>
        <FormSkeleton />
      </AppLayout>
    )
  }

  if (!selectedShop) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <Ruler className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני עריכת טבלת מידות
          </p>
          <Button onClick={() => router.push("/size-charts")}>
            חזור לרשימת טבלאות מידות
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ערוך טבלת מידות</h1>
            <p className="text-gray-600 mt-1">
              ערוך טבלת מידות לחנות: <span className="font-semibold">{selectedShop?.name || ""}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/size-charts")}
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
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler className="w-5 h-5" />
                  מידע בסיסי
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם טבלת המידות *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="לדוגמה: טבלת מידות בגדים"
                  />
                </div>

                <div className="space-y-2">
                  <Label>סוג תוכן</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!formData.useImage}
                        onChange={() => setFormData((prev) => ({ ...prev, useImage: false }))}
                        className="w-4 h-4"
                      />
                      <FileText className="w-4 h-4" />
                      <span>עורך עשיר</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.useImage}
                        onChange={() => setFormData((prev) => ({ ...prev, useImage: true }))}
                        className="w-4 h-4"
                      />
                      <ImageIcon className="w-4 h-4" />
                      <span>תמונה</span>
                    </label>
                  </div>
                </div>

                {!formData.useImage ? (
                  <div className="space-y-2">
                    <Label>תוכן טבלת המידות</Label>
                    <RichTextEditor
                      value={formData.content}
                      onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
                      placeholder="הדבק או הקלד את תוכן טבלת המידות כאן..."
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>תמונת טבלת המידות</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                      {formData.imageUrl ? (
                        <div className="relative">
                          <img
                            src={formData.imageUrl}
                            alt="טבלת מידות"
                            className="w-full max-h-96 object-contain rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 left-2"
                            onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setMediaPickerOpen(true)}
                          className="w-full"
                        >
                          <ImageIcon className="w-4 h-4 ml-2" />
                          בחר תמונה
                        </Button>
                      )}
                    </div>
                    <MediaPicker
                      open={mediaPickerOpen}
                      onOpenChange={setMediaPickerOpen}
                      onSelect={(files) => {
                        if (files.length > 0) {
                          setFormData((prev) => ({ ...prev, imageUrl: files[0] }))
                        }
                        setMediaPickerOpen(false)
                      }}
                      selectedFiles={formData.imageUrl ? [formData.imageUrl] : []}
                      shopId={selectedShop?.id || ""}
                      entityType="size-charts"
                      entityId={sizeChartId}
                      multiple={false}
                      title="בחר תמונת טבלת מידות"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Display Settings */}
            <Card>
              <CardHeader>
                <CardTitle>הגדרות תצוגה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>איפה יוצג</Label>
                  <Select
                    value={formData.displayType}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({ ...prev, displayType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          <span>גלובלי - בכל המוצרים</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="categories">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          <span>קטגוריות ספציפיות</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="products">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span>מוצרים ספציפיים</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.displayType === "categories" && (
                  <div className="space-y-2">
                    <Label>בחר קטגוריות</Label>
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                      {categories.length === 0 ? (
                        <p className="text-sm text-gray-500">אין קטגוריות זמינות</p>
                      ) : (
                        categories.map((category: any) => (
                          <label
                            key={category.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <Checkbox
                              checked={formData.categoryIds.includes(category.id)}
                              onCheckedChange={() => toggleCategory(category.id)}
                            />
                            <span>{category.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {formData.displayType === "products" && (
                  <div className="space-y-2">
                    <Label>בחר מוצרים</Label>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="חפש מוצרים..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                    {loadingProducts && (
                      <p className="text-sm text-gray-500">טוען מוצרים...</p>
                    )}
                    {productSearchResults.length > 0 && (
                      <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                        {productSearchResults.map((product: any) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => toggleProduct(product.id)}
                            className={`w-full text-right p-2 rounded hover:bg-gray-50 ${
                              formData.productIds.includes(product.id) ? "bg-emerald-50" : ""
                            }`}
                          >
                            {product.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {formData.productIds.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <Label>מוצרים נבחרים:</Label>
                        <div className="flex flex-wrap gap-2">
                          {formData.productIds.map((productId) => {
                            const product = products.find((p: any) => p.id === productId) ||
                              productSearchResults.find((p: any) => p.id === productId)
                            return product ? (
                              <Badge
                                key={productId}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                {product.name}
                                <button
                                  type="button"
                                  onClick={() => removeProduct(productId)}
                                  className="ml-1 hover:text-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ) : null
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>הגדרות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive" className="cursor-pointer">
                    פעיל
                  </Label>
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked as boolean }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

