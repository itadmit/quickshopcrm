"use client"

import { useState } from "react"
import { Plus, X, Package, ShoppingBag, Store, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function MobileFloatingMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const t = useTranslations()

  const toggleMenu = () => setIsOpen(!isOpen)

  const menuItems = [
    {
      icon: Store,
      label: t('dashboard.actions.createStoreShort'),
      href: "/shops/new",
      color: "bg-emerald-500",
      delay: "delay-[0ms]"
    },
    {
      icon: Package,
      label: t('dashboard.actions.addProduct'),
      href: "/products/new",
      color: "bg-blue-500",
      delay: "delay-[50ms]"
    },
    {
      icon: ShoppingBag,
      label: t('dashboard.actions.viewOrders'), // Using view orders as "create order" might be less common manual task
      href: "/orders",
      color: "bg-purple-500",
      delay: "delay-[100ms]"
    }
  ]

  return (
    <div className="fixed bottom-6 left-6 z-50 md:hidden flex flex-col items-start gap-4 pb-safe">
      {/* Overlay Background when open */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 z-40",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Menu Items */}
      <div className={cn("flex flex-col gap-3 items-start relative z-50 mb-2 transition-all duration-300", isOpen ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none")}>
        {menuItems.map((item, index) => (
          <Link 
            key={index} 
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={cn("flex items-center gap-3 group transition-all duration-300 transform", isOpen ? "translate-x-0" : "-translate-x-4")}
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform", item.color)}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="bg-white px-3 py-1 rounded-lg text-sm font-medium shadow-sm text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Main FAB Button */}
      <Button
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-all duration-300 z-50 relative",
          isOpen ? "bg-gray-900 rotate-90" : "bg-emerald-600 hover:bg-emerald-700"
        )}
        onClick={toggleMenu}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-8 w-8 text-white" />
        )}
      </Button>
    </div>
  )
}

