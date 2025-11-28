"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MediaPicker } from "@/components/MediaPicker"
import { Image as ImageIcon, Upload, X, Star, GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"

interface MediaCardProps {
  images: string[]
  shopId?: string
  entityId?: string
  onSelect: (files: string[]) => void
  onRemove: (index: number) => void
  onReorder: (newOrder: string[]) => void
  mediaPickerOpen: boolean
  onMediaPickerChange: (open: boolean) => void
}

function SortableImageItem({
  image,
  index,
  isPrimary,
  onRemove,
  onSetPrimary,
}: {
  image: string
  index: number
  isPrimary: boolean
  onRemove: (index: number) => void
  onSetPrimary: (index: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <img
        src={image}
        alt={`תמונה ${index + 1}`}
        className="w-full h-32 object-cover rounded-lg border-2 pointer-events-none"
        style={{
          borderColor: isPrimary ? "#10b981" : "#e5e7eb",
        }}
        draggable={false}
      />
      {isPrimary && (
        <Badge className="absolute top-2 right-2 bg-emerald-600 text-white text-xs px-2 py-0.5">
          <Star className="w-3 h-3 ml-1 fill-current" />
          ראשית
        </Badge>
      )}
      <div className="absolute top-2 left-2 flex gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="bg-gray-800/80 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          title="גרור לשינוי סדר"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3" />
        </button>
        {!isPrimary && (
          <button
            type="button"
            onClick={() => onSetPrimary(index)}
            className="bg-blue-600/80 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            title="הגדר כתמונה ראשית"
          >
            <Star className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="bg-red-500/80 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="מחק"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

export function MediaCard({
  images,
  shopId,
  entityId = "new",
  onSelect,
  onRemove,
  onReorder,
  mediaPickerOpen,
  onMediaPickerChange,
}: MediaCardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    if (active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img === active.id)
      const newIndex = images.findIndex((img) => img === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(images, oldIndex, newIndex)
        onReorder(newOrder)
      }
    }
  }

  const handleSetPrimary = (index: number) => {
    if (index === 0) return // כבר ראשית
    const newOrder = [images[index], ...images.filter((_, i) => i !== index)]
    onReorder(newOrder)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          תמונות
        </CardTitle>
        {images.length > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            התמונה הראשונה תוצג ככיסוי המוצר. גרור תמונות לשינוי סדר.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <SortableImageItem
                  key={image}
                  image={image}
                  index={index}
                  isPrimary={index === 0}
                  onRemove={onRemove}
                  onSetPrimary={handleSetPrimary}
                />
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
          </SortableContext>
        </DndContext>
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

