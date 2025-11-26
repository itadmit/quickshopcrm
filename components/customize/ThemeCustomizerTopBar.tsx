"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  X, 
  Save, 
  Monitor, 
  Smartphone, 
  Tablet,
  Menu,
  Settings,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PageType } from "./ThemeCustomizer"

interface ThemeCustomizerTopBarProps {
  pageType: PageType
  hasUnsavedChanges: boolean
  saving: boolean
  onSave: () => void
  onClose?: () => void
  onLeftSidebarToggle: () => void
  onRightSidebarToggle: () => void
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
}

const pageTypeLabels: Record<PageType, string> = {
  home: "דף בית",
  category: "דף קטגוריה",
  product: "דף מוצר",
}

export function ThemeCustomizerTopBar({
  pageType,
  hasUnsavedChanges,
  saving,
  onSave,
  onClose,
  onLeftSidebarToggle,
  onRightSidebarToggle,
  leftSidebarOpen,
  rightSidebarOpen,
}: ThemeCustomizerTopBarProps) {
  return (
    <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 shadow-sm">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9"
          >
            <ChevronLeft className="w-4 h-4 ml-2" />
            יציאה
          </Button>
        )}
        
        <div className="h-6 w-px bg-gray-300" />
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">תבנית ברירת מחדל</span>
          <span className="text-sm font-medium">{pageTypeLabels[pageType]}</span>
        </div>
      </div>

      {/* Center - Device Preview Buttons */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-3",
            "hover:bg-white"
          )}
        >
          <Monitor className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-3",
            "hover:bg-white"
          )}
        >
          <Tablet className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-3",
            "hover:bg-white"
          )}
        >
          <Smartphone className="w-4 h-4" />
        </Button>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Sidebar Toggles - רק במסך קטן */}
        <div className="lg:hidden flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLeftSidebarToggle}
            className={cn(
              "h-9",
              leftSidebarOpen && "bg-gray-100"
            )}
          >
            <Menu className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRightSidebarToggle}
            className={cn(
              "h-9",
              rightSidebarOpen && "bg-gray-100"
            )}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {hasUnsavedChanges && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            יש שינויים לא שמורים
          </Badge>
        )}
        
        <Button
          onClick={onSave}
          disabled={saving || !hasUnsavedChanges}
          className="h-9"
        >
          <Save className="w-4 h-4 ml-2" />
          {saving ? "שומר..." : "שמור"}
        </Button>
      </div>
    </div>
  )
}


