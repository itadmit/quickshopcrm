"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

interface StatusCardProps {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  onChange: (status: "DRAFT" | "PUBLISHED" | "ARCHIVED") => void
  scheduledPublishDate?: string
  onScheduledPublishDateChange?: (date: string) => void
  notifyOnPublish?: boolean
  onNotifyOnPublishChange?: (notify: boolean) => void
}

export function StatusCard({ 
  status, 
  onChange,
  scheduledPublishDate,
  onScheduledPublishDateChange,
  notifyOnPublish,
  onNotifyOnPublishChange
}: StatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>סטטוס</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="status">סטטוס פרסום</Label>
          <Select value={status} onValueChange={(value: any) => onChange(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">טיוטה</SelectItem>
              <SelectItem value="PUBLISHED">פורסם</SelectItem>
              <SelectItem value="ARCHIVED">ארכיון</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* תזמון פרסום */}
        <div className="border-t pt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scheduledPublishDate">תזמון פרסום</Label>
            <Input
              id="scheduledPublishDate"
              type="datetime-local"
              value={scheduledPublishDate || ""}
              onChange={(e) => onScheduledPublishDateChange?.(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              השאר ריק לפרסום מיידי
            </p>
          </div>

          {scheduledPublishDate && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="notifyOnPublish"
                checked={notifyOnPublish || false}
                onCheckedChange={(checked) => onNotifyOnPublishChange?.(checked as boolean)}
              />
              <Label htmlFor="notifyOnPublish" className="cursor-pointer text-sm">
                עדכן אותי במייל כשהמוצר עולה
              </Label>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

