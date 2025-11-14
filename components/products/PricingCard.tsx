"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { DollarSign } from "lucide-react"

interface PricingData {
  price: string
  comparePrice: string
  cost: string
  taxEnabled: boolean
}

interface PricingCardProps {
  data: PricingData
  onChange: (data: Partial<PricingData>) => void
  hidden?: boolean
}

export function PricingCard({ data, onChange, hidden = false }: PricingCardProps) {
  if (hidden) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          תמחור
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
                value={data.price}
                onChange={(e) => onChange({ price: e.target.value })}
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
                value={data.comparePrice}
                onChange={(e) => onChange({ comparePrice: e.target.value })}
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
                value={data.cost}
                onChange={(e) => onChange({ cost: e.target.value })}
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
            checked={data.taxEnabled}
            onCheckedChange={(checked) => onChange({ taxEnabled: checked as boolean })}
          />
        </div>
      </CardContent>
    </Card>
  )
}

