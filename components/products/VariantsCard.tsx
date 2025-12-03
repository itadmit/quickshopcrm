"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, Plus, Trash2, X } from "lucide-react"

interface Option {
  id: string
  name: string
  type: "button" | "color" | "image" | "pattern"
  values: any[]
}

interface Variant {
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
}

interface VariantsCardProps {
  enabled: boolean
  options: Option[]
  variants: Variant[]
  defaultVariantId?: string | null
  onEnabledChange: (enabled: boolean) => void
  onOptionsChange: (options: Option[]) => void
  onVariantsChange: (variants: Variant[]) => void
  onDefaultVariantChange?: (variantId: string | null) => void
}

// Popular colors mapping (Hebrew)
const popularColors: Record<string, string> = {
  'שחור': '#000000',
  'לבן': '#FFFFFF',
  'אדום': '#FF0000',
  'כחול': '#0000FF',
  'ירוק': '#00FF00',
  'צהוב': '#FFFF00',
  'כתום': '#FFA500',
  'סגול': '#800080',
  'ורוד': '#FFC0CB',
  'חום': '#8B4513',
  'אפור': '#808080',
  'זהב': '#FFD700',
  'כסף': '#C0C0C0',
  'תכלת': '#00FFFF',
  'ורד': '#FF69B4',
  'שמנת': '#FFFDD0',
  'בז\'': '#F5F5DC',
  'חאקי': '#F0E68C',
  'טורקיז': '#40E0D0',
  'אפרסק': '#FFDAB9',
}

export function VariantsCard({
  enabled,
  options,
  variants,
  defaultVariantId,
  onEnabledChange,
  onOptionsChange,
  onVariantsChange,
  onDefaultVariantChange,
}: VariantsCardProps) {
  const [colorDetectionTimers, setColorDetectionTimers] = useState<Record<string, NodeJS.Timeout>>({})

  // Cleanup color detection timers on unmount
  useEffect(() => {
    return () => {
      Object.values(colorDetectionTimers).forEach(timer => {
        clearTimeout(timer)
      })
    }
  }, [colorDetectionTimers])

  // Detect color from name
  const detectColorFromName = (name: string): string | null => {
    const lowerName = name.toLowerCase().trim()
    const colorKey = Object.keys(popularColors).find(key => 
      key.toLowerCase() === lowerName
    )
    return colorKey ? popularColors[colorKey] : null
  }

  // Auto-detect color with debounce
  const autoDetectColor = (optionId: string, value: string) => {
    // Clear existing timer
    if (colorDetectionTimers[optionId]) {
      clearTimeout(colorDetectionTimers[optionId])
    }

    // Set new timer
    const timer = setTimeout(() => {
      const detectedColor = detectColorFromName(value)
      if (detectedColor) {
        const colorInput = document.getElementById(`color-${optionId}`) as HTMLInputElement
        if (colorInput) {
          colorInput.value = detectedColor
          // Add visual feedback
          colorInput.style.transform = 'scale(1.1)'
          colorInput.style.transition = 'transform 0.2s'
          setTimeout(() => {
            colorInput.style.transform = 'scale(1)'
          }, 200)
        }
      }
      
      // Remove timer from state
      setColorDetectionTimers(prev => {
        const newTimers = { ...prev }
        delete newTimers[optionId]
        return newTimers
      })
    }, 500) // 500ms debounce

    setColorDetectionTimers(prev => ({ ...prev, [optionId]: timer }))
  }

  // Generate all possible variant combinations from options
  const generateVariants = (opts: Option[]) => {
    if (opts.length === 0 || opts.some(o => o.values.length === 0)) {
      onVariantsChange([])
      return
    }

    const combinations: Record<string, string>[][] = [[]]
    
    opts.forEach(option => {
      const newCombinations: Record<string, string>[][] = []
      combinations.forEach(combination => {
        option.values.forEach(value => {
          const displayValue = typeof value === 'string' ? value : (value?.label || value?.id || String(value))
          newCombinations.push([
            ...combination,
            { [option.name]: displayValue }
          ])
        })
      })
      combinations.length = 0
      combinations.push(...newCombinations)
    })

    const newVariants = combinations.map((combination, index) => {
      const optionValues: Record<string, string> = {}
      combination.forEach(opt => {
        Object.assign(optionValues, opt)
      })
      
      const name = Object.values(optionValues).join(" / ")
      
      // Try to find existing variant with same option values
      const existing = variants.find(v => 
        JSON.stringify(v.optionValues) === JSON.stringify(optionValues)
      )

      return existing || {
        id: `variant-${Date.now()}-${index}`,
        name,
        price: "",
        comparePrice: "",
        cost: "",
        sku: "",
        barcode: "",
        weight: "",
        inventoryQty: "",
        image: "",
        optionValues,
      }
    })

    onVariantsChange(newVariants)
  }

  const addOption = () => {
    const newOption: Option = {
      id: `option-${Date.now()}`,
      name: "",
      type: "button",
      values: [],
    }
    const updated = [...options, newOption]
    onOptionsChange(updated)
  }

  const removeOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index)
    onOptionsChange(updated)
    generateVariants(updated)
  }

  const updateOption = (index: number, field: keyof Option, value: any) => {
    const updated = [...options]
    updated[index] = { ...updated[index], [field]: value }
    onOptionsChange(updated)
    if (field === 'values') {
      generateVariants(updated)
    }
  }

  const removeValue = (optionIndex: number, valueIndex: number) => {
    const option = options[optionIndex]
    const updatedValues = option.values.filter((_, i) => i !== valueIndex)
    updateOption(optionIndex, 'values', updatedValues)
  }

  const handleEnabledChange = (checked: boolean) => {
    onEnabledChange(checked)
    if (!checked) {
      onOptionsChange([])
      onVariantsChange([])
    } else if (options.length === 0) {
      addOption()
    }
  }

  return (
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
            checked={enabled}
            onCheckedChange={handleEnabledChange}
          />
          <Label htmlFor="hasVariants" className="cursor-pointer">
            למוצר זה יש אפשרויות, כמו גודל או צבע
          </Label>
        </div>

        {enabled && (
          <div className="space-y-6 pt-4 border-t">
            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">אפשרויות</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
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
                          updateOption(optionIndex, 'name', e.target.value)
                          generateVariants(options)
                        }}
                        className="flex-1"
                      />
                      <Select
                        value={(option as any).type}
                        onValueChange={(value: any) => updateOption(optionIndex, 'type', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="button">כפתור</SelectItem>
                          <SelectItem value="color">צבע</SelectItem>
                          <SelectItem value="pattern">דפוס</SelectItem>
                          <SelectItem value="image">תמונה</SelectItem>
                        </SelectContent>
                      </Select>
                      {options.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(optionIndex)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>ערכים</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {option.values.map((value: any, valueIndex: number) => {
                          const displayValue = typeof value === 'string' ? value : (value?.label || value?.id || String(value))
                          
                          // Special rendering for colors
                          if ((option as any).type === "color" && value?.metadata?.color) {
                            return (
                              <div key={valueIndex} className="flex items-center gap-1 border rounded-lg p-1">
                                <div
                                  className="w-6 h-6 rounded border"
                                  style={{ backgroundColor: value.metadata.color }}
                                />
                                <span className="px-2 text-sm">{displayValue}</span>
                                <button
                                  type="button"
                                  onClick={() => removeValue(optionIndex, valueIndex)}
                                  className="hover:text-red-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )
                          }
                          
                          // Special rendering for patterns
                          if ((option as any).type === "pattern" && value?.metadata?.pattern) {
                            return (
                              <div key={valueIndex} className="flex items-center gap-1 border rounded-lg p-1">
                                <div
                                  className="w-6 h-6 rounded border"
                                  style={{ 
                                    backgroundColor: value.metadata.color || '#FFFFFF',
                                    backgroundImage: value.metadata.pattern,
                                    backgroundSize: value.metadata.backgroundSize || '12px 12px',
                                    backgroundPosition: value.metadata.backgroundPosition || '0 0'
                                  }}
                                />
                                <span className="px-2 text-sm">{displayValue}</span>
                                <button
                                  type="button"
                                  onClick={() => removeValue(optionIndex, valueIndex)}
                                  className="hover:text-red-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )
                          }
                          
                          // Special rendering for images
                          if ((option as any).type === "image" && value?.metadata?.image) {
                            return (
                              <div key={valueIndex} className="flex items-center gap-1 border rounded-lg p-1">
                                <img
                                  src={value.metadata.image}
                                  alt={displayValue}
                                  className="w-6 h-6 rounded object-cover"
                                />
                                <span className="px-2 text-sm">{displayValue}</span>
                                <button
                                  type="button"
                                  onClick={() => removeValue(optionIndex, valueIndex)}
                                  className="hover:text-red-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )
                          }
                          
                          // Default rendering (button type)
                          return (
                            <Badge
                              key={valueIndex}
                              variant="secondary"
                              className="flex items-center gap-1 px-3 py-1"
                            >
                              {displayValue}
                              <button
                                type="button"
                                onClick={() => removeValue(optionIndex, valueIndex)}
                                className="mr-1 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          )
                        })}
                      </div>

                      {/* Input for adding values - changes based on type */}
                      {(option as any).type === "button" && (
                        <div className="flex gap-2">
                          <Input
                            placeholder="הוסף ערך"
                            className="w-40"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                const input = e.currentTarget
                                const value = input.value.trim()
                                if (value) {
                                  const valueExists = option.values.some((v: any) => {
                                    const vLabel = typeof v === 'string' ? v : (v?.label || v?.id)
                                    return vLabel === value
                                  })
                                  if (!valueExists) {
                                    const updated = [...options]
                                    updated[optionIndex].values.push(value)
                                    onOptionsChange(updated)
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
                                const valueExists = option.values.some((v: any) => {
                                  const vLabel = typeof v === 'string' ? v : (v?.label || v?.id)
                                  return vLabel === value
                                })
                                if (!valueExists) {
                                  const updated = [...options]
                                  updated[optionIndex].values.push(value)
                                  onOptionsChange(updated)
                                  generateVariants(updated)
                                  input.value = ""
                                }
                              }
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {(option as any).type === "color" && (
                        <div className="space-y-2">
                          <div className="flex gap-2 items-center">
                            <input
                              type="color"
                              id={`color-${option.id}`}
                              className="w-12 h-10 rounded border cursor-pointer transition-transform"
                              defaultValue="#000000"
                            />
                            <Input
                              placeholder="שם צבע (לדוגמה: שחור, לבן, אדום)"
                              className="flex-1"
                              id={`color-label-${option.id}`}
                              onChange={(e) => {
                                // Auto-detect color as user types (with debounce)
                                const value = e.target.value.trim()
                                if (value) {
                                  autoDetectColor(option.id, value)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  const input = e.currentTarget
                                  const colorInput = document.getElementById(`color-${option.id}`) as HTMLInputElement
                                  const value = input.value.trim()
                                  
                                  // Try to detect color first
                                  const detectedColor = detectColorFromName(value)
                                  const color = detectedColor || colorInput?.value || "#000000"
                                  
                                  if (value) {
                                    const valueExists = option.values.some((v: any) => {
                                      const vLabel = typeof v === 'string' ? v : (v?.label || v?.id)
                                      return vLabel === value
                                    })
                                    if (!valueExists) {
                                      const updated = [...options]
                                      updated[optionIndex].values.push({
                                        id: value,
                                        label: value,
                                        metadata: { color }
                                      })
                                      onOptionsChange(updated)
                                      generateVariants(updated)
                                      input.value = ""
                                      if (colorInput) colorInput.value = "#000000"
                                    }
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const input = document.getElementById(`color-label-${option.id}`) as HTMLInputElement
                                const colorInput = document.getElementById(`color-${option.id}`) as HTMLInputElement
                                const value = input.value.trim()
                                
                                // Try to detect color first
                                const detectedColor = detectColorFromName(value)
                                const color = detectedColor || colorInput?.value || "#000000"
                                
                                if (value) {
                                  const valueExists = option.values.some((v: any) => {
                                    const vLabel = typeof v === 'string' ? v : (v?.label || v?.id)
                                    return vLabel === value
                                  })
                                  if (!valueExists) {
                                    const updated = [...options]
                                    updated[optionIndex].values.push({
                                      id: value,
                                      label: value,
                                      metadata: { color }
                                    })
                                    onOptionsChange(updated)
                                    generateVariants(updated)
                                    input.value = ""
                                    if (colorInput) colorInput.value = "#000000"
                                  }
                                }
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500">
                            💡 כתוב שם צבע בעברית וקוד הצבע יזוהה אוטומטית (20 צבעים פופולריים)
                          </p>
                        </div>
                      )}

                      {(option as any).type === "pattern" && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Select
                              defaultValue="dots"
                              onValueChange={(pattern) => {
                                const select = document.querySelector(`[data-pattern-select="${option.id}"]`) as HTMLElement
                                const preview = document.getElementById(`pattern-preview-${option.id}`) as HTMLElement
                                const colorInput = document.getElementById(`pattern-color-${option.id}`) as HTMLInputElement
                                
                                if (select) {
                                  select.setAttribute('data-pattern', pattern)
                                }
                                
                                // Update preview
                                if (preview && colorInput) {
                                  const color = colorInput.value || "#000000"
                                  let patternCSS = ''
                                  switch (pattern) {
                                    case 'dots':
                                      patternCSS = `radial-gradient(circle, ${color} 25%, white 25%)`
                                      preview.style.backgroundSize = '12px 12px'
                                      preview.style.backgroundPosition = '0 0, 6px 6px'
                                      preview.style.backgroundColor = 'white'
                                      break
                                    case 'stripes':
                                      patternCSS = `repeating-linear-gradient(45deg, ${color}, ${color} 8px, white 8px, white 16px)`
                                      preview.style.backgroundSize = 'auto'
                                      preview.style.backgroundPosition = '0 0'
                                      preview.style.backgroundColor = 'white'
                                      break
                                    case 'squares':
                                      patternCSS = `
                                        linear-gradient(45deg, ${color} 25%, transparent 25%, transparent 75%, ${color} 75%, ${color}),
                                        linear-gradient(45deg, ${color} 25%, transparent 25%, transparent 75%, ${color} 75%, ${color})
                                      `
                                      preview.style.backgroundSize = '12px 12px'
                                      preview.style.backgroundPosition = '0 0, 6px 6px'
                                      preview.style.backgroundColor = 'white'
                                      break
                                  }
                                  preview.style.backgroundImage = patternCSS
                                }
                              }}
                            >
                              <SelectTrigger className="w-32" data-pattern-select={option.id} data-pattern="dots">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="dots">נקודות</SelectItem>
                                <SelectItem value="stripes">פסים</SelectItem>
                                <SelectItem value="squares">ריבועים</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {/* Pattern Preview */}
                            <div
                              id={`pattern-preview-${option.id}`}
                              className="w-12 h-10 rounded border"
                              style={{
                                backgroundImage: 'radial-gradient(circle, #000000 25%, white 25%)',
                                backgroundSize: '12px 12px',
                                backgroundPosition: '0 0, 6px 6px',
                                backgroundColor: 'white'
                              }}
                            />
                            
                            <input
                              type="color"
                              id={`pattern-color-${option.id}`}
                              className="w-12 h-10 rounded border cursor-pointer"
                              defaultValue="#000000"
                              onChange={(e) => {
                                // Update preview when color changes
                                const preview = document.getElementById(`pattern-preview-${option.id}`) as HTMLElement
                                const patternSelect = document.querySelector(`[data-pattern-select="${option.id}"]`) as HTMLElement
                                const color = e.target.value
                                const patternType = patternSelect?.getAttribute('data-pattern') || "dots"
                                
                                if (preview) {
                                  let patternCSS = ''
                                  switch (patternType) {
                                    case 'dots':
                                      patternCSS = `radial-gradient(circle, ${color} 25%, white 25%)`
                                      preview.style.backgroundSize = '12px 12px'
                                      preview.style.backgroundPosition = '0 0, 6px 6px'
                                      preview.style.backgroundColor = 'white'
                                      break
                                    case 'stripes':
                                      patternCSS = `repeating-linear-gradient(45deg, ${color}, ${color} 8px, white 8px, white 16px)`
                                      preview.style.backgroundSize = 'auto'
                                      preview.style.backgroundPosition = '0 0'
                                      preview.style.backgroundColor = 'white'
                                      break
                                    case 'squares':
                                      patternCSS = `
                                        linear-gradient(45deg, ${color} 25%, transparent 25%, transparent 75%, ${color} 75%, ${color}),
                                        linear-gradient(45deg, ${color} 25%, transparent 25%, transparent 75%, ${color} 75%, ${color})
                                      `
                                      preview.style.backgroundSize = '12px 12px'
                                      preview.style.backgroundPosition = '0 0, 6px 6px'
                                      preview.style.backgroundColor = 'white'
                                      break
                                  }
                                  preview.style.backgroundImage = patternCSS
                                }
                              }}
                            />
                            <Input
                              placeholder="שם דפוס (לדוגמה: נקודות שחורות)"
                              className="flex-1"
                              id={`pattern-label-${option.id}`}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  const input = e.currentTarget
                                  const colorInput = document.getElementById(`pattern-color-${option.id}`) as HTMLInputElement
                                  const patternSelect = document.querySelector(`[data-pattern-select="${option.id}"]`) as HTMLElement
                                  const value = input.value.trim()
                                  const color = colorInput?.value || "#000000"
                                  const patternType = patternSelect?.getAttribute('data-pattern') || "dots"
                                  
                                  // Create CSS pattern
                                  let pattern = ''
                                  let backgroundSize = '12px 12px'
                                  let backgroundPosition = '0 0, 6px 6px'
                                  
                                  switch (patternType) {
                                    case 'dots':
                                      pattern = `radial-gradient(circle, ${color} 25%, white 25%)`
                                      break
                                    case 'stripes':
                                      pattern = `repeating-linear-gradient(45deg, ${color}, ${color} 8px, white 8px, white 16px)`
                                      backgroundSize = 'auto'
                                      backgroundPosition = '0 0'
                                      break
                                    case 'squares':
                                      pattern = `
                                        linear-gradient(45deg, ${color} 25%, transparent 25%, transparent 75%, ${color} 75%, ${color}),
                                        linear-gradient(45deg, ${color} 25%, transparent 25%, transparent 75%, ${color} 75%, ${color})
                                      `
                                      break
                                  }
                                  
                                  if (value) {
                                    const valueExists = option.values.some((v: any) => {
                                      const vLabel = typeof v === 'string' ? v : (v?.label || v?.id)
                                      return vLabel === value
                                    })
                                    if (!valueExists) {
                                      const updated = [...options]
                                      updated[optionIndex].values.push({
                                        id: value,
                                        label: value,
                                        metadata: { 
                                          pattern,
                                          color,
                                          backgroundSize,
                                          backgroundPosition
                                        }
                                      })
                                      onOptionsChange(updated)
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
                              onClick={() => {
                                const input = document.getElementById(`pattern-label-${option.id}`) as HTMLInputElement
                                const colorInput = document.getElementById(`pattern-color-${option.id}`) as HTMLInputElement
                                const patternSelect = document.querySelector(`[data-pattern-select="${option.id}"]`) as HTMLElement
                                const value = input.value.trim()
                                const color = colorInput?.value || "#000000"
                                const patternType = patternSelect?.getAttribute('data-pattern') || "dots"
                                
                                // Create CSS pattern
                                let pattern = ''
                                let backgroundSize = '12px 12px'
                                let backgroundPosition = '0 0, 6px 6px'
                                
                                switch (patternType) {
                                  case 'dots':
                                    pattern = `radial-gradient(circle, ${color} 25%, white 25%)`
                                    break
                                  case 'stripes':
                                    pattern = `repeating-linear-gradient(45deg, ${color}, ${color} 8px, white 8px, white 16px)`
                                    backgroundSize = 'auto'
                                    backgroundPosition = '0 0'
                                    break
                                  case 'squares':
                                    pattern = `
                                      linear-gradient(45deg, ${color} 25%, transparent 25%, transparent 75%, ${color} 75%, ${color}),
                                      linear-gradient(45deg, ${color} 25%, transparent 25%, transparent 75%, ${color} 75%, ${color})
                                    `
                                    break
                                }
                                
                                if (value) {
                                  const valueExists = option.values.some((v: any) => {
                                    const vLabel = typeof v === 'string' ? v : (v?.label || v?.id)
                                    return vLabel === value
                                  })
                                  if (!valueExists) {
                                    const updated = [...options]
                                    updated[optionIndex].values.push({
                                      id: value,
                                      label: value,
                                      metadata: { 
                                        pattern,
                                        color,
                                        backgroundSize,
                                        backgroundPosition
                                      }
                                    })
                                    onOptionsChange(updated)
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
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Variants Table */}
            {variants.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">וריאציות ({variants.length})</h3>
                </div>
                
                {/* Bulk Edit Section */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                          <Package className="w-4 h-4" />
                          עריכה קבוצתית - החל על כל הוריאציות
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          onClick={() => {
                            const priceInput = document.getElementById('bulk-price') as HTMLInputElement
                            const comparePriceInput = document.getElementById('bulk-compare-price') as HTMLInputElement
                            const costInput = document.getElementById('bulk-cost') as HTMLInputElement
                            const inventoryInput = document.getElementById('bulk-inventory') as HTMLInputElement
                            
                            const updates: any = {}
                            if (priceInput?.value) updates.price = priceInput.value
                            if (comparePriceInput?.value) updates.comparePrice = comparePriceInput.value
                            if (costInput?.value) updates.cost = costInput.value
                            if (inventoryInput?.value) updates.inventoryQty = inventoryInput.value
                            
                            if (Object.keys(updates).length > 0) {
                              const updated = variants.map(v => ({ ...v, ...updates }))
                              onVariantsChange(updated)
                              
                              // Clear inputs
                              if (priceInput) priceInput.value = ""
                              if (comparePriceInput) comparePriceInput.value = ""
                              if (costInput) costInput.value = ""
                              if (inventoryInput) inventoryInput.value = ""
                            }
                          }}
                        >
                          החל
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-blue-900">מחיר</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="bg-white h-9"
                            id="bulk-price"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-blue-900">מחיר לפני הנחה</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="bg-white h-9"
                            id="bulk-compare-price"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-blue-900">עלות</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="bg-white h-9"
                            id="bulk-cost"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-blue-900">מלאי</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            className="bg-white h-9"
                            id="bulk-inventory"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Desktop Table View */}
                <div className="hidden md:block border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-center p-2 text-sm font-medium">ברירת מחדל</th>
                        <th className="text-right p-2 text-sm font-medium">שם</th>
                        <th className="text-right p-2 text-sm font-medium">מחיר</th>
                        <th className="text-right p-2 text-sm font-medium">מחיר לפני הנחה</th>
                        <th className="text-right p-2 text-sm font-medium">עלות</th>
                        <th className="text-right p-2 text-sm font-medium">מקט</th>
                        <th className="text-right p-2 text-sm font-medium">מלאי</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant, variantIndex) => (
                        <tr key={variant.id} className="border-t">
                          <td className="p-2 text-center">
                            <Checkbox
                              checked={defaultVariantId === variant.id}
                              onCheckedChange={(checked) => {
                                if (onDefaultVariantChange) {
                                  onDefaultVariantChange(checked ? variant.id : null)
                                }
                              }}
                              title="סמן כווריאנט ברירת מחדל"
                            />
                          </td>
                          <td className="p-2">
                            <div className="font-medium text-sm">{variant.name}</div>
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={variant.price}
                              onChange={(e) => {
                                const updated = [...variants]
                                updated[variantIndex].price = e.target.value
                                onVariantsChange(updated)
                              }}
                              placeholder="0.00"
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
                                onVariantsChange(updated)
                              }}
                              placeholder="0.00"
                              className="w-full"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={variant.cost}
                              onChange={(e) => {
                                const updated = [...variants]
                                updated[variantIndex].cost = e.target.value
                                onVariantsChange(updated)
                              }}
                              placeholder="0.00"
                              className="w-full"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={variant.sku}
                              onChange={(e) => {
                                const updated = [...variants]
                                updated[variantIndex].sku = e.target.value
                                onVariantsChange(updated)
                              }}
                              placeholder="מקט"
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
                                onVariantsChange(updated)
                              }}
                              placeholder="0"
                              className="w-full"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {variants.map((variant, variantIndex) => (
                    <Card key={variant.id} className="border-2">
                      <CardContent className="p-4 space-y-3">
                        {/* Header with name and default checkbox */}
                        <div className="flex items-center justify-between border-b pb-3">
                          <div className="font-semibold text-sm">{variant.name}</div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-gray-600">ברירת מחדל</Label>
                            <Checkbox
                              checked={defaultVariantId === variant.id}
                              onCheckedChange={(checked) => {
                                if (onDefaultVariantChange) {
                                  onDefaultVariantChange(checked ? variant.id : null)
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* Fields */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-600">מחיר (₪)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={variant.price}
                              onChange={(e) => {
                                const updated = [...variants]
                                updated[variantIndex].price = e.target.value
                                onVariantsChange(updated)
                              }}
                              placeholder="0.00"
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-600">לפני הנחה (₪)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={variant.comparePrice}
                              onChange={(e) => {
                                const updated = [...variants]
                                updated[variantIndex].comparePrice = e.target.value
                                onVariantsChange(updated)
                              }}
                              placeholder="0.00"
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-600">עלות (₪)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={variant.cost}
                              onChange={(e) => {
                                const updated = [...variants]
                                updated[variantIndex].cost = e.target.value
                                onVariantsChange(updated)
                              }}
                              placeholder="0.00"
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-600">מלאי</Label>
                            <Input
                              type="number"
                              value={variant.inventoryQty}
                              onChange={(e) => {
                                const updated = [...variants]
                                updated[variantIndex].inventoryQty = e.target.value
                                onVariantsChange(updated)
                              }}
                              placeholder="0"
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1.5 col-span-2">
                            <Label className="text-xs text-gray-600">מקט</Label>
                            <Input
                              value={variant.sku}
                              onChange={(e) => {
                                const updated = [...variants]
                                updated[variantIndex].sku = e.target.value
                                onVariantsChange(updated)
                              }}
                              placeholder="מק״ט"
                              className="h-9"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

