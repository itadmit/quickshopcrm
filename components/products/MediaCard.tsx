"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MediaPicker } from "@/components/MediaPicker"
import { Image as ImageIcon, Upload, X } from "lucide-react"

interface MediaCardProps {
  images: string[]
  shopId?: string
  entityId?: string
  onSelect: (files: string[]) => void
  onRemove: (index: number) => void
  mediaPickerOpen: boolean
  onMediaPickerChange: (open: boolean) => void
}

export function MediaCard({
  images,
  shopId,
  entityId = "new",
  onSelect,
  onRemove,
  mediaPickerOpen,
  onMediaPickerChange,
}: MediaCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          תמונות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image}
                alt={`תמונה ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onMediaPickerChange(true)}
            className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-32 cursor-pointer hover:border-gray-400 transition-colors"
          >
            <div className="text-center">
              <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">בחר תמונות</p>
            </div>
          </button>
        </div>
        <MediaPicker
          open={mediaPickerOpen}
          onOpenChange={onMediaPickerChange}
          onSelect={onSelect}
          selectedFiles={images}
          shopId={shopId}
          entityType="products"
          entityId={entityId}
          multiple={true}
          title="בחר תמונות למוצר"
        />
      </CardContent>
    </Card>
  )
}

