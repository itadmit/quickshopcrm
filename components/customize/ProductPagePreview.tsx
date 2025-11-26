"use client"

import { useEffect, useRef } from "react"
import { ProductPageElement } from "@/components/storefront/ProductPageLayoutDesigner"
import { cn } from "@/lib/utils"

interface ProductPagePreviewProps {
  previewUrl: string
  previewMode: "desktop" | "mobile"
  isEditing: boolean
  selectedElementId: string | null
  onElementClick: (elementId: string) => void
  onElementHover: (elementId: string | null) => void
  onMoveElement: (elementId: string, direction: "up" | "down") => void
  onToggleVisibility: (elementId: string) => void
  elements: ProductPageElement[]
}

export function ProductPagePreview({
  previewUrl,
  previewMode,
  isEditing,
  selectedElementId,
  onElementClick,
  onElementHover,
  onMoveElement,
  onToggleVisibility,
  elements,
}: ProductPagePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // שליחת הודעות ל-iframe כשמצב העריכה משתנה או כשהאלמנטים משתנים
  useEffect(() => {
    if (!iframeRef.current || !isEditing) return

    const iframe = iframeRef.current
    const sendMessages = () => {
      if (iframe.contentWindow) {
        // שליחת הודעת customizeMode
        iframe.contentWindow.postMessage(
          {
            type: "customizeMode",
            isEditing: true,
            elements: elements,
            selectedElementId: selectedElementId,
          },
          window.location.origin
        )
        
        // שליחת הודעת updateProductPageLayout לעדכון מידי
        iframe.contentWindow.postMessage(
          {
            type: "updateProductPageLayout",
            elements: elements,
          },
          window.location.origin
        )
      }
    }

    const handleLoad = () => {
      // קצת delay כדי שה-iframe יטען קודם
      setTimeout(sendMessages, 100)
    }

    iframe.addEventListener("load", handleLoad)
    
    // שליחה גם אם כבר נטען
    if (iframe.contentDocument?.readyState === 'complete') {
      sendMessages()
    } else {
      handleLoad()
    }

    // שליחה גם כשהאלמנטים משתנים
    sendMessages()

    return () => {
      iframe.removeEventListener("load", handleLoad)
    }
  }, [isEditing, elements, selectedElementId])

  // האזנה להודעות מה-iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data.type === "elementClick" && event.data.elementId) {
        onElementClick(event.data.elementId)
      } else if (event.data.type === "elementHover") {
        onElementHover(event.data.elementId || null)
      } else if (event.data.type === "moveElement" && event.data.elementId && event.data.direction) {
        onMoveElement(event.data.elementId, event.data.direction)
      } else if (event.data.type === "toggleElementVisibility" && event.data.elementId) {
        onToggleVisibility(event.data.elementId)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [onElementClick, onElementHover, onMoveElement, onToggleVisibility])

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-100 p-4">
      <div
        className={cn(
          "relative bg-white rounded-lg shadow-lg overflow-hidden transition-all",
          previewMode === "mobile" ? "max-w-sm w-full" : "w-full h-full"
        )}
      >
        {/* Browser Chrome */}
        <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-gray-600">
              {previewMode === "desktop" ? "תצוגת מחשב" : "תצוגת מובייל"}
            </span>
          </div>
        </div>

        {/* Iframe Preview */}
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className={cn(
            "w-full border-0",
            previewMode === "mobile" ? "h-[600px]" : "h-full min-h-[600px]"
          )}
          style={{
            width: previewMode === "mobile" ? "375px" : "100%",
          }}
        />
      </div>
    </div>
  )
}

