"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Workflow,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"

interface Automation {
  id: string
  name: string
  description: string | null
  isActive: boolean
  trigger: {
    type: string
  }
  createdAt: string
  updatedAt: string
  _count: {
    logs: number
  }
}

export default function AutomationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [automationToDelete, setAutomationToDelete] = useState<string | null>(null)

  useEffect(() => {
    if (selectedShop) {
      fetchAutomations()
    }
  }, [selectedShop])

  const fetchAutomations = async () => {
    if (!selectedShop) return

    try {
      setLoading(true)
      const response = await fetch(`/api/automations?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setAutomations(data || [])
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את האוטומציות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching automations:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת האוטומציות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (automationId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/automations/${automationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: currentStatus ? "האוטומציה הושבתה" : "האוטומציה הופעלה",
        })
        fetchAutomations()
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לעדכן את סטטוס האוטומציה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error toggling automation:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון האוטומציה",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!automationToDelete) return

    try {
      const response = await fetch(`/api/automations/${automationToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "האוטומציה נמחקה בהצלחה",
        })
        setDeleteDialogOpen(false)
        setAutomationToDelete(null)
        fetchAutomations()
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן למחוק את האוטומציה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting automation:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת האוטומציה",
        variant: "destructive",
      })
    }
  }

  const getEventTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      "order.created": "הזמנה נוצרה",
      "order.paid": "הזמנה שולמה",
      "order.shipped": "הזמנה נשלחה",
      "order.delivered": "הזמנה נמסרה",
      "order.cancelled": "הזמנה בוטלה",
      "cart.abandoned": "עגלה ננטשה",
      "customer.created": "לקוח נוצר",
      "customer.subscribed": "לקוח נרשם לניוזלטר",
      "product.created": "מוצר נוצר",
      "product.updated": "מוצר עודכן",
      "inventory.low_stock": "מלאי נמוך",
      "inventory.out_of_stock": "מלאי אזל",
    }
    return labels[type] || type
  }

  const filteredAutomations = automations.filter((automation) =>
    automation.name.toLowerCase().includes(search.toLowerCase()) ||
    automation.description?.toLowerCase().includes(search.toLowerCase())
  )

  if (!selectedShop) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">אנא בחר חנות</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">אוטומציות</h1>
            <p className="text-gray-500 mt-1">
              בנה אוטומציות שיפעלו אוטומטית בהתאם לאירועים בחנות שלך
            </p>
          </div>
          <Button
            onClick={() => router.push("/automations/new")}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            אוטומציה חדשה
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="חפש אוטומציות..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Automations List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : filteredAutomations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Workflow className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                אין אוטומציות
              </h3>
              <p className="text-gray-500 mb-6 text-center">
                {search
                  ? "לא נמצאו אוטומציות התואמות לחיפוש"
                  : "התחל בבניית אוטומציה ראשונה שלך"}
              </p>
              {!search && (
                <Button onClick={() => router.push("/automations/new")}>
                  <Plus className="w-4 h-4 ml-2" />
                  צור אוטומציה חדשה
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAutomations.map((automation) => (
              <Card key={automation.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{automation.name}</CardTitle>
                        <Badge
                          variant={automation.isActive ? "default" : "secondary"}
                          className="gap-1"
                        >
                          {automation.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              פעילה
                            </>
                          ) : (
                            <>
                              <Pause className="w-3 h-3" />
                              מושבתת
                            </>
                          )}
                        </Badge>
                      </div>
                      {automation.description && (
                        <p className="text-sm text-gray-500 mb-3">
                          {automation.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Workflow className="w-4 h-4" />
                          <span>{getEventTypeLabel(automation.trigger.type)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {new Date(automation.updatedAt).toLocaleDateString("he-IL")}
                          </span>
                        </div>
                        {automation._count.logs > 0 && (
                          <div className="flex items-center gap-1">
                            <span>{automation._count.logs} הרצות</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={automation.isActive}
                        onCheckedChange={() =>
                          handleToggleActive(automation.id, automation.isActive)
                        }
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/automations/${automation.id}`)}
                          >
                            <Edit className="w-4 h-4 ml-2" />
                            ערוך
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAutomationToDelete(automation.id)
                              setDeleteDialogOpen(true)
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 ml-2" />
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת אוטומציה</DialogTitle>
            <DialogDescription>
              האם אתה בטוח שברצונך למחוק את האוטומציה הזו? פעולה זו לא ניתנת לביטול.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setAutomationToDelete(null)
              }}
            >
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              מחק
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

