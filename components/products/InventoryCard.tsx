"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3 } from "lucide-react"

interface InventoryData {
  inventoryEnabled: boolean
  inventoryQty: string
  lowStockAlert: string
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "PRE_ORDER" | "BACKORDER" | "DISCONTINUED"
  availableDate: string
  trackInventory: boolean
  sellWhenSoldOut: boolean
  priceByWeight: boolean
  showPricePer100ml: boolean
  pricePer100ml: string
}

interface InventoryCardProps {
  data: InventoryData
  onChange: (data: Partial<InventoryData>) => void
  hidden?: boolean
}

export function InventoryCard({ data, onChange, hidden = false }: InventoryCardProps) {
  if (hidden) return null

  return (
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
            checked={data.inventoryEnabled}
            onCheckedChange={(checked) => onChange({ inventoryEnabled: checked as boolean })}
          />
        </div>

        {data.inventoryEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inventoryQty">כמות במלאי</Label>
              <Input
                id="inventoryQty"
                type="number"
                value={data.inventoryQty}
                onChange={(e) => onChange({ inventoryQty: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lowStockAlert">התראת מלאי נמוך</Label>
              <Input
                id="lowStockAlert"
                type="number"
                value={data.lowStockAlert}
                onChange={(e) => onChange({ lowStockAlert: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="availability">זמינות</Label>
          <Select
            value={data.availability}
            onValueChange={(value) => onChange({ availability: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IN_STOCK">במלאי</SelectItem>
              <SelectItem value="OUT_OF_STOCK">אזל מהמלאי</SelectItem>
              <SelectItem value="PRE_ORDER">הזמנה מראש</SelectItem>
              <SelectItem value="BACKORDER">הזמנה חוזרת</SelectItem>
              <SelectItem value="DISCONTINUED">הופסק</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(data.availability === "PRE_ORDER" || data.availability === "BACKORDER") && (
          <div className="space-y-2">
            <Label htmlFor="availableDate">תאריך זמינות</Label>
            <Input
              id="availableDate"
              type="datetime-local"
              value={data.availableDate}
              onChange={(e) => onChange({ availableDate: e.target.value })}
            />
          </div>
        )}

        {/* אפשרויות נוספות */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="trackInventory" className="cursor-pointer">
                המשך מכירה כשאין במלאי
              </Label>
              <p className="text-xs text-gray-500">
                הלקוחות יוכלו להזמין גם כשהמלאי אפס
              </p>
            </div>
            <Switch
              id="sellWhenSoldOut"
              checked={data.sellWhenSoldOut}
              onCheckedChange={(checked) => onChange({ sellWhenSoldOut: checked as boolean })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="priceByWeight" className="cursor-pointer">
                זהו מוצר נמכר לפי משקל
              </Label>
              <p className="text-xs text-gray-500">
                המחיר יחושב לפי משקל (ק"ג) במקום כמות יח'
              </p>
            </div>
            <Switch
              id="priceByWeight"
              checked={data.priceByWeight}
              onCheckedChange={(checked) => onChange({ priceByWeight: checked as boolean })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showPricePer100ml" className="cursor-pointer">
                  האם לרשום מחיר ל-100 מ״ל
                </Label>
                <p className="text-xs text-gray-500">
                  הלקוחות יראו את המחיר ל-100 מ״ל לצד המחיר הרגיל
                </p>
              </div>
              <Switch
                id="showPricePer100ml"
                checked={data.showPricePer100ml}
                onCheckedChange={(checked) => onChange({ showPricePer100ml: checked as boolean })}
              />
            </div>
            {data.showPricePer100ml && (
              <div className="space-y-2 pr-4">
                <Label htmlFor="pricePer100ml">מחיר ל-100 מ״ל (₪)</Label>
                <Input
                  id="pricePer100ml"
                  type="number"
                  step="0.01"
                  min="0"
                  value={data.pricePer100ml}
                  onChange={(e) => onChange({ pricePer100ml: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

