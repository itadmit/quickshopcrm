"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
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
  Eye,
  Plus,
  Trash2,
  Copy,
  Layers,
} from "lucide-react"
import { MediaPicker } from "@/components/MediaPicker"

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
    availability: "IN_STOCK" as "IN_STOCK" | "OUT_OF_STOCK" | "PRE_ORDER" | "BACKORDER" | "DISCONTINUED",
    availableDate: "",
    seoTitle: "",
    seoDescription: "",
    tags: [] as string[],
    categories: [] as string[],
  })

  const [newTag, setNewTag] = useState("")
  const [uploadingImages, setUploadingImages] = useState(false)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  
  // Variants & Options state
  const [hasVariants, setHasVariants] = useState(false)
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({})
  const [defaultOptionValues, setDefaultOptionValues] = useState<Record<string, string>>({})
  const [uploadingOptionImages, setUploadingOptionImages] = useState<Record<string, boolean>>({})
  const [debounceTimers, setDebounceTimers] = useState<Record<string, NodeJS.Timeout>>({})
  const newValueInputsRef = useRef<Record<string, string>>({})
  const debounceValuesRef = useRef<Record<string, { value?: string; color?: string; label?: string }>>({})
  const optionsRef = useRef<Array<{
    id: string
    name: string
    type: "button" | "color" | "image"
    values: Array<{ 
      id: string
      label: string
      metadata?: { color?: string; image?: string }
    }>
  }>>([])
  
  // Keep refs in sync with state
  useEffect(() => {
    newValueInputsRef.current = newValueInputs
  }, [newValueInputs])
  
  const [options, setOptions] = useState<Array<{ 
    id: string
    name: string
    type: "button" | "color" | "image"
    values: Array<{ 
      id: string
      label: string
      metadata?: { color?: string; image?: string }
    }>
  }>>([])
  // Keep options ref in sync
  useEffect(() => {
    optionsRef.current = options
  }, [options])
  
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

  // Bulk edit state
  const [bulkEdit, setBulkEdit] = useState({
    price: "",
    comparePrice: "",
    inventoryQty: "",
  })

  useEffect(() => {
    if (!shopsLoading) {
      if (selectedShop) {
        setLoading(false)
      } else {
        toast({
          title: "שגיאה",
          description: "אין חנות נבחרת. יש לבחור חנות מההדר",
          variant: "destructive",
        })
        router.push("/products")
      }
    }
  }, [selectedShop, shopsLoading, router, toast])

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }))
  }

  const handleMediaSelect = (selectedPaths: string[]) => {
    setFormData((prev) => ({
      ...prev,
      images: selectedPaths,
    }))
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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers).forEach(timer => {
        clearTimeout(timer)
      })
    }
  }, [])

  // Helper function to add value automatically after debounce
  const addValueAfterDebounce = (
    optionId: string,
    optionIndex: number,
    optionType: "button" | "color" | "image",
    value: string,
    colorValue?: string,
    labelValue?: string
  ) => {
    // Clear existing timer
    if (debounceTimers[optionId]) {
      clearTimeout(debounceTimers[optionId])
    }

    // Store the current values for this debounce
    debounceValuesRef.current[optionId] = {
      value: optionType === "button" ? value : undefined,
      color: optionType === "color" ? (colorValue || "#000000") : undefined,
      label: optionType === "color" ? labelValue : undefined,
    }

    // Set new timer
    const timer = setTimeout(() => {
      // Check if the values haven't changed (user stopped typing)
      const storedValues = debounceValuesRef.current[optionId]
      const currentInputs = newValueInputsRef.current
      
      let shouldAdd = false
      let valueData: { label: string; metadata?: { color?: string; image?: string } } | null = null
      
      if (optionType === "button") {
        const currentValue = currentInputs[optionId]?.trim() || ""
        const storedValue = storedValues?.value?.trim() || ""
        // Only add if the value matches what we stored and is not empty
        if (currentValue === storedValue && currentValue && currentValue.length >= 2) {
          shouldAdd = true
          valueData = { label: currentValue }
        }
      } else if (optionType === "color") {
        const currentColor = currentInputs[optionId] || "#000000"
        const currentLabel = currentInputs[`${optionId}-label`]?.trim() || ""
        const storedColor = storedValues?.color || "#000000"
        const storedLabel = storedValues?.label?.trim() || ""
        
        // Only add if both color and label match what we stored and label is not empty
        if (currentColor === storedColor && currentLabel === storedLabel && currentLabel && currentLabel.length >= 2) {
          shouldAdd = true
          valueData = { label: currentLabel, metadata: { color: currentColor } }
        }
      }
      
      const currentOptions = optionsRef.current
      
      if (shouldAdd && valueData && currentOptions[optionIndex]) {
        // Check if value doesn't already exist
        if (!currentOptions[optionIndex].values.some(v => v.label === valueData.label)) {
          const updated = [...currentOptions]
          updated[optionIndex].values.push({
            id: `value-${Date.now()}-${Math.random()}`,
            label: valueData.label,
            metadata: valueData.metadata,
          })
          setOptions(updated)
          generateVariants(updated)
          
          // Clear input based on type
          if (optionType === "button") {
            setNewValueInputs(prev => ({ ...prev, [optionId]: "" }))
          } else if (optionType === "color") {
            setNewValueInputs(prev => ({ 
              ...prev, 
              [optionId]: "#000000",
              [`${optionId}-label`]: ""
            }))
          }
        }
      }
      
      // Remove timer and stored values from state
      setDebounceTimers(prev => {
        const newTimers = { ...prev }
        delete newTimers[optionId]
        return newTimers
      })
      delete debounceValuesRef.current[optionId]
    }, 1000) // 1 second debounce

    setDebounceTimers(prev => ({ ...prev, [optionId]: timer }))
  }

  // Generate variants from options
  const generateVariants = (currentOptions: Array<{ 
    id: string
    name: string
    type: "button" | "color" | "image"
    values: Array<{ 
      id: string
      label: string
      metadata?: { color?: string; image?: string }
    }>
  }>) => {
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
      remainingOptions: Array<{ 
        id: string
        name: string
        type: "button" | "color" | "image"
        values: Array<{ 
          id: string
          label: string
          metadata?: { color?: string; image?: string }
        }>
      }>,
      index: number
    ) {
      if (index >= remainingOptions.length) {
        combinations.push({ ...current })
        return
      }

      const option = remainingOptions[index]
      for (const value of option.values) {
        generateCombinations(
          { ...current, [option.id]: value.label },
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

  const handleSubmit = async (publish: boolean = false) => {
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
        shopId: selectedShop.id,
        name: formData.name.trim(),
        slug: formData.slug || generateSlug(formData.name),
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
        status: publish ? "PUBLISHED" : formData.status,
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

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const product = await response.json()
        
        // Save options and variants if they exist
        if (hasVariants && options.length > 0 && variants.length > 0) {
          // Save options
          for (const option of options.filter(opt => opt.name.trim() && opt.values.length > 0)) {
            try {
              // Convert values to array of strings (API expects strings, not objects)
              const formattedValues = option.values.map((value: any) => {
                if (typeof value === 'string') {
                  return value
                } else if (value && typeof value === 'object' && value.label) {
                  return value.label
                } else if (value && typeof value === 'object' && value.id) {
                  // If it's an object with id but no label, try to extract the value
                  return value.id.split('-').pop() || String(value)
                } else {
                  return String(value)
                }
              })

              await fetch(`/api/products/${product.id}/options`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: option.name,
                  type: option.type,
                  values: formattedValues,
                  position: options.indexOf(option),
                }),
              })
            } catch (error) {
              console.error("Error saving option:", error)
            }
          }

          // Fetch options to get their IDs
          const optionsResponse = await fetch(`/api/products/${product.id}/options`)
          if (optionsResponse.ok) {
            const savedOptions = await optionsResponse.json()
            
            // Map option IDs
            const optionIdMap: Record<string, string> = {}
            options.forEach((opt, index) => {
              const saved = savedOptions.find((s: any) => s.name === opt.name && s.position === index)
              if (saved) {
                optionIdMap[opt.id] = saved.id
              }
            })

            // Save variants
            for (const variant of variants) {
              try {
                // Map option values to option names and values
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

                await fetch(`/api/products/${product.id}/variants`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
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
                  }),
                })
              } catch (error) {
                console.error("Error saving variant:", error)
              }
            }
          }
        }

        toast({
          title: "הצלחה",
          description: publish ? "המוצר נשמר ופורסם בהצלחה" : "המוצר נשמר כטיוטה",
        })
        router.push(`/products/${product.id}/edit`)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "אירעה שגיאה בשמירת המוצר",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving product:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת המוצר",
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
      <AppLayout title="שגיאה">
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">חנות לא נבחרה</h3>
          <p className="text-gray-600 mb-4">יש לבחור חנות מההדר לפני יצירת מוצר</p>
          <Button onClick={() => router.push("/products")}>חזור לרשימת מוצרים</Button>
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
            <h1 className="text-3xl font-bold text-gray-900">מוצר חדש</h1>
            <p className="text-gray-600 mt-1">
              צור מוצר חדש לחנות: <span className="font-semibold">{selectedShop.name}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              ביטול
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={saving}
            >
              <Save className="w-4 h-4 ml-2" />
              שמור כטיוטה
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="prodify-gradient text-white"
            >
              {saving ? "שומר..." : "פרסם מוצר"}
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
                    onChange={(e) => handleNameChange(e.target.value)}
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
                  <p className="text-sm text-gray-500">
                    השאר ריק כדי ליצור אוטומטית מהשם
                  </p>
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
                  shopId={selectedShop?.id}
                  entityType="products"
                  entityId="new"
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

                {formData.availability === "PRE_ORDER" || formData.availability === "BACKORDER" ? (
                  <div className="space-y-2">
                    <Label htmlFor="availableDate">תאריך זמינות</Label>
                    <Input
                      id="availableDate"
                      type="datetime-local"
                      value={formData.availableDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, availableDate: e.target.value }))}
                    />
                  </div>
                ) : null}
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
                              type: "button" as "button" | "color" | "image",
                              values: [],
                            }
                            setOptions([...options, newOption])
                          }}
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          הוסף אפשרות
                        </Button>
                      </div>

                      {options.map((option, optionIndex) => {
                        return (
                          <div key={option.id} className="relative border-r-4 border-red-500 pr-4 pb-6">
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 space-y-2">
                                  <Label htmlFor={`option-name-${option.id}`} className="text-sm font-medium">
                                    שם אפשרות
                                  </Label>
                                  <Input
                                    id={`option-name-${option.id}`}
                                    placeholder="למשל: גודל"
                                    value={option.name}
                                    onChange={(e) => {
                                      const updated = [...options]
                                      updated[optionIndex].name = e.target.value
                                      setOptions(updated)
                                      generateVariants(updated)
                                    }}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`option-type-${option.id}`} className="text-sm font-medium">
                                    סוג
                                  </Label>
                                  <Select
                                    value={option.type}
                                    onValueChange={(value: "button" | "color" | "image") => {
                                      const updated = [...options]
                                      updated[optionIndex].type = value
                                      // Clear values when changing type
                                      updated[optionIndex].values = []
                                      setOptions(updated)
                                      generateVariants(updated)
                                    }}
                                  >
                                    <SelectTrigger id={`option-type-${option.id}`} className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="button">כפתור</SelectItem>
                                      <SelectItem value="color">צבע</SelectItem>
                                      <SelectItem value="image">תמונה</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {options.length > 0 && (
                                  <div className="flex items-end pb-2">
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
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`option-values-${option.id}`} className="text-sm font-medium">
                                  ערכי אפשרות
                                </Label>
                                <div className="space-y-2">
                                  {/* Display existing values */}
                                  {option.values.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      {option.values.map((value, valueIndex) => (
                                        <div key={value.id} className="flex items-center gap-1">
                                          {option.type === "button" && (
                                            <Badge
                                              variant="secondary"
                                              className="flex items-center gap-1 px-3 py-1"
                                            >
                                              {value.label}
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
                                          )}
                                          {option.type === "color" && (
                                            <div className="flex items-center gap-1 border rounded-lg p-1">
                                              <div
                                                className="w-8 h-8 rounded border"
                                                style={{ backgroundColor: value.metadata?.color || "#000000" }}
                                              />
                                              <span className="px-2 text-sm">{value.label}</span>
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
                                            </div>
                                          )}
                                          {option.type === "image" && (
                                            <div className="flex items-center gap-1 border rounded-lg p-1">
                                              {value.metadata?.image ? (
                                                <img
                                                  src={value.metadata.image}
                                                  alt={value.label}
                                                  className="w-8 h-8 object-cover rounded"
                                                />
                                              ) : (
                                                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                                                  <ImageIcon className="w-4 h-4 text-gray-400" />
                                                </div>
                                              )}
                                              <span className="px-2 text-sm">{value.label}</span>
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
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Input for new value - Shopify style */}
                                  <div className="space-y-2">
                                    {option.type === "button" && (
                                      <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                          <Input
                                            id={`option-values-${option.id}`}
                                            placeholder="הוסף ערך"
                                            value={newValueInputs[option.id] || ""}
                                            onChange={(e) => {
                                              const value = e.target.value
                                              setNewValueInputs(prev => ({ ...prev, [option.id]: value }))
                                              
                                              // Auto-add after 1 second of no typing
                                              if (value.trim()) {
                                                addValueAfterDebounce(
                                                  option.id,
                                                  optionIndex,
                                                  "button",
                                                  value
                                                )
                                              }
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault()
                                                // Clear debounce timer and stored values
                                                if (debounceTimers[option.id]) {
                                                  clearTimeout(debounceTimers[option.id])
                                                  setDebounceTimers(prev => {
                                                    const newTimers = { ...prev }
                                                    delete newTimers[option.id]
                                                    return newTimers
                                                  })
                                                }
                                                delete debounceValuesRef.current[option.id]
                                                
                                                const value = newValueInputs[option.id]?.trim()
                                                if (value && value.length >= 2 && !option.values.some(v => v.label === value)) {
                                                  const updated = [...options]
                                                  updated[optionIndex].values.push({
                                                    id: `value-${Date.now()}-${Math.random()}`,
                                                    label: value,
                                                  })
                                                  setOptions(updated)
                                                  generateVariants(updated)
                                                  setNewValueInputs(prev => ({ ...prev, [option.id]: "" }))
                                                }
                                              }
                                            }}
                                          />
                                        </div>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => {
                                            const value = newValueInputs[option.id]?.trim()
                                            if (value && value.length >= 2 && !option.values.some(v => v.label === value)) {
                                            // Clear debounce
                                            if (debounceTimers[option.id]) {
                                              clearTimeout(debounceTimers[option.id])
                                              setDebounceTimers(prev => {
                                                const newTimers = { ...prev }
                                                delete newTimers[option.id]
                                                return newTimers
                                              })
                                            }
                                            delete debounceValuesRef.current[option.id]
                                            
                                            const updated = [...options]
                                            updated[optionIndex].values.push({
                                              id: `value-${Date.now()}-${Math.random()}`,
                                              label: value,
                                            })
                                            setOptions(updated)
                                            generateVariants(updated)
                                            setNewValueInputs(prev => ({ ...prev, [option.id]: "" }))
                                          }
                                        }}
                                      >
                                        Done
                                      </Button>
                                    </div>
                                  )}
                                  {option.type === "color" && (
                                    <div className="flex gap-2 items-end">
                                      <input
                                        type="color"
                                        value={newValueInputs[option.id] || "#000000"}
                                        onChange={(e) => {
                                          const color = e.target.value
                                          setNewValueInputs(prev => {
                                            const updated = { ...prev, [option.id]: color }
                                            const label = updated[`${option.id}-label`]?.trim()
                                            
                                            // Auto-add after 1 second if label exists
                                            if (label) {
                                              addValueAfterDebounce(
                                                option.id,
                                                optionIndex,
                                                "color",
                                                "",
                                                color,
                                                label
                                              )
                                            }
                                            
                                            return updated
                                          })
                                        }}
                                        className="w-12 h-10 rounded border"
                                      />
                                      <div className="flex-1">
                                        <Input
                                          id={`option-values-${option.id}`}
                                          placeholder="שם צבע"
                                          value={newValueInputs[`${option.id}-label`] || ""}
                                          onChange={(e) => {
                                            const label = e.target.value
                                            setNewValueInputs(prev => {
                                              const updated = { ...prev, [`${option.id}-label`]: label }
                                              
                                              // Auto-add after 1 second of no typing
                                              if (label.trim()) {
                                                const color = updated[option.id] || "#000000"
                                                addValueAfterDebounce(
                                                  option.id,
                                                  optionIndex,
                                                  "color",
                                                  "",
                                                  color,
                                                  label
                                                )
                                              }
                                              
                                              return updated
                                            })
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault()
                                              // Clear debounce timer and stored values
                                              if (debounceTimers[option.id]) {
                                                clearTimeout(debounceTimers[option.id])
                                                setDebounceTimers(prev => {
                                                  const newTimers = { ...prev }
                                                  delete newTimers[option.id]
                                                  return newTimers
                                                })
                                              }
                                              delete debounceValuesRef.current[option.id]
                                              
                                              const color = newValueInputs[option.id] || "#000000"
                                              const label = newValueInputs[`${option.id}-label`]?.trim() || color
                                              if (label && label.length >= 2 && !option.values.some(v => v.label === label)) {
                                                const updated = [...options]
                                                updated[optionIndex].values.push({
                                                  id: `value-${Date.now()}-${Math.random()}`,
                                                  label: label,
                                                  metadata: { color: color },
                                                })
                                                setOptions(updated)
                                                generateVariants(updated)
                                                setNewValueInputs(prev => ({ 
                                                  ...prev, 
                                                  [option.id]: "#000000",
                                                  [`${option.id}-label`]: ""
                                                }))
                                              }
                                            }
                                          }}
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          const color = newValueInputs[option.id] || "#000000"
                                          const label = newValueInputs[`${option.id}-label`]?.trim() || color
                                          if (label && label.length >= 2 && !option.values.some(v => v.label === label)) {
                                            // Clear debounce
                                            if (debounceTimers[option.id]) {
                                              clearTimeout(debounceTimers[option.id])
                                              setDebounceTimers(prev => {
                                                const newTimers = { ...prev }
                                                delete newTimers[option.id]
                                                return newTimers
                                              })
                                            }
                                            delete debounceValuesRef.current[option.id]
                                            
                                            const updated = [...options]
                                            updated[optionIndex].values.push({
                                              id: `value-${Date.now()}-${Math.random()}`,
                                              label: label,
                                              metadata: { color: color },
                                            })
                                            setOptions(updated)
                                            generateVariants(updated)
                                            setNewValueInputs(prev => ({ 
                                              ...prev, 
                                              [option.id]: "#000000",
                                              [`${option.id}-label`]: ""
                                            }))
                                          }
                                        }}
                                      >
                                        Done
                                      </Button>
                                    </div>
                                  )}
                                  {option.type === "image" && (
                                    <div className="flex gap-2 items-end">
                                      <div className="flex-1">
                                        <Input
                                          id={`option-values-${option.id}`}
                                          placeholder="שם תמונה"
                                          value={newValueInputs[`${option.id}-label`] || ""}
                                          onChange={(e) => {
                                            setNewValueInputs(prev => ({ ...prev, [`${option.id}-label`]: e.target.value }))
                                          }}
                                        />
                                      </div>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id={`image-upload-${option.id}`}
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0]
                                          const label = newValueInputs[`${option.id}-label`]?.trim()
                                          if (file && label) {
                                            setUploadingOptionImages(prev => ({ ...prev, [option.id]: true }))
                                            try {
                                              const formData = new FormData()
                                              formData.append("file", file)
                                              const response = await fetch("/api/files/upload", {
                                                method: "POST",
                                                body: formData,
                                              })
                                              if (response.ok) {
                                                const data = await response.json()
                                                if (!option.values.some(v => v.label === label)) {
                                                  const updated = [...options]
                                                  updated[optionIndex].values.push({
                                                    id: `value-${Date.now()}-${Math.random()}`,
                                                    label: label,
                                                    metadata: { image: data.url },
                                                  })
                                                  setOptions(updated)
                                                  generateVariants(updated)
                                                  setNewValueInputs(prev => ({ 
                                                    ...prev, 
                                                    [`${option.id}-label`]: ""
                                                  }))
                                                }
                                              }
                                            } catch (error) {
                                              console.error("Error uploading image:", error)
                                            } finally {
                                              setUploadingOptionImages(prev => ({ ...prev, [option.id]: false }))
                                            }
                                          }
                                          e.target.value = ""
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          document.getElementById(`image-upload-${option.id}`)?.click()
                                        }}
                                        disabled={uploadingOptionImages[option.id]}
                                      >
                                        {uploadingOptionImages[option.id] ? (
                                          "מעלה..."
                                        ) : (
                                          <>
                                            <Upload className="w-4 h-4 ml-1" />
                                            העלה תמונה
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
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
                          {selectedShop?.domain || selectedShop?.slug ? (
                            `https://${selectedShop.domain || `${selectedShop.slug}.myshop.com`}`
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

