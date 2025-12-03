"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, Eye, EyeOff, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface EditableProductElementProps {
  elementId: string
  elementName: string
  isEditing: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  onToggleVisibility?: () => void
  onOpenSettings?: () => void
  isVisible?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  children: React.ReactNode
  isSelected?: boolean
}

export function EditableProductElement({
  elementId,
  elementName,
  isEditing,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onOpenSettings,
  isVisible = true,
  canMoveUp = false,
  canMoveDown = false,
  children,
  isSelected = false,
}: EditableProductElementProps) {
  const [isHovered, setIsHovered] = useState(false)

  // שליחת הודעות ל-parent window במצב customize
  useEffect(() => {
    if (!isEditing || typeof window === 'undefined') return

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation()
      // שליחת הודעה ל-parent window
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "elementClick",
            elementId: elementId,
          },
          window.location.origin
        )
      }
      onOpenSettings?.()
    }

    const handleMouseEnter = () => {
      setIsHovered(true)
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "elementHover",
            elementId: elementId,
          },
          window.location.origin
        )
      }
    }

    const handleMouseLeave = () => {
      setIsHovered(false)
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "elementHover",
            elementId: null,
          },
          window.location.origin
        )
      }
    }

    const element = document.querySelector(`[data-element-id="${elementId}"]`)
    if (element) {
      element.addEventListener('click', handleClick as EventListener)
      element.addEventListener('mouseenter', handleMouseEnter as EventListener)
      element.addEventListener('mouseleave', handleMouseLeave as EventListener)
    }

    return () => {
      if (element) {
        element.removeEventListener('click', handleClick as EventListener)
        element.removeEventListener('mouseenter', handleMouseEnter as EventListener)
        element.removeEventListener('mouseleave', handleMouseLeave as EventListener)
      }
    }
  }, [isEditing, elementId, onOpenSettings])

  if (!isEditing) {
    return <>{children}</>
  }

  return (
    <div
      data-element-id={elementId}
      className={cn(
        "relative group",
        !isVisible && "opacity-50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        onOpenSettings?.()
      }}
      style={{ cursor: isEditing && (isHovered || isSelected) ? 'pointer' : 'default' }}
    >
      {/* מסגרת ירוקה ב-hover או בחירה */}
      {(isHovered || isSelected) && isEditing && (
        <div className="absolute -inset-1 border-2 border-emerald-500 rounded-lg pointer-events-none z-10 shadow-lg" />
      )}

      {/* מדבקה עם שם האלמנט - לחיצה פותחת הגדרות */}
      {isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenSettings?.()
          }}
          className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-medium px-2 py-1 rounded-bl-lg rounded-tr-lg z-20 cursor-pointer hover:bg-emerald-600 transition-colors flex items-center gap-1"
          title="לחץ לפתיחת הגדרות"
        >
          {elementName}
          <Settings className="w-3 h-3" />
        </button>
      )}

      {/* כפתורי בקרה */}
      {isHovered && (
        <div className="absolute top-2 left-2 flex gap-1 bg-white rounded shadow-lg p-1 z-20">
          {onOpenSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onOpenSettings()
              }}
              className="h-8 w-8 p-0"
              title="הגדרות"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
          {onMoveUp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onMoveUp()
              }}
              disabled={!canMoveUp}
              className="h-8 w-8 p-0 transition-transform hover:scale-110 active:scale-95"
              title="העבר למעלה"
            >
              <ChevronUp className="w-4 h-4 transition-transform" />
            </Button>
          )}
          {onMoveDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onMoveDown()
              }}
              disabled={!canMoveDown}
              className="h-8 w-8 p-0 transition-transform hover:scale-110 active:scale-95"
              title="העבר למטה"
            >
              <ChevronDown className="w-4 h-4 transition-transform" />
            </Button>
          )}
          {onToggleVisibility && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility()
              }}
              className="h-8 w-8 p-0"
              title={isVisible ? "הסתר" : "הצג"}
            >
              {isVisible ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      )}

      {/* התוכן */}
      <div className={cn(!isVisible && "pointer-events-none")}>
        {children}
      </div>
    </div>
  )
}

