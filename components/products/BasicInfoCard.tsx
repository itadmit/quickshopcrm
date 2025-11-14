"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Package } from "lucide-react"

interface BasicInfoData {
  name: string
  description: string
}

interface BasicInfoCardProps {
  data: BasicInfoData
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
}

export function BasicInfoCard({ data, onNameChange, onDescriptionChange }: BasicInfoCardProps) {
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
      </CardContent>
    </Card>
  )
}

