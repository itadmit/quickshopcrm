"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ShippingData {
  weight: string
  dimensions: {
    length: string
    width: string
    height: string
  }
}

interface ShippingCardProps {
  data: ShippingData
  onChange: (data: ShippingData) => void
}

export function ShippingCard({ data, onChange }: ShippingCardProps) {
  const handleWeightChange = (weight: string) => {
    onChange({ ...data, weight })
  }

  const handleDimensionChange = (dimension: 'length' | 'width' | 'height', value: string) => {
    onChange({
      ...data,
      dimensions: {
        ...data.dimensions,
        [dimension]: value,
      },
    })
  }

  return (
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
            value={data.weight}
            onChange={(e) => handleWeightChange(e.target.value)}
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
              value={data.dimensions.length}
              onChange={(e) => handleDimensionChange('length', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="width">רוחב (ס"מ)</Label>
            <Input
              id="width"
              type="number"
              step="0.01"
              value={data.dimensions.width}
              onChange={(e) => handleDimensionChange('width', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">גובה (ס"מ)</Label>
            <Input
              id="height"
              type="number"
              step="0.01"
              value={data.dimensions.height}
              onChange={(e) => handleDimensionChange('height', e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

