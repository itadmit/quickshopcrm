"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Button } from "@/components/ui/button"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { ProductFormSkeleton } from "@/components/skeletons/ProductFormSkeleton"
import { Save, Eye } from "lucide-react"

// Import all the new shared components
import { BasicInfoCard } from "@/components/products/BasicInfoCard"
import { MediaCard } from "@/components/products/MediaCard"
import { PricingCard } from "@/components/products/PricingCard"
import { InventoryCard } from "@/components/products/InventoryCard"
import { ShippingCard } from "@/components/products/ShippingCard"
import { StatusCard } from "@/components/products/StatusCard"
import { ProductDetailsCard } from "@/components/products/ProductDetailsCard"
import { TagsCard } from "@/components/products/TagsCard"
import { SEOCard } from "@/components/products/SEOCard"
import { CategoriesCard } from "@/components/products/CategoriesCard"
import { CustomFieldsCard } from "@/components/products/CustomFieldsCard"
import { ProductAddonsCard } from "@/components/products/ProductAddonsCard"
import { VariantsCard } from "@/components/products/VariantsCard"
import { BadgesCard } from "@/components/products/BadgesCard"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Image as ImageIcon } from "lucide-react"

interface Shop {
  id: string
  name: string
}

export default function NewProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { selectedShop, loading: shopsLoading } = useShop()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    sku: "",
    price: "",
    comparePrice: "",
    cost: "",
    taxEnabled: true,
    inventoryEnabled: true,
    inventoryQty: "",
    lowStockAlert: "",
    availability: "IN_STOCK" as "IN_STOCK" | "OUT_OF_STOCK" | "PRE_ORDER" | "BACKORDER" | "DISCONTINUED",
    availableDate: "",
    trackInventory: true,
    sellWhenSoldOut: false,
    priceByWeight: false,
    showPricePer100ml: false,
    pricePer100ml: "",
    weight: "",
    dimensions: {
      length: "",
      width: "",
      height: "",
    },
    status: "DRAFT" as "DRAFT" | "PUBLISHED" | "ARCHIVED",
    scheduledPublishDate: "",
    notifyOnPublish: false,
    images: [] as string[],
    video: "",
    minQuantity: "",
    maxQuantity: "",
    seoTitle: "",
    seoDescription: "",
    tags: [] as string[],
    categories: [] as string[],
    badges: [] as any[],
  })

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})
  const [productAddonIds, setProductAddonIds] = useState<string[]>([])
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  
  // Variants state
  const [hasVariants, setHasVariants] = useState(false)
  const [options, setOptions] = useState<Array<{ id: string; name: string; type: "button" | "color" | "image" | "pattern"; values: any[] }>>([])
  const [variants, setVariants] = useState<Array<{
    id: string
    name: string
    price: string
    comparePrice: string
    cost: string
    sku: string
    barcode: string
    weight: string
    inventoryQty: string
    image: string
    optionValues: Record<string, string>
  }>>([])
  const [defaultVariantId, setDefaultVariantId] = useState<string | null>(null)

  // Memoized callbacks
  const handleCustomFieldsChange = useCallback((values: Record<string, any>) => {
    setCustomFieldValues(values)
  }, [])

  const handleProductAddonsChange = useCallback((addonIds: string[]) => {
    setProductAddonIds(addonIds)
  }, [])

  useEffect(() => {
    if (!shopsLoading) {
        setLoading(false)
    }
  }, [shopsLoading])

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\u0590-\u05FFa-zA-Z0-9\-]+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name)
    }))
  }

  const handleMediaSelect = (files: string[]) => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }))
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "שם המוצר הוא שדה חובה",
        variant: "destructive",
      })
      return
    }

    if (!selectedShop) {
      toast({
        title: "שגיאה",
        description: "יש לבחור חנות",
        variant: "destructive",
      })
      return
    }

    if (!hasVariants && (!formData.price || parseFloat(formData.price) < 0)) {
      toast({
        title: "שגיאה",
        description: "מחיר חייב להיות מספר חיובי",
        variant: "destructive",
      })
      return
    }

    try {
    setSaving(true)

      // טיפול בערכי מספרים - מניעת NaN
      const safeParseInt = (value: string) => {
        if (!value || !value.trim()) return null
        const parsed = parseInt(value)
        return isNaN(parsed) ? null : parsed
      }
      
      const safeParseFloat = (value: string) => {
        if (!value || !value.trim()) return null
        const parsed = parseFloat(value)
        return isNaN(parsed) ? null : parsed
      }
      
      const inventoryQtyValue = hasVariants ? 0 : (safeParseInt(formData.inventoryQty) ?? 0)
      const lowStockAlertValue = safeParseInt(formData.lowStockAlert)
      const minQuantityValue = safeParseInt(formData.minQuantity)
      const maxQuantityValue = safeParseInt(formData.maxQuantity)
      const pricePer100mlValue = safeParseFloat(formData.pricePer100ml)
      const weightValue = safeParseFloat(formData.weight)

      const payload: any = {
        shopId: selectedShop.id,
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        price: hasVariants ? 0 : (safeParseFloat(formData.price) ?? 0),
        taxEnabled: formData.taxEnabled,
        inventoryEnabled: formData.inventoryEnabled,
        inventoryQty: inventoryQtyValue,
        availability: formData.availability,
        trackInventory: formData.trackInventory,
        sellWhenSoldOut: formData.sellWhenSoldOut,
        priceByWeight: formData.priceByWeight,
        showPricePer100ml: formData.showPricePer100ml,
        status: formData.status,
        notifyOnPublish: formData.notifyOnPublish,
        images: formData.images,
        tags: formData.tags,
        categories: formData.categories,
        customFields: customFieldValues,
        addonIds: productAddonIds,
        defaultVariantId: defaultVariantId,
      }

      // הוסף שדות אופציונליים רק אם יש להם ערך
      if (formData.description && formData.description.trim()) {
        payload.description = formData.description
      }
      if (formData.sku && formData.sku.trim()) {
        payload.sku = formData.sku
      }
      if (formData.video && formData.video.trim()) {
        payload.video = formData.video
      }
      if (formData.seoTitle && formData.seoTitle.trim()) {
        payload.seoTitle = formData.seoTitle
      }
      if (formData.seoDescription && formData.seoDescription.trim()) {
        payload.seoDescription = formData.seoDescription
      }
      if (formData.scheduledPublishDate && formData.scheduledPublishDate.trim()) {
        payload.scheduledPublishDate = new Date(formData.scheduledPublishDate).toISOString()
      }
      if (formData.availableDate && formData.availableDate.trim()) {
        payload.availableDate = new Date(formData.availableDate).toISOString()
      }
      if (formData.badges && formData.badges.length > 0) {
        payload.badges = formData.badges
      }
      if (!hasVariants) {
        const comparePrice = safeParseFloat(formData.comparePrice)
        if (comparePrice !== null && comparePrice !== undefined) {
          payload.comparePrice = comparePrice
        }
        const cost = safeParseFloat(formData.cost)
        if (cost !== null && cost !== undefined) {
          payload.cost = cost
        }
      }
      if (lowStockAlertValue !== null && lowStockAlertValue !== undefined) {
        payload.lowStockAlert = lowStockAlertValue
      }
      if (minQuantityValue !== null && minQuantityValue !== undefined) {
        payload.minQuantity = minQuantityValue
      }
      if (maxQuantityValue !== null && maxQuantityValue !== undefined) {
        payload.maxQuantity = maxQuantityValue
      }
      if (pricePer100mlValue !== null && pricePer100mlValue !== undefined) {
        payload.pricePer100ml = pricePer100mlValue
      }
      if (weightValue !== null && weightValue !== undefined) {
        payload.weight = weightValue
      }
      const dimLength = safeParseFloat(formData.dimensions.length)
      const dimWidth = safeParseFloat(formData.dimensions.width)
      const dimHeight = safeParseFloat(formData.dimensions.height)
      if (dimLength !== null || dimWidth !== null || dimHeight !== null) {
        payload.dimensions = {
          length: dimLength,
          width: dimWidth,
          height: dimHeight,
        }
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const product = await response.json()
        
        // אם יש variants, צור אותם בנפרד
        if (hasVariants && variants.length > 0 && options.length > 0) {
          try {
            // צור options קודם
            const optionPromises = options.map(async (option, i) => {
              // המרת values לפורמט הנכון
              const formattedValues = option.values.map((value: any) => {
                if (typeof value === 'string') {
                  return { id: value, label: value }
                }
                return {
                  id: value.id || String(value),
                  label: value.label || value.id || String(value),
                  metadata: value.metadata || {}
                }
              })
              
              const optionResponse = await fetch(`/api/products/${product.id}/options`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: option.name,
                  type: option.type || "button",
                  values: formattedValues,
                  position: i,
                }),
              })
              
              if (!optionResponse.ok) {
                const error = await optionResponse.json()
                throw new Error(`שגיאה ביצירת אפשרות ${option.name}: ${error.error || 'שגיאה לא ידועה'}`)
              }
              
              return await optionResponse.json()
            })
            
            await Promise.all(optionPromises)
            
            // צור variants
            const variantPromises = variants.map(async (variant) => {
              // המרת optionValues לפורמט option1/option1Value וכו'
              const optionEntries = Object.entries(variant.optionValues || {})
              const variantPayload: any = {
                name: variant.name,
                inventoryQty: safeParseInt(variant.inventoryQty) ?? 0,
              }
              
              // הוסף שדות רק אם יש להם ערך
              const price = safeParseFloat(variant.price)
              if (price !== null && price !== undefined) {
                variantPayload.price = price
              }
              
              const comparePrice = safeParseFloat(variant.comparePrice)
              if (comparePrice !== null && comparePrice !== undefined) {
                variantPayload.comparePrice = comparePrice
              }
              
              const cost = safeParseFloat(variant.cost)
              if (cost !== null && cost !== undefined) {
                variantPayload.cost = cost
              }
              
              if (variant.sku && variant.sku.trim()) {
                variantPayload.sku = variant.sku
              }
              
              if (variant.barcode && variant.barcode.trim()) {
                variantPayload.barcode = variant.barcode
              }
              
              const weight = safeParseFloat(variant.weight)
              if (weight !== null && weight !== undefined) {
                variantPayload.weight = weight
              }
              
              if (variant.image && variant.image.trim()) {
                variantPayload.image = variant.image
              }
              
              // המרת optionValues לפורמט הנכון
              optionEntries.forEach(([optionName, optionValue], index) => {
                if (index < 3 && optionValue) { // רק 3 options נתמכים
                  variantPayload[`option${index + 1}`] = optionName
                  variantPayload[`option${index + 1}Value`] = String(optionValue)
                }
              })
              
              const variantResponse = await fetch(`/api/products/${product.id}/variants`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(variantPayload),
              })
              
              if (!variantResponse.ok) {
                const error = await variantResponse.json()
                throw new Error(`שגיאה ביצירת וריאציה ${variant.name}: ${error.error || 'שגיאה לא ידועה'}`)
              }
              
              return await variantResponse.json()
            })
            
            await Promise.all(variantPromises)
            
            toast({
              title: "הצלחה",
              description: "המוצר והוריאציות נוצרו בהצלחה",
            })
          } catch (variantError: any) {
            console.error("Error creating variants:", variantError)
            toast({
              title: "אזהרה",
              description: `המוצר נוצר אבל הייתה בעיה ביצירת הוריאציות: ${variantError.message || 'שגיאה לא ידועה'}`,
              variant: "destructive",
            })
          }
        } else {
          toast({
            title: "הצלחה",
            description: "המוצר נוצר בהצלחה",
          })
        }
        
        router.push(`/products/${product.slug}/edit`)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה ביצירת המוצר",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת המוצר",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || shopsLoading) {
    return (
      <AppLayout title="מוצר חדש">
        <ProductFormSkeleton />
      </AppLayout>
    )
  }

  if (!selectedShop) {
    return (
      <AppLayout title="מוצר חדש">
        <div className="text-center py-12">
          <p className="text-gray-500">אנא בחר חנות כדי להמשיך</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="מוצר חדש">
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">מוצר חדש</h1>
            <p className="text-sm md:text-base text-gray-600">צור מוצר חדש לחנות {selectedShop.name}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              className="flex-1 md:flex-none"
            >
              ביטול
            </Button>
            <Button
              onClick={handleSubmit} 
              disabled={saving}
              className="prodify-gradient text-white flex-1 md:flex-none"
            >
              <Save className="w-4 h-4 ml-2" />
              {saving ? "שומר..." : "פרסם"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <BasicInfoCard
              data={{
                name: formData.name,
                description: formData.description,
              }}
              onNameChange={handleNameChange}
              onDescriptionChange={(description) => 
                setFormData(prev => ({ ...prev, description }))
              }
            />

            {/* Media */}
            <MediaCard
              images={formData.images}
              shopId={selectedShop.id}
                  entityId="new"
              onSelect={handleMediaSelect}
              onRemove={removeImage}
              mediaPickerOpen={mediaPickerOpen}
              onMediaPickerChange={setMediaPickerOpen}
            />

            {/* Pricing */}
            <PricingCard
              data={{
                price: formData.price,
                comparePrice: formData.comparePrice,
                cost: formData.cost,
                taxEnabled: formData.taxEnabled,
              }}
              onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
              hidden={hasVariants}
            />

            {/* Inventory */}
            <InventoryCard
              data={{
                inventoryEnabled: formData.inventoryEnabled,
                inventoryQty: formData.inventoryQty,
                lowStockAlert: formData.lowStockAlert,
                availability: formData.availability,
                availableDate: formData.availableDate,
                trackInventory: formData.trackInventory,
                sellWhenSoldOut: formData.sellWhenSoldOut,
                priceByWeight: formData.priceByWeight,
                showPricePer100ml: formData.showPricePer100ml,
                pricePer100ml: formData.pricePer100ml,
              }}
              onChange={(data) => setFormData(prev => ({ ...prev, ...data as any }))}
              hidden={hasVariants}
            />

            {/* Variants & Options */}
            <VariantsCard
              enabled={hasVariants}
              options={options}
              variants={variants}
              defaultVariantId={defaultVariantId}
              onEnabledChange={setHasVariants}
              onOptionsChange={setOptions}
              onVariantsChange={setVariants}
              onDefaultVariantChange={setDefaultVariantId}
            />

            {/* Product Add-ons */}
            {selectedShop && (
              <ProductAddonsCard
                shopId={selectedShop.id}
                categoryIds={formData.categories}
                onChange={handleProductAddonsChange}
              />
            )}

            {/* Custom Fields */}
            {selectedShop && (
              <CustomFieldsCard
                shopId={selectedShop.id}
                categoryIds={formData.categories}
                values={customFieldValues}
                onChange={handleCustomFieldsChange}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  תצוגה מקדימה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.images && formData.images.length > 0 ? (
                  <div className="w-full h-48 bg-gray-50 rounded-lg flex items-center justify-center p-4">
                    <img
                      src={formData.images[0]}
                      alt={formData.name || "תצוגה מקדימה"}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    {formData.name || "שם מוצר"}
                  </h3>
                  {!hasVariants && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl font-bold text-emerald-600">
                      ₪{formData.price ? parseFloat(formData.price).toFixed(2) : "0.00"}
                    </span>
                    {formData.comparePrice && (
                      <span className="text-sm text-gray-500 line-through">
                        ₪{parseFloat(formData.comparePrice).toFixed(2)}
                      </span>
                    )}
                  </div>
                  )}
                  {hasVariants && (
                    <p className="text-sm text-emerald-600 font-medium mb-2">
                      מחיר משתנה לפי וריאציה
                    </p>
                  )}
                  {formData.description && (
                    <div 
                      className="text-sm text-gray-600 line-clamp-3 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: formData.description }}
                    />
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <StatusCard
              status={formData.status}
              onChange={(status) => setFormData(prev => ({ ...prev, status }))}
              scheduledPublishDate={formData.scheduledPublishDate}
              onScheduledPublishDateChange={(date) => setFormData(prev => ({ ...prev, scheduledPublishDate: date }))}
              notifyOnPublish={formData.notifyOnPublish}
              onNotifyOnPublishChange={(notify) => setFormData(prev => ({ ...prev, notifyOnPublish: notify }))}
            />

            {/* Categories */}
            <CategoriesCard
              selectedCategories={formData.categories}
              onChange={(categories) => setFormData(prev => ({ ...prev, categories }))}
              shopId={selectedShop.id}
            />

            {/* Product Details */}
            <ProductDetailsCard
              data={{
                sku: formData.sku,
                minQuantity: formData.minQuantity,
                maxQuantity: formData.maxQuantity,
                video: formData.video,
              }}
              onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
            />

            {/* Shipping */}
            <ShippingCard
              data={{
                weight: formData.weight,
                dimensions: formData.dimensions,
              }}
              onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
            />

            {/* Tags */}
            <TagsCard
              tags={formData.tags}
              onAdd={(tag) => {
                if (!formData.tags.includes(tag)) {
                  setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
                }
              }}
              onRemove={(tag) => 
                setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
              }
            />

            {/* Badges */}
            <BadgesCard
              badges={formData.badges}
              onChange={(badges) => setFormData(prev => ({ ...prev, badges }))}
            />

            {/* SEO */}
            <SEOCard
              data={{
                seoTitle: formData.seoTitle,
                slug: formData.slug,
                seoDescription: formData.seoDescription,
              }}
              onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
            />
          </div>
        </div>

        {/* Sticky Save Button - Mobile Only */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-4 shadow-lg">
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full prodify-gradient text-white h-12"
          >
            <Save className="w-4 h-4 ml-2" />
            {saving ? "שומר..." : "פרסם מוצר"}
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}

