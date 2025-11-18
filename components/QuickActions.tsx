"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { 
  Plus, 
  Package, 
  ShoppingCart, 
  Users, 
  Tag, 
  Ticket,
  ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface QuickAction {
  id: string
  labelKey: string
  href: string
  icon: any
  permission?: string
}

const STORAGE_KEY = "quick-actions-history"

// פעולות זמינות - מחוץ לקומפוננטה כדי לא ליצור מחדש בכל רינדור
const AVAILABLE_ACTIONS: QuickAction[] = [
  { 
    id: "add-product", 
    labelKey: "header.quickActions.addProduct", 
    href: "/products/new", 
    icon: Package,
    permission: "products"
  },
  { 
    id: "add-order", 
    labelKey: "header.quickActions.addOrder", 
    href: "/orders/new", 
    icon: ShoppingCart,
    permission: "orders"
  },
  { 
    id: "add-customer", 
    labelKey: "header.quickActions.addCustomer", 
    href: "/customers/new", 
    icon: Users,
    permission: "customers"
  },
  { 
    id: "add-discount", 
    labelKey: "header.quickActions.addDiscount", 
    href: "/discounts/new", 
    icon: Tag,
    permission: "discounts"
  },
  { 
    id: "add-coupon", 
    labelKey: "header.quickActions.addCoupon", 
    href: "/coupons/new", 
    icon: Ticket,
    permission: "coupons"
  },
]

export function QuickActions() {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations()
  const [actionHistory, setActionHistory] = useState<string[]>([])

  // טעינת היסטוריית פעולות מ-localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setActionHistory(Array.isArray(parsed) ? parsed : [])
        } catch {
          setActionHistory([])
        }
      }
    }
  }, [])

  // עדכון היסטוריה כשעוברים לדף חדש
  useEffect(() => {
    const action = AVAILABLE_ACTIONS.find(a => pathname === a.href || pathname.startsWith(a.href + '/'))
    if (action) {
      setActionHistory((prev) => {
        // הסרת הפעולה אם היא כבר קיימת
        const filtered = prev.filter(id => id !== action.id)
        // הוספה לתחילת הרשימה
        const updated = [action.id, ...filtered].slice(0, 5) // שמירה על 5 פעולות אחרונות
        
        // שמירה ב-localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        }
        
        return updated
      })
    }
  }, [pathname])

  const updateActionHistory = (actionId: string) => {
    setActionHistory((prev) => {
      // הסרת הפעולה אם היא כבר קיימת
      const filtered = prev.filter(id => id !== actionId)
      // הוספה לתחילת הרשימה
      const updated = [actionId, ...filtered].slice(0, 5) // שמירה על 5 פעולות אחרונות
      
      // שמירה ב-localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
      
      return updated
    })
  }

  const handleActionClick = (action: QuickAction) => {
    updateActionHistory(action.id)
    router.push(action.href)
  }

  // קבלת הפעולות הנפוצות ביותר (עד 3)
  const frequentActions = useMemo(() => {
    return actionHistory
      .slice(0, 3)
      .map(id => AVAILABLE_ACTIONS.find(a => a.id === id))
      .filter((action): action is QuickAction => action !== undefined)
  }, [actionHistory])

  // אם אין היסטוריה, נציג פעולות ברירת מחדל
  const displayActions = frequentActions.length > 0 
    ? frequentActions 
    : AVAILABLE_ACTIONS.slice(0, 3)

  if (displayActions.length === 0) {
    return null
  }

  const remainingActionsCount = AVAILABLE_ACTIONS.length - displayActions.length

  return (
    <div className="flex items-center gap-3">
      {/* כיתוב הסבר */}
      <span className="text-xs text-gray-500 hidden lg:inline whitespace-nowrap">
        {t("header.quickActions.title")}
      </span>
      
      {/* קיצורים מהירים - עד 3 */}
      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1 bg-gray-50">
        {displayActions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.id}
              variant="ghost"
              size="sm"
              className="gap-2 h-8 px-3"
              onClick={() => handleActionClick(action)}
              title={t(action.labelKey)}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t(action.labelKey)}</span>
            </Button>
          )
        })}

        {/* תפריט נפתח לפעולות נוספות */}
        {remainingActionsCount > 0 && (
          <>
            <div className="h-6 w-px bg-gray-300 mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 gap-2 text-gray-600 hover:text-gray-900"
                  title={`${t("header.quickActions.moreActions")} (${remainingActionsCount})`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">
                    {t("header.quickActions.more")} ({remainingActionsCount})
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-b border-gray-200">
                  {t("header.quickActions.moreActions")}
                </div>
                {AVAILABLE_ACTIONS
                  .filter(action => !displayActions.some(da => da.id === action.id))
                  .map((action) => {
                    const Icon = action.icon
                    return (
                      <DropdownMenuItem
                        key={action.id}
                        onClick={() => handleActionClick(action)}
                        className="gap-2"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{t(action.labelKey)}</span>
                      </DropdownMenuItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  )
}

