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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
import { Save, Boxes, Package, DollarSign, X, Plus } from "lucide-react"

interface Product {
  id: string
  name: string
  price: number
}

export default function EditBundlePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const bundleId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Array<{ productId: string; quantity: number }>>([])
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    comparePrice: "",
    isActive: true,
  })

  useEffect(() => {
    if (selectedShop) {
      fetchProducts()
    }
    if (bundleId) {
      fetchBundle()
    }
  }, [selectedShop, bundleId])

  const fetchBundle = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/bundles/${bundleId}`)
      if (response.ok) {
        const bundle = await response.json()
        
        setFormData({
          name: bundle.name || "",
          description: bundle.description || "",
          price: bundle.price?.toString() || "",
          comparePrice: bundle.comparePrice?.toString() || "",
          isActive: bundle.isActive ?? true,
        })

        if (bundle.products) {
          setSelectedProducts(
            bundle.products.map((p: any) => ({
              productId: p.productId,
              quantity: p.quantity || 1,
            }))
          )
        }
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את החבילה",
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
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/products?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const addProduct = (productId: string) => {
    if (!selectedProducts.find((p) => p.productId === productId)) {
      setSelectedProducts([...selectedProducts, { productId, quantity: 1 }])
    }
  }

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.productId !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.productId === productId ? { ...p, quantity } : p
      )
    )
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
        description: "שם החבילה הוא חובה",
        variant: "destructive",
      })
      return
    }

    if (selectedProducts.length === 0) {
      toast({
        title: "שגיאה",
        description: "יש לבחור לפחות מוצר אחד",
        variant: "destructive",
      })
      return
    }

    if (!formData.price || parseFloat(formData.price) < 0) {
      toast({
        title: "שגיאה",
        description: "מחיר חייב להיות מספר חיובי",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload: any = {
        shopId: selectedShop.id,
        name: formData.name.trim(),
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : undefined,
        isActive: formData.isActive,
        products: selectedProducts.map((p, index) => ({
          productId: p.productId,
          quantity: p.quantity,
          position: index,
        })),
      }

      const response = await fetch(`/api/bundles/${bundleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "חבילת המוצרים עודכנה בהצלחה",
        })
        fetchBundle()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת חבילת המוצרים",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating bundle:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת חבילת המוצרים",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="עריכת חבילה">
        <FormSkeleton />
      </AppLayout>
    )
  }

  if (!selectedShop) {
    return (
      <AppLayout title="עריכת חבילת מוצרים">
        <div className="text-center py-12">
          <Boxes className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600 mb-4">
            יש לבחור חנות מההדר לפני עריכת חבילת מוצרים
          </p>
          <Button onClick={() => router.push("/bundles")}>
            חזור לרשימת חבילות
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="עריכת חבילת מוצרים">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">עריכת חבילת מוצרים</h1>
            <p className="text-gray-600 mt-1">
              ערוך חבילת מוצרים עם הנחה
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/bundles")}
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
              {saving ? "שומר..." : "שמור"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="w-5 h-5" />
                  פרטי חבילה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם חבילה *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="לדוגמה: חבילת מתחילים"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="תיאור החבילה..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">מחיר *</Label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">₪</span>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                        placeholder="0.00"
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comparePrice">מחיר מקורי (להשוואה)</Label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">₪</span>
                      <Input
                        id="comparePrice"
                        type="number"
                        step="0.01"
                        value={formData.comparePrice}
                        onChange={(e) => setFormData((prev) => ({ ...prev, comparePrice: e.target.value }))}
                        placeholder="0.00"
                        className="pr-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked as boolean }))
                    }
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    חבילה פעילה
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  מוצרים בחבילה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedProducts.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {selectedProducts.map((item) => {
                      const product = products.find((p) => p.id === item.productId)
                      return (
                        <div
                          key={item.productId}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{product?.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateQuantity(item.productId, parseInt(e.target.value) || 1)
                                }
                                className="w-20"
                              />
                              <span className="text-sm text-gray-600">כמות</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProduct(item.productId)}
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div>
                  <Label>הוסף מוצר</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {products
                      .filter((p) => !selectedProducts.find((sp) => sp.productId === p.id))
                      .map((product) => (
                        <Button
                          key={product.id}
                          variant="outline"
                          onClick={() => addProduct(product.id)}
                          className="justify-start"
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          {product.name}
                        </Button>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>מידע</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-600">
                <p>
                  חבילת מוצרים מאפשרת למכור מספר מוצרים יחד במחיר מיוחד.
                </p>
                <p>
                  הלקוח יקבל הנחה על רכישת כל המוצרים יחד.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

