"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge, Plus, Trash2 } from "lucide-react"

interface ProductBadge {
  id: string
  text: string
  color: string
  discountPercent?: number
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left"
}

interface BadgesCardProps {
  badges: ProductBadge[]
  onChange: (badges: ProductBadge[]) => void
}

const PRESET_COLORS = [
  { value: "#EF4444", label: "אדום" },
  { value: "#F97316", label: "כתום" },
  { value: "#22C55E", label: "ירוק" },
  { value: "#3B82F6", label: "כחול" },
  { value: "#A855F7", label: "סגול" },
  { value: "#EC4899", label: "ורוד" },
]

export function BadgesCard({ badges, onChange }: BadgesCardProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newBadge, setNewBadge] = useState<ProductBadge>({
    id: "",
    text: "",
    color: "#EF4444",
    discountPercent: undefined,
    position: "top-right",
  })

  const addBadge = () => {
    if (!newBadge.text.trim()) return

    const badge: ProductBadge = {
      ...newBadge,
      id: `badge-${Date.now()}`,
    }

    onChange([...badges, badge])
    setNewBadge({
      id: "",
      text: "",
      color: "#EF4444",
      discountPercent: undefined,
      position: "top-right",
    })
    setShowAddForm(false)
  }

  const removeBadge = (id: string) => {
    onChange(badges.filter(b => b.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge className="w-5 h-5" />
          מדבקות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          הוסף מדבקות למוצר להציג מבצעים, חידושים וסטיקרים נוספים בחנות.
        </p>

        {/* תצוגה מקדימה */}
        {badges.length > 0 && (
          <div className="space-y-2">
            <Label>תצוגה מקדימה - כל המדבקות</Label>
            <div className="border rounded-lg p-4 bg-gray-50 min-h-[200px] relative">
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                תמונת מוצר
              </div>
              {/* Group badges by position */}
              {Object.entries(
                badges.reduce((acc, badge) => {
                  if (!acc[badge.position]) acc[badge.position] = []
                  acc[badge.position].push(badge)
                  return acc
                }, {} as Record<string, ProductBadge[]>)
              ).map(([position, badgesInPosition]) => {
                const positionStyles = {
                  "top-right": "top-2 right-2",
                  "top-left": "top-2 left-2",
                  "bottom-right": "bottom-2 right-2",
                  "bottom-left": "bottom-2 left-2",
                }

                return (
                  <div
                    key={position}
                    className={`absolute ${positionStyles[position as keyof typeof positionStyles]} z-10 flex flex-col gap-1`}
                  >
                    {badgesInPosition.map((badge: any) => (
                      <div
                        key={badge.id}
                        className="px-3 py-1 rounded-md text-white text-sm font-semibold shadow-lg"
                        style={{ backgroundColor: badge.color }}
                      >
                        {badge.text}
                        {badge.discountPercent && ` ${badge.discountPercent}% הנחה`}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* רשימת מדבקות */}
        {badges.length > 0 && (
          <div className="space-y-2">
            {badges.map((badge: any) => (
              <div
                key={badge.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-white"
              >
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: badge.color }}
                />
                <div className="flex-1">
                  <div className="font-medium">{badge.text}</div>
                  {badge.discountPercent && (
                    <div className="text-sm text-gray-600">{badge.discountPercent}% הנחה</div>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {badge.position === "top-right" && "ימין למעלה"}
                  {badge.position === "top-left" && "שמאל למעלה"}
                  {badge.position === "bottom-right" && "ימין למטה"}
                  {badge.position === "bottom-left" && "שמאל למטה"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBadge(badge.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* טופס הוספת מדבקה */}
        {showAddForm ? (
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <div className="space-y-2">
              <Label htmlFor="badge-text">טקסט</Label>
              <Input
                id="badge-text"
                value={newBadge.text}
                onChange={(e) => setNewBadge({ ...newBadge, text: e.target.value })}
                placeholder="לדוגמה: חדש, מבצע, 60% הנחה"
              />
            </div>

            <div className="space-y-2">
              <Label>צבע</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={newBadge.color}
                  onChange={(e) => setNewBadge({ ...newBadge, color: e.target.value })}
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={newBadge.color}
                  onChange={(e) => setNewBadge({ ...newBadge, color: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2 flex-wrap mt-2">
                <Label className="text-xs text-gray-600 w-full">צבעים מוכנים:</Label>
                {PRESET_COLORS.map((color: any) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewBadge({ ...newBadge, color: color.value })}
                    className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: color.value,
                      borderColor: newBadge.color === color.value ? "#000" : "transparent",
                    }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge-discount">אחוז הנחה (אופציונלי)</Label>
              <Input
                id="badge-discount"
                type="number"
                value={newBadge.discountPercent || ""}
                onChange={(e) => setNewBadge({
                  ...newBadge,
                  discountPercent: e.target.value ? parseInt(e.target.value) : undefined
                })}
                placeholder="60"
                min="0"
                max="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge-position">מיקום</Label>
              <Select
                value={newBadge.position}
                onValueChange={(value: any) => setNewBadge({ ...newBadge, position: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-right">ימין למעלה</SelectItem>
                  <SelectItem value="top-left">שמאל למעלה</SelectItem>
                  <SelectItem value="bottom-right">ימין למטה</SelectItem>
                  <SelectItem value="bottom-left">שמאל למטה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button type="button" onClick={addBadge} className="flex-1">
                הוסף מדבקה
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                ביטול
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddForm(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף מדבקה נוספת
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

