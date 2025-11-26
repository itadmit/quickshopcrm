"use client"

import { useState, useEffect, useRef } from "react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useOptimisticToast as useToast } from "@/hooks/useOptimisticToast"
import { cn } from "@/lib/utils"
import { ThemeCustomizerLeftSidebar } from "./ThemeCustomizerLeftSidebar"
import { ThemeCustomizerRightSidebar } from "./ThemeCustomizerRightSidebar"
import { ThemeCustomizerPreview } from "./ThemeCustomizerPreview"
import { ThemeCustomizerTopBar } from "./ThemeCustomizerTopBar"

export type PageType = "home" | "category" | "product"

export interface ThemeSection {
  id: string
  type: "section" | "block"
  name: string
  icon?: string
  visible: boolean
  position: number
  blocks?: ThemeBlock[]
  config?: any
}

export interface ThemeBlock {
  id: string
  type: string
  name: string
  visible: boolean
  position: number
  config?: any
}

interface ThemeCustomizerProps {
  shopSlug: string
  pageType: PageType
  pageId?: string
  onClose?: () => void
}

export function ThemeCustomizer({
  shopSlug,
  pageType,
  pageId,
  onClose,
}: ThemeCustomizerProps) {
  const isMobile = useMediaQuery("(max-width: 1024px)")
  const { toast } = useToast()
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(!isMobile)
  const [sections, setSections] = useState<ThemeSection[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [initialSections, setInitialSections] = useState<ThemeSection[]>([])

  // המרת HomePageSection ל-ThemeSection
  const convertHomePageSectionsToThemeSections = (homeSections: any[]): ThemeSection[] => {
    if (!homeSections || homeSections.length === 0) {
      // אם אין sections, נחזיר sections ריקים עם Template ריק
      return [
        {
          id: "header",
          type: "section",
          name: "הדר",
          visible: true,
          position: 0,
          blocks: [],
        },
        {
          id: "template",
          type: "section",
          name: "תוכן האתר",
          visible: true,
          position: 1,
          blocks: [],
        },
        {
          id: "footer",
          type: "section",
          name: "פוטר",
          visible: true,
          position: 2,
          blocks: [],
        },
      ]
    }

    // המרת כל HomePageSection ל-block בתוך Template section
    const templateBlocks: ThemeBlock[] = homeSections
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((section) => ({
        id: section.id,
        type: section.type || "custom",
        name: section.type || "Custom Section",
        visible: section.visible !== false,
        position: section.position || 0,
        config: section.config || {},
      }))

    return [
      {
        id: "header",
        type: "section",
          name: "הדר",
        visible: true,
        position: 0,
        blocks: [],
      },
      {
        id: "template",
        type: "section",
          name: "תוכן האתר",
        visible: true,
        position: 1,
        blocks: templateBlocks,
      },
      {
        id: "footer",
        type: "section",
          name: "פוטר",
        visible: true,
        position: 2,
        blocks: [],
      },
    ]
  }

  // המרת ThemeSection חזרה ל-HomePageSection
  const convertThemeSectionsToHomePageSections = (themeSections: ThemeSection[]): any[] => {
    const templateSection = themeSections.find((s) => s.id === "template")
    if (!templateSection || !templateSection.blocks) {
      return []
    }

    return templateSection.blocks.map((block) => ({
      id: block.id,
      type: block.type,
      visible: block.visible,
      position: block.position,
      config: block.config || {},
    }))
  }

  // המרת ProductPageElements ל-ThemeSection
  const convertProductPageElementsToThemeSections = (elements: any[]): ThemeSection[] => {
    const templateBlocks: ThemeBlock[] = elements
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((element) => ({
        id: element.id,
        type: element.type,
        name: element.type || "Element",
        visible: element.visible !== false,
        position: element.position || 0,
        config: element.config || {},
      }))

    return [
      {
        id: "header",
        type: "section",
          name: "הדר",
        visible: true,
        position: 0,
        blocks: [],
      },
      {
        id: "template",
        type: "section",
          name: "תוכן האתר",
        visible: true,
        position: 1,
        blocks: templateBlocks,
      },
      {
        id: "footer",
        type: "section",
          name: "פוטר",
        visible: true,
        position: 2,
        blocks: [],
      },
    ]
  }

  // המרת ThemeSection חזרה ל-ProductPageElements
  const convertThemeSectionsToProductPageElements = (themeSections: ThemeSection[]): any[] => {
    const templateSection = themeSections.find((s) => s.id === "template")
    if (!templateSection || !templateSection.blocks) {
      return []
    }

    return templateSection.blocks.map((block) => ({
      id: block.id,
      type: block.type,
      visible: block.visible,
      position: block.position,
      config: block.config || {},
    }))
  }

  // טעינת layout מהשרת
  useEffect(() => {
    const fetchLayout = async () => {
      try {
        setLoading(true)
        setHasUnsavedChanges(false)
        
        if (pageType === "home") {
          // לדף בית - טען מה-home-page-layout
          const response = await fetch(`/api/storefront/${shopSlug}/home-page-layout`)
          if (response.ok) {
            const data = await response.json()
            // ה-API מחזיר { sections: [...] } ישירות
            let homeSections = data.sections || []
            
            // אם אין sections, נטען את defaultSections
            if (!homeSections || homeSections.length === 0) {
              // נטען defaultSections מ-HomePageCustomizer
              const { defaultSections: defaultHomeSections } = await import("./HomePageCustomizer")
              homeSections = defaultHomeSections
            }
            
            console.log("Loaded home sections:", homeSections)
            const themeSections = convertHomePageSectionsToThemeSections(homeSections)
            console.log("Converted theme sections:", themeSections)
            setSections(themeSections)
            setInitialSections(themeSections)
          } else {
            console.log("Failed to load home page layout, using defaults")
            // נטען defaultSections
            const { defaultSections: defaultHomeSections } = await import("./HomePageCustomizer")
            const themeSections = convertHomePageSectionsToThemeSections(defaultHomeSections)
            setSections(themeSections)
            setInitialSections(themeSections)
          }
        } else if (pageType === "product") {
          // לעמוד מוצר - טען מ-product-page-layout
          const response = await fetch(`/api/storefront/${shopSlug}/product-page-layout`)
          if (response.ok) {
            const data = await response.json()
            const elements = data.layout?.elements || []
            if (elements.length > 0) {
              const themeSections = convertProductPageElementsToThemeSections(elements)
              setSections(themeSections)
              setInitialSections(themeSections)
            } else {
              // default elements
              const defaultElements = [
                { id: "gallery", type: "product-gallery", visible: true, position: 0 },
                { id: "name", type: "product-name", visible: true, position: 1 },
                { id: "price", type: "product-price", visible: true, position: 2 },
                { id: "description", type: "product-description", visible: true, position: 3 },
                { id: "variants", type: "product-variants", visible: true, position: 4 },
                { id: "quantity", type: "product-quantity", visible: true, position: 5 },
                { id: "buttons", type: "product-buttons", visible: true, position: 6 },
              ]
              const themeSections = convertProductPageElementsToThemeSections(defaultElements)
              setSections(themeSections)
              setInitialSections(themeSections)
            }
          }
        } else {
          // לדפים אחרים - טען מ-theme-layout
          const response = await fetch(
            `/api/storefront/${shopSlug}/theme-layout?pageType=${pageType}`
          )
          if (response.ok) {
            const data = await response.json()
            if (data.layout?.sections && data.layout.sections.length > 0) {
              setSections(data.layout.sections)
              setInitialSections(data.layout.sections)
            } else {
              const defaultSections: ThemeSection[] = []
              setSections(defaultSections)
              setInitialSections(defaultSections)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching layout:", error)
      } finally {
        setLoading(false)
      }
    }

    if (shopSlug) {
      fetchLayout()
    }
  }, [shopSlug, pageType])

  // סימון שיש שינויים כשהאלמנטים משתנים (רק אם זה שונה מה-initial)
  useEffect(() => {
    if (!loading) {
      const hasChanges = JSON.stringify(sections) !== JSON.stringify(initialSections)
      setHasUnsavedChanges(hasChanges)
    }
  }, [sections, initialSections, loading])

  // העדכון בזמן אמת נעשה דרך ThemeCustomizerPreview

  // במסך קטן - רק סיידבר אחד פתוח בכל פעם
  useEffect(() => {
    if (isMobile) {
      if (selectedSectionId || selectedBlockId) {
        setLeftSidebarOpen(false)
        setRightSidebarOpen(true)
      } else {
        setLeftSidebarOpen(true)
        setRightSidebarOpen(false)
      }
    } else {
      // במסך גדול - שני סיידברים פתוחים
      setLeftSidebarOpen(true)
      if (selectedSectionId || selectedBlockId) {
        setRightSidebarOpen(true)
      }
    }
  }, [isMobile, selectedSectionId, selectedBlockId])

  const handleSectionClick = (sectionId: string) => {
    setSelectedSectionId(sectionId)
    setSelectedBlockId(null)
    // פתיחת הגדרות גם במסך גדול
    setRightSidebarOpen(true)
    if (isMobile) {
      setLeftSidebarOpen(false)
    }
  }

  const handleBlockClick = (blockId: string, sectionId: string) => {
    setSelectedBlockId(blockId)
    setSelectedSectionId(sectionId)
    // פתיחת הגדרות גם במסך גדול
    setRightSidebarOpen(true)
    if (isMobile) {
      setLeftSidebarOpen(false)
    }
  }

  const handleBackToSections = () => {
    setSelectedSectionId(null)
    setSelectedBlockId(null)
    if (isMobile) {
      setRightSidebarOpen(false)
      setLeftSidebarOpen(true)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let response
      
      if (pageType === "home") {
        // לדף בית - שמור ב-home-page-layout
        const homeSections = convertThemeSectionsToHomePageSections(sections)
        response = await fetch(`/api/storefront/${shopSlug}/home-page-layout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sections: homeSections,
          }),
        })
      } else if (pageType === "product") {
        // לעמוד מוצר - שמור ב-product-page-layout
        const elements = convertThemeSectionsToProductPageElements(sections)
        response = await fetch(`/api/storefront/${shopSlug}/product-page-layout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            elements,
          }),
        })
      } else {
        // לדפים אחרים - שמור ב-theme-layout
        response = await fetch(`/api/storefront/${shopSlug}/theme-layout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pageType,
            sections,
          }),
        })
      }

      if (response.ok) {
        const data = await response.json()
        if (pageType === "home") {
          // עדכון sections מה-response
          const updatedThemeSections = convertHomePageSectionsToThemeSections(data.layout?.sections || data.sections || [])
          setInitialSections(updatedThemeSections)
        } else if (pageType === "product") {
          // עדכון elements מה-response
          const elements = data.layout?.elements || []
          const updatedThemeSections = convertProductPageElementsToThemeSections(elements)
          setInitialSections(updatedThemeSections)
        } else {
          setInitialSections(data.layout?.sections || sections)
        }
        setHasUnsavedChanges(false)
        toast({
          title: "נשמר בהצלחה",
          description: "השינויים נשמרו בהצלחה",
        })
      } else {
        const error = await response.json()
        console.error("Error saving:", error)
        toast({
          title: "שגיאה בשמירה",
          description: error.error || "אירעה שגיאה בשמירת השינויים",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving:", error)
      toast({
        title: "שגיאה בשמירה",
        description: "אירעה שגיאה בשמירת השינויים",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען קסטומייזר...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50" dir="rtl">
      {/* Top Bar */}
      <ThemeCustomizerTopBar
        pageType={pageType}
        hasUnsavedChanges={hasUnsavedChanges}
        saving={saving}
        onSave={handleSave}
        onClose={onClose}
        onLeftSidebarToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onRightSidebarToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        {leftSidebarOpen && (
          <ThemeCustomizerLeftSidebar
            sections={sections}
            onSectionClick={handleSectionClick}
            onBlockClick={handleBlockClick}
            selectedSectionId={selectedSectionId}
            selectedBlockId={selectedBlockId}
            onSectionsChange={setSections}
            shopSlug={shopSlug}
            pageType={pageType}
            isMobile={isMobile}
          />
        )}

        {/* Preview */}
        <div className="flex-1 overflow-hidden">
          <ThemeCustomizerPreview
            shopSlug={shopSlug}
            pageType={pageType}
            pageId={pageId}
            sections={sections}
            selectedSectionId={selectedSectionId}
            selectedBlockId={selectedBlockId}
            onSectionClick={handleSectionClick}
            onBlockClick={handleBlockClick}
          />
        </div>

        {/* Right Sidebar */}
        {rightSidebarOpen && (
          <ThemeCustomizerRightSidebar
            selectedSectionId={selectedSectionId}
            selectedBlockId={selectedBlockId}
            sections={sections}
            onSectionsChange={setSections}
            onBack={handleBackToSections}
            shopSlug={shopSlug}
            pageType={pageType}
            pageId={pageId}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  )
}

