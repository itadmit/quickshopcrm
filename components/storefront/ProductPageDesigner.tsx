"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Monitor, Smartphone, Layout, Image as ImageIcon, ChevronRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type GalleryLayout = "standard" | "right-side" | "left-side" | "masonry" | "fixed"

interface Product {
  id: string
  name: string
  slug: string
}

interface ProductPageDesignerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLayoutChange?: (layout: GalleryLayout) => void
  currentLayout?: GalleryLayout
  products?: Product[]
  selectedProductId?: string
  onProductChange?: (productId: string) => void
  onBack?: () => void
}

// מוצר דמה לתצוגה מקדימה
const mockProduct = {
  name: "כובע אדידס",
  description: "כובע אדידס קלאסי עם לוגו, מגן מפני השמש",
  price: 89.90,
  comparePrice: 129.90,
  images: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop",
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=800&fit=crop",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&h=800&fit=crop",
    "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop",
  ],
  availability: "IN_STOCK",
  inventoryQty: 20,
}

export function ProductPageDesigner({
  open,
  onOpenChange,
  onLayoutChange,
  currentLayout = "standard",
  products = [],
  selectedProductId,
  onProductChange,
  onBack,
}: ProductPageDesignerProps) {
  const [layout, setLayout] = useState<GalleryLayout>(currentLayout)
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const [selectedImage, setSelectedImage] = useState(0)
  const [productSearchQuery, setProductSearchQuery] = useState("")

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchQuery.toLowerCase())
  )

  // עדכון ה-layout כשהקומפוננטה נפתחת או כשה-currentLayout משתנה
  useEffect(() => {
    if (open && currentLayout) {
      setLayout(currentLayout)
    }
  }, [open, currentLayout])

  const handleLayoutChange = (newLayout: GalleryLayout) => {
    setLayout(newLayout)
    onLayoutChange?.(newLayout)
  }

  const renderGallery = () => {
    // אם זה מובייל בתצוגה מקדימה, נציג את התצוגה המובייל ישירות
    const isMobilePreview = previewMode === "mobile"
    
    switch (layout) {
      case "standard":
        return (
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              <img
                src={mockProduct.images[selectedImage]}
                alt={mockProduct.name}
                className="w-full h-full object-cover"
              />
            </div>
            {mockProduct.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {mockProduct.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      "aspect-square overflow-hidden rounded-lg border-2 transition-all",
                      selectedImage === index
                        ? "border-black ring-2 ring-black ring-offset-2"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <img
                      src={image}
                      alt={`${mockProduct.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )

      case "right-side":
        return (
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={mockProduct.images[selectedImage]}
                  alt={mockProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {mockProduct.images.length > 1 && (
              <div className="flex flex-col gap-2 w-20">
                {mockProduct.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      "aspect-square overflow-hidden rounded-lg border-2 transition-all",
                      selectedImage === index
                        ? "border-black ring-2 ring-black ring-offset-1"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <img
                      src={image}
                      alt={`${mockProduct.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )

      case "left-side":
        return (
          <div className="flex gap-4">
            {mockProduct.images.length > 1 && (
              <div className="flex flex-col gap-2 w-20">
                {mockProduct.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      "aspect-square overflow-hidden rounded-lg border-2 transition-all",
                      selectedImage === index
                        ? "border-black ring-2 ring-black ring-offset-1"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <img
                      src={image}
                      alt={`${mockProduct.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1">
              <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={mockProduct.images[selectedImage]}
                  alt={mockProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        )

      case "masonry":
        // אם זה מובייל בתצוגה מקדימה, נציג את התצוגה המובייל ישירות
        if (isMobilePreview) {
          return (
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide bg-white -mx-2 px-2">
              {mockProduct.images.map((image, index) => (
                <div 
                  key={index} 
                  className="flex-shrink-0 snap-center"
                  style={{ 
                    width: 'calc(100% - 0.3125rem)',
                    minWidth: 'calc(100% - 0.3125rem)',
                    marginRight: index < mockProduct.images.length - 1 ? '5px' : '0'
                  }}
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={image}
                      alt={`${mockProduct.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        }
        
        return (
          <>
            {/* Desktop - תצוגה אנכית */}
            <div className="hidden lg:block space-y-2">
              {mockProduct.images.map((image, index) => {
                // תמונות גדולות באינדקסים 0, 3, 6, 9... (כל 3 תמונות)
                const isLarge = index % 3 === 0
                
                if (isLarge) {
                  // תמונה גדולה על כל הרוחב
                  return (
                    <div key={index} className="w-full">
                      <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                        <img
                          src={image}
                          alt={`${mockProduct.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )
                } else {
                  // תמונות קטנות - נצטרך לקבץ אותן ב-2
                  const groupIndex = Math.floor((index - 1) / 3)
                  const positionInGroup = (index - 1) % 3
                  
                  // אם זו התמונה הראשונה בקבוצה של 2 קטנות, ניצור את הקונטיינר
                  if (positionInGroup === 0) {
                    const nextImage = mockProduct.images[index + 1]
                    return (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                          <img
                            src={image}
                            alt={`${mockProduct.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {nextImage && (
                          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                            <img
                              src={nextImage}
                              alt={`${mockProduct.name} ${index + 2}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )
                  }
                  // אם זו התמונה השנייה בקבוצה, נדלג (כי כבר רינדרנו אותה עם הראשונה)
                  return null
                }
              })}
            </div>
            {/* Mobile - סלידר אופקי עם רווח של 5px לבן */}
            <div className="lg:hidden flex overflow-x-auto snap-x snap-mandatory scrollbar-hide bg-white -mx-4 px-4">
              {mockProduct.images.map((image, index) => (
                <div 
                  key={index} 
                  className="flex-shrink-0 snap-center"
                  style={{ 
                    width: 'calc(100vw - 2rem - 5px)',
                    marginRight: index < mockProduct.images.length - 1 ? '5px' : '0'
                  }}
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={image}
                      alt={`${mockProduct.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )

      case "fixed":
        // אם זה מובייל בתצוגה מקדימה, נציג את התצוגה המובייל ישירות
        if (isMobilePreview) {
          return (
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {mockProduct.images.map((image, index) => (
                <div key={index} className="flex-shrink-0 w-full snap-center">
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={image}
                      alt={`${mockProduct.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        }
        
        return (
          <>
            {/* Desktop - תצוגה אנכית */}
            <div className="hidden lg:block space-y-4">
              {mockProduct.images.map((image, index) => (
                <div key={index} className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={image}
                    alt={`${mockProduct.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            {/* Mobile - סלידר אופקי ללא רווח */}
            <div className="lg:hidden flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {mockProduct.images.map((image, index) => (
                <div key={index} className="flex-shrink-0 w-full snap-center">
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={image}
                      alt={`${mockProduct.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="right">
      <SheetContent onClose={() => onOpenChange(false)} className="w-full sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <SheetTitle>עיצוב דף מוצר</SheetTitle>
              <SheetDescription>
                בחר את תצוגת הגלריה הרצויה וצפה בתצוגה מקדימה
              </SheetDescription>
            </div>
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="mr-2"
              >
                <ChevronRight className="w-4 h-4 ml-2" />
                חזור
              </Button>
            )}
          </div>
        </SheetHeader>

        <SheetBody>
          {/* בחירת מוצר */}
          {products.length > 0 && onProductChange && (
            <div className="mb-6 pb-6 border-b">
              <Label className="text-sm font-semibold mb-3 block">החלף מוצר</Label>
              <div className="relative mb-3">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="חפש מוצר..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              {filteredProducts.length > 0 ? (
                <Select value={selectedProductId} onValueChange={onProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מוצר" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">לא נמצאו מוצרים</p>
              )}
            </div>
          )}
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

          {/* בחירת תצוגת גלריה */}
          <div className="mb-6">
            <Label className="text-sm font-semibold mb-3 block">תצוגת גלריה</Label>
            <RadioGroup value={layout} onValueChange={(value) => handleLayoutChange(value as GalleryLayout)}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="standard" id="standard" />
                  <Label htmlFor="standard" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Layout className="w-4 h-4" />
                      <span>סטנדרט</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">תמונה גדולה ומתחת טאמבניילס</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="right-side" id="right-side" />
                  <Label htmlFor="right-side" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      <span>צידי ימין</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">תמונה גדולה והתמונות הממוזערות מימין</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="left-side" id="left-side" />
                  <Label htmlFor="left-side" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      <span>צידי שמאל</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">תמונה גדולה והתמונות הממוזערות משמאל</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="masonry" id="masonry" />
                  <Label htmlFor="masonry" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Layout className="w-4 h-4" />
                      <span>תפזורת</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">תמונות מימין (אחת גדולה, 2 קטנות מתחת, וכו) והמלל משמאל סטיקי</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Layout className="w-4 h-4" />
                      <span>קבוע</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">המלל סטיקי והתמונות אחת אחרי השנייה באותו גודל</p>
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
                <div className={cn(
                  "grid gap-6",
                  previewMode === "desktop" 
                    ? layout === "masonry" || layout === "fixed"
                      ? "grid-cols-2"
                      : "grid-cols-2"
                    : "grid-cols-1"
                )}>
                  {/* גלריה */}
                  <div className={cn(
                    previewMode === "mobile" 
                      ? "order-1"
                      : layout === "masonry" || layout === "fixed" 
                        ? "order-2" 
                        : ""
                  )}>
                    {renderGallery()}
                  </div>

                  {/* פרטי מוצר */}
                  <div className={cn(
                    "space-y-4",
                    previewMode === "mobile"
                      ? "order-2"
                      : layout === "masonry" || layout === "fixed" 
                        ? "order-1 sticky top-4 h-fit" 
                        : ""
                  )}>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">{mockProduct.name}</h1>
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-2xl font-bold text-gray-900">
                          ₪{mockProduct.price.toFixed(2)}
                        </span>
                        {mockProduct.comparePrice && (
                          <span className="text-lg text-gray-500 line-through">
                            ₪{mockProduct.comparePrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {mockProduct.description && (
                      <div>
                        <p className="text-gray-700 text-sm">{mockProduct.description}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">כמות</label>
                      <div className="flex items-center gap-2 w-fit">
                        <button className="px-3 py-1 border rounded">-</button>
                        <input
                          type="number"
                          value="1"
                          readOnly
                          className="w-16 text-center border rounded"
                        />
                        <button className="px-3 py-1 border rounded">+</button>
                        <span className="text-sm text-gray-500">(זמין: {mockProduct.inventoryQty})</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button className="w-full bg-black text-white py-2 rounded text-sm font-medium">
                        הוסף לעגלה
                      </button>
                      <button className="w-full border-2 border-black py-2 rounded text-sm font-medium">
                        קנה עכשיו
                      </button>
                    </div>
                  </div>
                </div>
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

