"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Plus, X, Search, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Product {
  id: string
  name: string
  price: number
  images: string[]
  variants?: Array<{
    id: string
    name: string
    price: number | null
    inventoryQty: number | null
  }>
}

interface Customer {
  id: string
  name: string
  email: string
  phone?: string | null
}

interface Shop {
  id: string
  name: string
  slug: string
}

interface OrderItem {
  productId: string
  productName: string
  variantId?: string | null
  variantName?: string | null
  quantity: number
  price: number
}

interface ManualOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ManualOrderDialog({ open, onOpenChange, onSuccess }: ManualOrderDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [step, setStep] = useState(1) // 1 = Customer, 2 = Products, 3 = Details

  // Shop selection
  const [shops, setShops] = useState<Shop[]>([])
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
  })

  // Products
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<string | null>(null)

  // Order Details
  const [orderDetails, setOrderDetails] = useState({
    // כתובת משלוח
    address: "",
    houseNumber: "",
    apartment: "",
    floor: "",
    city: "",
    zip: "",
    // פרטי תשלום
    paymentMethod: "cash",
    deliveryMethod: "shipping",
    // הנחות וקופונים
    couponCode: "",
    discount: 0,
    discountType: "fixed", // fixed או percentage
    // הערות
    notes: "",
    orderNotes: "",
    // סטטוסים
    status: "PENDING",
    paymentStatus: "PENDING",
  })
  
  // קופונים זמינים
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([])

  // טעינת חנויות
  useEffect(() => {
    if (open) {
      fetchCurrentShop()
    }
  }, [open])

  // טעינת לקוחות כשבוחרים חנות
  useEffect(() => {
    if (selectedShop) {
      fetchCustomers()
      fetchProducts()
    }
  }, [selectedShop])

  // טעינת מוצרים כשמחפשים
  useEffect(() => {
    if (selectedShop && productSearch) {
      const timer = setTimeout(() => {
        fetchProducts()
      }, 300) // debounce
      return () => clearTimeout(timer)
    }
  }, [productSearch])

  const fetchCurrentShop = async () => {
    try {
      const response = await fetch("/api/shops")
      if (response.ok) {
        const shops = await response.json()
        console.log("Shops API response:", shops)
        // ה-API מחזיר מערך ישירות, לא אובייקט עם shops
        const shopsArray = Array.isArray(shops) ? shops : []
        setShops(shopsArray)
        // בחירה אוטומטית של החנות הראשונה
        if (shopsArray.length > 0) {
          console.log("Auto-selecting first shop:", shopsArray[0])
          setSelectedShop(shopsArray[0])
        } else {
          console.error("No shops found in response")
        }
      } else {
        console.error("Failed to fetch shops, status:", response.status)
        const errorText = await response.text()
        console.error("Error response:", errorText)
      }
    } catch (error) {
      console.error("Error fetching shops:", error)
    }
  }

  const fetchCustomers = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) return
    setLoadingCustomers(true)
    try {
      const params = new URLSearchParams()
      params.append("shopId", shopToUse.id)
      if (customerSearch) {
        params.append("search", customerSearch)
      }
      const response = await fetch(`/api/customers?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
    } finally {
      setLoadingCustomers(false)
    }
  }

  const fetchProducts = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) return
    setLoadingProducts(true)
    try {
      const params = new URLSearchParams()
      params.append("shopId", shopToUse.id)
      params.append("limit", "5")
      // רק אם יש חיפוש
      if (productSearch && productSearch.length > 0) {
        params.append("search", productSearch)
      } else {
        // אם אין חיפוש, לא טוענים מוצרים
        setProducts([])
        setLoadingProducts(false)
        return
      }
      console.log("Fetching products for shop:", shopToUse.id)
      const response = await fetch(`/api/products?${params.toString()}`)
      console.log("Products API response status:", response.status)
      if (response.ok) {
        const data = await response.json()
        console.log("Products loaded:", data.products?.length || 0, "products")
        console.log("Products data:", data.products)
        setProducts(data.products || [])
      } else {
        console.error("Failed to fetch products:", response.status)
        const errorData = await response.json().catch(() => ({}))
        console.error("Error details:", errorData)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoadingProducts(false)
    }
  }

  const addProductToOrder = (product: Product, variant?: any) => {
    // Validation של מחיר
    const price = variant?.price ?? product.price
    if (!price || price < 0) {
      toast({
        title: "שגיאה",
        description: "מחיר המוצר לא תקין",
        variant: "destructive",
      })
      return
    }

    // בדיקת מלאי
    const inventory = variant?.inventoryQty ?? product.inventoryQty
    if (inventory === 0) {
      const shouldContinue = window.confirm(
        `⚠️ אזהרה: אין מלאי עבור ${product.name}${variant ? ` - ${variant.name}` : ''}\n\nהאם אתה בטוח שברצונך להוסיף את המוצר להזמנה?`
      )
      if (!shouldContinue) {
        return
      }
    }

    const existingItemIndex = orderItems.findIndex(
      (item) =>
        item.productId === product.id &&
        item.variantId === (variant?.id || null)
    )

    if (existingItemIndex >= 0) {
      // עדכון כמות
      const newItems = [...orderItems]
      newItems[existingItemIndex].quantity += 1
      setOrderItems(newItems)
    } else {
      // הוספת פריט חדש
      setOrderItems([
        ...orderItems,
        {
          productId: product.id,
          productName: product.name,
          variantId: variant?.id || null,
          variantName: variant?.name || null,
          quantity: 1,
          price: price,
        },
      ])
    }
    toast({
      title: "המוצר נוסף להזמנה",
      description: `${product.name}${variant ? ` - ${variant.name}` : ""}`,
    })
  }

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1 || isNaN(quantity)) {
      toast({
        title: "שגיאה",
        description: "כמות חייבת להיות לפחות 1",
        variant: "destructive",
      })
      return
    }
    const newItems = [...orderItems]
    newItems[index].quantity = quantity
    setOrderItems(newItems)
  }

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal()
    if (orderDetails.discountType === 'percentage') {
      return (subtotal * orderDetails.discount) / 100
    }
    return orderDetails.discount
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const discount = calculateDiscount()
    return Math.max(0, subtotal - discount)
  }

  const handleSubmit = async () => {
    const shopToUse = selectedShop || shops[0]
    if (!shopToUse) {
      toast({
        title: "שגיאה",
        description: "לא נמצאה חנות. אנא צור חנות תחילה.",
        variant: "destructive",
      })
      return
    }

    if (!selectedCustomer && (!newCustomer.name || !newCustomer.email)) {
      toast({
        title: "שגיאה",
        description: "נא לבחור לקוח או למלא פרטי לקוח חדש",
        variant: "destructive",
      })
      return
    }

    // Validation של email format
    if (newCustomer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email)) {
      toast({
        title: "שגיאה",
        description: "נא להזין כתובת אימייל תקינה",
        variant: "destructive",
      })
      return
    }

    if (orderItems.length === 0) {
      toast({
        title: "שגיאה",
        description: "נא להוסיף לפחות מוצר אחד להזמנה",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shopToUse.id,
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name || newCustomer.name,
          customerEmail: selectedCustomer?.email || newCustomer.email,
          customerPhone: selectedCustomer?.phone || newCustomer.phone,
          items: orderItems,
          deliveryMethod: orderDetails.deliveryMethod,
          shippingAddress: orderDetails.deliveryMethod === "shipping" ? {
            city: orderDetails.city,
            address: orderDetails.address,
            houseNumber: orderDetails.houseNumber,
            apartment: orderDetails.apartment || undefined,
            floor: orderDetails.floor || undefined,
            zip: orderDetails.zip || undefined,
          } : undefined,
          paymentMethod: orderDetails.paymentMethod,
          couponCode: orderDetails.couponCode || undefined,
          discount: calculateDiscount(),
          orderNotes: orderDetails.orderNotes,
          notes: orderDetails.notes,
          status: orderDetails.status,
          paymentStatus: orderDetails.paymentStatus,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "הזמנה נוצרה בהצלחה",
          description: `מספר הזמנה: ${data.order.orderNumber}`,
        })
        onSuccess()
        resetForm()
        onOpenChange(false)
      } else {
        const error = await response.json()
        throw new Error(error.error || "שגיאה ביצירת ההזמנה")
      }
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה ביצירת ההזמנה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setSelectedShop(null)
    setSelectedCustomer(null)
    setCustomerSearch("")
    setNewCustomer({ name: "", email: "", phone: "" })
    setProductSearch("")
    setOrderItems([])
    setOrderDetails({
      shippingAddress: "",
      city: "",
      paymentMethod: "cash",
      notes: "",
      status: "PENDING",
      paymentStatus: "PENDING",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>יצירת הזמנה ידנית</DialogTitle>
        </DialogHeader>

        {/* Steps Indicator */}
        <div className="flex items-center justify-between mb-6">
          {[
            { num: 1, label: "בחירת לקוח" },
            { num: 2, label: "בחירת מוצרים" },
            { num: 3, label: "פרטי הזמנה" },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center ${s.num < 3 ? "flex-1" : ""}`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step >= s.num ? "bg-teal-500 text-white" : "bg-gray-200"
                }`}
              >
                {s.num}
              </div>
              <span className="mr-2 text-sm">{s.label}</span>
              {s.num < 3 && <div className="flex-1 h-0.5 bg-gray-200 mr-4" />}
            </div>
          ))}
        </div>

        {/* Step 1: Customer Selection */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Customer Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>בחר לקוח קיים</Label>
                {selectedCustomer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                    className="h-auto p-1 text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4 ml-1" />
                    הסר בחירה
                  </Button>
                )}
              </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="חפש לקוח..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value)
                          fetchCustomers()
                        }}
                        className="pr-10"
                      />
                    </div>
                  </div>
                  
                  {loadingCustomers ? (
                    <div className="mt-2 flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                    </div>
                  ) : customers.length > 0 ? (
                    <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                      {customers.map((customer) => (
                        <div
                          key={customer.id}
                          className={`p-2 cursor-pointer hover:bg-gray-50 ${
                            selectedCustomer?.id === customer.id
                              ? "bg-teal-50"
                              : ""
                          }`}
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">
                            {customer.email}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : customerSearch ? (
                    <div className="mt-2 text-center text-sm text-gray-500 p-4">
                      לא נמצאו לקוחות. הזן פרטים למטה ליצירת לקוח חדש.
                    </div>
                  ) : null}
                </div>

                {/* OR New Customer */}
                <div className="border-t pt-4">
                  <Label>או צור לקוח חדש</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label className="text-sm">שם פרטי *</Label>
                      <Input
                        value={newCustomer.name.split(' ')[0] || newCustomer.name}
                        onChange={(e) => {
                          const lastName = newCustomer.name.split(' ').slice(1).join(' ')
                          setNewCustomer({ ...newCustomer, name: lastName ? `${e.target.value} ${lastName}` : e.target.value })
                        }}
                        disabled={!!selectedCustomer}
                        placeholder="שם פרטי"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">שם משפחה *</Label>
                      <Input
                        value={newCustomer.name.split(' ').slice(1).join(' ') || ''}
                        onChange={(e) => {
                          const firstName = newCustomer.name.split(' ')[0] || ''
                          setNewCustomer({ ...newCustomer, name: `${firstName} ${e.target.value}`.trim() })
                        }}
                        disabled={!!selectedCustomer}
                        placeholder="שם משפחה"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">אימייל *</Label>
                      <Input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, email: e.target.value })
                        }
                        disabled={!!selectedCustomer}
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">טלפון *</Label>
                      <Input
                        value={newCustomer.phone}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, phone: e.target.value })
                        }
                        disabled={!!selectedCustomer}
                        placeholder="050-1234567"
                      />
                    </div>
                  </div>
                </div>
          </div>
        )}

        {/* Step 2: Products Selection */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Product Search */}
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חפש מוצר..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Products List */}
            {loadingProducts ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              </div>
            ) : products.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      if (product.variants && product.variants.length > 0) {
                        setSelectedProductForVariant(product.id)
                      } else {
                        addProductToOrder(product)
                      }
                    }}
                  >
                    {product.images[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">
                        {product.variants && product.variants.length > 0 
                          ? `${product.variants.length} וריאציות`
                          : `מלאי: ${product.inventoryQty ?? 0}`
                        }
                      </div>
                    </div>
                    <div className="text-teal-600 font-bold">₪{product.price}</div>
                    <Plus className="h-5 w-5 text-gray-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-gray-500 p-8">
                {productSearch ? "לא נמצאו מוצרים" : "התחל להקליד כדי לחפש מוצרים..."}
              </div>
            )}

            {/* Variant Selection Dialog */}
            {selectedProductForVariant && (
              <Dialog open={!!selectedProductForVariant} onOpenChange={(open) => !open && setSelectedProductForVariant(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>בחר וריאציה</DialogTitle>
                    <DialogDescription>בחר את הוריאציה הרצויה של המוצר</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {products
                      .find((p) => p.id === selectedProductForVariant)
                      ?.variants?.map((variant) => (
                        <Card
                          key={variant.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            const product = products.find((p) => p.id === selectedProductForVariant)
                            if (product) {
                              addProductToOrder(product, variant)
                              setSelectedProductForVariant(null)
                            }
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="font-medium">{variant.name}</div>
                            <div className="text-teal-600 font-bold">
                              ₪{variant.price || products.find((p) => p.id === selectedProductForVariant)?.price || 0}
                            </div>
                            {variant.inventoryQty !== null && (
                              <div className="text-xs text-gray-500">
                                במלאי: {variant.inventoryQty}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Selected Items */}
            {orderItems.length > 0 && (
              <div className="border-t pt-4">
                <Label className="mb-2 block">פריטים שנבחרו</Label>
                {orderItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      {item.variantName && (
                        <div className="text-sm text-gray-500">
                          {item.variantName}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItemQuantity(index, parseInt(e.target.value))
                        }
                        className="w-20"
                      />
                      <span className="font-medium">₪{item.price}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center mt-4 font-bold">
                  <span>סה"כ:</span>
                  <span>₪{calculateTotal()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Order Details */}
        {step === 3 && (
          <div className="space-y-4">
            {/* שיטת משלוח */}
            <div>
              <Label>שיטת משלוח *</Label>
              <Select
                value={orderDetails.deliveryMethod}
                onValueChange={(value) =>
                  setOrderDetails({ ...orderDetails, deliveryMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shipping">משלוח לכתובת</SelectItem>
                  <SelectItem value="pickup">איסוף עצמי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* כתובת משלוח (רק אם נבחר משלוח) */}
            {orderDetails.deliveryMethod === "shipping" && (
              <div className="space-y-4 border-t pt-4">
                <Label className="text-base font-semibold">כתובת משלוח</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>עיר *</Label>
                    <Input
                      value={orderDetails.city}
                      onChange={(e) =>
                        setOrderDetails({ ...orderDetails, city: e.target.value })
                      }
                      placeholder="תל אביב"
                    />
                  </div>
                  <div>
                    <Label>רחוב *</Label>
                    <Input
                      value={orderDetails.address}
                      onChange={(e) =>
                        setOrderDetails({ ...orderDetails, address: e.target.value })
                      }
                      placeholder="רחוב התחילה"
                    />
                  </div>
                  <div>
                    <Label>מספר בית *</Label>
                    <Input
                      value={orderDetails.houseNumber}
                      onChange={(e) =>
                        setOrderDetails({ ...orderDetails, houseNumber: e.target.value })
                      }
                      placeholder="12"
                    />
                  </div>
                  <div>
                    <Label>דירה (אופציונלי)</Label>
                    <Input
                      value={orderDetails.apartment}
                      onChange={(e) =>
                        setOrderDetails({ ...orderDetails, apartment: e.target.value })
                      }
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <Label>קומה (אופציונלי)</Label>
                    <Input
                      value={orderDetails.floor}
                      onChange={(e) =>
                        setOrderDetails({ ...orderDetails, floor: e.target.value })
                      }
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <Label>מיקוד (אופציונלי)</Label>
                    <Input
                      value={orderDetails.zip}
                      onChange={(e) =>
                        setOrderDetails({ ...orderDetails, zip: e.target.value })
                      }
                      placeholder="1234567"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>אמצעי תשלום</Label>
                <Select
                  value={orderDetails.paymentMethod}
                  onValueChange={(value) =>
                    setOrderDetails({ ...orderDetails, paymentMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">מזומן</SelectItem>
                    <SelectItem value="credit_card">כרטיס אשראי</SelectItem>
                    <SelectItem value="bank_transfer">העברה בנקאית</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>סטטוס הזמנה</Label>
                <Select
                  value={orderDetails.status}
                  onValueChange={(value) =>
                    setOrderDetails({ ...orderDetails, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">ממתינה</SelectItem>
                    <SelectItem value="CONFIRMED">מאושרת</SelectItem>
                    <SelectItem value="PROCESSING">בטיפול</SelectItem>
                    <SelectItem value="COMPLETED">הושלמה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>סטטוס תשלום</Label>
                <Select
                  value={orderDetails.paymentStatus}
                  onValueChange={(value) =>
                    setOrderDetails({ ...orderDetails, paymentStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">ממתין</SelectItem>
                    <SelectItem value="PAID">שולם</SelectItem>
                    <SelectItem value="REFUNDED">הוחזר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* הערות הזמנה */}
            <div>
              <Label>הערות להזמנה (אופציונלי)</Label>
              <Textarea
                value={orderDetails.orderNotes}
                onChange={(e) =>
                  setOrderDetails({ ...orderDetails, orderNotes: e.target.value })
                }
                rows={3}
                placeholder="הערות נוספות להזמנה..."
              />
            </div>

            {/* הנחות */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
              <div className="md:col-span-2">
                <Label>קוד קופון (אופציונלי)</Label>
                <Input
                  value={orderDetails.couponCode}
                  onChange={(e) =>
                    setOrderDetails({ ...orderDetails, couponCode: e.target.value })
                  }
                  placeholder="הזן קוד קופון..."
                />
              </div>
              <div>
                <Label>סוג הנחה</Label>
                <Select
                  value={orderDetails.discountType}
                  onValueChange={(value) =>
                    setOrderDetails({ ...orderDetails, discountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">סכום קבוע (₪)</SelectItem>
                    <SelectItem value="percentage">אחוזים (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label>סכום הנחה</Label>
                <Input
                  type="number"
                  min="0"
                  value={orderDetails.discount}
                  onChange={(e) =>
                    setOrderDetails({ ...orderDetails, discount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder={orderDetails.discountType === 'percentage' ? 'אחוזים (0-100)' : 'סכום בשקלים'}
                />
              </div>
            </div>

            {/* הערות פנימיות */}
            <div>
              <Label>הערות פנימיות (אופציונלי)</Label>
              <Textarea
                value={orderDetails.notes}
                onChange={(e) =>
                  setOrderDetails({ ...orderDetails, notes: e.target.value })
                }
                rows={3}
                placeholder="הערות למנהל בלבד..."
              />
            </div>

            {/* Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>לקוח:</span>
                    <span className="font-medium">
                      {selectedCustomer?.name || newCustomer.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>פריטים:</span>
                    <span className="font-medium">{orderItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>סכום ביניים:</span>
                    <span>₪{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  {orderDetails.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>הנחה ({orderDetails.discountType === 'percentage' ? `${orderDetails.discount}%` : '₪'}):</span>
                      <span>-₪{calculateDiscount().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>סה"כ לתשלום:</span>
                    <span>₪{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              חזור
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !selectedCustomer && !newCustomer.email) ||
                (step === 2 && orderItems.length === 0)
              }
            >
              המשך
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  יוצר הזמנה...
                </>
              ) : (
                "צור הזמנה"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

