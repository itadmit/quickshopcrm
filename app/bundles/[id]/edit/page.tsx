"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { ArrowRight, Save, Plus, X, Package } from "lucide-react"
import { getProductPrice, formatProductPrice } from "@/lib/product-price"

interface Product {
  id: string
  name: string
  price: number
  comparePrice: number | null
  variants?: Array<{
    id: string
    name: string
    price: number | null
    comparePrice: number | null
  }>
}

interface BundleProduct {
  productId: string
  quantity: number
  position: number
  product: {
    id: string
    name: string
    price: number
  }
}

interface Bundle {
  id: string
  name: string
  description: string | null
  price: number
  comparePrice: number | null
  isActive: boolean
  products: BundleProduct[]
}

export default function EditBundlePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop, shops, loading: shopLoading } = useShop()
  const bundleId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    productId: string
    quantity: number
    position: number
  }>>([])

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    comparePrice: "",
    isActive: true,
  })

  useEffect(() => {
    if (selectedShop && bundleId) {
      fetchBundle()
      fetchProducts()
    }
  }, [selectedShop, bundleId])

  const fetchBundle = async () => {
    if (!bundleId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/bundles/${bundleId}`)
      if (response.ok) {
        const bundle: Bundle = await response.json()
        setFormData({
          name: bundle.name || "",
          description: bundle.description || "",
          price: bundle.price.toString(),
          comparePrice: bundle.comparePrice?.toString() || "",
          isActive: bundle.isActive,
        })
        setSelectedProducts(
          bundle.products.map((p, index) => ({
            productId: p.productId,
            quantity: p.quantity,
            position: p.position || index,
          }))
        )
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את החבילה",
          variant: "destructive",
        })
        router.push("/bundles")
      }
    } catch (error) {
      console.error("Error fetching bundle:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת החבילה",
        variant: "destructive",
      })
      router.push("/bundles")
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    const shopToUseForProducts = selectedShop || shops[0]
    if (!shopToUseForProducts) return

    try {
      const response = await fetch(`/api/products?shopId=${shopToUseForProducts.id}`)
      if (response.ok) {
        const data = await response.json()
        // Ensure all products have comparePrice field
        const productsWithComparePrice = (data.products || []).map((p: any) => ({
          ...p,
          comparePrice: p.comparePrice ?? null,
          variants: (p.variants || []).map((v: any) => ({
            ...v,
            comparePrice: v.comparePrice ?? null,
          })),
        }))
        setProducts(productsWithComparePrice as Product[])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const handleAddProduct = (productId: string) => {
    if (selectedProducts.find(p => p.productId === productId)) {
      toast({
        title: "שגיאה",
        description: "המוצר כבר קיים בחבילה",
        variant: "destructive",
      })
      return
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        productId,
        quantity: 1,
        position: selectedProducts.length,
      },
    ])
  }

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index))
  }

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const updated = [...selectedProducts]
    updated[index].quantity = quantity
    setSelectedProducts(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedShop) {
      toast({
        title: "שגיאה",
        description: "יש לבחור חנות",
        variant: "destructive",
      })
      return
    }

    if (selectedProducts.length === 0) {
      toast({
        title: "שגיאה",
        description: "יש להוסיף לפחות מוצר אחד לחבילה",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/bundles/${bundleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
          isActive: formData.isActive,
          products: selectedProducts,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "החבילה עודכנה בהצלחה",
        })
        router.push("/bundles")
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לעדכן את החבילה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating bundle:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון החבילה",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (shopLoading || loading) {
    return (
      <AppLayout title="עריכת חבילה">
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">טוען נתונים...</h3>
        </div>
      </AppLayout>
    )
  }

  // אם אין חנות נבחרת, נשתמש בחנות הראשונה
  const shopToUse = selectedShop || shops[0]
  
  if (!shopToUse) {
    return (
      <AppLayout title="עריכת חבילה">
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">לא נמצאה חנות</h3>
          <p className="text-gray-600">אנא צור חנות תחילה</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="עריכת חבילה">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">עריכת חבילה</h1>
            <p className="text-gray-600 mt-1">ערוך את פרטי החבילה</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/bundles")}>
            <ArrowRight className="w-4 h-4 ml-2 rotate-180" />
            חזור
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>מידע בסיסי</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">שם החבילה *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">תיאור</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">מחיר *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="comparePrice">מחיר מקורי (להשוואה)</Label>
                  <Input
                    id="comparePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.comparePrice}
                    onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">חבילה פעילה</Label>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle>מוצרים בחבילה</CardTitle>
              <CardDescription>הוסף מוצרים לחבילה וקבע כמות לכל מוצר</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <div className="space-y-2">
                  <Label>מוצרים נבחרים ({selectedProducts.length})</Label>
                  {selectedProducts.map((item, index) => {
                    const product = products.find(p => p.id === item.productId)
                    return (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{product?.name || "מוצר לא נמצא"}</p>
                          <p className="text-sm text-gray-600">
                            {product && product.comparePrice !== undefined ? formatProductPrice(product) : "₪0.00"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">כמות:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Available Products */}
              <div className="space-y-2">
                <Label>הוסף מוצר</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {products
                    .filter(p => !selectedProducts.find(sp => sp.productId === p.id))
                    .map((product) => (
                      <Button
                        key={product.id}
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => handleAddProduct(product.id)}
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        {product.name} - {product.comparePrice !== undefined ? formatProductPrice(product) : `₪${product.price.toFixed(2)}`}
                      </Button>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="prodify-gradient text-white"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  שמור שינויים
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/bundles")}
            >
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}

