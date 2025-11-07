"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Monitor, Smartphone, Layout, Grid3x3, List } from "lucide-react"
import { cn } from "@/lib/utils"

type CategoryLayout = "grid" | "list" | "compact-grid" | "large-grid"

interface CategoryPageDesignerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLayoutChange?: (layout: CategoryLayout) => void
  currentLayout?: CategoryLayout
}

// מוצרים דמה לתצוגה מקדימה
const mockProducts = [
  {
    id: "1",
    name: "תיק ספורט נייק",
    price: 249.90,
    comparePrice: 299.90,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
    availability: "IN_STOCK",
  },
  {
    id: "2",
    name: "כובע אדידס",
    price: 89.90,
    comparePrice: 129.90,
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop",
    availability: "IN_STOCK",
  },
  {
    id: "3",
    name: "נעלי ריצה נייק",
    price: 399.90,
    comparePrice: null,
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=400&fit=crop",
    availability: "IN_STOCK",
  },
  {
    id: "4",
    name: "חולצת ספורט",
    price: 149.90,
    comparePrice: 199.90,
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop",
    availability: "OUT_OF_STOCK",
  },
]

const mockCategory = {
  name: "ספורט ופנאי",
  description: "כל מה שצריך לספורט ולפנאי",
  productCount: 24,
}

export function CategoryPageDesigner({
  open,
  onOpenChange,
  onLayoutChange,
  currentLayout = "grid",
}: CategoryPageDesignerProps) {
  const [layout, setLayout] = useState<CategoryLayout>(currentLayout)
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")

  // עדכון ה-layout כשהקומפוננטה נפתחת או כשה-currentLayout משתנה
  useEffect(() => {
    if (open && currentLayout) {
      setLayout(currentLayout)
    }
  }, [open, currentLayout])

  const handleLayoutChange = (newLayout: CategoryLayout) => {
    setLayout(newLayout)
    onLayoutChange?.(newLayout)
  }

  const renderProducts = () => {
    switch (layout) {
      case "grid":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mockProducts.map((product) => (
              <div key={product.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold text-gray-900">
                      ₪{product.price.toFixed(2)}
                    </span>
                    {product.comparePrice && (
                      <span className="text-xs text-gray-500 line-through">
                        ₪{product.comparePrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {product.availability === "OUT_OF_STOCK" && (
                    <span className="text-xs text-red-600">אזל מהמלאי</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )

      case "list":
        return (
          <div className="space-y-4">
            {mockProducts.map((product) => (
              <div key={product.id} className="flex gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{product.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      ₪{product.price.toFixed(2)}
                    </span>
                    {product.comparePrice && (
                      <span className="text-sm text-gray-500 line-through">
                        ₪{product.comparePrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {product.availability === "OUT_OF_STOCK" && (
                    <span className="text-xs text-red-600 mt-1 block">אזל מהמלאי</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )

      case "compact-grid":
        return (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {mockProducts.map((product) => (
              <div key={product.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <h3 className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-gray-900">
                      ₪{product.price.toFixed(2)}
                    </span>
                    {product.comparePrice && (
                      <span className="text-xs text-gray-500 line-through">
                        ₪{product.comparePrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case "large-grid":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockProducts.map((product) => (
              <div key={product.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{product.name}</h3>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl font-bold text-gray-900">
                      ₪{product.price.toFixed(2)}
                    </span>
                    {product.comparePrice && (
                      <span className="text-base text-gray-500 line-through">
                        ₪{product.comparePrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {product.availability === "OUT_OF_STOCK" && (
                    <span className="text-sm text-red-600">אזל מהמלאי</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="right">
      <SheetContent onClose={() => onOpenChange(false)} className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>עיצוב עמוד קטגוריה</SheetTitle>
          <SheetDescription>
            בחר את תצוגת המוצרים הרצויה וצפה בתצוגה מקדימה
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {/* בחירת תצוגה מקדימה */}
          <div className="mb-6">
            <Label className="text-sm font-semibold mb-3 block">תצוגה מקדימה</Label>
            <div className="flex gap-2">
              <Button
                variant={previewMode === "desktop" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("desktop")}
                className="flex-1"
              >
                <Monitor className="w-4 h-4 ml-2" />
                מחשב
              </Button>
              <Button
                variant={previewMode === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("mobile")}
                className="flex-1"
              >
                <Smartphone className="w-4 h-4 ml-2" />
                מובייל
              </Button>
            </div>
          </div>

          {/* בחירת תצוגת מוצרים */}
          <div className="mb-6">
            <Label className="text-sm font-semibold mb-3 block">תצוגת מוצרים</Label>
            <RadioGroup value={layout} onValueChange={(value) => handleLayoutChange(value as CategoryLayout)}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="grid" id="grid" />
                  <Label htmlFor="grid" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Grid3x3 className="w-4 h-4" />
                      <span>רשת</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">תצוגת רשת סטנדרטית עם 4 עמודות</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="list" id="list" />
                  <Label htmlFor="list" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <List className="w-4 h-4" />
                      <span>רשימה</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">תצוגת רשימה עם תמונה משמאל ופרטים מימין</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="compact-grid" id="compact-grid" />
                  <Label htmlFor="compact-grid" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Grid3x3 className="w-4 h-4" />
                      <span>רשת צפופה</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">תצוגת רשת צפופה עם 6 עמודות</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="large-grid" id="large-grid" />
                  <Label htmlFor="large-grid" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Layout className="w-4 h-4" />
                      <span>רשת גדולה</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">תצוגת רשת גדולה עם 3 עמודות</p>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* תצוגה מקדימה */}
          <div className="mt-8">
            <Label className="text-sm font-semibold mb-3 block">תצוגה מקדימה</Label>
            <div
              className={cn(
                "border-2 border-gray-200 rounded-lg bg-white overflow-hidden",
                previewMode === "desktop" ? "max-w-2xl" : "max-w-sm mx-auto"
              )}
            >
              <div className="bg-gray-100 p-2 flex items-center gap-2 border-b">
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 text-center text-xs text-gray-600">
                  {previewMode === "desktop" ? "תצוגת מחשב" : "תצוגת מובייל"}
                </div>
              </div>
              <div className={cn("p-4", previewMode === "mobile" && "p-2")}>
                {/* כותרת קטגוריה */}
                <div className="mb-6 pb-4 border-b">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{mockCategory.name}</h1>
                  {mockCategory.description && (
                    <p className="text-sm text-gray-600 mb-2">{mockCategory.description}</p>
                  )}
                  <span className="text-xs text-gray-500">{mockCategory.productCount} מוצרים</span>
                </div>

                {/* מוצרים */}
                {renderProducts()}
              </div>
            </div>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

