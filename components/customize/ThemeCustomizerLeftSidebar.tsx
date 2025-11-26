"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  ChevronDown, 
  ChevronRight,
  Plus,
  Eye,
  EyeOff,
  GripVertical,
  Search,
  Home,
  Package,
  FolderOpen,
  Layout,
  Image as ImageIcon,
  Video,
  FileText,
  ShoppingBag,
  Tag,
  Users,
  Mail,
  Menu,
  X,
  Sparkles,
  Grid3x3,
  TrendingUp,
  Heart,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeSection, ThemeBlock, PageType } from "./ThemeCustomizer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BlockPicker } from "./BlockPicker"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface ThemeCustomizerLeftSidebarProps {
  sections: ThemeSection[]
  onSectionClick: (sectionId: string) => void
  onBlockClick: (blockId: string, sectionId: string) => void
  selectedSectionId: string | null
  selectedBlockId: string | null
  onSectionsChange: (sections: ThemeSection[]) => void
  shopSlug: string
  pageType: PageType
  isMobile: boolean
}

// הגדרת sections ברירת מחדל לפי סוג דף
const getDefaultSections = (pageType: PageType): ThemeSection[] => {
  if (pageType === "home") {
    return [
      {
        id: "header",
        type: "section",
        name: "Header",
        visible: true,
        position: 0,
        blocks: [],
      },
      {
        id: "template",
        type: "section",
        name: "Template",
        visible: true,
        position: 1,
        blocks: [],
      },
      {
        id: "footer",
        type: "section",
        name: "Footer",
        visible: true,
        position: 2,
        blocks: [],
      },
    ]
  }
  
  if (pageType === "product") {
    return [
      {
        id: "header",
        type: "section",
        name: "Header",
        visible: true,
        position: 0,
        blocks: [],
      },
      {
        id: "template",
        type: "section",
        name: "Template",
        visible: true,
        position: 1,
        blocks: [
          {
            id: "gallery",
            type: "product-gallery",
            name: "גלריה",
            visible: true,
            position: 0,
          },
          {
            id: "name",
            type: "product-name",
            name: "שם מוצר",
            visible: true,
            position: 1,
          },
          {
            id: "price",
            type: "product-price",
            name: "מחיר",
            visible: true,
            position: 2,
          },
        ],
      },
      {
        id: "footer",
        type: "section",
        name: "Footer",
        visible: true,
        position: 2,
        blocks: [],
      },
    ]
  }
  
  return []
}

// רשימת sections אפשריים להוספה
const availableSections = [
  { id: "slideshow", name: "Slideshow", icon: ImageIcon },
  { id: "scrolling-promotion", name: "Scrolling promotion", icon: Tag },
  { id: "custom-content", name: "Custom content", icon: FileText },
  { id: "video", name: "Video", icon: Video },
  { id: "brands-list", name: "Brands list", icon: ShoppingBag },
  { id: "featured-products", name: "Featured products", icon: Package },
  { id: "testimonials", name: "Testimonials", icon: Users },
  { id: "newsletter", name: "Newsletter", icon: Mail },
]

// פונקציה לקבלת שם section בעברית
const getSectionLabel = (sectionId: string) => {
  const labels: Record<string, string> = {
    "header": "הדר",
    "template": "תוכן האתר",
    "footer": "פוטר",
  }
  return labels[sectionId] || sectionId
}

// פונקציה לקבלת רשימת blocks אפשריים לפי pageType
const getAvailableBlocks = (pageType: PageType) => {
  if (pageType === "home") {
    return [
      // בלוקים בסיסיים
      { id: "hero", type: "hero", name: "הירו", icon: ImageIcon, category: "basic", description: "אזור הירו עם תמונה וטקסט", defaultConfig: { title: "", subtitle: "", description: "גלה עכשיו את הקטגוריה החדשה שלנו", buttonText: "גלה עכשיו", backgroundImage: "", backgroundImageMobile: "", textColor: "#000000", addOverlay: false } },
      { id: "slideshow", type: "slideshow", name: "Slideshow", icon: ImageIcon, category: "media", description: "מצגת תמונות עם ניווט", defaultConfig: { containerType: "full-width", slideHeight: "adapt", showOverlay: true, paginationPosition: "bottom", controlsColor: "dark", showPagination: true, showNavigation: true, autoRotate: false, changeSlidesEvery: 4 } },
      { id: "image-slide", type: "image-slide", name: "Image slide", icon: ImageIcon, category: "media", description: "שקופית תמונה בודדת", defaultConfig: { backgroundImage: "", backgroundImageMobile: "", contentInContainer: false, contentPosition: "bottom-center", contentAlignment: "center", textSize: "medium", textColor: "dark", heading: "", subheading: "", description: "", imageLink: "", buttonLabel: "", buttonLink: "", buttonStyle: "primary", buttonSize: "medium" } },
      { id: "video", type: "video", name: "Video", icon: Video, category: "media", description: "סרטון עם אפשרויות נגינה", defaultConfig: { containerType: "full-width", colorScheme: "scheme-1", videoType: "shopify-hosted", videoLink: "", videoRatio: "9:16", coverImage: "", heading: "", textSize: "medium", textColor: "light", playButtonStyle: "outline", playButtonSize: "medium", videoWidth: "", autoplay: false, loop: false, muted: false, showControls: true, paddingTop: 44, paddingBottom: 44 } },
      { id: "scrolling-promotion", type: "scrolling-promotion", name: "Scrolling promotion", icon: Tag, category: "content", description: "קידום גלילה אוטומטי", defaultConfig: { containerType: "full-width", direction: "left", speed: 30, itemGap: 50, itemGapMobile: 30, colorScheme: "scheme-3", paddingTop: 30, paddingBottom: 30 } },
      { id: "custom-content", type: "custom-content", name: "Custom content", icon: FileText, category: "content", description: "תוכן מותאם אישית", defaultConfig: { heading: "", headingSize: "medium", subheading: "", description: "", textAlignment: "left", containerType: "default", colorScheme: "scheme-1", contentColorScheme: "scheme-1", backgroundImage: "", backgroundImageMobile: "", enableParallax: false, parallaxDirection: "vertical", columnGap: 30, columnGapMobile: 16, enableHorizontalScroll: false, paddingTop: 100, paddingBottom: 100, customClasses: "" } },
      { id: "text-block", type: "text-block", name: "Text block", icon: FileText, category: "content", description: "בלוק טקסט עם אפשרויות עיצוב", defaultConfig: { heading: "", subheading: "", text: "", containerWidth: "50%", verticalAlignment: "middle", horizontalAlignment: "center", textSize: "medium", textColor: "inherit", buttonLabel: "", buttonLink: "", buttonStyle: "primary", buttonSize: "medium", customClasses: "" } },
      { id: "image", type: "image", name: "Image", icon: ImageIcon, category: "media", description: "תמונה בודדת", defaultConfig: { image: "", imageLink: "", containerWidth: "50%", verticalAlignment: "middle", customClasses: "" } },
      { id: "brands-list", type: "brands-list", name: "Brands list", icon: ShoppingBag, category: "content", description: "רשימת מותגים עם אפשרויות סליידר", defaultConfig: { heading: "", headingSize: "medium", subheading: "", textAlignment: "center", containerType: "default", colorScheme: "scheme-1", imagesPerRow: 4, columnGap: 30, rowGap: 30, columnGapMobile: 10, rowGapMobile: 10, enableSlider: true, showNavigation: false, showPagination: false, autoRotate: false, changeSlidesEvery: 3, paddingTop: 0, paddingBottom: 100 } },
      { id: "new-arrivals", type: "new-arrivals", name: "חדש באתר", icon: Sparkles, category: "products", description: "מוצרים חדשים", defaultConfig: { title: "חדש באתר", subtitle: "", icon: "sparkles", products: [] } },
      { id: "categories", type: "categories", name: "קטגוריות", icon: Grid3x3, category: "products", description: "תצוגת קטגוריות", defaultConfig: { title: "קטגוריות", subtitle: "גלה את המוצרים שלנו", categories: ["all"] } },
      { id: "featured-products", type: "featured-products", name: "מוצרים מומלצים", icon: TrendingUp, category: "products", description: "מוצרים מומלצים", defaultConfig: { title: "מוצרים מומלצים", subtitle: "", icon: "trending-up", products: [] } },
      { id: "about", type: "about", name: "אודות", icon: Heart, category: "content", description: "סקשן אודות", defaultConfig: { title: "אודות", subtitle: "", description: "זהו טקסט דוגמה להצגת מידע על החברה או המותג.", buttonText: "קרא עוד", backgroundImage: "" } },
    ]
  } else if (pageType === "product") {
    return [
      { id: "product-gallery", type: "product-gallery", name: "גלריה", icon: ImageIcon, defaultConfig: {} },
      { id: "product-name", type: "product-name", name: "שם מוצר", icon: FileText, defaultConfig: {} },
      { id: "product-price", type: "product-price", name: "מחיר", icon: TrendingUp, defaultConfig: {} },
      { id: "product-description", type: "product-description", name: "תיאור מוצר", icon: FileText, defaultConfig: {} },
      { id: "product-variants", type: "product-variants", name: "וריאציות", icon: Package, defaultConfig: {} },
      { id: "product-quantity", type: "product-quantity", name: "כמות", icon: Package, defaultConfig: {} },
      { id: "product-buttons", type: "product-buttons", name: "כפתורים", icon: Package, defaultConfig: {} },
      { id: "product-reviews", type: "product-reviews", name: "ביקורות", icon: Star, defaultConfig: {} },
      { id: "product-related", type: "product-related", name: "מוצרים קשורים", icon: Package, defaultConfig: {} },
      { id: "custom-text", type: "custom-text", name: "טקסט מותאם", icon: FileText, defaultConfig: {} },
      { id: "custom-accordion", type: "custom-accordion", name: "אקורדיון", icon: FileText, defaultConfig: {} },
      { id: "custom-html", type: "custom-html", name: "HTML מותאם", icon: FileText, defaultConfig: {} },
    ]
  }
  return []
}

// Sortable Section Component
function SortableSection({
  section,
  isExpanded,
  isSelected,
  onToggle,
  onClick,
  onToggleVisibility,
  children,
}: {
  section: ThemeSection
  isExpanded: boolean
  isSelected: boolean
  onToggle: () => void
  onClick: () => void
  onToggleVisibility: () => void
  children?: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const SectionIcon = section.id === "header" ? Menu : section.id === "template" ? Layout : Menu

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-50")}>
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-gray-50",
          isSelected && "bg-blue-50 border-r-2 border-blue-500",
          isDragging && "bg-gray-100"
        )}
        onClick={onClick}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className="p-1 hover:bg-gray-200 rounded"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <SectionIcon className="w-4 h-4 text-gray-600" />
        
        <span className="flex-1 text-sm font-medium">{getSectionLabel(section.id)}</span>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisibility()
          }}
          className="p-1 hover:bg-gray-200 rounded"
        >
          {section.visible ? (
            <Eye className="w-4 h-4 text-gray-600" />
          ) : (
            <EyeOff className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
      {children}
    </div>
  )
}

// Helper function to get block label
const getBlockLabel = (blockType: string, blockName: string, pageType?: PageType) => {
  // Labels לדף בית
  const homePageLabels: Record<string, string> = {
    "hero": "הירו",
    "slideshow": "Slideshow",
    "image-slide": "Image slide",
    "video": "Video",
    "scrolling-promotion": "Scrolling promotion",
    "custom-content": "Custom content",
    "text-block": "Text block",
    "image": "Image",
    "brands-list": "Brands list",
    "new-arrivals": "חדש באתר",
    "categories": "קטגוריות",
    "featured-products": "מוצרים מומלצים",
    "about": "אודות",
  }
  
  // Labels לעמוד מוצר
  const productPageLabels: Record<string, string> = {
    "product-gallery": "גלריה",
    "product-name": "שם מוצר",
    "product-price": "מחיר",
    "product-description": "תיאור מוצר",
    "product-variants": "וריאציות",
    "product-quantity": "כמות",
    "product-buttons": "כפתורים",
    "product-reviews": "ביקורות",
    "product-related": "מוצרים קשורים",
    "custom-text": "טקסט מותאם",
    "custom-accordion": "אקורדיון",
    "custom-html": "HTML מותאם",
  }
  
  if (pageType === "product") {
    return productPageLabels[blockType] || blockName
  }
  
  return homePageLabels[blockType] || blockName
}

// Sortable Block Component
function SortableBlock({
  block,
  sectionId,
  isSelected,
  onClick,
  onToggleVisibility,
  pageType,
}: {
  block: ThemeBlock
  sectionId: string
  isSelected: boolean
  onClick: () => void
  onToggleVisibility: () => void
  pageType: PageType
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `block-${sectionId}-${block.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Icons לדף בית
  const BlockIcon = block.type === "hero" || block.type === "slideshow" || block.type === "image-slide" || block.type === "image"
    ? ImageIcon
    : block.type === "video"
    ? Video
    : block.type === "scrolling-promotion"
    ? Tag
    : block.type === "custom-content" || block.type === "text-block"
    ? FileText
    : block.type === "brands-list"
    ? ShoppingBag
    : block.type === "new-arrivals"
    ? Sparkles
    : block.type === "categories"
    ? Grid3x3
    : block.type === "featured-products"
    ? TrendingUp
    : block.type === "about"
    ? Heart
    // Icons לדף מוצר
    : block.type.includes("gallery") || block.type.includes("image")
    ? ImageIcon
    : block.type.includes("video")
    ? Video
    : block.type.includes("text") || block.type.includes("description")
    ? FileText
    : Package

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-gray-50",
        isSelected && "bg-blue-50 border-r-2 border-blue-500",
        isDragging && "bg-gray-100"
      )}
      onClick={onClick}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
      <BlockIcon className="w-4 h-4 text-gray-500 mr-2" />
      <span className="flex-1 text-sm">{getBlockLabel(block.type, block.name || "", pageType)}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleVisibility()
        }}
        className="p-1 hover:bg-gray-200 rounded"
      >
        {block.visible ? (
          <Eye className="w-4 h-4 text-gray-600" />
        ) : (
          <EyeOff className="w-4 h-4 text-gray-400" />
        )}
      </button>
    </div>
  )
}

export function ThemeCustomizerLeftSidebar({
  sections: initialSections,
  onSectionClick,
  onBlockClick,
  selectedSectionId,
  selectedBlockId,
  onSectionsChange,
  shopSlug,
  pageType,
  isMobile,
}: ThemeCustomizerLeftSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["template"])
  )
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  // שימוש ב-sections שנשלחו מה-parent
  const sections = useMemo(() => {
    console.log("LeftSidebar received sections:", initialSections)
    // אם אין sections, נחזיר sections ריקים (לא נטען default)
    return initialSections || []
  }, [initialSections])

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const handleAddSection = (sectionType: string) => {
    const newSection: ThemeSection = {
      id: `section-${Date.now()}`,
      type: "section",
      name: availableSections.find((s) => s.id === sectionType)?.name || sectionType,
      visible: true,
      position: sections.length,
      blocks: [],
    }
    onSectionsChange([...sections, newSection])
  }

  const handleAddBlock = (sectionId: string, blockType: string) => {
    const availableBlocks = getAvailableBlocks(pageType)
    const blockTemplate = availableBlocks.find((b) => b.type === blockType)
    
    if (!blockTemplate) return
    
    const updatedSections = sections.map((section) => {
      if (section.id === sectionId) {
        const newBlock: ThemeBlock = {
          id: `${blockType}-${Date.now()}`,
          type: blockTemplate.type,
          name: blockTemplate.name,
          visible: true,
          position: (section.blocks?.length || 0),
          config: blockTemplate.defaultConfig || {},
        }
        return {
          ...section,
          blocks: [...(section.blocks || []), newBlock],
        }
      }
      return section
    })
    onSectionsChange(updatedSections)
  }

  const handleToggleVisibility = (sectionId: string, blockId?: string) => {
    const updatedSections = sections.map((section) => {
      if (section.id === sectionId) {
        if (blockId) {
          return {
            ...section,
            blocks: section.blocks?.map((block) =>
              block.id === blockId
                ? { ...block, visible: !block.visible }
                : block
            ),
          }
        } else {
          return { ...section, visible: !section.visible }
        }
      }
      return section
    })
    onSectionsChange(updatedSections)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // אם זה section
    if (sections.find((s) => s.id === activeId)) {
      const oldIndex = sections.findIndex((s) => s.id === activeId)
      const newIndex = sections.findIndex((s) => s.id === overId)

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newSections = arrayMove(sections, oldIndex, newIndex).map((section, index) => ({
          ...section,
          position: index,
        }))
        onSectionsChange(newSections)
      }
    }
    // אם זה block
    else if (activeId.startsWith("block-")) {
      const activeParts = activeId.split("-")
      const overParts = overId.split("-")

      if (activeParts.length >= 3 && overParts.length >= 3) {
        const activeSectionId = activeParts[1]
        const activeBlockId = activeParts.slice(2).join("-")
        const overSectionId = overParts[1]
        const overBlockId = overParts.slice(2).join("-")

        if (activeSectionId === overSectionId) {
          // אותו section - רק להזיז את ה-block
          const updatedSections = sections.map((section) => {
            if (section.id === activeSectionId) {
              const blocks = section.blocks || []
              const oldIndex = blocks.findIndex((b) => b.id === activeBlockId)
              const newIndex = blocks.findIndex((b) => b.id === overBlockId)

              if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const newBlocks = arrayMove(blocks, oldIndex, newIndex).map((block, index) => ({
                  ...block,
                  position: index,
                }))
                return { ...section, blocks: newBlocks }
              }
            }
            return section
          })
          onSectionsChange(updatedSections)
        }
      }
    }

    setActiveId(null)
  }

  const getSectionIcon = (sectionId: string) => {
    if (sectionId === "header") return Menu
    if (sectionId === "template") return Layout
    if (sectionId === "footer") return Menu
    return Layout
  }


  const getBlockIcon = (blockType: string) => {
    // Icons לדף בית
    if (blockType === "hero" || blockType === "slideshow" || blockType === "image-slide" || blockType === "image") return ImageIcon
    if (blockType === "video") return Video
    if (blockType === "scrolling-promotion") return Tag
    if (blockType === "custom-content" || blockType === "text-block") return FileText
    if (blockType === "brands-list") return ShoppingBag
    if (blockType === "new-arrivals") return Sparkles
    if (blockType === "categories") return Grid3x3
    if (blockType === "featured-products") return TrendingUp
    if (blockType === "about") return Heart
    
    // Icons לדף מוצר
    if (blockType.includes("gallery") || blockType.includes("image")) return ImageIcon
    if (blockType.includes("video")) return Video
    if (blockType.includes("text") || blockType.includes("description")) return FileText
    return Package
  }

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">
            {pageType === "home" && "דף בית"}
            {pageType === "category" && "דף קטגוריה"}
            {pageType === "product" && "דף מוצר"}
          </h2>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="חפש sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 h-9"
          />
        </div>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto sidebar-scroll">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections
              .filter((section) =>
                searchQuery === "" ||
                section.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sections
              .filter((section) =>
                searchQuery === "" ||
                section.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((section) => {
                const isExpanded = expandedSections.has(section.id)
                const isSelected = selectedSectionId === section.id

                return (
                  <SortableSection
                    key={section.id}
                    section={section}
                    isExpanded={isExpanded}
                    isSelected={isSelected}
                    onToggle={() => toggleSection(section.id)}
                    onClick={() => {
                      onSectionClick(section.id)
                    }}
                    onToggleVisibility={() => handleToggleVisibility(section.id)}
                  >

                {/* Section Blocks */}
                {isExpanded && section.blocks && section.blocks.length > 0 && (
                  <div className="mr-8">
                    <SortableContext
                      items={section.blocks.map((b) => `block-${section.id}-${b.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {section.blocks
                        .sort((a, b) => a.position - b.position)
                        .map((block) => {
                          const isBlockSelected = selectedBlockId === block.id

                          return (
                            <SortableBlock
                              key={block.id}
                              block={block}
                              sectionId={section.id}
                              isSelected={isBlockSelected}
                              onClick={() => onBlockClick(block.id, section.id)}
                              onToggleVisibility={() =>
                                handleToggleVisibility(section.id, block.id)
                              }
                              pageType={pageType}
                            />
                          )
                        })}
                    </SortableContext>
                    
                    {/* Add Block Button */}
                    <BlockPicker
                      blocks={getAvailableBlocks(pageType)}
                      onSelect={(blockType) => handleAddBlock(section.id, blockType)}
                      pageType={pageType}
                    />
                  </div>
                )}

                {/* Add Block Button for sections without blocks */}
                {isExpanded && (!section.blocks || section.blocks.length === 0) && (
                  <div className="mr-8">
                    <BlockPicker
                      blocks={getAvailableBlocks(pageType)}
                      onSelect={(blockType) => handleAddBlock(section.id, blockType)}
                      pageType={pageType}
                    />
                  </div>
                )}
                  </SortableSection>
                )
              })}
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="bg-white border border-gray-200 rounded shadow-lg p-2">
                {sections.find((s) => s.id === activeId)?.name ||
                  sections
                    .flatMap((s) =>
                      (s.blocks || []).map((b) => ({
                        ...b,
                        sectionId: s.id,
                      }))
                    )
                    .find((b) => `block-${b.sectionId}-${b.id}` === activeId)?.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Add Section Button */}
        <div className="p-4 border-t border-gray-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-center"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף section
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {availableSections.map((section) => (
                <DropdownMenuItem
                  key={section.id}
                  onClick={() => handleAddSection(section.id)}
                >
                  <section.icon className="w-4 h-4 ml-2" />
                  {section.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

