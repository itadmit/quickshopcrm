"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Gift } from "lucide-react"

interface GiftCardFormData {
  recipientName: string
  recipientEmail: string
  recipientPhone: string
  senderName: string
  message: string
}

interface GiftCardFormProps {
  data: GiftCardFormData
  onChange: (data: GiftCardFormData) => void
  variantPrice?: number
}

export function GiftCardForm({ data, onChange, variantPrice }: GiftCardFormProps) {
  const updateField = (field: keyof GiftCardFormData, value: string) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  return (
    <Card className="border-2 border-dashed border-purple-200 bg-purple-50/50">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">פרטי כרטיס המתנה</h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipientName">
                שם הנמען <span className="text-red-500">*</span>
              </Label>
              <Input
                id="recipientName"
                value={data.recipientName}
                onChange={(e) => updateField("recipientName", e.target.value)}
                placeholder="שם הנמען"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientEmail">
                אימייל הנמען <span className="text-red-500">*</span>
              </Label>
              <Input
                id="recipientEmail"
                type="email"
                value={data.recipientEmail}
                onChange={(e) => updateField("recipientEmail", e.target.value)}
                placeholder="recipient@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientPhone">טלפון הנמען</Label>
            <Input
              id="recipientPhone"
              type="tel"
              value={data.recipientPhone}
              onChange={(e) => updateField("recipientPhone", e.target.value)}
              placeholder="05X-XXXXXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="senderName">שם השולח</Label>
            <Input
              id="senderName"
              value={data.senderName}
              onChange={(e) => updateField("senderName", e.target.value)}
              placeholder="שם השולח (אופציונלי)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">ברכה אישית</Label>
            <Textarea
              id="message"
              value={data.message}
              onChange={(e) => updateField("message", e.target.value)}
              placeholder="כתוב ברכה אישית לנמען..."
              rows={4}
            />
          </div>

          {variantPrice && (
            <div className="pt-4 border-t border-purple-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">סכום כרטיס המתנה:</span>
                <span className="text-xl font-bold text-purple-600">
                  ₪{variantPrice.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}



