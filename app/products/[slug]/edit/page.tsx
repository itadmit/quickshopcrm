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
    pageTemplateId: "",
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
          trackInventory: data.trackInventory ?? true,
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
          tags: data.tags?.map((t: any) => t.name) || [],
          categories: data.collections?.map((c: any) => c.collectionId) || [],
          badges: data.badges || [],
          pageTemplateId: data.pageTemplateId || "",
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
        trackInventory: formData.trackInventory,
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
        badges: formData.badges.length > 0 ? formData.badges : null,
        addonIds: productAddonIds,
        pageTemplateId: formData.pageTemplateId || null,
      }

      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">עריכת מוצר</h1>
            <p className="text-gray-600">עדכן את פרטי המוצר {product.name}</p>
          </div>
          <div className="flex gap-2">
            {shopUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(shopUrl, "_blank")}
              >
                <ExternalLink className="w-4 h-4 ml-2" />
                צפייה בחנות
              </Button>
            )}
            <Button variant="outline" onClick={() => router.back()}>
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
              onEnabledChange={setHasVariants}
              onOptionsChange={setOptions}
              onVariantsChange={setVariants}
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
                      {templates.map((template) => (
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
                        className="text-purple-600 hover:underline"
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
      </div>
    </AppLayout>
  )
}

