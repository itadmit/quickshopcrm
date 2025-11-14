"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "@/components/providers/ShopProvider"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { TableSkeleton } from "@/components/skeletons/TableSkeleton"
import { Webhook, Search, Plus, Globe, CheckCircle, XCircle, Calendar } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"

interface WebhookItem {
  id: string
  url: string
  events: string[]
  isActive: boolean
  secret: string | null
  lastTriggeredAt: string | null
  createdAt: string
}

export default function WebhooksPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedShop } = useShop()
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (selectedShop) {
      fetchWebhooks()
    }
  }, [selectedShop])

  const fetchWebhooks = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      const response = await fetch(`/api/webhooks?shopId=${selectedShop.id}`)
      if (response.ok) {
        const data = await response.json()
        setWebhooks(data)
      }
    } catch (error) {
      console.error("Error fetching webhooks:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את ה-Webhooks",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "ה-Webhook עודכן בהצלחה",
        })
        fetchWebhooks()
      }
    } catch (error) {
      console.error("Error toggling webhook:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון ה-Webhook",
        variant: "destructive",
      })
    }
  }

  const filteredWebhooks = webhooks.filter((webhook) =>
    webhook.url.toLowerCase().includes(search.toLowerCase())
  )

  if (!selectedShop) {
    return (
      <AppLayout title="Webhooks">
        <div className="text-center py-12">
          <Webhook className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            אין חנות נבחרת
          </h3>
          <p className="text-gray-600">
            יש לבחור חנות מההדר לפני ניהול Webhooks
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Webhooks">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
            <p className="text-gray-600 mt-1">
              נהל Webhooks לקבלת עדכונים על אירועים בחנות
            </p>
          </div>
          <Button
            onClick={() => router.push("/webhooks/new")}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            Webhook חדש
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="חיפוש לפי URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Webhooks List */}
        {loading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : filteredWebhooks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Webhook className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">אין Webhooks</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredWebhooks.map((webhook) => (
              <Card key={webhook.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Globe className="w-5 h-5 text-gray-400" />
                        <span className="font-mono text-sm">{webhook.url}</span>
                        {webhook.isActive ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 ml-1" />
                            פעיל
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="w-3 h-3 ml-1" />
                            לא פעיל
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 mt-4">
                        <div>
                          <p className="text-sm font-medium mb-1">אירועים:</p>
                          <div className="flex flex-wrap gap-2">
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="secondary">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {webhook.lastTriggeredAt && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            הופעל לאחרונה:{" "}
                            {format(new Date(webhook.lastTriggeredAt), "dd/MM/yyyy HH:mm", {
                              locale: he,
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleWebhook(webhook.id, webhook.isActive)}
                      >
                        {webhook.isActive ? "השבת" : "הפעל"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/webhooks/${webhook.id}/edit`)}
                      >
                        ערוך
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

