"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  UserPlus, 
  FileText,
  Calendar,
  Coins,
  Receipt,
  X,
  Mail,
  Phone,
  MapPin
} from "lucide-react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  entityType?: string | null
  entityId?: string | null
  entityDetails?: any
}

interface NotificationsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationsDrawer({ open, onOpenChange }: NotificationsDrawerProps) {
  const router = useRouter()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string, navigateToEntity = false) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead: true }),
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true }))
        )
        fetchNotifications()
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id, true)

    if (notification.entityType && notification.entityId) {
      onOpenChange(false)
      switch (notification.entityType) {
        case 'lead':
          router.push(`/leads/${notification.entityId}`)
          break
        case 'quote':
          router.push(`/quotes/${notification.entityId}`)
          break
        case 'payment':
          router.push(`/payments`)
          break
        case 'client':
          router.push(`/clients/${notification.entityId}`)
          break
        case 'project':
          router.push(`/projects`)
          break
        case 'task':
          router.push(`/tasks/my`)
          break
      }
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task':
        return CheckCircle2
      case 'meeting':
        return Calendar
      case 'lead':
        return UserPlus
      case 'document':
        return FileText
      case 'reminder':
        return Clock
      case 'quote':
        return Receipt
      case 'payment':
        return Coins
      default:
        return Bell
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'text-blue-600 bg-blue-100'
      case 'meeting':
        return 'text-emerald-600 bg-emerald-100'
      case 'lead':
        return 'text-green-600 bg-green-100'
      case 'document':
        return 'text-cyan-600 bg-cyan-100'
      case 'reminder':
        return 'text-orange-600 bg-orange-100'
      case 'quote':
        return 'text-indigo-600 bg-indigo-100'
      case 'payment':
        return 'text-emerald-600 bg-emerald-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatNotificationDetails = (notification: Notification) => {
    if (!notification.entityDetails) return null

    switch (notification.entityType) {
      case 'lead':
        const lead = notification.entityDetails
        return (
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{lead.name}</span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                {lead.email}
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4" />
                {lead.phone}
              </div>
            )}
            {lead.source && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                מקור: {lead.source}
              </div>
            )}
          </div>
        )
      case 'quote':
        const quote = notification.entityDetails
        return (
          <div className="mt-2 space-y-1 text-sm">
            <div className="font-medium text-gray-900">#{quote.quoteNumber}</div>
            {quote.title && (
              <div className="text-gray-600">{quote.title}</div>
            )}
            {quote.total && (
              <div className="text-gray-900 font-semibold">₪{quote.total.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</div>
            )}
          </div>
        )
      case 'payment':
        const payment = notification.entityDetails
        return (
          <div className="mt-2 space-y-1 text-sm">
            <div className="font-semibold text-emerald-600 text-lg">₪{payment.amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</div>
            {payment.transactionId && (
              <div className="text-gray-600">מספר עסקה: {payment.transactionId}</div>
            )}
          </div>
        )
      case 'client':
        const client = notification.entityDetails
        return (
          <div className="mt-2 space-y-1 text-sm">
            <div className="font-medium text-gray-900">{client.name}</div>
            {client.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                {client.email}
              </div>
            )}
          </div>
        )
      default:
        return null
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/20 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-0 top-0 h-full w-full translate-x-0 translate-y-0 p-0 rounded-none border-l border-r-0 z-[101] bg-white",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
            !isMobile && "max-w-md"
          )}
          dir="rtl"
          style={{ 
            right: 'auto',
            left: 0,
            transform: 'none',
          }}
        >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between border-b",
            isMobile ? "p-3" : "p-4"
          )}>
            <div className="flex items-center gap-2">
              <Bell className={cn(
                "text-emerald-600",
                isMobile ? "w-4 h-4" : "w-5 h-5"
              )} />
              <h2 className={cn(
                "font-bold",
                isMobile ? "text-lg" : "text-xl"
              )}>התראות</h2>
              {unreadCount > 0 && (
                <span className="bg-emerald-600 text-white text-xs rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size={isMobile ? "sm" : "sm"}
                  onClick={markAllAsRead}
                  className={cn(isMobile && "text-xs px-2")}
                >
                  {isMobile ? "סמן הכל" : "סמן הכל כנקרא"}
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)}
                className={cn(isMobile && "h-8 w-8")}
              >
                <X className={cn(isMobile ? "w-4 h-4" : "w-5 h-5")} />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className={cn(
            "flex-1 overflow-y-auto",
            isMobile ? "p-3" : "p-4"
          )}>
            {loading ? (
              <div className="text-center text-gray-500 py-8">טוען...</div>
            ) : notifications.length === 0 ? (
              <div className={cn(
                "text-center",
                isMobile ? "py-8" : "py-12"
              )}>
                <Bell className={cn(
                  "mx-auto text-gray-300 mb-4",
                  isMobile ? "w-12 h-12" : "w-16 h-16"
                )} />
                <h3 className={cn(
                  "font-medium text-gray-900 mb-2",
                  isMobile ? "text-base" : "text-lg"
                )}>אין התראות חדשות</h3>
                <p className={cn(
                  "text-gray-500",
                  isMobile && "text-sm"
                )}>כל ההתראות שלך יופיעו כאן</p>
              </div>
            ) : (
              <div className={cn(isMobile ? "space-y-2" : "space-y-3")}>
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type)
                  const colorClass = getNotificationColor(notification.type)
                  const details = formatNotificationDetails(notification)
                  const timeAgo = new Date(notification.createdAt).toLocaleString('he-IL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <Card 
                      key={notification.id} 
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-gray-50",
                        !notification.isRead && "border-r-4 border-r-emerald-600 bg-emerald-50/30",
                        isMobile && "border-0 shadow-none"
                      )}
                    >
                      <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
                        <div className={cn(
                          "flex items-start",
                          isMobile ? "gap-3" : "gap-4"
                        )}>
                          <div className={cn(
                            "rounded-full flex items-center justify-center flex-shrink-0",
                            colorClass,
                            isMobile ? "w-10 h-10" : "w-12 h-12"
                          )}>
                            <Icon className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className={cn(
                                  "font-medium",
                                  !notification.isRead ? "text-gray-900" : "text-gray-600",
                                  isMobile && "text-sm"
                                )}>
                                  {notification.title}
                                </h3>
                                <p className={cn(
                                  "text-gray-600 mt-1",
                                  isMobile ? "text-xs" : "text-sm"
                                )}>{notification.message}</p>
                                {details && (
                                  <div className={cn(
                                    "mt-2 bg-gray-50 rounded-lg border border-gray-200",
                                    isMobile ? "p-1.5 text-xs" : "p-2"
                                  )}>
                                    {details}
                                  </div>
                                )}
                              </div>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0 mt-1"></div>
                              )}
                            </div>
                            <div className={cn(
                              "flex items-center gap-4",
                              isMobile ? "mt-2" : "mt-3"
                            )}>
                              <span className="text-xs text-gray-500">{timeAgo}</span>
                              {!notification.isRead && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className={cn(
                                    "h-6 text-xs",
                                    isMobile && "px-2"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAsRead(notification.id)
                                  }}
                                >
                                  {isMobile ? "סמן" : "סמן כנקרא"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}

