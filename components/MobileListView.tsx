"use client"

import { ReactNode, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronDown, ChevronUp, Tag, Package, Hash, Settings2, User, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MobileListItem {
  id: string
  orderNumber?: string // For orders
  title: string
  subtitle?: string
  description?: string
  image?: string
  icon?: ReactNode
  badge?: {
    text: string
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "blue" | "purple" | "cyan"
  }
  badges?: Array<{
    text: string
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "blue" | "purple" | "cyan"
  }>
  price?: string
  comparePrice?: string
  inventory?: number | string
  couponCode?: string | null
  status?: "PUBLISHED" | "DRAFT" | "ARCHIVED"
  metadata?: Array<{
    label: string
    value: string | ReactNode
    icon?: ReactNode
  }>
  actions?: Array<{
    label: string
    icon?: ReactNode
    onClick: () => void
    variant?: "default" | "destructive"
  }>
  className?: string // For custom styling like opacity
}

interface MobileListViewProps {
  items: MobileListItem[]
  onItemClick?: (item: MobileListItem) => void
  selectedItems?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  showCheckbox?: boolean
  emptyState?: {
    icon: ReactNode
    title: string
    description: string
    action?: {
      label: string
      onClick: () => void
    }
  }
  className?: string
  showSettingsButton?: boolean
  settingsType?: "products" | "orders" | "default"
}

export function MobileListView({
  items,
  onItemClick,
  selectedItems = new Set(),
  onSelectionChange,
  showCheckbox = false,
  emptyState,
  className,
  showSettingsButton = true,
  settingsType = "default",
}: MobileListViewProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [displaySettings, setDisplaySettings] = useState({
    showCategory: true,
    showInventory: true,
    showSku: true,
    showMetadata: true,
    showBadges: true,
  })

  const handleToggleItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    onSelectionChange?.(newSelected)
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  if (items.length === 0 && emptyState) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="mb-4 flex justify-center">{emptyState.icon}</div>
            <h3 className="text-lg font-semibold mb-2 prodify-gradient-text">
              {emptyState.title}
            </h3>
            <p className="text-gray-600 mb-4">{emptyState.description}</p>
            {emptyState.action && (
              <Button
                onClick={emptyState.action.onClick}
                className="prodify-gradient text-white"
              >
                {emptyState.action.label}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Settings Button - Fixed position */}
      {showSettingsButton && items.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="fixed left-4 bottom-20 z-30 rounded-full w-10 h-10 p-0 shadow-lg bg-white"
          onClick={() => setShowSettingsModal(true)}
        >
          <Settings2 className="w-4 h-4" />
        </Button>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-end" style={{ marginTop: 0, top: 0 }}>
          <div
            className="absolute inset-0 bg-black/10 backdrop-blur-sm"
            style={{ marginTop: 0, top: 0 }}
            onClick={() => setShowSettingsModal(false)}
          />
          <div className="relative w-full bg-white rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">הגדרות תצוגה</h2>
              <p className="text-sm text-gray-500 mt-1">
                {settingsType === "orders" ? "בחר מה להציג בכרטיס ההזמנה" : "בחר מה להציג בכרטיס"}
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Product-specific settings */}
              {settingsType === "products" && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <label htmlFor="show-category" className="text-sm font-medium">
                        הצג קטגוריה
                      </label>
                    </div>
                    <Checkbox
                      id="show-category"
                      checked={displaySettings.showCategory}
                      onCheckedChange={(checked) =>
                        setDisplaySettings({ ...displaySettings, showCategory: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <label htmlFor="show-sku" className="text-sm font-medium">
                        הצג מקט
                      </label>
                    </div>
                    <Checkbox
                      id="show-sku"
                      checked={displaySettings.showSku}
                      onCheckedChange={(checked) =>
                        setDisplaySettings({ ...displaySettings, showSku: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <label htmlFor="show-inventory" className="text-sm font-medium">
                        הצג מלאי
                      </label>
                    </div>
                    <Checkbox
                      id="show-inventory"
                      checked={displaySettings.showInventory}
                      onCheckedChange={(checked) =>
                        setDisplaySettings({ ...displaySettings, showInventory: checked as boolean })
                      }
                    />
                  </div>
                </>
              )}

              {/* Orders-specific settings */}
              {settingsType === "orders" && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <label htmlFor="show-date" className="text-sm font-medium">
                        הצג תאריך ושעה
                      </label>
                    </div>
                    <Checkbox
                      id="show-date"
                      checked={displaySettings.showSku}
                      onCheckedChange={(checked) =>
                        setDisplaySettings({ ...displaySettings, showSku: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <label htmlFor="show-coupon" className="text-sm font-medium">
                        הצג קופון (אם בשימוש)
                      </label>
                    </div>
                    <Checkbox
                      id="show-coupon"
                      checked={displaySettings.showInventory}
                      onCheckedChange={(checked) =>
                        setDisplaySettings({ ...displaySettings, showInventory: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <label htmlFor="show-badges" className="text-sm font-medium">
                        הצג סטטוס תשלום
                      </label>
                    </div>
                    <Checkbox
                      id="show-badges"
                      checked={displaySettings.showBadges}
                      onCheckedChange={(checked) =>
                        setDisplaySettings({ ...displaySettings, showBadges: checked as boolean })
                      }
                    />
                  </div>
                </>
              )}

              {/* Default settings (both products and orders can share) */}
              {settingsType === "default" && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <label htmlFor="show-metadata" className="text-sm font-medium">
                        הצג פרטים נוספים
                      </label>
                    </div>
                    <Checkbox
                      id="show-metadata"
                      checked={displaySettings.showMetadata}
                      onCheckedChange={(checked) =>
                        setDisplaySettings({ ...displaySettings, showMetadata: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <label htmlFor="show-badges" className="text-sm font-medium">
                        הצג תגיות נוספות
                      </label>
                    </div>
                    <Checkbox
                      id="show-badges"
                      checked={displaySettings.showBadges}
                      onCheckedChange={(checked) =>
                        setDisplaySettings({ ...displaySettings, showBadges: checked as boolean })
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t">
              <Button
                onClick={() => setShowSettingsModal(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                סגור
              </Button>
            </div>
          </div>
        </div>
      )}

    <div className={cn("space-y-2", className)}>
      {items.map((item: any) => {
        const isSelected = selectedItems.has(item.id)

        return (
          <Card
            key={item.id}
            className={cn(
              "transition-all duration-200 border-0 shadow-sm",
              isSelected && "ring-2 ring-emerald-500 bg-emerald-50/50",
              onItemClick && "cursor-pointer active:scale-[0.99]",
              item.className
            )}
            onClick={() => onItemClick?.(item)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                {showCheckbox && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pt-0.5"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleToggleItem(item.id, checked as boolean)
                      }
                    />
                  </div>
                )}

                {/* Image or Icon */}
                {(item.image || item.icon) && (
                  <div className="flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-14 h-14 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                        {item.icon}
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 flex gap-2">
                  {/* Left side - Title, Category, מקט, Inventory */}
                  <div className="flex-[2] min-w-0 flex flex-col gap-1">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                      {item.title}
                    </h3>

                    {/* Category */}
                    {item.metadata && item.metadata.length > 0 && item.metadata[0].label && displaySettings.showCategory && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {item.metadata[0].label}
                        </span>
                      </div>
                    )}

                    {/* מקט */}
                    {item.metadata && item.metadata.length > 0 && displaySettings.showSku && (
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {item.metadata[0].value}
                        </span>
                      </div>
                    )}

                    {/* Inventory */}
                    {item.inventory !== undefined && displaySettings.showInventory && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Package className="w-3 h-3 text-gray-400" />
                        <span>מלאי: <span className="font-medium">{item.inventory}</span></span>
                      </div>
                    )}

                    {/* Coupon Code (for orders) */}
                    {item.couponCode && displaySettings.showInventory && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Tag className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-medium">קופון: {item.couponCode}</span>
                      </div>
                    )}

                    {/* Additional Metadata (for orders: date, phone) */}
                    {item.metadata && item.metadata.length > 0 && (
                      <>
                        {item.metadata.map((meta: any, index: number) => {
                          // First item (date) - show if showSku is true
                          if (index === 0 && displaySettings.showSku) {
                            return (
                              <div key={index} className="flex items-center gap-1.5 text-xs text-gray-500">
                                {meta.icon}
                                <span>{meta.label && `${meta.label}: `}{meta.value}</span>
                              </div>
                            )
                          }
                          // Additional items (phone etc.) - always show for orders
                          if (index > 0) {
                            return (
                              <div key={index} className="flex items-center gap-1.5 text-xs text-gray-500">
                                {meta.icon}
                                <span>{meta.label && `${meta.label}: `}{meta.value}</span>
                              </div>
                            )
                          }
                          return null
                        })}
                      </>
                    )}
                  </div>

                  {/* Right side - Status Badge and Prices */}
                  <div className="flex flex-col items-end justify-center gap-1 flex-shrink-0">
                    {/* Status Badge */}
                    {item.status && (
                      <Badge
                        variant={
                          item.status === "PUBLISHED" ? "success" :
                          item.status === "DRAFT" ? "warning" :
                          "secondary"
                        }
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-4 leading-none",
                          item.status === "PUBLISHED" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                          item.status === "DRAFT" && "bg-yellow-50 text-yellow-700 border-yellow-200"
                        )}
                      >
                        {item.status === "PUBLISHED" ? "פעיל" :
                         item.status === "DRAFT" ? "טיוטה" :
                         "בארכיון"}
                      </Badge>
                    )}

                    {/* Main Badge */}
                    {item.badge && (
                      <Badge
                        variant={item.badge.variant}
                        className="text-[10px] px-1.5 py-0 h-4 leading-none"
                      >
                        {item.badge.text}
                      </Badge>
                    )}
                    
                    {/* Prices */}
                    {item.price && (
                      <span className="font-bold text-gray-900 text-sm whitespace-nowrap leading-tight">
                        {item.price}
                      </span>
                    )}
                    {item.comparePrice && (
                      <span className="text-[10px] text-gray-500 line-through whitespace-nowrap leading-tight">
                        {item.comparePrice}
                      </span>
                    )}

                    {/* Additional Badges (for orders: payment status, etc.) */}
                    {item.badges && item.badges.length > 0 && displaySettings.showBadges && (
                      <div className="flex flex-col gap-0.5 items-end">
                        {item.badges.map((badge: any, index: number) => (
                          <Badge
                            key={index}
                            variant={badge.variant}
                            className="text-[10px] px-1.5 py-0 h-4 leading-none"
                          >
                            {badge.text}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Toggle Button */}
                {item.actions && item.actions.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-gray-100 self-center"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpanded(item.id)
                    }}
                  >
                    {expandedItems.has(item.id) ? (
                      <ChevronUp className="h-4 w-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    )}
                  </Button>
                )}

                {/* Arrow indicator if clickable */}
                {onItemClick && !item.actions && (
                  <ChevronLeft className="h-5 w-5 text-gray-400 flex-shrink-0 self-start mt-0.5" />
                )}
              </div>

              {/* Expanded Actions Grid */}
              {item.actions && expandedItems.has(item.id) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-4 gap-1.5">
                    {item.actions.map((action: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          action.onClick()
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors",
                          action.variant === "destructive"
                            ? "hover:bg-red-50 text-red-600"
                            : "hover:bg-gray-100 text-gray-700"
                        )}
                      >
                        {action.icon && (
                          <span className="flex-shrink-0">{action.icon}</span>
                        )}
                        <span className="text-[10px] font-medium text-center leading-tight whitespace-nowrap">
                          {action.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
    </>
  )
}

