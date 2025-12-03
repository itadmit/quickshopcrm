"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Popup {
  id: string
  name: string
  layout: "one-column" | "two-column"
  borderRadius: number
  content: Array<{
    id: string
    type: "text" | "image" | "form"
    content: any
  }>
  displayFrequency: "every-visit" | "once-daily" | "once-weekly" | "once-monthly"
  displayLocation: "all-pages" | "specific-pages"
  specificPages?: string[] | null
  delay: number
  trigger: "on-load" | "on-exit-intent" | "on-scroll"
  scrollPercentage?: number | null
  backgroundColor?: string | null
  textColor?: string | null
  overlayColor?: string | null
  overlayOpacity?: number | null
}

interface PopupDisplayProps {
  slug: string
  currentPath?: string
}

export function PopupDisplay({ slug, currentPath }: PopupDisplayProps) {
  const pathname = usePathname()
  const actualPath = currentPath || pathname || "/"
  const [popups, setPopups] = useState<Popup[]>([])
  const [visiblePopup, setVisiblePopup] = useState<Popup | null>(null)
  const [hasScrolled, setHasScrolled] = useState(false)
  const [exitIntentDetected, setExitIntentDetected] = useState(false)

  useEffect(() => {
    // טעינת פופאפים פעילים
    const fetchPopups = async () => {
      try {
        const response = await fetch(`/api/storefront/${slug}/popups`)
        if (response.ok) {
          const data = await response.json()
          setPopups(data)
        }
      } catch (error) {
        console.error("Error fetching popups:", error)
      }
    }

    fetchPopups()
  }, [slug])

  // בדיקה אם הפופאפ צריך להופיע לפי תדירות
  const shouldShowPopup = (popup: Popup): boolean => {
    const storageKey = `popup_${popup.id}_shown`
    
    // בדיקה לפי תדירות
    switch (popup.displayFrequency) {
      case "every-visit":
        return true
      case "once-daily":
        const dailyKey = `${storageKey}_${new Date().toDateString()}`
        return !localStorage.getItem(dailyKey)
      case "once-weekly":
        const weekKey = `${storageKey}_${getWeekNumber()}`
        return !localStorage.getItem(weekKey)
      case "once-monthly":
        const monthKey = `${storageKey}_${new Date().getMonth()}_${new Date().getFullYear()}`
        return !localStorage.getItem(monthKey)
      default:
        return true
    }
  }

  // בדיקה אם הפופאפ צריך להופיע לפי מיקום
  const shouldShowOnCurrentPage = (popup: Popup): boolean => {
    if (popup.displayLocation === "all-pages") {
      return true
    }
    
    if (popup.displayLocation === "specific-pages" && popup.specificPages) {
      return popup.specificPages.includes(actualPath)
    }
    
    return false
  }

  // טיפול בטריגרים
  useEffect(() => {
    if (popups.length === 0 || visiblePopup) return

    // טריגר: on-load
    const loadTriggerPopups = popups.filter(
      p => p.trigger === "on-load" && shouldShowPopup(p) && shouldShowOnCurrentPage(p)
    )

    if (loadTriggerPopups.length > 0) {
      const popup = loadTriggerPopups[0] // לוקח את הראשון
      const timeoutId = setTimeout(() => {
        setVisiblePopup(popup)
      }, popup.delay * 1000)
      
      return () => clearTimeout(timeoutId)
    }

    // טריגר: on-scroll
    const handleScroll = () => {
      if (hasScrolled || visiblePopup) return

      const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      
      const scrollTriggerPopups = popups.filter(
        p => p.trigger === "on-scroll" && 
             shouldShowPopup(p) && 
             shouldShowOnCurrentPage(p) &&
             scrollPercentage >= (p.scrollPercentage || 50)
      )

      if (scrollTriggerPopups.length > 0) {
        setHasScrolled(true)
        const popup = scrollTriggerPopups[0]
        setTimeout(() => {
          setVisiblePopup(popup)
        }, popup.delay * 1000)
      }
    }

    window.addEventListener("scroll", handleScroll)

    // טריגר: on-exit-intent
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !exitIntentDetected && !visiblePopup) {
        const exitIntentPopups = popups.filter(
          p => p.trigger === "on-exit-intent" && shouldShowPopup(p) && shouldShowOnCurrentPage(p)
        )

        if (exitIntentPopups.length > 0) {
          setExitIntentDetected(true)
          const popup = exitIntentPopups[0]
          setTimeout(() => {
            setVisiblePopup(popup)
          }, popup.delay * 1000)
        }
      }
    }

    document.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      document.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [popups, hasScrolled, exitIntentDetected, actualPath, visiblePopup])

  const handleClose = (popup: Popup) => {
    setVisiblePopup(null)
    
    // שמירת סטטוס שהפופאפ הוצג
    const storageKey = `popup_${popup.id}_shown`
    
    switch (popup.displayFrequency) {
      case "once-daily":
        localStorage.setItem(`${storageKey}_${new Date().toDateString()}`, "true")
        break
      case "once-weekly":
        localStorage.setItem(`${storageKey}_${getWeekNumber()}`, "true")
        break
      case "once-monthly":
        localStorage.setItem(`${storageKey}_${new Date().getMonth()}_${new Date().getFullYear()}`, "true")
        break
    }
  }

  if (!visiblePopup) return null

  const overlayColor = visiblePopup.overlayColor || "#000000"
  const overlayOpacity = visiblePopup.overlayOpacity || 0.5

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        backgroundColor: `rgba(${hexToRgb(overlayColor)}, ${overlayOpacity})`,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose(visiblePopup)
        }
      }}
    >
      <div
        className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          borderRadius: `${visiblePopup.borderRadius}px`,
          backgroundColor: visiblePopup.backgroundColor || "#ffffff",
          color: visiblePopup.textColor || "#000000",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-4 top-4 z-10"
          onClick={() => handleClose(visiblePopup)}
        >
          <X className="w-5 h-5" />
        </Button>

        <div className={`p-6 ${visiblePopup.layout === "two-column" ? "grid grid-cols-2 gap-4" : ""}`}>
          {visiblePopup.content.map((element: any) => (
            <div key={element.id}>
              {element.type === "text" && (
                <p
                  style={{
                    fontSize: `${element.content.fontSize || 16}px`,
                    fontWeight: element.content.fontWeight || "normal",
                    textAlign: element.content.align || "right",
                  }}
                >
                  {element.content.text}
                </p>
              )}
              {element.type === "image" && element.content.url && (
                <img
                  src={element.content.url}
                  alt={element.content.alt || ""}
                  style={{ width: `${element.content.width || 100}%` }}
                  className="rounded"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper function להמרת hex ל-RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return "0, 0, 0"
  
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  
  return `${r}, ${g}, ${b}`
}

// Helper function לקבלת מספר שבוע
function getWeekNumber(): string {
  const date = new Date()
  const oneJan = new Date(date.getFullYear(), 0, 1)
  const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000))
  const week = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7)
  return `${date.getFullYear()}_${week}`
}

