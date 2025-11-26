"use client"

import { useState } from "react"
import { Home, ShoppingBag, Plus, Package, Tag, Ticket, Layers, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function MobileBottomNav() {
  const pathname = usePathname()
  const t = useTranslations()
  const [isActionsOpen, setIsActionsOpen] = useState(false)

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

  // Visual Right Side (Start in RTL) - Menu & Products
  // Note: In HTML structure with dir="rtl", the first items are on the right.
  
  // Visual Left Side (End in RTL) - Orders & Home
  // We want Home to be the leftmost item (Last in visual order in RTL)

  return (
    <>
      {/* Actions Menu Overlay */}
      {isActionsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-24 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setIsActionsOpen(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-xl animate-in slide-in-from-bottom-10 duration-300 space-y-2" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-2 font-medium text-gray-500 text-sm">{t('dashboard.quickActions.title')}</div>
            
            <div className="grid grid-cols-2 gap-2">
              <Link href="/products/new" onClick={() => setIsActionsOpen(false)} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700">
                  <Package className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">{t('dashboard.actions.addProduct')}</span>
              </Link>

              <Link href="/collections/new" onClick={() => setIsActionsOpen(false)} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 transition-colors">
                <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">{t('sidebar.categories') || "קטגוריה"}</span>
              </Link>

              <Link href="/discounts/new" onClick={() => setIsActionsOpen(false)} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-900 transition-colors">
                <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-pink-700">
                  <Tag className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">{t('sidebar.discounts') || "הנחה"}</span>
              </Link>

              <Link href="/coupons/new" onClick={() => setIsActionsOpen(false)} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 transition-colors">
                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700">
                  <Ticket className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">{t('sidebar.coupons') || "קופון"}</span>
              </Link>
            </div>

             <Button 
              variant="ghost" 
              className="w-full mt-2 text-gray-500 hover:text-gray-900"
              onClick={() => setIsActionsOpen(false)}
            >
              {t('common.cancel') || "ביטול"}
            </Button>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-safe md:hidden">
        <div className="flex items-center justify-between px-2 h-16 relative">
          
          {/* Right Group (Start in RTL) - Settings & Products */}
          <div className="flex-1 flex justify-around">
            <Link 
              href="/settings"
              className={cn(
                "flex flex-col items-center justify-center w-12 gap-1 transition-colors",
                isActive("/settings") ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Settings className="w-6 h-6" />
              <span className="text-[10px] font-medium truncate max-w-full">{t('sidebar.settings') || "הגדרות"}</span>
            </Link>

            <Link 
              href="/products"
              className={cn(
                "flex flex-col items-center justify-center w-12 gap-1 transition-colors",
                isActive("/products") ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Package className="w-6 h-6" />
              <span className="text-[10px] font-medium truncate max-w-full">{t('sidebar.products')}</span>
            </Link>
          </div>

          {/* Center Floating Action Button Space */}
          <div className="relative -top-6 mx-2">
            <button 
              onClick={() => setIsActionsOpen(!isActionsOpen)}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 ease-out active:scale-95",
                isActionsOpen ? "bg-gray-800 rotate-45" : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              <Plus className="w-8 h-8 text-white" />
            </button>
          </div>

          {/* Left Group (End in RTL) - Orders & Home */}
          <div className="flex-1 flex justify-around">
            <Link 
              href="/orders"
              className={cn(
                "flex flex-col items-center justify-center w-12 gap-1 transition-colors",
                isActive("/orders") ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <ShoppingBag className="w-6 h-6" />
              <span className="text-[10px] font-medium truncate max-w-full">{t('sidebar.orders')}</span>
            </Link>

            <Link 
              href="/dashboard"
              className={cn(
                "flex flex-col items-center justify-center w-12 gap-1 transition-colors",
                pathname === "/dashboard" ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Home className="w-6 h-6" />
              <span className="text-[10px] font-medium truncate max-w-full">{t('sidebar.home')}</span>
            </Link>
          </div>

        </div>
      </div>
    </>
  )
}
