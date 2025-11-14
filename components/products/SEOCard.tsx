"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search } from "lucide-react"

interface SEOData {
  seoTitle: string
  slug: string
  seoDescription: string
}

interface SEOCardProps {
  data: SEOData
  onChange: (data: Partial<SEOData>) => void
}

export function SEOCard({ data, onChange }: SEOCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          SEO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="seoTitle">כותרת SEO</Label>
          <Input
            id="seoTitle"
            value={data.seoTitle}
            onChange={(e) => onChange({ seoTitle: e.target.value })}
            placeholder="כותרת לדפדפן ומנועי חיפוש"
            maxLength={60}
          />
          <p className="text-xs text-gray-500">
            {data.seoTitle?.length || 0} / 60 תווים
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="slug">כתובת URL (Slug)</Label>
          <Input
            id="slug"
            value={data.slug}
            onChange={(e) => onChange({ slug: e.target.value })}
            placeholder="לדוגמה: חולצת-טי-שירט"
          />
          <p className="text-sm text-gray-500">
            השאר ריק כדי ליצור אוטומטית מהשם
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="seoDescription">תיאור SEO</Label>
          <Textarea
            id="seoDescription"
            value={data.seoDescription}
            onChange={(e) => onChange({ seoDescription: e.target.value })}
            placeholder="תיאור קצר למנועי חיפוש..."
            rows={3}
            maxLength={160}
          />
          <p className="text-xs text-gray-500">
            {data.seoDescription?.length || 0} / 160 תווים
          </p>
        </div>

        {/* Google Preview */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2">תצוגה מקדימה בגוגל</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="text-gray-400">›</span>
              <span className="text-gray-500 truncate">
                {data.slug || "product-slug"}
              </span>
            </div>
            <h3 className="text-lg text-blue-600 hover:underline cursor-pointer line-clamp-1">
              {data.seoTitle || "כותרת המוצר"}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {data.seoDescription || "תיאור המוצר יופיע כאן..."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

