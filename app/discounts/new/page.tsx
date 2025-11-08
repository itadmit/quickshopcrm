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
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Save, Tag, Zap, Percent, DollarSign, Package, Users, Calendar, Search, X } from "lucide-react"
import { NewDiscountSkeleton } from "@/components/skeletons/NewDiscountSkeleton"

interface Product {
  id: string
  name: string
  price: number
}

interface Category {
  id: string
  name: string
}

interface Collection {
  id: string
  name: string
}

interface Customer {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

export default function NewDiscountPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop, loading: shopLoading } = useShop()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Products/Categories/Collections state
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedCollections, setSelectedCollections] = useState<string[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [categorySearch, setCategorySearch] = useState("")
  const [collectionSearch, setCollectionSearch] = useState("")
  
  // Customers state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [customerSearch, setCustomerSearch] = useState("")
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED" | "BUY_X_GET_Y" | "VOLUME_DISCOUNT" | "NTH_ITEM_DISCOUNT",
    value: "",
    buyQuantity: "",
    getQuantity: "",
    getDiscount: "",
    nthItem: "",
    minOrderAmount: "",
    maxDiscount: "",
    maxUses: "",
    usesPerCustomer: "1",
    startDate: "",
    endDate: "",
    isActive: true,
    isAutomatic: false,
    canCombine: false,
    priority: "0",
    target: "ALL_PRODUCTS" as string,
    customerTarget: "ALL_CUSTOMERS" as string,
  })

  useEffect(() => {
    if (selectedShop) {
      fetchProducts()
      fetchCategories()
      fetchCollections()
      fetchCustomers()
    }
  }, [selectedShop])

  useEffect(() => {
    if (!selectedShop) return
    
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
    if (!selectedShop) return
    try {
      const response = await fetch(`/api/products?shopId=${selectedShop.id}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const fetchCategories = async () => {
    if (!selectedShop) return
    try {
      const response = await fetch(`/api/categories?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data || [])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchCollections = async () => {
    if (!selectedShop) return
    try {
      const response = await fetch(`/api/collections?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setCollections(data || [])
      }
    } catch (error) {
      console.error("Error fetching collections:", error)
    }
  }

  const fetchCustomers = async () => {
    if (!selectedShop) return
    try {
      const response = await fetch(`/api/customers?shopId=${selectedShop.id}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
    }
  }

  const searchCustomers = async (searchTerm: string) => {
    if (!selectedShop) return
    try {
      const response = await fetch(`/api/customers?shopId=${selectedShop.id}&search=${encodeURIComponent(searchTerm)}&limit=50`)
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

  const filteredCollections = collections.filter(c => 
    c.name.toLowerCase().includes(collectionSearch.toLowerCase())
  )

  const filteredCustomers = customers.filter(c => {
    const searchLower = customerSearch.toLowerCase()
    const name = `${c.firstName || ""} ${c.lastName || ""}`.trim()
    return (
      c.email.toLowerCase().includes(searchLower) ||
      name.toLowerCase().includes(searchLower)
    )
  })

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

    if (!formData.value || parseFloat(formData.value) < 0) {
      toast({
        title: "שגיאה",
        description: "ערך ההנחה חייב להיות מספר חיובי",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload: any = {
        shopId: selectedShop.id,
        title: formData.title.trim(),
        description: formData.description || undefined,
        type: formData.type,
        value: parseFloat(formData.value),
        buyQuantity: formData.buyQuantity ? parseInt(formData.buyQuantity) : undefined,
        getQuantity: formData.getQuantity ? parseInt(formData.getQuantity) : undefined,
        getDiscount: formData.getDiscount ? parseFloat(formData.getDiscount) : undefined,
        nthItem: formData.nthItem ? parseInt(formData.nthItem) : undefined,
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : undefined,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
        usesPerCustomer: parseInt(formData.usesPerCustomer),
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        isActive: formData.isActive,
        isAutomatic: formData.isAutomatic,
        canCombine: formData.canCombine,
        priority: parseInt(formData.priority),
        target: formData.target,
        customerTarget: formData.customerTarget,
        applicableProducts: formData.target === "SPECIFIC_PRODUCTS" ? selectedProducts : [],
        applicableCategories: formData.target === "SPECIFIC_CATEGORIES" ? selectedCategories : [],
        applicableCollections: formData.target === "SPECIFIC_COLLECTIONS" ? selectedCollections : [],
        excludedProducts: formData.target === "EXCLUDE_PRODUCTS" ? selectedProducts : [],
        excludedCategories: formData.target === "EXCLUDE_CATEGORIES" ? selectedCategories : [],
        excludedCollections: formData.target === "EXCLUDE_COLLECTIONS" ? selectedCollections : [],
        customerTiers: [],
        specificCustomers: formData.customerTarget === "SPECIFIC_CUSTOMERS" ? selectedCustomers : [],
      }

      const response = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "ההנחה נוצרה בהצלחה",
        })
        router.push("/discounts")
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

  // אם עדיין טוען את החנויות, הצג skeleton
  if (shopLoading) {
    return (
      <AppLayout title="הנחה חדשה">
        <NewDiscountSkeleton />
      </AppLayout>
    )
  }

  // אם אין חנות נבחרת אחרי שהטעינה הסתיימה, זה אומר שאין חנויות
  if (!selectedShop && !shopLoading) {
    return (
      <AppLayout title="הנחה חדשה">
        <div className="text-center py-12">
          <Tag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות זמינה
          </h3>
          <p className="text-gray-600 mb-4">
            יש ליצור חנות לפני יצירת הנחה
          </p>
          <Button onClick={() => router.push("/discounts")}>
            חזור לרשימת הנחות
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="הנחה חדשה">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">הנחה חדשה</h1>
            <p className="text-gray-600 mt-1">
              צור הנחה אוטומטית או קופון
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
              {saving ? "שומר..." : "שמור"}
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
                  <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
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
                  <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
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
                  <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                    <Label>הנחת כמות (בפיתוח)</Label>
                    <p className="text-sm text-gray-600">
                      תכונה זו תתווסף בקרוב. תוכל להגדיר הנחות לפי כמות (למשל: קנה 3+ קבל 10% הנחה, קנה 5+ קבל 15% הנחה)
                    </p>
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
                      <Label htmlFor="collections" className="cursor-pointer flex-1 text-right">קולקציות ספציפיות</Label>
                      <RadioGroupItem value="SPECIFIC_COLLECTIONS" id="collections" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="exclude-products" className="cursor-pointer flex-1 text-right">כל המוצרים חוץ מ-</Label>
                      <RadioGroupItem value="EXCLUDE_PRODUCTS" id="exclude-products" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="exclude-categories" className="cursor-pointer flex-1 text-right">כל המוצרים חוץ מקטגוריות</Label>
                      <RadioGroupItem value="EXCLUDE_CATEGORIES" id="exclude-categories" />
                    </div>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <Label htmlFor="exclude-collections" className="cursor-pointer flex-1 text-right">כל המוצרים חוץ מקולקציות</Label>
                      <RadioGroupItem value="EXCLUDE_COLLECTIONS" id="exclude-collections" />
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
                        filteredProducts.map((product) => (
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
                        filteredCategories.map((category) => (
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

                {/* Collection Selection */}
                {(formData.target === "SPECIFIC_COLLECTIONS" || formData.target === "EXCLUDE_COLLECTIONS") && (
                  <div className="space-y-3">
                    <Label>בחר קולקציות:</Label>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="חפש קולקציות..."
                        value={collectionSearch}
                        onChange={(e) => setCollectionSearch(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                    <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                      {filteredCollections.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">לא נמצאו קולקציות</p>
                      ) : (
                        filteredCollections.map((collection) => (
                          <div key={collection.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`collection-${collection.id}`}
                              checked={selectedCollections.includes(collection.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCollections([...selectedCollections, collection.id])
                                } else {
                                  setSelectedCollections(selectedCollections.filter(id => id !== collection.id))
                                }
                              }}
                            />
                            <Label htmlFor={`collection-${collection.id}`} className="cursor-pointer flex-1 text-sm">
                              {collection.name}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                    {selectedCollections.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedCollections.map((collectionId) => {
                          const collection = collections.find(c => c.id === collectionId)
                          if (!collection) return null
                          return (
                            <div key={collectionId} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                              {collection.name}
                              <button
                                onClick={() => setSelectedCollections(selectedCollections.filter(id => id !== collectionId))}
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
                        filteredCustomers.map((customer) => {
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
                  <Label htmlFor="isAutomatic" className="cursor-pointer flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    הנחה אוטומטית (מוחלת ללא קוד)
                  </Label>
                  <Switch
                    id="isAutomatic"
                    checked={formData.isAutomatic}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isAutomatic: checked as boolean }))
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

