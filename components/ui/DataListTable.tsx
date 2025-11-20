"use client"

import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Edit, Trash2, LucideIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface DataListItem {
  id: string
  title: string
  subtitle?: ReactNode
  meta?: ReactNode
  icon?: LucideIcon
  iconBgColor?: string
  iconColor?: string
  badges?: Array<{ label: string; variant?: "default" | "secondary" | "destructive" | "outline" }>
  isActive?: boolean
  [key: string]: any
}

interface DataListTableProps {
  title: string
  description?: string
  items: DataListItem[]
  loading?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  emptyStateIcon?: LucideIcon
  emptyStateTitle?: string
  emptyStateDescription?: string
  emptyStateAction?: ReactNode
  onEdit?: (item: DataListItem) => void
  onDelete?: (item: DataListItem) => void
  deleteConfirmMessage?: string
  renderItem?: (item: DataListItem) => ReactNode
  className?: string
}

export function DataListTable({
  title,
  description,
  items,
  loading = false,
  searchPlaceholder = "חפש...",
  searchValue = "",
  onSearchChange,
  emptyStateIcon,
  emptyStateTitle = "אין פריטים",
  emptyStateDescription,
  emptyStateAction,
  onEdit,
  onDelete,
  deleteConfirmMessage = "האם אתה בטוח שברצונך למחוק פריט זה?",
  renderItem,
  className,
}: DataListTableProps) {
  const filteredItems = searchValue
    ? items.filter((item) =>
        item.title.toLowerCase().includes(searchValue.toLowerCase())
      )
    : items

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">טוען...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {onSearchChange && (
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pr-10"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            {emptyStateIcon && (
              <emptyStateIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            )}
            <p className="text-gray-500 mb-4">{emptyStateTitle}</p>
            {emptyStateDescription && (
              <p className="text-sm text-gray-400 mb-4">{emptyStateDescription}</p>
            )}
            {emptyStateAction}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              if (renderItem) {
                return renderItem(item)
              }

              const Icon = item.icon
              const iconBgColor = item.iconBgColor || "bg-emerald-100"
              const iconColor = item.iconColor || "text-emerald-600"

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {Icon && (
                      <div className={cn("p-2 rounded-lg", iconBgColor)}>
                        <Icon className={cn("w-5 h-5", iconColor)} />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        {item.badges?.map((badge, idx) => (
                          <Badge key={idx} variant={badge.variant || "secondary"}>
                            {badge.label}
                          </Badge>
                        ))}
                        {item.isActive === false && !item.badges?.some(b => b.label === "לא פעיל") && (
                          <Badge variant="secondary">לא פעיל</Badge>
                        )}
                      </div>
                      {item.subtitle && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          {item.subtitle}
                        </div>
                      )}
                      {item.meta && (
                        <div className="text-sm text-gray-500 mt-1">{item.meta}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm(deleteConfirmMessage)) {
                                onDelete(item)
                              }
                            }}
                            className="text-red-600"
                          >
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

