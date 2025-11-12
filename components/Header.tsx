"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Bell, Search, ChevronDown, Settings, LogOut, User, Store, ExternalLink } from "lucide-react"
import { useShop } from "@/components/providers/ShopProvider"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { NotificationsDrawer } from "@/components/NotificationsDrawer"
import { getShopBaseUrl } from "@/lib/utils"

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession()
  const { selectedShop, shops, setSelectedShop, loading: shopsLoading } = useShop()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const notifications = await response.json()
          const unread = notifications.filter((n: any) => !n.isRead).length
          setUnreadCount(unread)
        }
      } catch (error) {
        console.error('Error fetching notifications count:', error)
      }
    }

    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4 flex-1">
        {title && (
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Shop Selector - מוצג רק אם יש יותר מחנות אחת או שהמשתמש הוזמן לחנות אחרת */}
        {!shopsLoading && shops.length > 0 && selectedShop && (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors border border-gray-200">
                  <Store className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {selectedShop.name}
                  </span>
                  {shops.length > 1 && (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </DropdownMenuTrigger>
              {shops.length > 1 && (
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>בחר חנות</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {shops.map((shop) => (
                    <DropdownMenuItem
                      key={shop.id}
                      onClick={() => setSelectedShop(shop)}
                      className={selectedShop?.id === shop.id ? "bg-purple-50" : ""}
                    >
                      <Store className="ml-2 h-4 w-4" />
                      <span>{shop.name}</span>
                      {selectedShop?.id === shop.id && (
                        <span className="mr-auto text-purple-600">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              )}
            </DropdownMenu>
            <a
              href={getShopBaseUrl(selectedShop)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg px-2 py-1 transition-colors"
              title="צפה בחנות"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">צפה בחנות</span>
            </a>
          </div>
        )}

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="חיפוש..."
            className="pr-10"
          />
        </div>

        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          onClick={() => setNotificationsOpen(true)}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
        
        <NotificationsDrawer open={notificationsOpen} onOpenChange={setNotificationsOpen} />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-2 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="prodify-gradient text-white text-sm">
                  {session?.user?.name ? getUserInitials(session.user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {session?.user?.name || "משתמש"}
                </div>
                <div className="text-xs text-gray-500">
                  {session?.user?.role === "SUPER_ADMIN" && "סופר אדמין"}
                  {session?.user?.role === "ADMIN" && "מנהל"}
                  {session?.user?.role === "MANAGER" && "מנהל צוות"}
                  {session?.user?.role === "USER" && "משתמש"}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="ml-2 h-4 w-4" />
              <span>הפרופיל שלי</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="ml-2 h-4 w-4" />
              <span>הגדרות</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="ml-2 h-4 w-4" />
              <span>התנתק</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}


