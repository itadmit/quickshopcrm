"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Checkbox } from "@/components/ui/checkbox"
import { Package, Gift } from "lucide-react"

interface BasicInfoData {
  name: string
  description: string
  isGiftCard?: boolean
}

interface BasicInfoCardProps {
  data: BasicInfoData
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onIsGiftCardChange?: (isGiftCard: boolean) => void
}

export function BasicInfoCard({ data, onNameChange, onDescriptionChange, onIsGiftCardChange }: BasicInfoCardProps) {
  return (
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
            value={data.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="לדוגמה: חולצת טי שירט"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">תיאור</Label>
          <RichTextEditor
            value={data.description}
            onChange={onDescriptionChange}
            placeholder="תיאור מפורט של המוצר..."
          />
        </div>

        {onIsGiftCardChange && (
          <div className="flex items-center space-x-2 space-x-reverse pt-2 border-t">
            <Checkbox
              id="isGiftCard"
              checked={data.isGiftCard || false}
              onCheckedChange={(checked) => onIsGiftCardChange(checked === true)}
            />
            <Label
              htmlFor="isGiftCard"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              זהו מוצר Gift Card (כרטיס מתנה)
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

