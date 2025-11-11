"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { FormSkeleton } from "@/components/skeletons/FormSkeleton"
import { getShopProductUrl } from "@/lib/utils"
import {
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Package,
  DollarSign,
  BarChart3,
  Search,
  Tag,
  Plus,
  ArrowRight,
  Eye,
  Trash2,
  Copy,
  Layers,
  ExternalLink,
} from "lucide-react"
import { MediaPicker } from "@/components/MediaPicker"

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
    availability: "IN_STOCK" as "IN_STOCK" | "OUT_OF_STOCK" | "PRE_ORDER" | "BACKORDER" | "DISCONTINUED",
    availableDate: "",
    seoTitle: "",
    seoDescription: "",
    tags: [] as string[],
  })

  const [newTag, setNewTag] = useState("")
  const [uploadingImages, setUploadingImages] = useState(false)
  const [afterProductSave, setAfterProductSave] = useState<"stay" | "return">("stay")
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [originalData, setOriginalData] = useState<any>(null)
  const [hasChanges, setHasChanges] = useState(false)
  
  // Variants & Options state
  const [hasVariants, setHasVariants] = useState(false)
  const [options, setOptions] = useState<Array<{ id: string; name: string; values: any[] }>>([])
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
  const [defaultOptionValues, setDefaultOptionValues] = useState<Record<string, string>>({})

  // Bulk edit state
  const [bulkEdit, setBulkEdit] = useState({
    price: "",
    comparePrice: "",
    inventoryQty: "",
  })

  useEffect(() => {
    if (productSlug) {
      fetchProduct()
    }
  }, [productSlug])

  // Load company settings for after save behavior
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/company/settings')
        if (response.ok) {
          const data = await response.json()
          const settings = data.settings || {}
          if (settings.afterProductSave) {
            setAfterProductSave(settings.afterProductSave)
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
    loadSettings()
  }, [])

  // בדיקת שינויים בכל פעם שה-formData, options או variants משתנים
  useEffect(() => {
    if (!originalData) return

    const formDataChanged = JSON.stringify(formData) !== JSON.stringify(originalData.formData)
    const optionsChanged = JSON.stringify(options) !== JSON.stringify(originalData.options)
    const variantsChanged = JSON.stringify(variants) !== JSON.stringify(originalData.variants)
    
    const hasChangesValue = formDataChanged || optionsChanged || variantsChanged
    setHasChanges(hasChangesValue)
  }, [formData, options, variants, originalData])

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

        const initialFormData = {
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
          weight: data.weight?.toString() || "",
          dimensions: {
            length: data.dimensions?.length?.toString() || "",
            width: data.dimensions?.width?.toString() || "",
            height: data.dimensions?.height?.toString() || "",
          },
          status: data.status || "DRAFT",
          images: data.images || [],
          video: data.video || "",
          minQuantity: data.minQuantity?.toString() || "",
          maxQuantity: data.maxQuantity?.toString() || "",
          availability: data.availability || "IN_STOCK",
          availableDate: availableDateFormatted,
          seoTitle: data.seoTitle || "",
          seoDescription: data.seoDescription || "",
          tags: data.tags?.map((t: any) => t.name) || [],
        }
        
        setFormData(initialFormData)
        // שמירת הנתונים המקוריים להשוואה
        setOriginalData({
          formData: JSON.parse(JSON.stringify(initialFormData)),
          options: [],
          variants: [],
        })

        // טעינת ברירות מחדל מ-customFields
        if (data.customFields && typeof data.customFields === 'object') {
          const customFields = data.customFields as any
          if (customFields.defaultOptionValues) {
            setDefaultOptionValues(customFields.defaultOptionValues)
          }
        }

        // Fetch options and variants
        const [optionsRes, variantsRes] = await Promise.all([
          fetch(`/api/products/${productSlug}/options`),
          fetch(`/api/products/${productSlug}/variants`),
        ])

        let initialOptions: any[] = []
        let initialVariants: any[] = []

        if (optionsRes.ok) {
          const optionsData = await optionsRes.json()
          initialOptions = optionsData.length > 0
            ? optionsData.map((opt: any) => {
                // Parse values if it's a JSON string, otherwise use as is
                let values = opt.values || []
                if (typeof values === 'string') {
                  try {
                    values = JSON.parse(values)
                  } catch (e) {
                    values = []
                  }
                }
                // If values are objects, extract labels for display
                return {
                  id: opt.id,
                  name: opt.name,
                  values: values,
                }
              })
            : []
          
          if (initialOptions.length > 0) {
            setHasVariants(true)
          }
          setOptions(initialOptions)
        }

        if (variantsRes.ok) {
          const variantsData = await variantsRes.json()
          initialVariants = variantsData.length > 0
            ? variantsData.map((v: any) => ({
                id: v.id,
                name: v.name || "",
                price: v.price?.toString() || "",
                comparePrice: v.comparePrice?.toString() || "",
                cost: v.cost?.toString() || "",
                sku: v.sku || "",
                barcode: v.barcode || "",
                weight: v.weight?.toString() || "",
                inventoryQty: v.inventoryQty?.toString() || "",
                image: v.image || "",
                optionValues: {
                  ...(v.option1 && v.option1Value ? { [v.option1]: v.option1Value } : {}),
                  ...(v.option2 && v.option2Value ? { [v.option2]: v.option2Value } : {}),
                  ...(v.option3 && v.option3Value ? { [v.option3]: v.option3Value } : {}),
                },
              }))
            : []
          
          setVariants(initialVariants)
        }

        // עדכון הנתונים המקוריים עם options ו-variants
        setOriginalData((prev: any) => ({
          ...prev,
          options: JSON.parse(JSON.stringify(initialOptions)),
          variants: JSON.parse(JSON.stringify(initialVariants)),
        }))
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את המוצר",
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
      router.push("/products")
    } finally {
      setLoading(false)
    }
  }


  const removeImage = async (index: number) => {
    const imageToRemove = formData.images[index]
    
    // מחיקה מהשרת אם זה קובץ ב-S3
    if (imageToRemove && imageToRemove.startsWith("https://") && imageToRemove.includes(".s3.")) {
      try {
        await fetch(`/api/files/delete?path=${encodeURIComponent(imageToRemove)}`, {
          method: "DELETE",
        })
      } catch (error) {
        console.error("Error deleting image from server:", error)
        // ממשיכים גם אם יש שגיאה
      }
    }
    
    // הסרה מהרשימה
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const handleMediaSelect = (selectedPaths: string[]) => {
    setFormData((prev) => ({
      ...prev,
      images: selectedPaths,
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }))
  }

  // Generate variants from options
  const generateVariants = (currentOptions: Array<{ id: string; name: string; values: any[] }>) => {
    // Filter out options without name or values
    const validOptions = currentOptions.filter(
      (opt) => opt.name.trim() && opt.values.length > 0
    )

    if (validOptions.length === 0) {
      setVariants([])
      return
    }

    // Generate all combinations
    const combinations: Array<Record<string, string>> = []
    
    function generateCombinations(
      current: Record<string, string>,
      remainingOptions: Array<{ id: string; name: string; values: any[] }>,
      index: number
    ) {
      if (index >= remainingOptions.length) {
        combinations.push({ ...current })
        return
      }

      const option = remainingOptions[index]
      for (const value of option.values) {
        // Extract string value from object or use string directly
        const stringValue = typeof value === 'string' ? value : (value?.label || value?.id || String(value))
        generateCombinations(
          { ...current, [option.id]: stringValue },
          remainingOptions,
          index + 1
        )
      }
    }

    generateCombinations({}, validOptions, 0)

    // Create variants from combinations
    const newVariants = combinations.map((combo, index) => {
      const variantName = validOptions
        .map((opt) => `${opt.name}: ${combo[opt.id]}`)
        .join(" / ")

      // Check if variant already exists
      const existing = variants.find((v) => {
        return validOptions.every((opt) => v.optionValues[opt.id] === combo[opt.id])
      })

      return {
        id: existing?.id || `variant-${Date.now()}-${index}`,
        name: existing?.name || variantName,
        price: existing?.price || "",
        comparePrice: existing?.comparePrice || "",
        cost: existing?.cost || "",
        sku: existing?.sku || "",
        barcode: existing?.barcode || "",
        weight: existing?.weight || "",
        inventoryQty: existing?.inventoryQty || "",
        image: existing?.image || "",
        optionValues: combo,
      }
    })

    setVariants(newVariants)
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
        name: formData.name.trim(),
        slug: formData.slug,
        description: formData.description || undefined,
        sku: formData.sku || undefined,
        price: parseFloat(formData.price),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : undefined,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        taxEnabled: formData.taxEnabled,
        inventoryEnabled: formData.inventoryEnabled,
        inventoryQty: formData.inventoryQty ? parseInt(formData.inventoryQty) : 0,
        lowStockAlert: formData.lowStockAlert ? parseInt(formData.lowStockAlert) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        dimensions: formData.dimensions.length || formData.dimensions.width || formData.dimensions.height
          ? {
              length: formData.dimensions.length ? parseFloat(formData.dimensions.length) : undefined,
              width: formData.dimensions.width ? parseFloat(formData.dimensions.width) : undefined,
              height: formData.dimensions.height ? parseFloat(formData.dimensions.height) : undefined,
            }
          : undefined,
        status: formData.status,
        images: formData.images,
        video: formData.video || undefined,
        minQuantity: formData.minQuantity ? parseInt(formData.minQuantity) : undefined,
        maxQuantity: formData.maxQuantity ? parseInt(formData.maxQuantity) : undefined,
        availability: formData.availability,
        availableDate: formData.availableDate || undefined,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        customFields: {
          defaultOptionValues: Object.keys(defaultOptionValues).length > 0 ? defaultOptionValues : undefined,
        },
      }

      const response = await fetch(`/api/products/${productSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        // Update options and variants if they exist
        if (hasVariants && options.length > 0) {
          // Get existing options
          const existingOptionsRes = await fetch(`/api/products/${productSlug}/options`)
          const existingOptions = existingOptionsRes.ok ? await existingOptionsRes.json() : []

          // Delete old options that are not in new options
          for (const existing of existingOptions) {
            if (!options.find(opt => opt.id === existing.id)) {
              await fetch(`/api/products/${productSlug}/options/${existing.id}`, {
                method: "DELETE",
              })
            }
          }

          // Update or create options
          for (const option of options.filter(opt => opt.name.trim() && opt.values.length > 0)) {
            // Convert values to proper format (objects with id, label, metadata)
            const formattedValues = option.values.map((value: any) => {
              if (typeof value === 'string') {
                // New string value - convert to object
                return {
                  id: `value-${Date.now()}-${Math.random()}`,
                  label: value,
                  metadata: {},
                }
              } else if (value && typeof value === 'object') {
                // Already an object - use as is
                return value
              } else {
                // Fallback
                return {
                  id: `value-${Date.now()}-${Math.random()}`,
                  label: String(value),
                  metadata: {},
                }
              }
            })

            const existing = existingOptions.find((e: any) => e.id === option.id)
            if (existing) {
              // Update existing option
              await fetch(`/api/products/${productSlug}/options/${option.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: option.name,
                  values: formattedValues,
                  position: options.indexOf(option),
                }),
              })
            } else {
              // Create new option
              await fetch(`/api/products/${productSlug}/options`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: option.name,
                  values: formattedValues,
                  position: options.indexOf(option),
                }),
              })
            }
          }

          // Get updated options
          const updatedOptionsRes = await fetch(`/api/products/${productSlug}/options`)
          const updatedOptions = updatedOptionsRes.ok ? await updatedOptionsRes.json() : []

          // Get existing variants
          const existingVariantsRes = await fetch(`/api/products/${productSlug}/variants`)
          const existingVariants = existingVariantsRes.ok ? await existingVariantsRes.json() : []

          // Delete old variants that are not in new variants
          for (const existing of existingVariants) {
            if (!variants.find(v => v.id === existing.id)) {
              await fetch(`/api/products/${productSlug}/variants/${existing.id}`, {
                method: "DELETE",
              })
            }
          }

          // Update or create variants
          for (const variant of variants) {
            const existing = existingVariants.find((e: any) => e.id === variant.id)
            
            // Map option values
            const optionKeys = Object.keys(variant.optionValues)
            const option1Key = optionKeys[0]
            const option2Key = optionKeys[1]
            const option3Key = optionKeys[2]

            const option1 = option1Key ? options.find(o => o.id === option1Key) : null
            const option2 = option2Key ? options.find(o => o.id === option2Key) : null
            const option3 = option3Key ? options.find(o => o.id === option3Key) : null

            const option1Value = option1Key ? variant.optionValues[option1Key] : undefined
            const option2Value = option2Key ? variant.optionValues[option2Key] : undefined
            const option3Value = option3Key ? variant.optionValues[option3Key] : undefined

            const variantPayload = {
              name: variant.name,
              price: variant.price ? parseFloat(variant.price) : undefined,
              comparePrice: variant.comparePrice ? parseFloat(variant.comparePrice) : undefined,
              cost: variant.cost ? parseFloat(variant.cost) : undefined,
              sku: variant.sku || undefined,
              barcode: variant.barcode || undefined,
              weight: variant.weight ? parseFloat(variant.weight) : undefined,
              inventoryQty: variant.inventoryQty ? parseInt(variant.inventoryQty) : 0,
              image: variant.image || undefined,
              option1: option1?.name,
              option1Value: option1Value,
              option2: option2?.name,
              option2Value: option2Value,
              option3: option3?.name,
              option3Value: option3Value,
            }

            if (existing) {
              // Update existing variant
              await fetch(`/api/products/${productSlug}/variants/${variant.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(variantPayload),
              })
            } else {
              // Create new variant
              await fetch(`/api/products/${productSlug}/variants`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(variantPayload),
              })
            }
          }
        } else {
          // Delete all options and variants if hasVariants is false
          const [existingOptionsRes, existingVariantsRes] = await Promise.all([
            fetch(`/api/products/${productSlug}/options`),
            fetch(`/api/products/${productSlug}/variants`),
          ])

          if (existingOptionsRes.ok) {
            const existingOptions = await existingOptionsRes.json()
            for (const option of existingOptions) {
              await fetch(`/api/products/${productSlug}/options/${option.id}`, {
                method: "DELETE",
              })
            }
          }

          if (existingVariantsRes.ok) {
            const existingVariants = await existingVariantsRes.json()
            for (const variant of existingVariants) {
              await fetch(`/api/products/${productSlug}/variants/${variant.id}`, {
                method: "DELETE",
              })
            }
          }
        }

        const updatedProduct = await response.json()
        
        toast({
          title: "הצלחה",
          description: "המוצר עודכן בהצלחה",
        })
        
        // איפוס השינויים אחרי שמירה מוצלחת
        setHasChanges(false)
        
        // Check setting for after save behavior - עושים את זה קודם
        if (afterProductSave === "return") {
          // אם צריך לחזור לרשימה, עושים redirect ישירות
          router.push("/products")
          return
        }
        
        // אם לא חוזרים לרשימה, אז מטפלים בשינוי slug או רענון
        // אם ה-slug השתנה, עשה redirect ל-URL החדש
        if (updatedProduct.slug && updatedProduct.slug !== productSlug) {
          router.replace(`/products/${updatedProduct.slug}/edit`)
        } else {
          fetchProduct()
        }
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
        <FormSkeleton />
      </AppLayout>
    )
  }

  if (!product) {
    return null
  }

  return (
    <AppLayout title={`עריכת מוצר: ${product.name}`}>
      {/* כפתור צף לשמירה */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("האם אתה בטוח שברצונך לבטל את השינויים?")) {
                fetchProduct()
              }
            }}
            disabled={saving}
            className="bg-white shadow-lg"
          >
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="prodify-gradient text-white shadow-lg px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "שומר..." : "יש שינויים שלא נשמרו"}
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/products")}
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                חזרה לרשימה
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600 mt-1">ערוך את פרטי המוצר</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/products")}
              disabled={saving}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !hasChanges}
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  מידע בסיסי
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם המוצר *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="לדוגמה: חולצת טי שירט"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">כתובת URL (Slug)</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="לדוגמה: t-shirt"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="תיאור מפורט של המוצר..."
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Media */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  תמונות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`תמונה ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setMediaPickerOpen(true)}
                    className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-32 cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">בחר תמונות</p>
                    </div>
                  </button>
                </div>
                <MediaPicker
                  open={mediaPickerOpen}
                  onOpenChange={setMediaPickerOpen}
                  onSelect={handleMediaSelect}
                  selectedFiles={formData.images}
                  shopId={product?.shopId}
                  entityType="products"
                  entityId={formData.slug || productSlug}
                  multiple={true}
                  title="בחר תמונות למוצר"
                />
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  מחירים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="cost">מחיר עלות</Label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">₪</span>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        value={formData.cost}
                        onChange={(e) => setFormData((prev) => ({ ...prev, cost: e.target.value }))}
                        placeholder="0.00"
                        className="pr-10"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="taxEnabled" className="cursor-pointer">
                    כלול מע"מ במחיר
                  </Label>
                  <Switch
                    id="taxEnabled"
                    checked={formData.taxEnabled}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, taxEnabled: checked as boolean }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  מלאי
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="inventoryEnabled" className="cursor-pointer">
                    נהל מלאי
                  </Label>
                  <Switch
                    id="inventoryEnabled"
                    checked={formData.inventoryEnabled}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, inventoryEnabled: checked as boolean }))
                    }
                  />
                </div>

                {formData.inventoryEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inventoryQty">כמות במלאי</Label>
                      <Input
                        id="inventoryQty"
                        type="number"
                        value={formData.inventoryQty}
                        onChange={(e) => setFormData((prev) => ({ ...prev, inventoryQty: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lowStockAlert">התראת מלאי נמוך</Label>
                      <Input
                        id="lowStockAlert"
                        type="number"
                        value={formData.lowStockAlert}
                        onChange={(e) => setFormData((prev) => ({ ...prev, lowStockAlert: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="availability">זמינות</Label>
                  <Select
                    value={formData.availability}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({ ...prev, availability: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_STOCK">במלאי</SelectItem>
                      <SelectItem value="OUT_OF_STOCK">אזל מהמלאי</SelectItem>
                      <SelectItem value="PRE_ORDER">הזמנה מראש</SelectItem>
                      <SelectItem value="BACKORDER">הזמנה בחזרה</SelectItem>
                      <SelectItem value="DISCONTINUED">הופסק</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.availability === "PRE_ORDER" || formData.availability === "BACKORDER") && (
                  <div className="space-y-2">
                    <Label htmlFor="availableDate">תאריך זמינות</Label>
                    <Input
                      id="availableDate"
                      type="datetime-local"
                      value={formData.availableDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, availableDate: e.target.value }))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Variants & Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  וריאציות ואפשרויות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="hasVariants"
                    checked={hasVariants}
                    onCheckedChange={(checked) => {
                      setHasVariants(checked as boolean)
                      if (!checked) {
                        setOptions([])
                        setVariants([])
                      }
                    }}
                  />
                  <Label htmlFor="hasVariants" className="cursor-pointer">
                    למוצר זה יש אפשרויות, כמו גודל או צבע
                  </Label>
                </div>

                {hasVariants && (
                  <div className="space-y-6 pt-4 border-t">
                    {/* Options */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">אפשרויות</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newOption = {
                              id: `option-${Date.now()}`,
                              name: "",
                              values: [],
                            }
                            setOptions([...options, newOption])
                          }}
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          הוסף אפשרות
                        </Button>
                      </div>

                      {options.map((option, optionIndex) => (
                        <Card key={option.id} className="p-4">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="שם אפשרות (למשל: גודל)"
                                value={option.name}
                                onChange={(e) => {
                                  const updated = [...options]
                                  updated[optionIndex].name = e.target.value
                                  setOptions(updated)
                                  generateVariants(updated)
                                }}
                                className="flex-1"
                              />
                              {options.length > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updated = options.filter((_, i) => i !== optionIndex)
                                    setOptions(updated)
                                    generateVariants(updated)
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>

                              <div className="space-y-2">
                              <Label>ערכים</Label>
                              <div className="flex flex-wrap gap-2">
                                {option.values.map((value: any, valueIndex: number) => {
                                  // Handle both string values and object values with {id, label, metadata}
                                  const displayValue = typeof value === 'string' ? value : (value?.label || value?.id || String(value))
                                  return (
                                    <Badge
                                      key={valueIndex}
                                      variant="secondary"
                                      className="flex items-center gap-1 px-3 py-1"
                                    >
                                      {displayValue}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...options]
                                          updated[optionIndex].values = updated[optionIndex].values.filter(
                                            (_, i) => i !== valueIndex
                                          )
                                          setOptions(updated)
                                          generateVariants(updated)
                                        }}
                                        className="mr-1 hover:text-red-500"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </Badge>
                                  )
                                })}
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="הוסף ערך"
                                    className="w-32"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault()
                                        const input = e.currentTarget
                                        const value = input.value.trim()
                                        if (value) {
                                          // Check if value already exists (handle both string and object values)
                                          const valueExists = option.values.some((v: any) => {
                                            if (typeof v === 'string') return v === value
                                            return v?.label === value || v?.id === value
                                          })
                                          if (!valueExists) {
                                            const updated = [...options]
                                            updated[optionIndex].values.push(value)
                                            setOptions(updated)
                                            generateVariants(updated)
                                            input.value = ""
                                          }
                                        }
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      const input = e.currentTarget.previousElementSibling as HTMLInputElement
                                      const value = input.value.trim()
                                      if (value) {
                                        // Check if value already exists (handle both string and object values)
                                        const valueExists = option.values.some((v: any) => {
                                          if (typeof v === 'string') return v === value
                                          return v?.label === value || v?.id === value
                                        })
                                        if (!valueExists) {
                                          const updated = [...options]
                                          updated[optionIndex].values.push(value)
                                          setOptions(updated)
                                          generateVariants(updated)
                                          input.value = ""
                                        }
                                      }
                                    }}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Default Option Values Selection */}
                    {options.length > 0 && (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="w-4 h-4 text-blue-600" />
                            <Label className="text-sm font-semibold text-blue-900">ברירות מחדל לוריאציות</Label>
                          </div>
                          <p className="text-xs text-gray-600 mb-4">
                            בחר את הערכים שיוצגו כברירת מחדל בדף המוצר בפרונט
                          </p>
                          <div className="space-y-3">
                            {options.map((option) => {
                              const optionValues = Array.isArray(option.values) ? option.values : []
                              return (
                                <div key={option.id} className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-700">
                                    {option.name || "אפשרות ללא שם"}
                                  </Label>
                                  <Select
                                    value={defaultOptionValues[option.id] || ""}
                                    onValueChange={(value) => {
                                      setDefaultOptionValues({
                                        ...defaultOptionValues,
                                        [option.id]: value,
                                      })
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="בחר ערך ברירת מחדל" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {optionValues.map((value: any) => {
                                        const valueId = typeof value === 'object' ? value.id : value
                                        const valueLabel = typeof value === 'object' ? value.label : value
                                        return (
                                          <SelectItem key={valueId} value={valueId}>
                                            {valueLabel}
                                          </SelectItem>
                                        )
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Variants Table */}
                    {variants.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">וריאציות ({variants.length})</h3>
                        </div>
                        
                        {/* Bulk Edit Section */}
                        <Card className="bg-purple-50 border-purple-200">
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Layers className="w-4 h-4 text-purple-600" />
                              <Label className="text-sm font-semibold text-purple-900">עריכה קבוצתית</Label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600">מחיר</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={bulkEdit.price}
                                  onChange={(e) => setBulkEdit((prev) => ({ ...prev, price: e.target.value }))}
                                  placeholder="הזן מחיר"
                                  className="h-9 w-full"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600">מחיר מוזל</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={bulkEdit.comparePrice}
                                  onChange={(e) => setBulkEdit((prev) => ({ ...prev, comparePrice: e.target.value }))}
                                  placeholder="הזן מחיר מוזל"
                                  className="h-9 w-full"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600">מלאי</Label>
                                <Input
                                  type="number"
                                  value={bulkEdit.inventoryQty}
                                  onChange={(e) => setBulkEdit((prev) => ({ ...prev, inventoryQty: e.target.value }))}
                                  placeholder="הזן מלאי"
                                  className="h-9 w-full"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600 opacity-0">פעולה</Label>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    const updated = variants.map((variant) => ({
                                      ...variant,
                                      price: bulkEdit.price || variant.price,
                                      comparePrice: bulkEdit.comparePrice || variant.comparePrice,
                                      inventoryQty: bulkEdit.inventoryQty || variant.inventoryQty,
                                    }))
                                    setVariants(updated)
                                    toast({
                                      title: "הוחל בהצלחה",
                                      description: `עודכנו ${variants.length} וריאציות`,
                                    })
                                    // Clear bulk edit fields
                                    setBulkEdit({ price: "", comparePrice: "", inventoryQty: "" })
                                  }}
                                  className="h-9 w-full prodify-gradient text-white"
                                >
                                  <Copy className="w-4 h-4 ml-1" />
                                  החל על הכל
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b">
                                <th className="text-right p-2 text-sm font-medium">וריאציה</th>
                                <th className="text-right p-2 text-sm font-medium">מחיר</th>
                                <th className="text-right p-2 text-sm font-medium">מחיר מוזל</th>
                                <th className="text-right p-2 text-sm font-medium">SKU</th>
                                <th className="text-right p-2 text-sm font-medium">מלאי</th>
                                <th className="text-right p-2 text-sm font-medium">פעולות</th>
                              </tr>
                            </thead>
                            <tbody>
                              {variants.map((variant, variantIndex) => (
                                <tr key={variant.id} className="border-b">
                                  <td className="p-2">
                                    <Input
                                      value={variant.name}
                                      onChange={(e) => {
                                        const updated = [...variants]
                                        updated[variantIndex].name = e.target.value
                                        setVariants(updated)
                                      }}
                                      className="w-full"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={variant.price}
                                      onChange={(e) => {
                                        const updated = [...variants]
                                        updated[variantIndex].price = e.target.value
                                        setVariants(updated)
                                      }}
                                      placeholder="מחיר בסיס"
                                      className="w-full"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={variant.comparePrice}
                                      onChange={(e) => {
                                        const updated = [...variants]
                                        updated[variantIndex].comparePrice = e.target.value
                                        setVariants(updated)
                                      }}
                                      placeholder="מחיר מוזל"
                                      className="w-full"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <Input
                                      value={variant.sku}
                                      onChange={(e) => {
                                        const updated = [...variants]
                                        updated[variantIndex].sku = e.target.value
                                        setVariants(updated)
                                      }}
                                      placeholder="SKU"
                                      className="w-full"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <Input
                                      type="number"
                                      value={variant.inventoryQty}
                                      onChange={(e) => {
                                        const updated = [...variants]
                                        updated[variantIndex].inventoryQty = e.target.value
                                        setVariants(updated)
                                      }}
                                      placeholder="0"
                                      className="w-full"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const updated = variants.filter((_, i) => i !== variantIndex)
                                        setVariants(updated)
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping */}
            <Card>
              <CardHeader>
                <CardTitle>משלוח</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">משקל (ק"ג)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="length">אורך (ס"מ)</Label>
                    <Input
                      id="length"
                      type="number"
                      step="0.01"
                      value={formData.dimensions.length}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          dimensions: { ...prev.dimensions, length: e.target.value },
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="width">רוחב (ס"מ)</Label>
                    <Input
                      id="width"
                      type="number"
                      step="0.01"
                      value={formData.dimensions.width}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          dimensions: { ...prev.dimensions, width: e.target.value },
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">גובה (ס"מ)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.01"
                      value={formData.dimensions.height}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          dimensions: { ...prev.dimensions, height: e.target.value },
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  <img
                    src={formData.images[0]}
                    alt={formData.name || "תצוגה מקדימה"}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    {formData.name || "שם מוצר"}
                  </h3>
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
                {product?.shop?.slug && formData.status === "PUBLISHED" && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const productSlugentifier = formData.slug || product.id
                        const url = getShopProductUrl(
                          { slug: product.shop?.slug || '', domain: product.shop?.domain || '' },
                          productSlugentifier
                        )
                        window.open(url, "_blank")
                      }}
                    >
                      <ExternalLink className="w-4 h-4 ml-2" />
                      צפה בחנות
                    </Button>
                  </div>
                )}
                {(!product?.shop?.slug || formData.status !== "PUBLISHED") && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500 text-center">
                      {!product?.shop?.slug
                        ? "לא ניתן להציג תצוגה מקדימה - חנות לא זוהתה"
                        : "פרסם את המוצר כדי לצפות בחנות"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>סטטוס</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">סטטוס פרסום</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">טיוטה</SelectItem>
                      <SelectItem value="PUBLISHED">פורסם</SelectItem>
                      <SelectItem value="ARCHIVED">ארכיון</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle>פרטי מוצר</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                    placeholder="לדוגמה: TSH-001"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minQuantity">כמות מינימלית</Label>
                    <Input
                      id="minQuantity"
                      type="number"
                      value={formData.minQuantity}
                      onChange={(e) => setFormData((prev) => ({ ...prev, minQuantity: e.target.value }))}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxQuantity">כמות מקסימלית</Label>
                    <Input
                      id="maxQuantity"
                      type="number"
                      value={formData.maxQuantity}
                      onChange={(e) => setFormData((prev) => ({ ...prev, maxQuantity: e.target.value }))}
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="video">קישור לסרטון</Label>
                  <Input
                    id="video"
                    value={formData.video}
                    onChange={(e) => setFormData((prev) => ({ ...prev, video: e.target.value }))}
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  תגיות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    placeholder="הוסף תגית"
                  />
                  <Button onClick={addTag} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SEO */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  SEO
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seoTitle">כותרת SEO</Label>
                  <Input
                    id="seoTitle"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, seoTitle: e.target.value }))}
                    placeholder="כותרת לדפדפן ומנועי חיפוש"
                    maxLength={60}
                  />
                  <p className="text-xs text-gray-500">
                    {formData.seoTitle?.length || 0} / 60 תווים
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seoDescription">תיאור SEO</Label>
                  <Textarea
                    id="seoDescription"
                    value={formData.seoDescription}
                    onChange={(e) => setFormData((prev) => ({ ...prev, seoDescription: e.target.value }))}
                    placeholder="תיאור קצר למנועי חיפוש"
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-gray-500">
                    {formData.seoDescription?.length || 0} / 160 תווים
                  </p>
                </div>

                {/* Google Preview */}
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-sm font-medium mb-2 block">תצוגה מקדימה בגוגל</Label>
                  <div className="border rounded-lg p-3 bg-white">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="text-green-700">
                          {product?.shop?.domain || product?.shop?.slug ? (
                            `https://${product.shop.domain || `${product.shop.slug}.myshop.com`}`
                          ) : (
                            "example.com"
                          )}
                        </span>
                        <span className="text-gray-400">›</span>
                        <span className="text-gray-500">מוצרים</span>
                        <span className="text-gray-400">›</span>
                        <span className="text-gray-500 truncate">
                          {formData.slug || "product-slug"}
                        </span>
                      </div>
                      <h3 className="text-lg text-blue-600 hover:underline cursor-pointer line-clamp-1">
                        {formData.seoTitle || formData.name || "כותרת המוצר"}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {formData.seoDescription || formData.description || "תיאור המוצר יופיע כאן..."}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
