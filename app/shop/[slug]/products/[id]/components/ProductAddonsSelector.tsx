"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ProductAddon } from "../types"

interface SelectedAddon {
  addonId: string
  valueId: string | null
  label: string
  price: number
  quantity: number
}

interface ProductAddonsSelectorProps {
  addons: ProductAddon[]
  onChange: (selectedAddons: SelectedAddon[]) => void
  onPriceChange?: (totalAddonsPrice: number) => void
  theme?: any
}

export function ProductAddonsSelector({
  addons,
  onChange,
  onPriceChange,
  theme,
}: ProductAddonsSelectorProps) {
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([])
  const [textInputs, setTextInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    onChange(selectedAddons)
    const totalPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0)
    onPriceChange?.(totalPrice)
  }, [selectedAddons])

  const handleSingleChoice = (addon: ProductAddon, valueId: string) => {
    const value = addon.values.find(v => v.id === valueId)
    if (!value) return

    setSelectedAddons(prev => {
      const filtered = prev.filter(a => a.addonId !== addon.id)
      return [...filtered, {
        addonId: addon.id,
        valueId: value.id,
        label: `${addon.name}: ${value.label}`,
        price: value.price,
        quantity: 1,
      }]
    })
  }

  const handleMultipleChoice = (addon: ProductAddon, valueId: string, checked: boolean) => {
    const value = addon.values.find(v => v.id === valueId)
    if (!value) return

    setSelectedAddons(prev => {
      if (checked) {
        return [...prev, {
          addonId: addon.id,
          valueId: value.id,
          label: `${addon.name}: ${value.label}`,
          price: value.price,
          quantity: 1,
        }]
      } else {
        return prev.filter(a => !(a.addonId === addon.id && a.valueId === valueId))
      }
    })
  }

  const handleTextInput = (addon: ProductAddon, text: string) => {
    setTextInputs(prev => ({ ...prev, [addon.id]: text }))
    
    setSelectedAddons(prev => {
      const filtered = prev.filter(a => a.addonId !== addon.id)
      if (text.trim()) {
        return [...filtered, {
          addonId: addon.id,
          valueId: null,
          label: `${addon.name}: ${text}`,
          price: 0, // TEXT_INPUT בד"כ לא עולה כסף, או שמוגדר במקום אחר
          quantity: 1,
        }]
      }
      return filtered
    })
  }

  const handleCheckbox = (addon: ProductAddon, checked: boolean) => {
    setSelectedAddons(prev => {
      const filtered = prev.filter(a => a.addonId !== addon.id)
      if (checked) {
        return [...filtered, {
          addonId: addon.id,
          valueId: null,
          label: addon.name,
          price: addon.values[0]?.price || 0,
          quantity: 1,
        }]
      }
      return filtered
    })
  }

  if (addons.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {addons.map((addon) => {
        const isSelected = selectedAddons.some(a => a.addonId === addon.id)
        
        return (
          <div key={addon.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                {addon.name}
                {addon.required && (
                  <Badge variant="destructive" className="mr-2 text-xs">
                    חובה
                  </Badge>
                )}
              </Label>
            </div>

            {/* SINGLE_CHOICE - Radio */}
            {addon.type === "SINGLE_CHOICE" && (
              <RadioGroup
                value={selectedAddons.find(a => a.addonId === addon.id)?.valueId || ""}
                onValueChange={(value) => handleSingleChoice(addon, value)}
              >
                <div className="space-y-2">
                  {addon.values.map((value) => (
                    <div key={value.id} className="flex items-center gap-2">
                      <RadioGroupItem value={value.id} id={`${addon.id}-${value.id}`} />
                      <Label
                        htmlFor={`${addon.id}-${value.id}`}
                        className="cursor-pointer flex items-center gap-2 flex-1"
                      >
                        <span>{value.label}</span>
                        {value.price > 0 && (
                          <span className="text-sm text-gray-600">
                            (+₪{value.price.toFixed(2)})
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            {/* MULTIPLE_CHOICE - Checkboxes */}
            {addon.type === "MULTIPLE_CHOICE" && (
              <div className="space-y-2">
                {addon.values.map((value) => {
                  const checked = selectedAddons.some(
                    a => a.addonId === addon.id && a.valueId === value.id
                  )
                  
                  return (
                    <div key={value.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`${addon.id}-${value.id}`}
                        checked={checked}
                        onCheckedChange={(checked) =>
                          handleMultipleChoice(addon, value.id, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`${addon.id}-${value.id}`}
                        className="cursor-pointer flex items-center gap-2 flex-1"
                      >
                        <span>{value.label}</span>
                        {value.price > 0 && (
                          <span className="text-sm text-gray-600">
                            (+₪{value.price.toFixed(2)})
                          </span>
                        )}
                      </Label>
                    </div>
                  )
                })}
              </div>
            )}

            {/* TEXT_INPUT */}
            {addon.type === "TEXT_INPUT" && (
              <Input
                placeholder={`הזן ${addon.name.toLowerCase()}...`}
                value={textInputs[addon.id] || ""}
                onChange={(e) => handleTextInput(addon, e.target.value)}
              />
            )}

            {/* CHECKBOX */}
            {addon.type === "CHECKBOX" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={addon.id}
                  checked={isSelected}
                  onCheckedChange={(checked) => handleCheckbox(addon, checked as boolean)}
                  style={{
                    ...(isSelected && theme?.primaryColor ? {
                      backgroundColor: theme.primaryColor,
                      borderColor: theme.primaryColor,
                    } : {})
                  }}
                />
                <Label htmlFor={addon.id} className="cursor-pointer flex items-center gap-2">
                  <span>{addon.values[0]?.label || addon.name}</span>
                  {addon.values[0]?.price > 0 && (
                    <span className="text-sm text-gray-600">
                      (+₪{addon.values[0].price.toFixed(2)})
                    </span>
                  )}
                </Label>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

