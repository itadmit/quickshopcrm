"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Save,
  X,
  Clock,
  CheckCircle,
  Package,
  Truck,
  PackageCheck,
  XCircle,
  RotateCcw,
  AlertCircle,
} from "lucide-react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

interface OrderStatus {
  id: string
  key: string
  label: string
  labelEn: string | null
  color: string
  icon: string | null
  description: string | null
  isDefault: boolean
  isSystem: boolean
  position: number
  isActive: boolean
}

const ICON_OPTIONS = [
  { value: "Clock", label: "שעון", icon: Clock },
  { value: "CheckCircle", label: "V במעגל", icon: CheckCircle },
  { value: "Package", label: "חבילה", icon: Package },
  { value: "Truck", label: "משאית", icon: Truck },
  { value: "PackageCheck", label: "חבילה מאושרת", icon: PackageCheck },
  { value: "XCircle", label: "X במעגל", icon: XCircle },
  { value: "RotateCcw", label: "חץ חוזר", icon: RotateCcw },
  { value: "AlertCircle", label: "אזהרה", icon: AlertCircle },
]

export default function OrderStatusesPage() {
  const { toast } = useToast()
  const [statuses, setStatuses] = useState<OrderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<OrderStatus | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [key, setKey] = useState("")
  const [label, setLabel] = useState("")
  const [labelEn, setLabelEn] = useState("")
  const [color, setColor] = useState("#3B82F6")
  const [icon, setIcon] = useState("Package")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    fetchStatuses()
  }, [])

  const fetchStatuses = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/order-statuses")
      if (response.ok) {
        const data = await response.json()
        setStatuses(data)
      }
    } catch (error) {
      console.error("Error fetching statuses:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את רשימת הסטטוסים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return

    const items = Array.from(statuses)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index,
    }))

    setStatuses(updatedItems)

    // Save new positions to server
    try {
      await Promise.all(
        updatedItems.map((item) =>
          fetch(`/api/order-statuses/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: item.position }),
          })
        )
      )
    } catch (error) {
      console.error("Error updating positions:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את סדר הסטטוסים",
        variant: "destructive",
      })
      fetchStatuses() // Reload to get correct order
    }
  }

  const openDialog = (status?: OrderStatus) => {
    if (status) {
      setEditingStatus(status)
      setKey(status.key)
      setLabel(status.label)
      setLabelEn(status.labelEn || "")
      setColor(status.color)
      setIcon(status.icon || "Package")
      setDescription(status.description || "")
      setIsActive(status.isActive)
    } else {
      setEditingStatus(null)
      setKey("")
      setLabel("")
      setLabelEn("")
      setColor("#3B82F6")
      setIcon("Package")
      setDescription("")
      setIsActive(true)
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!label.trim()) {
      toast({
        title: "שגיאה",
        description: "יש למלא את שם הסטטוס",
        variant: "destructive",
      })
      return
    }

    if (!editingStatus && !key.trim()) {
      toast({
        title: "שגיאה",
        description: "יש למלא את מזהה הסטטוס באנגלית",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const body = {
        key: editingStatus ? undefined : key.toUpperCase().replace(/\s+/g, "_"),
        label,
        labelEn: labelEn || undefined,
        color,
        icon,
        description: description || undefined,
        isActive,
      }

      const url = editingStatus
        ? `/api/order-statuses/${editingStatus.id}`
        : "/api/order-statuses"
      const method = editingStatus ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: editingStatus
            ? "הסטטוס עודכן בהצלחה"
            : "הסטטוס נוצר בהצלחה",
        })
        setDialogOpen(false)
        fetchStatuses()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לשמור את הסטטוס",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving status:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת הסטטוס",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (status: OrderStatus) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הסטטוס "${status.label}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/order-statuses/${status.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הסטטוס נמחק בהצלחה",
        })
        fetchStatuses()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן למחוק את הסטטוס",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting status:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הסטטוס",
        variant: "destructive",
      })
    }
  }

  const getIconComponent = (iconName: string) => {
    const iconOption = ICON_OPTIONS.find((opt) => opt.value === iconName)
    return iconOption ? iconOption.icon : Package
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">סטטוסי הזמנות</h1>
            <p className="text-gray-600 mt-2">
              נהל את הסטטוסים להזמנות בחנות שלך
            </p>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="ml-2 h-4 w-4" />
            הוסף סטטוס
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>רשימת סטטוסים</CardTitle>
            <CardDescription>
              גרור את הסטטוסים כדי לשנות את הסדר שלהם
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">טוען...</div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="statuses">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {statuses.map((status, index) => {
                        const IconComponent = getIconComponent(status.icon || "Package")
                        return (
                          <Draggable
                            key={status.id}
                            draggableId={status.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center gap-4 p-4 border rounded-lg ${
                                  snapshot.isDragging ? "shadow-lg" : ""
                                } ${!status.isActive ? "opacity-50" : ""}`}
                              >
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-5 w-5 text-gray-400" />
                                </div>

                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: status.color + "20" }}
                                >
                                  <IconComponent
                                    className="h-5 w-5"
                                    style={{ color: status.color }}
                                  />
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{status.label}</h3>
                                    {status.isSystem && (
                                      <Badge variant="secondary">מערכת</Badge>
                                    )}
                                    {status.isDefault && (
                                      <Badge variant="outline">ברירת מחדל</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    {status.key}
                                    {status.description && ` • ${status.description}`}
                                  </p>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDialog(status)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {!status.isSystem && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(status)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingStatus ? "ערוך סטטוס" : "הוסף סטטוס חדש"}
              </DialogTitle>
              <DialogDescription>
                {editingStatus
                  ? "ערוך את פרטי הסטטוס"
                  : "הגדר סטטוס חדש להזמנות"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {!editingStatus && (
                <div>
                  <Label htmlFor="key">מזהה (באנגלית, ללא רווחים)</Label>
                  <Input
                    id="key"
                    value={key}
                    onChange={(e) =>
                      setKey(e.target.value.toUpperCase().replace(/\s+/g, "_"))
                    }
                    placeholder="MY_CUSTOM_STATUS"
                    disabled={editingStatus?.isSystem}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="label">שם הסטטוס (עברית) *</Label>
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="הסטטוס שלי"
                />
              </div>

              <div>
                <Label htmlFor="labelEn">שם הסטטוס (אנגלית)</Label>
                <Input
                  id="labelEn"
                  value={labelEn}
                  onChange={(e) => setLabelEn(e.target.value)}
                  placeholder="My Status"
                />
              </div>

              <div>
                <Label htmlFor="color">צבע</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="icon">אייקון</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">תיאור (אופציונלי)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="תיאור קצר של הסטטוס"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">פעיל</Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                ביטול
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "שומר..." : "שמור"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}



