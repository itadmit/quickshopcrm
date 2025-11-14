"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ProductDetailsData {
  sku: string
  minQuantity: string
  maxQuantity: string
  video: string
}

interface ProductDetailsCardProps {
  data: ProductDetailsData
  onChange: (data: Partial<ProductDetailsData>) => void
}

export function ProductDetailsCard({ data, onChange }: ProductDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>פרטי מוצר</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sku">SKU / מק״ט</Label>
          <Input
            id="sku"
            value={data.sku}
            onChange={(e) => onChange({ sku: e.target.value })}
            placeholder="לדוגמה: TSH-001"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minQuantity">כמות מינימלית</Label>
            <Input
              id="minQuantity"
              type="number"
              value={data.minQuantity}
              onChange={(e) => onChange({ minQuantity: e.target.value })}
              placeholder="1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxQuantity">כמות מקסימלית</Label>
            <Input
              id="maxQuantity"
              type="number"
              value={data.maxQuantity}
              onChange={(e) => onChange({ maxQuantity: e.target.value })}
              placeholder="100"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="video">קישור לסרטון</Label>
          <Input
            id="video"
            value={data.video}
            onChange={(e) => onChange({ video: e.target.value })}
            placeholder="https://youtube.com/..."
          />
        </div>
      </CardContent>
    </Card>
  )
}

