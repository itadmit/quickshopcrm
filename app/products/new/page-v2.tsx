"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Button } from "@/components/ui/button"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
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
import { CustomFieldsCard } from "@/components/products/CustomFieldsCard"
import { ProductAddonsCard } from "@/components/products/ProductAddonsCard"
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
    weight: "",
    dimensions: {
      length: "",
      width: "",
      height: "",
    },
    status: "DRAFT" as "DRAFT" | "PUBLISHED" | "ARCHIVED",
    images: [] as string[],
    video: "",
    minQuantity: "",
    maxQuantity: "",
    seoTitle: "",
    seoDescription: "",
    tags: [] as string[],
    categories: [] as string[],
  })

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})
  const [productAddonIds, setProductAddonIds] = useState<string[]>([])
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [hasVariants, setHasVariants] = useState(false)

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

      const payload = {
        shopId: selectedShop.id,
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description || null,
        sku: formData.sku || null,
        price: hasVariants ? 0 : parseFloat(formData.price),
        comparePrice: hasVariants ? undefined : (formData.comparePrice ? parseFloat(formData.comparePrice) : undefined),
        cost: hasVariants ? undefined : (formData.cost ? parseFloat(formData.cost) : undefined),
        taxEnabled: formData.taxEnabled,
        inventoryEnabled: formData.inventoryEnabled,
        inventoryQty: hasVariants ? 0 : (formData.inventoryQty ? parseInt(formData.inventoryQty) : 0),
        lowStockAlert: formData.lowStockAlert ? parseInt(formData.lowStockAlert) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        dimensions: {
          length: formData.dimensions.length || null,
          width: formData.dimensions.width || null,
          height: formData.dimensions.height || null,
        },
        status: formData.status,
        images: formData.images,
        video: formData.video || null,
        minQuantity: formData.minQuantity ? parseInt(formData.minQuantity) : null,
        maxQuantity: formData.maxQuantity ? parseInt(formData.maxQuantity) : null,
        seoTitle: formData.seoTitle || null,
        seoDescription: formData.seoDescription || null,
        tags: formData.tags,
        categories: formData.categories,
        customFields: customFieldValues,
        addonIds: productAddonIds,
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const product = await response.json()
        toast({
          title: "הצלחה",
          description: "המוצר נוצר בהצלחה",
        })
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
        <FormSkeleton />
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">מוצר חדש</h1>
            <p className="text-gray-600">צור מוצר חדש לחנות {selectedShop.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              ביטול
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={saving}
              className="prodify-gradient text-white"
            >
              <Save className="w-4 h-4 ml-2" />
              {saving ? "שומר..." : "פרסם מוצר"}
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
              }}
              onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
              hidden={hasVariants}
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
                      <span className="text-xl font-bold text-purple-600">
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
                    <p className="text-sm text-purple-600 font-medium mb-2">
                      מחיר משתנה לפי וריאציה
                    </p>
                  )}
                  {formData.description && (
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {formData.description}
                    </p>
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
      </div>
    </AppLayout>
  )
}

