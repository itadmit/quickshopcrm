"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { ThemeSection, ThemeBlock, PageType } from "./ThemeCustomizer"

interface ThemeCustomizerPreviewProps {
  shopSlug: string
  pageType: PageType
  pageId?: string
  sections: ThemeSection[]
  selectedSectionId: string | null
  selectedBlockId: string | null
  onSectionClick: (sectionId: string) => void
  onBlockClick: (blockId: string, sectionId: string) => void
}

export function ThemeCustomizerPreview({
  shopSlug,
  pageType,
  pageId,
  sections,
  selectedSectionId,
  selectedBlockId,
  onSectionClick,
  onBlockClick,
}: ThemeCustomizerPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // בניית URL לתצוגה מקדימה
  const getPreviewUrl = () => {
    const baseUrl = `/shop/${shopSlug}`
    const customizeParam = "customize=true"
    
    if (pageType === "home") {
      return `${baseUrl}?${customizeParam}`
    } else if (pageType === "category" && pageId) {
      return `${baseUrl}/categories/${pageId}?${customizeParam}`
    } else if (pageType === "product" && pageId) {
      return `${baseUrl}/products/${pageId}?${customizeParam}`
    }
    
    return `${baseUrl}?${customizeParam}`
  }

  // שליחת הודעות ל-iframe כשהאלמנטים משתנים
  useEffect(() => {
    if (!iframeRef.current) return

    const iframe = iframeRef.current
    const sendMessage = () => {
      if (iframe.contentWindow) {
        // שליחת הודעת customizeMode
        iframe.contentWindow.postMessage(
          {
            type: "customizeMode",
            isEditing: true,
            sections: sections,
            selectedSectionId: selectedSectionId,
            selectedBlockId: selectedBlockId,
          },
          window.location.origin
        )

        // עדכון תוכן לפי סוג דף
        if (pageType === "home") {
          // המרת sections ל-homePageSections
          const templateSection = sections.find((s) => s.id === "template")
          if (templateSection?.blocks) {
            const homeSections = templateSection.blocks.map((block) => ({
              id: block.id,
              type: block.type,
              visible: block.visible,
              position: block.position,
              config: block.config || {},
            }))
            iframe.contentWindow.postMessage({
              type: "updateHomePageSections",
              sections: homeSections
            }, window.location.origin)
          }
        } else if (pageType === "product") {
          // המרת sections ל-productPageElements
          const templateSection = sections.find((s) => s.id === "template")
          if (templateSection?.blocks) {
            const elements = templateSection.blocks.map((block) => ({
              id: block.id,
              type: block.type,
              visible: block.visible,
              position: block.position,
              config: block.config || {},
            }))
            iframe.contentWindow.postMessage({
              type: "updateProductPageLayout",
              elements: elements
            }, window.location.origin)
          }
        }
      }
    }

    const handleLoad = () => {
      setTimeout(sendMessage, 100)
    }

    iframe.addEventListener("load", handleLoad)
    
    if (iframe.contentDocument?.readyState === "complete") {
      sendMessage()
    }

    sendMessage()

    return () => {
      iframe.removeEventListener("load", handleLoad)
    }
  }, [sections, selectedSectionId, selectedBlockId, pageType])

  // האזנה להודעות מה-iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data.type === "sectionClick" && event.data.sectionId) {
        onSectionClick(event.data.sectionId)
      } else if (
        event.data.type === "blockClick" &&
        event.data.blockId &&
        event.data.sectionId
      ) {
        onBlockClick(event.data.blockId, event.data.sectionId)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [onSectionClick, onBlockClick])

  return (
    <div className="relative w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full overflow-hidden">
        <iframe
          ref={iframeRef}
          src={getPreviewUrl()}
          className="w-full h-full border-0"
          style={{ 
            minHeight: "100vh",
            display: "block",
            overflow: "auto",
          }}
          scrolling="yes"
          title="Preview"
        />
        
        {/* Overlay for editing mode */}
        <div className="absolute inset-0 pointer-events-none">
          {sections.map((section) => (
            <div
              key={section.id}
              className={cn(
                "absolute border-2 border-transparent transition-all",
                selectedSectionId === section.id && "border-blue-500 bg-blue-500/10",
                !section.visible && "opacity-50"
              )}
              style={{
                top: `${section.position * 100}px`,
                height: "200px", // TODO: חשב את הגובה האמיתי
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

