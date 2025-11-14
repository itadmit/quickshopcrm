"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tag, Plus, X } from "lucide-react"

interface TagsCardProps {
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}

export function TagsCard({ tags, onAdd, onRemove }: TagsCardProps) {
  const [newTag, setNewTag] = useState("")

  const handleAdd = () => {
    if (newTag.trim()) {
      onAdd(newTag.trim())
      setNewTag("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          תגיות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="הוסף תגית"
          />
          <Button onClick={handleAdd} size="sm" type="button">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <button
                type="button"
                onClick={() => onRemove(tag)}
                className="ml-1 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

