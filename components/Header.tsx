"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useTranslations, useLocale } from "next-intl"
import { Bell, ChevronDown, Settings, LogOut, User, ExternalLink, UserPlus, Plug, Menu, Search, X } from "lucide-react"
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
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Sidebar } from "@/components/Sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { NotificationsDrawer } from "@/components/NotificationsDrawer"
import { InvitePeopleDialog } from "@/components/dialogs/InvitePeopleDialog"
import { GlobalSearch } from "@/components/GlobalSearch"
import { QuickActions } from "@/components/QuickActions"
import { getShopBaseUrl } from "@/lib/utils"

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession()
  const { selectedShop, shops, setSelectedShop, loading: shopsLoading } = useShop()
  const t = useTranslations()
  const locale = useLocale()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
    <header className="h-16 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl flex items-center justify-between px-2 md:px-6 sticky top-0 z-40 transition-all duration-200 supports-[backdrop-filter]:bg-white/60">
      {/* Mobile: Logo and Hamburger */}
      <div className="flex md:hidden items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <Link href="/dashboard" className="flex items-center">
          <span 
            className="text-lg font-pacifico text-gray-900" 
            style={{ letterSpacing: '1px' }}
          >
            Quick Shop
          </span>
        </Link>
      </div>

      {/* Desktop: Quick Actions */}
      <div className="hidden lg:flex items-center gap-2">
        <QuickActions />
      </div>

      {/* Desktop: Global Search */}
      <div className="hidden md:block flex-1 max-w-md lg:max-w-xl xl:max-w-2xl mx-2 lg:mx-4 xl:mx-8">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1 lg:gap-3">
        {/* Marketplace Link - Hidden on Mobile and Small Laptops */}
        <Button
          variant="outline"
          size="sm"
          className="hidden xl:flex gap-2"
          asChild
        >
          <Link href="/settings/plugins">
            <Plug className="w-4 h-4" />
            <span className="text-sm">{t("header.marketplace")}</span>
          </Link>
        </Button>

        {/* View Store Button - Hidden on Mobile and Small Laptops */}
        {mounted && selectedShop && (
          <Button
            variant="outline"
            size="sm"
            className="hidden lg:flex gap-2"
            onClick={() => {
              const shopUrl = getShopBaseUrl(selectedShop)
              window.open(shopUrl, '_blank')
            }}
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm">{t("header.viewStore")}</span>
          </Button>
        )}

        {/* Mobile: Search Icon */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="w-5 h-5" />
        </Button>

        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9"
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

        {/* Invite People Dialog */}
        {(session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "MANAGER") && (
          <InvitePeopleDialog 
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
          />
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-1 md:p-2 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="prodify-gradient text-white text-sm">
                  {session?.user?.name ? getUserInitials(session.user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="text-right hidden md:block">
                <div className="text-sm font-medium text-gray-900">
                  {session?.user?.name || t("header.user")}
                </div>
                <div className="text-xs text-gray-500">
                  {session?.user?.role === "SUPER_ADMIN" && t("header.superAdmin")}
                  {session?.user?.role === "ADMIN" && t("header.admin")}
                  {session?.user?.role === "MANAGER" && t("header.manager")}
                  {session?.user?.role === "USER" && t("header.userRole")}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
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
            <DropdownMenuItem className="flex flex-row-reverse items-center gap-2 cursor-pointer">
              <User className="w-4 h-4 flex-shrink-0" />
              <span>{t("header.myProfile")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="flex flex-row-reverse items-center gap-2 cursor-pointer">
              <Link href="/settings" className="flex flex-row-reverse items-center gap-2 w-full">
                <Settings className="w-4 h-4 flex-shrink-0" />
                <span>{t("header.settings")}</span>
              </Link>
            </DropdownMenuItem>
            {(session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "MANAGER") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setInviteDialogOpen(true)} className="flex flex-row-reverse items-center gap-2 cursor-pointer">
                  <UserPlus className="w-4 h-4 flex-shrink-0" />
                  <span>{t("header.inviteTeam")}</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600 focus:text-red-600 flex flex-row-reverse items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>{t("header.signOut")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen} side="right">
        <SheetContent onClose={() => setSidebarOpen(false)} className="p-0">
          <div className="h-full overflow-y-auto">
            <Sidebar hideLogo={true} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Search Dropdown */}
      {searchOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/20 z-[45] md:hidden"
            onClick={() => setSearchOpen(false)}
          />
          {/* Search Panel */}
          <div className="fixed top-16 left-0 right-0 bg-white shadow-2xl z-[46] md:hidden animate-in slide-in-from-top-4 duration-200 max-h-[80vh] overflow-y-auto">
            <div className="p-4 relative">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-2 z-10"
                onClick={() => setSearchOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
              
              <GlobalSearch 
                isMobile={true} 
                autoFocus={true} 
                onSelect={() => setSearchOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </header>
  )
}
