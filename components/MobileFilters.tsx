"use client"

import { ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, X, Loader2, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  id: string
  label: string
  type: "select" | "search"
  value: string
  onChange: (value: string) => void
  options?: FilterOption[]
  placeholder?: string
  icon?: ReactNode
}

interface MobileFiltersProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters: FilterConfig[]
  isSearching?: boolean
  className?: string
  actions?: Array<{
    label: string
    icon?: ReactNode
    onClick: () => void
    variant?: "default" | "outline" | "destructive"
  }>
}

export function MobileFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder = "חיפוש...",
  filters,
  isSearching = false,
  className,
  actions,
}: MobileFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [tempFilters, setTempFilters] = useState<Record<string, string>>({})

  const activeFiltersCount = filters.filter((f: any) => {
    if (f.type === "select") {
      return f.value !== "all" && f.value !== ""
    }
    return false
  }).length

  const handleOpenFilters = () => {
    // Store current values in temp state
    const current: Record<string, string> = {}
    filters.forEach((f: any) => {
      current[f.id] = f.value
    })
    setTempFilters(current)
    setIsFilterOpen(true)
  }

  const handleApplyFilters = () => {
    // Apply temp filters to actual filters
    filters.forEach((f: any) => {
      if (tempFilters[f.id] !== undefined) {
        f.onChange(tempFilters[f.id])
      }
    })
    setIsFilterOpen(false)
  }

  const handleResetFilters = () => {
    const reset: Record<string, string> = {}
    filters.forEach((f: any) => {
      reset[f.id] = "all"
      f.onChange("all")
    })
    setTempFilters(reset)
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search Bar with Filter Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10 pl-10 h-11"
          />
          {isSearching && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
            </div>
          )}
          {searchValue && !isSearching && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Button */}
        <Button
          variant="outline"
          size="sm"
          className="relative flex-shrink-0 h-11 w-11 p-0"
          onClick={handleOpenFilters}
        >
          <Settings className="w-5 h-5 text-gray-600" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Additional Actions Row */}
      {actions && actions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.variant || "outline"}
              size="sm"
              onClick={action.onClick}
              className="flex-shrink-0 h-9"
            >
              {action.icon && <span className="ml-2">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {isFilterOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm"
            onClick={() => setIsFilterOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">סינון תוצאות</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {filters.map((filter: any) => (
                <div key={filter.id} className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    {filter.icon}
                    {filter.label}
                  </label>
                  {filter.type === "select" && filter.options ? (
                    <Select
                      value={tempFilters[filter.id] || filter.value}
                      onValueChange={(value) =>
                        setTempFilters({ ...tempFilters, [filter.id]: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={filter.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {filter.options.map((option: any) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="p-4 border-t flex gap-2">
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="flex-1"
              >
                איפוס
              </Button>
              <Button
                onClick={handleApplyFilters}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                החל סינון
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

