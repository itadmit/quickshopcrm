"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AccordionContextValue {
  openItems: Set<string>
  toggleItem: (id: string) => void
  storageKey?: string
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined)

interface AccordionProps {
  children: React.ReactNode
  defaultValue?: string[]
  storageKey?: string
  className?: string
}

export function Accordion({ children, defaultValue = [], storageKey, className }: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved !== null) {
        // אם יש מפתח ב-localStorage (אפילו אם הערך ריק), נשתמש בו
        try {
          const parsed = JSON.parse(saved)
          return new Set(Array.isArray(parsed) ? parsed : [])
        } catch {
          // אם יש שגיאה בפארס, נשתמש ב-defaultValue
          return new Set(defaultValue)
        }
      }
    }
    // אם אין localStorage שמור, נשתמש ב-defaultValue (כל האקורדיונים פתוחים)
    return new Set(defaultValue)
  })

  const toggleItem = React.useCallback((id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      
      // שמירה ב-localStorage
      if (storageKey && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)))
      }
      
      return next
    })
  }, [storageKey])

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, storageKey }}>
      <div className={cn("space-y-1", className)}>{children}</div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemProps {
  id: string
  children: React.ReactNode
  className?: string
}

export function AccordionItem({ id, children, className }: AccordionItemProps) {
  return (
    <div className={cn("", className)} data-accordion-item={id}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { itemId: id })
        }
        return child
      })}
    </div>
  )
}

interface AccordionTriggerProps {
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
  itemId?: string
}

export function AccordionTrigger({ children, className, icon, itemId: propItemId }: AccordionTriggerProps) {
  const context = React.useContext(AccordionContext)
  if (!context) {
    throw new Error("AccordionTrigger must be used within Accordion")
  }

  const itemElement = React.useRef<HTMLButtonElement | null>(null)
  const [itemId, setItemId] = React.useState<string>(propItemId || "")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (propItemId) {
      setItemId(propItemId)
    } else {
      const item = itemElement.current?.closest('[data-accordion-item]')
      if (item) {
        setItemId(item.getAttribute('data-accordion-item') || "")
      }
    }
  }, [propItemId])

  const isOpen = itemId ? context.openItems.has(itemId) : false

  const handleClick = () => {
    if (itemId) {
      context.toggleItem(itemId)
    }
  }

  return (
    <button
      ref={itemElement}
      onClick={handleClick}
      className={cn(
        "flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        "text-gray-700 hover:bg-gray-200",
        className
      )}
    >
      <div className="flex items-center gap-2 flex-1">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
          {children}
        </span>
      </div>
      <ChevronDown
        className={cn(
          "w-4 h-4 text-gray-400 transition-transform flex-shrink-0",
          mounted && isOpen && "transform rotate-180"
        )}
      />
    </button>
  )
}

interface AccordionContentProps {
  children: React.ReactNode
  className?: string
  itemId?: string
}

export function AccordionContent({ children, className, itemId: propItemId }: AccordionContentProps) {
  const context = React.useContext(AccordionContext)
  if (!context) {
    throw new Error("AccordionContent must be used within Accordion")
  }

  const itemElement = React.useRef<HTMLDivElement | null>(null)
  const [itemId, setItemId] = React.useState<string>(propItemId || "")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (propItemId) {
      setItemId(propItemId)
    } else {
      const item = itemElement.current?.closest('[data-accordion-item]')
      if (item) {
        setItemId(item.getAttribute('data-accordion-item') || "")
      }
    }
  }, [propItemId])

  const isOpen = itemId ? context.openItems.has(itemId) : false

  return (
    <div
      ref={itemElement}
      className={cn(
        "overflow-hidden transition-all duration-200 ease-in-out",
        mounted && isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0",
        className
      )}
    >
      <div className="pt-1">{children}</div>
    </div>
  )
}

