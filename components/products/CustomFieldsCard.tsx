"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Sliders,
  FileText,
  Calendar,
  Hash,
  Link as LinkIcon,
  Palette,
  CheckSquare,
  FileImage,
  ExternalLink,
} from "lucide-react"

interface CustomFieldDefinition {
  id: string
  namespace: string
  key: string
  label: string
  type: "TEXT" | "RICH_TEXT" | "DATE" | "COLOR" | "CHECKBOX" | "NUMBER" | "URL" | "FILE"
  description: string | null
  required: boolean
  scope: "GLOBAL" | "CATEGORY"
  categoryIds?: string[]
  showInStorefront: boolean
}

interface CustomFieldData {
  definition: CustomFieldDefinition
  value: string | null
  valueId: string | null
}

interface CustomFieldsCardProps {
  productId?: string // For edit mode
  shopId: string
  categoryIds?: string[]
  values?: Record<string, any> // Initial values
  onChange?: (values: Record<string, any>) => void
}

const FIELD_TYPE_ICONS: Record<string, any> = {
  TEXT: FileText,
  RICH_TEXT: FileText,
  DATE: Calendar,
  COLOR: Palette,
  CHECKBOX: CheckSquare,
  NUMBER: Hash,
  URL: LinkIcon,
  FILE: FileImage,
}

export function CustomFieldsCard({
  productId,
  shopId,
  categoryIds = [],
  values = {},
  onChange,
}: CustomFieldsCardProps) {
  const [loading, setLoading] = useState(true)
  const [fields, setFields] = useState<CustomFieldData[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({})
  const initializedRef = useRef(false)

  // Memoize categoryIds to prevent unnecessary re-renders
  const categoryIdsKey = useMemo(() => categoryIds.sort().join(','), [categoryIds])

  useEffect(() => {
    if (productId) {
      // Edit mode - load from product
      loadProductFields()
    } else {
      // New product mode - load definitions only
      loadFieldDefinitions()
    }
  }, [productId, shopId, categoryIdsKey])

  const loadProductFields = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/products/${productId}/custom-fields`)
      if (response.ok) {
        const data = await response.json()
        setFields(data)
        
        // Initialize values
        const initialValues: Record<string, any> = {}
        data.forEach((field: CustomFieldData) => {
          initialValues[field.definition.id] = field.value || ""
        })
        setFieldValues(initialValues)
        if (onChange) {
          onChange(initialValues)
        }
      }
    } catch (error) {
      console.error("Error loading product custom fields:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadFieldDefinitions = async () => {
    try {
      setLoading(true)
      
      // Load all applicable definitions
      const response = await fetch(`/api/custom-fields?shopId=${shopId}`)
      if (response.ok) {
        const definitions: CustomFieldDefinition[] = await response.json()
        
        // Filter by scope and categories
        const applicable = definitions.filter((def: any) => {
          if (def.scope === "GLOBAL") return true
          if (def.scope === "CATEGORY" && categoryIds.length > 0) {
            // Check if any of the product's categories match
            return categoryIds.some((catId) => def.categoryIds?.includes(catId))
          }
          return false
        })
        
        // Map to CustomFieldData format
        const mappedFields: CustomFieldData[] = applicable.map((def: any) => ({
          definition: def,
          value: values[def.id] || null,
          valueId: null,
        }))
        
        setFields(mappedFields)
        
        // Initialize values
        const initialValues: Record<string, any> = {}
        mappedFields.forEach((field: any) => {
          initialValues[field.definition.id] = field.value || ""
        })
        setFieldValues(initialValues)
        if (onChange) {
          onChange(initialValues)
        }
      }
    } catch (error) {
      console.error("Error loading custom field definitions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleValueChange = useCallback((definitionId: string, value: any) => {
    // Update local state immediately for responsive UI
    setFieldValues((prev) => ({
      ...prev,
      [definitionId]: value,
    }))
  }, [])

  // Debounce onChange calls to parent to reduce re-renders
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      return
    }
    
    const timeoutId = setTimeout(() => {
      if (onChange && Object.keys(fieldValues).length > 0) {
        onChange(fieldValues)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [fieldValues, onChange])

  const renderField = (field: CustomFieldData) => {
    const def = field.definition
    const value = fieldValues[def.id] || ""
    const Icon = FIELD_TYPE_ICONS[def.type]

    switch (def.type) {
      case "TEXT":
        return (
          <Input
            value={value}
            onChange={(e) => handleValueChange(def.id, e.target.value)}
            placeholder={def.description || undefined}
          />
        )

      case "RICH_TEXT":
        return (
          <Textarea
            value={value}
            onChange={(e) => handleValueChange(def.id, e.target.value)}
            placeholder={def.description || undefined}
            rows={4}
          />
        )

      case "DATE":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleValueChange(def.id, e.target.value)}
          />
        )

      case "COLOR":
        return (
          <div className="flex gap-2">
            <input
              type="color"
              value={value || "#000000"}
              onChange={(e) => handleValueChange(def.id, e.target.value)}
              className="w-12 h-10 rounded border cursor-pointer"
            />
            <Input
              value={value}
              onChange={(e) => handleValueChange(def.id, e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        )

      case "CHECKBOX":
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={value === "true" || value === true}
              onCheckedChange={(checked) =>
                handleValueChange(def.id, checked ? "true" : "false")
              }
            />
            <span className="text-sm text-gray-600">
              {value === "true" || value === true ? "כן" : "לא"}
            </span>
          </div>
        )

      case "NUMBER":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(def.id, e.target.value)}
            placeholder={def.description || undefined}
          />
        )

      case "URL":
        return (
          <div className="flex gap-2">
            <Input
              type="url"
              value={value}
              onChange={(e) => handleValueChange(def.id, e.target.value)}
              placeholder={def.description || "https://example.com"}
              className="flex-1"
            />
            {value && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(value, "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        )

      case "FILE":
        return (
          <div className="space-y-2">
            <Input
              type="text"
              value={value}
              onChange={(e) => handleValueChange(def.id, e.target.value)}
              placeholder="נתיב לקובץ"
            />
            <p className="text-xs text-gray-500">
              העלה קובץ למדיה והדבק כאן את הנתיב
            </p>
          </div>
        )

      default:
        return <Input value={value} onChange={(e) => handleValueChange(def.id, e.target.value)} />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="w-5 h-5" />
            שדות מותאמים אישית
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (fields.length === 0) {
    return null // Don't show the card if there are no custom fields
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5" />
            שדות מותאמים אישית
          </div>
          <Link href="/settings/custom-fields">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 ml-2" />
              ניהול שדות
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field: any) => {
          const Icon = FIELD_TYPE_ICONS[field.definition.type]
          return (
            <div key={field.definition.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={field.definition.id}>
                  {field.definition.label}
                  {field.definition.required && (
                    <span className="text-red-500 mr-1">*</span>
                  )}
                </Label>
                {field.definition.showInStorefront && (
                  <Badge variant="outline" className="text-xs">
                    מוצג בחנות
                  </Badge>
                )}
              </div>
              {field.definition.description && (
                <p className="text-sm text-gray-500">{field.definition.description}</p>
              )}
              {renderField(field)}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

