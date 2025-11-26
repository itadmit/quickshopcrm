"use client"

import { useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Package, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Truck,
  MapPin,
  Phone,
  Calendar,
  AlertCircle
} from "lucide-react"

interface TrackingEvent {
  date: Date
  status: string
  description: string
  location?: string
}

interface TrackingInfo {
  orderNumber: string
  trackingNumber?: string
  status: 'pending' | 'sent' | 'in_transit' | 'delivered' | 'cancelled' | 'failed' | 'returned'
  statusText: string
  lastUpdate?: Date
  location?: string
  estimatedDelivery?: Date
  driverName?: string
  driverPhone?: string
  events?: TrackingEvent[]
  providerName?: string
}

const statusConfig = {
  pending: { icon: Clock, color: "bg-yellow-100 text-yellow-800", text: "בהמתנה" },
  sent: { icon: Package, color: "bg-blue-100 text-blue-800", text: "נשלח" },
  in_transit: { icon: Truck, color: "bg-purple-100 text-purple-800", text: "בדרך" },
  delivered: { icon: CheckCircle2, color: "bg-green-100 text-green-800", text: "נמסר" },
  cancelled: { icon: XCircle, color: "bg-red-100 text-red-800", text: "בוטל" },
  failed: { icon: AlertCircle, color: "bg-red-100 text-red-800", text: "נכשל" },
  returned: { icon: Package, color: "bg-orange-100 text-orange-800", text: "הוחזר" },
}

export default function TrackOrderPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const shopSlug = params.slug as string
  
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '')
  const [phone, setPhone] = useState(searchParams.get('phone') || '')
  const [loading, setLoading] = useState(false)
  const [tracking, setTracking] = useState<TrackingInfo | null>(null)
  const [error, setError] = useState('')

  const handleTrack = async () => {
    if (!orderNumber.trim()) {
      setError('נא להזין מספר הזמנה')
      return
    }

    setLoading(true)
    setError('')
    setTracking(null)

    try {
      const response = await fetch(
        `/api/storefront/${shopSlug}/track?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'שגיאה בבדיקת סטטוס')
        return
      }

      setTracking(data)
    } catch (err) {
      console.error('Track error:', err)
      setError('אירעה שגיאה בבדיקת סטטוס ההזמנה')
    } finally {
      setLoading(false)
    }
  }

  const StatusIcon = tracking ? statusConfig[tracking.status]?.icon || Clock : Clock
  const statusStyle = tracking ? statusConfig[tracking.status]?.color : ''

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Package className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            מעקב אחר הזמנה
          </h1>
          <p className="text-gray-600">
            הזן את פרטי ההזמנה כדי לעקוב אחר המשלוח
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>פרטי הזמנה</CardTitle>
            <CardDescription>
              הזן את מספר ההזמנה ומספר הטלפון שבאמצעותם בוצעה ההזמנה
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orderNumber">מספר הזמנה *</Label>
              <Input
                id="orderNumber"
                placeholder="לדוגמה: 12345"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                dir="ltr"
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">מספר טלפון (אופציונלי)</Label>
              <Input
                id="phone"
                placeholder="050-1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                dir="ltr"
                className="text-right"
              />
              <p className="text-xs text-gray-500">
                לאימות נוסף (לא חובה)
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button
              onClick={handleTrack}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 ml-2 animate-spin" />
                  מחפש...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 ml-2" />
                  חפש הזמנה
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Tracking Results */}
        {tracking && (
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${statusStyle}`}>
                      <StatusIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle>הזמנה #{tracking.orderNumber}</CardTitle>
                      <CardDescription>{tracking.statusText}</CardDescription>
                    </div>
                  </div>
                  <Badge className={statusStyle}>
                    {statusConfig[tracking.status]?.text || tracking.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {tracking.trackingNumber && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">מספר מעקב:</span>
                    <span className="font-mono font-semibold" dir="ltr">
                      {tracking.trackingNumber}
                    </span>
                  </div>
                )}

                {tracking.providerName && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">חברת משלוחים:</span>
                    <span className="font-semibold">{tracking.providerName}</span>
                  </div>
                )}

                {tracking.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">מיקום נוכחי:</span>
                    <span className="font-medium">{tracking.location}</span>
                  </div>
                )}

                {tracking.estimatedDelivery && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">זמן אספקה משוער:</span>
                    <span className="font-medium">
                      {new Date(tracking.estimatedDelivery).toLocaleDateString('he-IL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}

                {tracking.driverName && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">פרטי שליח</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-blue-800">
                        <span className="font-medium">שם:</span> {tracking.driverName}
                      </p>
                      {tracking.driverPhone && (
                        <div className="flex items-center gap-2 text-blue-800">
                          <Phone className="w-4 h-4" />
                          <span dir="ltr">{tracking.driverPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {tracking.lastUpdate && (
                  <p className="text-xs text-gray-500 text-center">
                    עדכון אחרון: {new Date(tracking.lastUpdate).toLocaleString('he-IL')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            {tracking.events && tracking.events.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>היסטוריית משלוח</CardTitle>
                  <CardDescription>
                    כל העדכונים והאירועים של המשלוח
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tracking.events.map((event, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                          {index < tracking.events!.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 my-1" style={{ minHeight: '40px' }} />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-medium text-gray-900">{event.status}</p>
                            <span className="text-xs text-gray-500">
                              {new Date(event.date).toLocaleString('he-IL', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{event.description}</p>
                          {event.location && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Help Text */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-blue-900">
                <p className="font-medium">זקוק לעזרה?</p>
                <p>
                  אם אתה מתקשה למצוא את מספר ההזמנה, חפש במייל האישור שקיבלת לאחר ביצוע ההזמנה.
                  לשאלות נוספות, ניתן ליצור קשר עם שירות הלקוחות.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


