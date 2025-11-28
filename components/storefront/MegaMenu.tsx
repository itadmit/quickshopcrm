"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavigationItem {
  type: "link" | "page" | "category"
  label: string
  url?: string
  pageId?: string
  pageSlug?: string
  categoryId?: string
  categorySlug?: string
  children?: NavigationItem[]
  image?: string
  columnTitle?: string
}

interface MegaMenuProps {
  item: NavigationItem
  slug: string
  onClose?: () => void
}

export function MegaMenu({ item, slug, onClose }: MegaMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [headerTop, setHeaderTop] = useState(0)
  const [hoveredChildIndex, setHoveredChildIndex] = useState<number | null>(null)
  const hoveredColumnsRef = useRef<Set<number>>(new Set())

  // חישוב מיקום ההדר
  useEffect(() => {
    const updateHeaderTop = () => {
      const header = document.querySelector('header')
      if (header) {
        const rect = header.getBoundingClientRect()
        setHeaderTop(rect.bottom)
      }
    }
    
    updateHeaderTop()
    window.addEventListener('scroll', updateHeaderTop)
    window.addEventListener('resize', updateHeaderTop)
    
    return () => {
      window.removeEventListener('scroll', updateHeaderTop)
      window.removeEventListener('resize', updateHeaderTop)
    }
  }, [])

  // סגירה בלחיצה מחוץ למגה מניו
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        onClose?.()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  // סגירה ב-Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false)
        setHoveredChildIndex(null)
        onClose?.()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      return () => {
        document.removeEventListener("keydown", handleEscape)
      }
    }
  }, [isOpen, onClose])

  // איפוס hoveredChildIndex כשהמגה מניו נסגר
  useEffect(() => {
    if (!isOpen) {
      setHoveredChildIndex(null)
    }
  }, [isOpen])

  if (!item.children || item.children.length === 0) {
    return null
  }

  // חלוקה לעמודות - מקסימום 4 עמודות
  const columnsCount = Math.min(4, Math.ceil(item.children.length / 6))
  const itemsPerColumn = Math.ceil(item.children.length / columnsCount)

  const columns: NavigationItem[][] = []
  for (let i = 0; i < columnsCount; i++) {
    const start = i * itemsPerColumn
    const end = start + itemsPerColumn
    columns.push(item.children.slice(start, end))
  }

  const getItemUrl = (childItem: NavigationItem) => {
    if (childItem.type === "page") {
      const pageIdentifier = childItem.pageSlug || childItem.pageId
      return `/shop/${slug}/pages/${pageIdentifier}`
    } else if (childItem.type === "category") {
      // שימוש ב-slug אם קיים, אחרת ב-ID (תאימות לאחור)
      const categoryIdentifier = childItem.categorySlug || childItem.categoryId
      return `/shop/${slug}/categories/${categoryIdentifier}`
    } else if (childItem.type === "link") {
      return childItem.url || "#"
    }
    return "#"
  }

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => {
          // עיכוב קטן לפני סגירה כדי לאפשר מעבר למגה מניו
          setTimeout(() => {
            if (!menuRef.current?.matches(":hover")) {
              setIsOpen(false)
              onClose?.()
            }
          }, 100)
        }}
        className="relative"
      >
        <div className="flex items-center gap-1 cursor-pointer group">
          <span className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium">
            {item.label}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-500 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </div>

      {/* Mega Menu Dropdown */}
      {isOpen && (
        <div
          ref={menuRef}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => {
            setIsOpen(false)
            onClose?.()
          }}
          className="fixed left-0 right-0 bg-white border-t border-gray-200 shadow-xl z-50 overflow-hidden"
          style={{
            top: `${headerTop}px`,
            animation: "fadeInDown 0.2s ease-out",
          }}
        >
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex gap-8">
              {/* Content Columns */}
              <div className="flex-1">
                {/* שם הפריט הראשי מודגש */}
                <div className="mb-4">
                  <h2 className="text-base font-bold text-gray-900">{item.label}</h2>
                </div>
                <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${columnsCount}, 1fr)` }}>
                  {columns.map((column, columnIndex) => {
                    // חישוב האינדקס הגלובלי של הפריט הראשון בעמודה
                    let firstItemGlobalIndex = 0
                    for (let i = 0; i < columnIndex; i++) {
                      firstItemGlobalIndex += columns[i].length
                    }
                    
                    return (
                      <div 
                        key={columnIndex} 
                        className="space-y-3"
                        onMouseEnter={() => {
                          // כשנכנסים לעמודה, שומרים את האינדקס של העמודה
                          hoveredColumnsRef.current.add(columnIndex)
                          // אם אין תמונה מוצגת, מחפשים את הפריט הראשון עם תמונה
                          if (hoveredChildIndex === null) {
                            for (let i = 0; i < column.length; i++) {
                              const item = column[i]
                              if (item.image) {
                                setHoveredChildIndex(firstItemGlobalIndex + i)
                                break
                              }
                            }
                          }
                        }}
                        onMouseLeave={() => {
                          // מסירים את העמודה מהרשימה
                          hoveredColumnsRef.current.delete(columnIndex)
                          // רק אם אין עמודות אחרות עם hover, מחזירים לברירת מחדל
                          setTimeout(() => {
                            if (hoveredColumnsRef.current.size === 0) {
                              setHoveredChildIndex(null)
                            }
                          }, 50)
                        }}
                      >
                        {/* Column Items */}
                        {column.map((childItem, childIndex) => {
                          // חישוב האינדקס הגלובלי של הפריט
                          const globalIndex = firstItemGlobalIndex + childIndex
                          return (
                            <Link
                              key={childIndex}
                              href={getItemUrl(childItem)}
                              onClick={() => {
                                setIsOpen(false)
                                onClose?.()
                              }}
                              onMouseEnter={() => {
                                if (childItem.image) {
                                  setHoveredChildIndex(globalIndex)
                                }
                              }}
                              className="group flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              {/* Item Content */}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 group-hover:text-emerald-600 transition-colors">
                                  {childItem.label}
                                </div>
                                {childItem.children && childItem.children.length > 0 && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    {childItem.children.length} פריטים
                                  </div>
                                )}
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Category Image (תמונת הקטגוריה) - תמונה של הפריט הראשי או carousel של תמונות ילדים */}
              {(item.image || item.children?.some(child => child.image)) && (
                <div className="flex-shrink-0 w-80 relative">
                  <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 relative">
                    {/* תמונה של הפריט הראשי (תמיד ברקע) */}
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.label}
                        className={cn(
                          "absolute inset-0 w-full h-full object-cover transition-opacity duration-600",
                          hoveredChildIndex !== null ? "opacity-0" : "opacity-100"
                        )}
                        style={{ willChange: 'opacity', transitionTimingFunction: 'cubic-bezier(0.25,0.1,0.25,1)' }}
                      />
                    )}
                    
                    {/* תמונות של ילדים - מוצגות רק ב-hover */}
                    {hoveredChildIndex !== null && (() => {
                      const allChildren = item.children || []
                      const hoveredChild = allChildren[hoveredChildIndex]
                      if (hoveredChild?.image) {
                        return (
                          <img
                            src={hoveredChild.image}
                            alt={hoveredChild.label}
                            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-600"
                            style={{ transitionTimingFunction: 'cubic-bezier(0.25,0.1,0.25,1)' }}
                            style={{
                              opacity: 1,
                              willChange: 'opacity'
                            }}
                            key={hoveredChildIndex}
                          />
                        )
                      }
                      return null
                    })()}
                    
                    {/* Carousel רק אם אין תמונה לפריט הראשי ואין hover */}
                    {!item.image && hoveredChildIndex === null && (
                      <CategoryImageCarousel children={item.children || []} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

// Component for Category Image Carousel
function CategoryImageCarousel({ children }: { children: NavigationItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const images = children.filter(child => child.image).map(child => ({
    image: child.image!,
    label: child.label,
    url: child.url || `#${child.label}`,
  }))

  if (images.length === 0) {
    return null
  }

  // אם יש רק תמונה אחת, הצג אותה
  if (images.length === 1) {
    return (
      <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
        <img
          src={images[0].image}
          alt={images[0].label}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  // Carousel עם מספר תמונות
  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  // Auto-rotate every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [images.length])

  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 group">
      <img
        src={images[currentIndex].image}
        alt={images[currentIndex].label}
        className="w-full h-full object-cover transition-opacity duration-500"
      />
      
      {/* Navigation Arrows */}
      <button
        onClick={prevImage}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="תמונה קודמת"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        onClick={nextImage}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="תמונה הבאה"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === currentIndex
                ? "bg-white w-6"
                : "bg-white/50 hover:bg-white/75"
            )}
            aria-label={`עבור לתמונה ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

