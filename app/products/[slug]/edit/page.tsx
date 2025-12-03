"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Button } from "@/components/ui/button"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { ProductFormSkeleton } from "@/components/skeletons/ProductFormSkeleton"
import { Save, Eye, ExternalLink, Layout } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { getShopProductUrl } from "@/lib/utils"

// Import all the shared components
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
import { PremiumClubCard } from "@/components/products/PremiumClubCard"

interface Product {
  id: string
  shopId: string
  name: string
  slug: string
  description: string | null
  sku: string | null
  price: number
  comparePrice: number | null
  cost: number | null
  taxEnabled: boolean
  inventoryEnabled: boolean
  inventoryQty: number
  lowStockAlert: number | null
  weight: number | null
  dimensions: any
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  images: string[]
  video: string | null
  minQuantity: number | null
  maxQuantity: number | null
  availability: string
  availableDate: string | null
  seoTitle: string | null
  seoDescription: string | null
  tags: Array<{ name: string }>
  categories: Array<{ category: { id: string; name: string } }>
  shop?: {
    id: string
    name: string
    slug: string
    domain?: string | null
  }
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const productSlug = params.slug as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  
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
    pageTemplateId: "",
    exclusiveToTier: [] as string[],
  })

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})
  const [productAddonIds, setProductAddonIds] = useState<string[]>([])
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([])
  
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
    if (productSlug) {
      fetchProduct()
    }
  }, [productSlug])

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/products/${productSlug}`)
      if (response.ok) {
        const data = await response.json()
        setProduct(data)
        
        // טעינת defaultVariantId
        setDefaultVariantId(data.defaultVariantId || null)
        
        // Format availableDate for datetime-local input
        let availableDateFormatted = ""
        if (data.availableDate) {
          const date = new Date(data.availableDate)
          availableDateFormatted = date.toISOString().slice(0, 16)
        }

        setFormData({
          name: data.name || "",
          slug: data.slug || "",
          description: data.description || "",
          sku: data.sku || "",
          price: data.price?.toString() || "",
          comparePrice: data.comparePrice?.toString() || "",
          cost: data.cost?.toString() || "",
          taxEnabled: data.taxEnabled ?? true,
          inventoryEnabled: data.inventoryEnabled ?? true,
          inventoryQty: data.inventoryQty?.toString() || "",
          lowStockAlert: data.lowStockAlert?.toString() || "",
          availability: data.availability || "IN_STOCK",
          availableDate: availableDateFormatted,
          sellWhenSoldOut: data.sellWhenSoldOut ?? false,
          priceByWeight: data.priceByWeight ?? false,
          showPricePer100ml: data.showPricePer100ml ?? false,
          pricePer100ml: data.pricePer100ml?.toString() || "",
          weight: data.weight?.toString() || "",
          dimensions: {
            length: data.dimensions?.length?.toString() || "",
            width: data.dimensions?.width?.toString() || "",
            height: data.dimensions?.height?.toString() || "",
          },
          status: data.status || "DRAFT",
          scheduledPublishDate: data.scheduledPublishDate ? new Date(data.scheduledPublishDate).toISOString().slice(0, 16) : "",
          notifyOnPublish: data.notifyOnPublish || false,
          images: data.images || [],
          video: data.video || "",
          minQuantity: data.minQuantity?.toString() || "",
          maxQuantity: data.maxQuantity?.toString() || "",
          seoTitle: data.seoTitle || "",
          seoDescription: data.seoDescription || "",
          tags: Array.isArray(data.tags) ? data.tags.map((t: any) => (typeof t === 'string' ? t : t.name)) : [],
          categories: data.categories?.map((c: any) => c.categoryId) || [],
          badges: Array.isArray(data.badges) ? data.badges : [],
          pageTemplateId: data.pageTemplateId || "",
          exclusiveToTier: Array.isArray(data.exclusiveToTier) ? data.exclusiveToTier : [],
        })
        
        // טעינת תבניות זמינות
        if (data.shop?.slug) {
          const templatesRes = await fetch(`/api/storefront/${data.shop.slug}/product-page-templates`)
          if (templatesRes.ok) {
            const templatesData = await templatesRes.json()
            setTemplates(templatesData.templates || [])
          }
        }

        // Fetch options and variants
        const [optionsRes, variantsRes] = await Promise.all([
          fetch(`/api/products/${productSlug}/options`),
          fetch(`/api/products/${productSlug}/variants`),
        ])

        if (optionsRes.ok) {
          const optionsData = await optionsRes.json()
          if (optionsData.length > 0) {
            setHasVariants(true)
            const formattedOptions = optionsData.map((opt: any) => ({
              id: opt.id,
              name: opt.name,
              type: opt.type || "button",
              values: opt.values || [],
            }))
            setOptions(formattedOptions)
          }
        }

        if (variantsRes.ok) {
          const variantsData = await variantsRes.json()
          if (variantsData.length > 0) {
            const formattedVariants = variantsData.map((v: any) => ({
              id: v.id,
              name: v.name,
              price: v.price?.toString() || "",
              comparePrice: v.comparePrice?.toString() || "",
              cost: v.cost?.toString() || "",
              sku: v.sku || "",
              barcode: v.barcode || "",
              weight: v.weight?.toString() || "",
              inventoryQty: v.inventoryQty?.toString() || "",
              image: v.image || "",
              optionValues: v.optionValues || {},
            }))
            setVariants(formattedVariants)
          }
        }
      } else {
        toast({
          title: "שגיאה",
          description: "המוצר לא נמצא",
          variant: "destructive",
        })
        router.push("/products")
      }
    } catch (error) {
      console.error("Error fetching product:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת המוצר",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

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
      // Don't auto-generate slug on edit if it already has one
    }))
  }

  const handleMediaSelect = (files: string[]) => {
    setFormData(prev => {
      // הוסף רק תמונות שלא קיימות כבר
      const existingImages = new Set(prev.images)
      const newImages = files.filter(file => !existingImages.has(file))
      return {
        ...prev,
        images: [...prev.images, ...newImages]
      }
    })
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleReorderImages = (newOrder: string[]) => {
    setFormData(prev => ({
      ...prev,
      images: newOrder
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

    if (!product) {
      toast({
        title: "שגיאה",
        description: "לא נמצא מוצר לעדכון",
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
        shopId: product.shopId,
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
        availability: formData.availability,
        availableDate: formData.availableDate || null,
        sellWhenSoldOut: formData.sellWhenSoldOut,
        priceByWeight: formData.priceByWeight,
        showPricePer100ml: formData.showPricePer100ml,
        pricePer100ml: formData.pricePer100ml ? parseFloat(formData.pricePer100ml) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        dimensions: {
          length: formData.dimensions.length || null,
          width: formData.dimensions.width || null,
          height: formData.dimensions.height || null,
        },
        status: formData.status,
        scheduledPublishDate: formData.scheduledPublishDate ? new Date(formData.scheduledPublishDate).toISOString() : null,
        notifyOnPublish: formData.notifyOnPublish,
        images: formData.images,
        video: formData.video || null,
        minQuantity: formData.minQuantity ? parseInt(formData.minQuantity) : null,
        maxQuantity: formData.maxQuantity ? parseInt(formData.maxQuantity) : null,
        seoTitle: formData.seoTitle || null,
        seoDescription: formData.seoDescription || null,
        tags: formData.tags,
        categories: formData.categories,
        customFields: customFieldValues,
        badges: formData.badges,
        addonIds: productAddonIds,
        pageTemplateId: formData.pageTemplateId || null,
        defaultVariantId: defaultVariantId,
        exclusiveToTier: formData.exclusiveToTier,
      }

      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        // אם יש variants, סנכרן אותם עם השרת
        if (hasVariants && options.length > 0) {
          try {
            // קבל את כל האפשרויות והוריאציות הקיימות מהשרת
            const [existingOptionsRes, existingVariantsRes] = await Promise.all([
              fetch(`/api/products/${product.id}/options`),
              fetch(`/api/products/${product.id}/variants`),
            ])

            const existingOptions = existingOptionsRes.ok ? await existingOptionsRes.json() : []
            const existingVariants = existingVariantsRes.ok ? await existingVariantsRes.json() : []

            // מחק אפשרויות שלא קיימות יותר
            const optionsToDelete = existingOptions.filter((existingOpt: any) => 
              !options.some(opt => opt.id === existingOpt.id)
            )
            
            await Promise.all(
              optionsToDelete.map((opt: any) =>
                fetch(`/api/products/${product.id}/options/${opt.id}`, { method: "DELETE" })
              )
            )

            // עדכן או צור אפשרויות
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

            await Promise.all(
              options.map(async (option, i) => {
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

                const optionPayload = {
                  name: option.name,
                  type: (option as any).type || "button",
                  values: formattedValues,
                  position: i,
                }

                // בדוק אם זה ID אמיתי מהשרת (מתחיל עם 'clxxxx') או ID זמני
                const isExistingOption = option.id && !option.id.startsWith('option-')
                
                if (isExistingOption) {
                  // עדכן אפשרות קיימת
                  await fetch(`/api/products/${product.id}/options/${option.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(optionPayload),
                  })
                } else {
                  // צור אפשרות חדשה
                  await fetch(`/api/products/${product.id}/options`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(optionPayload),
                  })
                }
              })
            )

            // מחק וריאציות שלא קיימות יותר
            const variantsToDelete = existingVariants.filter((existingVar: any) => 
              !variants.some(v => v.id === existingVar.id)
            )
            
            await Promise.all(
              variantsToDelete.map((v: any) =>
                fetch(`/api/products/${product.id}/variants/${v.id}`, { method: "DELETE" })
              )
            )

            // עדכן או צור וריאציות
            await Promise.all(
              variants.map(async (variant) => {
                const optionEntries = Object.entries(variant.optionValues || {})
                const variantPayload: any = {
                  name: variant.name,
                  inventoryQty: safeParseInt(variant.inventoryQty) ?? 0,
                }

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
                  if (index < 3 && optionValue) {
                    variantPayload[`option${index + 1}`] = optionName
                    variantPayload[`option${index + 1}Value`] = String(optionValue)
                  }
                })

                // בדוק אם זה ID אמיתי מהשרת או ID זמני
                const isExistingVariant = variant.id && !variant.id.startsWith('variant-')
                
                if (isExistingVariant) {
                  // עדכן וריאציה קיימת
                  await fetch(`/api/products/${product.id}/variants/${variant.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(variantPayload),
                  })
                } else {
                  // צור וריאציה חדשה
                  await fetch(`/api/products/${product.id}/variants`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(variantPayload),
                  })
                }
              })
            )
          } catch (variantsError) {
            console.error("Error syncing variants:", variantsError)
            toast({
              title: "אזהרה",
              description: "המוצר עודכן אבל הייתה בעיה בסנכרון הוריאציות",
              variant: "destructive",
            })
          }
        } else if (!hasVariants) {
          // אם אין variants, מחק את כל האפשרויות והוריאציות הקיימות
          try {
            const [existingOptionsRes, existingVariantsRes] = await Promise.all([
              fetch(`/api/products/${product.id}/options`),
              fetch(`/api/products/${product.id}/variants`),
            ])

            const existingOptions = existingOptionsRes.ok ? await existingOptionsRes.json() : []
            const existingVariants = existingVariantsRes.ok ? await existingVariantsRes.json() : []

            await Promise.all([
              ...existingOptions.map((opt: any) =>
                fetch(`/api/products/${product.id}/options/${opt.id}`, { method: "DELETE" })
              ),
              ...existingVariants.map((v: any) =>
                fetch(`/api/products/${product.id}/variants/${v.id}`, { method: "DELETE" })
              ),
            ])
          } catch (error) {
            console.error("Error deleting variants:", error)
          }
        }

        toast({
          title: "הצלחה",
          description: "המוצר עודכן בהצלחה",
        })
        // Refresh product data
        await fetchProduct()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בעדכון המוצר",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון המוצר",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="עריכת מוצר">
        <ProductFormSkeleton />
      </AppLayout>
    )
  }

  if (!product) {
    return (
      <AppLayout title="עריכת מוצר">
        <div className="text-center py-12">
          <p className="text-gray-500">המוצר לא נמצא</p>
        </div>
      </AppLayout>
    )
  }

  const shopUrl = product.shop ? getShopProductUrl({ slug: product.shop.slug, domain: product.shop.domain }, product.slug) : null

  return (
    <AppLayout title={`עריכת ${product.name}`}>
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">עריכת מוצר</h1>
            <p className="text-sm md:text-base text-gray-600">עדכן את פרטי המוצר {product.name}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {shopUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(shopUrl, "_blank")}
                className="flex-1 md:flex-none"
              >
                <ExternalLink className="w-4 h-4 ml-2" />
                <span className="hidden sm:inline">צפייה בחנות</span>
                <span className="sm:hidden">חנות</span>
              </Button>
            )}
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
              {saving ? "שומר..." : "שמור"}
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
              onDescriptionChange={(description) => setFormData(prev => ({ ...prev, description }))}
            />

            {/* Media */}
            <MediaCard
              images={formData.images}
              shopId={product.shopId}
              entityId={product.id}
              onSelect={handleMediaSelect}
              onRemove={removeImage}
              onReorder={handleReorderImages}
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
            <ProductAddonsCard
              productId={product.id}
              shopId={product.shopId}
              categoryIds={formData.categories}
              onChange={handleProductAddonsChange}
            />

            {/* Custom Fields */}
            <CustomFieldsCard
              productId={product.id}
              shopId={product.shopId}
              categoryIds={formData.categories}
              values={customFieldValues}
              onChange={handleCustomFieldsChange}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <StatusCard
              status={formData.status}
              onChange={(status) => setFormData(prev => ({ ...prev, status }))}
              scheduledPublishDate={formData.scheduledPublishDate}
              onScheduledPublishDateChange={(date) => setFormData(prev => ({ ...prev, scheduledPublishDate: date }))}
              notifyOnPublish={formData.notifyOnPublish}
              onNotifyOnPublishChange={(notify) => setFormData(prev => ({ ...prev, notifyOnPublish: notify }))}
            />

            {/* Premium Club */}
            {product && (
              <PremiumClubCard
                exclusiveToTier={formData.exclusiveToTier}
                onExclusiveToTierChange={(tiers) =>
                  setFormData(prev => ({ ...prev, exclusiveToTier: tiers }))
                }
                shopId={product.shopId}
              />
            )}

            {/* Categories */}
            <CategoriesCard
              selectedCategories={formData.categories}
              onChange={(categories) => setFormData(prev => ({ ...prev, categories }))}
              shopId={product.shopId}
              productId={product.id}
              refreshTrigger={`${formData.name}-${formData.price}-${formData.status}-${formData.availability}-${formData.tags.join(',')}`}
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
              onAdd={(tag) => setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))}
              onRemove={(tag) => setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
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

            {/* Page Template */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  תבנית עמוד מוצר
                </CardTitle>
                <CardDescription>
                  בחר תבנית עיצוב ספציפית למוצר זה
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>תבנית</Label>
                  <Select
                    value={formData.pageTemplateId || undefined}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, pageTemplateId: value === "none" ? "" : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תבנית (אופציונלי)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא תבנית (ברירת מחדל)</SelectItem>
                      {templates.map((template: any) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.pageTemplateId && (
                    <p className="text-xs text-gray-500 mt-2">
                      ניתן ליצור תבניות חדשות ב-{" "}
                      <button
                        type="button"
                        onClick={() => window.open(`/customize?page=product&id=${product?.id}`, '_blank')}
                        className="text-emerald-600 hover:underline"
                      >
                        התאמה אישית
                      </button>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
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
            {saving ? "שומר..." : "שמור שינויים"}
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}

