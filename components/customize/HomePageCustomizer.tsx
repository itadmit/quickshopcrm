"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Sparkles, 
  Image as ImageIcon, 
  Star, 
  TrendingUp, 
  Heart,
  Grid3x3,
  Save,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Type,
  Upload,
  Video,
  Zap,
  Gift,
  Award,
  Flame,
  ShoppingBag,
  Package,
  Tag,
  Bell,
  RotateCcw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MediaPicker } from "@/components/MediaPicker"
import { Checkbox } from "@/components/ui/checkbox"

export interface HomePageSection {
  id: string
  type: "hero" | "new-arrivals" | "categories" | "hero-cta" | "featured-products" | "about"
  visible: boolean
  position: number
  config: {
    title?: string
    subtitle?: string
    description?: string
    buttonText?: string
    buttonUrl?: string // כתובת URL של הכפתור
    backgroundImage?: string
    backgroundImageMobile?: string
    video?: string // סרטון רקע
    addOverlay?: boolean // האם להוסיף החשכה
    overlayColor?: string // צבע ההחשכה
    textColor?: string // צבע הפונטים
    icon?: string
    products?: string[] // product IDs
    categories?: string[] // category IDs או "all"
  }
}

interface HomePageCustomizerProps {
  shopSlug: string
  shopId?: string
  initialSections: HomePageSection[]
  onSave: (sections: HomePageSection[]) => Promise<void>
}

export const defaultSections: HomePageSection[] = [
  {
    id: "hero-1",
    type: "hero",
    visible: true,
    position: 0,
    config: {
      title: "", // יוצג שם האתר אם ריק
      subtitle: "",
      description: "גלה עכשיו את הקולקציה החדשה שלנו",
      buttonText: "גלה עכשיו",
      backgroundImage: "",
      backgroundImageMobile: "",
      textColor: "#000000", // צבע כהה/שחור
      addOverlay: false, // ללא החשכה
    }
  },
  {
    id: "new-arrivals",
    type: "new-arrivals",
    visible: true,
    position: 1,
    config: {
      title: "חדש באתר",
      subtitle: "",
      icon: "sparkles",
      products: [],
    }
  },
  {
    id: "categories",
    type: "categories",
    visible: true,
    position: 2,
    config: {
      title: "קטגוריות",
      subtitle: "גלה את המוצרים שלנו",
      categories: ["all"],
    }
  },
  {
    id: "hero-cta",
    type: "hero-cta",
    visible: true,
    position: 3,
    config: {
      title: "",
      description: "",
      buttonText: "קרא עוד",
      icon: "star",
      backgroundImage: "",
    }
  },
  {
    id: "featured-products",
    type: "featured-products",
    visible: true,
    position: 4,
    config: {
      title: "מוצרים מומלצים",
      subtitle: "",
      icon: "trending-up",
      products: [],
    }
  },
  {
    id: "about",
    type: "about",
    visible: true,
    position: 5,
    config: {
      title: "אודות",
      subtitle: "",
      description: "זהו טקסט דוגמה להצגת מידע על החברה או המותג. כאן תוכלו לספר את הסיפור שלכם, להציג את הערכים שלכם ולחבר את הלקוחות למותג. הטקסט הזה הוא דמי דאטה וניתן לערוך אותו בהתאם לצרכים שלכם.",
      buttonText: "קרא עוד",
      backgroundImage: "",
    }
  },
]

export const sectionLabels: Record<HomePageSection["type"], string> = {
  "hero": "הירו ראשון",
  "new-arrivals": "חדש באתר",
  "categories": "קטגוריות",
  "hero-cta": "הירו שני - מסר מותג",
  "featured-products": "מוצרים מומלצים",
  "about": "אודות",
}

const sectionIcons: Record<HomePageSection["type"], any> = {
  "hero": ImageIcon,
  "new-arrivals": Sparkles,
  "categories": Grid3x3,
  "hero-cta": Star,
  "featured-products": TrendingUp,
  "about": Heart,
}

export function HomePageCustomizer({ shopSlug, shopId, initialSections, onSave }: HomePageCustomizerProps) {
  const [sections, setSections] = useState<HomePageSection[]>(
    initialSections.length > 0 ? initialSections : defaultSections
  )
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [mediaPickerType, setMediaPickerType] = useState<"image-desktop" | "image-mobile" | "video" | null>(null)
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)

  const selectedSectionData = selectedSection 
    ? sections.find(s => s.id === selectedSection)
    : null

  // שליחת עדכון ראשוני לתצוגה המקדימה כשהקומפוננטה נטענת
  useEffect(() => {
    sendUpdateToPreview(sections)
  }, []) // רק פעם אחת בטעינה

  // האזנה להודעות מהתצוגה המקדימה (כשלוחצים על סקשן)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      
      if (event.data.type === "selectSection") {
        const sectionId = event.data.sectionId
        // פתיחת ההגדרות של הסקשן
        setSelectedSection(sectionId)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const updateSection = (sectionId: string, updates: Partial<HomePageSection>) => {
    setSections(prev => {
      const updated = prev.map(s => 
        s.id === sectionId ? { ...s, ...updates } : s
      )
      // שליחת עדכון לתצוגה המקדימה
      sendUpdateToPreview(updated)
      return updated
    })
    setHasChanges(true)
  }

  const updateSectionConfig = (sectionId: string, configUpdates: Partial<HomePageSection["config"]>) => {
    setSections(prev => {
      const updated = prev.map(s => 
        s.id === sectionId ? { ...s, config: { ...s.config, ...configUpdates } } : s
      )
      // שליחת עדכון לתצוגה המקדימה
      sendUpdateToPreview(updated)
      return updated
    })
    setHasChanges(true)
  }

  // שליחת עדכון לתצוגה המקדימה דרך postMessage
  const sendUpdateToPreview = (updatedSections: HomePageSection[]) => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: "updateHomePageSections",
        sections: updatedSections
      }, window.location.origin)
    }
  }

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    setSections(prev => {
      // מיון לפי position
      const sorted = [...prev].sort((a, b) => a.position - b.position)
      const index = sorted.findIndex(s => s.id === sectionId)
      if (index === -1) return prev
      
      const targetIndex = direction === "up" ? index - 1 : index + 1
      
      if (targetIndex < 0 || targetIndex >= sorted.length) return prev
      
      // החלפת positions
      const currentSection = sorted[index]
      const targetSection = sorted[targetIndex]
      
      const tempPosition = currentSection.position
      currentSection.position = targetSection.position
      targetSection.position = tempPosition
      
      // מיון מחדש
      const reSorted = sorted.sort((a, b) => a.position - b.position)
      
      // שליחת עדכון לתצוגה המקדימה
      sendUpdateToPreview(reSorted)
      return reSorted
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(sections)
      setHasChanges(false)
    } catch (error) {
      console.error("Error saving home page:", error)
    } finally {
      setSaving(false)
    }
  }

  const renderSectionSettings = () => {
    if (!selectedSectionData) return null

    const { type, config } = selectedSectionData

    switch (type) {
      case "hero":
      case "hero-cta":
        return (
          <div className="space-y-4">
            {/* תמונת רקע Desktop */}
            <div>
              <Label>תמונת רקע (Desktop)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="url"
                  value={config.backgroundImage || ""}
                  onChange={(e) => updateSectionConfig(selectedSection!, { backgroundImage: e.target.value })}
                  placeholder="https://..."
                  className="flex-1"
                />
                {shopId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMediaPickerType("image-desktop")
                      setMediaPickerOpen(true)
                    }}
                  >
                    <Upload className="w-4 h-4 ml-2" />
                    העלה
                  </Button>
                )}
              </div>
              {config.backgroundImage && (
                <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border">
                  <img
                    src={config.backgroundImage}
                    alt="Background preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* תמונת רקע Mobile - רק להירו */}
            {type === "hero" && (
              <div>
                <Label>תמונת רקע (Mobile)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="url"
                    value={config.backgroundImageMobile || ""}
                    onChange={(e) => updateSectionConfig(selectedSection!, { backgroundImageMobile: e.target.value })}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  {shopId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setMediaPickerType("image-mobile")
                        setMediaPickerOpen(true)
                      }}
                    >
                      <Upload className="w-4 h-4 ml-2" />
                      העלה
                    </Button>
                  )}
                </div>
                {config.backgroundImageMobile && (
                  <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border">
                    <img
                      src={config.backgroundImageMobile}
                      alt="Mobile background preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {/* סרטון רקע */}
            {type === "hero" && (
              <div>
                <Label>סרטון רקע (אופציונלי)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="url"
                    value={config.video || ""}
                    onChange={(e) => updateSectionConfig(selectedSection!, { video: e.target.value })}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  {shopId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setMediaPickerType("video")
                        setMediaPickerOpen(true)
                      }}
                    >
                      <Video className="w-4 h-4 ml-2" />
                      העלה
                    </Button>
                  )}
                </div>
                {config.video && (
                  <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border bg-black">
                    <video
                      src={config.video}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  הסרטון יוצג מושתק אוטומטית
                </p>
              </div>
            )}

            {/* החשכה */}
            {type === "hero" && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="addOverlay"
                  checked={config.addOverlay ?? true}
                  onCheckedChange={(checked) => {
                    updateSectionConfig(selectedSection!, { addOverlay: checked as boolean })
                  }}
                />
                <Label htmlFor="addOverlay" className="cursor-pointer">
                  הוסף החשכה על הרקע
                </Label>
              </div>
            )}

            {/* צבע החשכה */}
            {type === "hero" && config.addOverlay && (
              <div>
                <Label>צבע החשכה</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={config.overlayColor || "#000000"}
                    onChange={(e) => updateSectionConfig(selectedSection!, { overlayColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.overlayColor || "#000000"}
                    onChange={(e) => updateSectionConfig(selectedSection!, { overlayColor: e.target.value })}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
            )}

            {/* צבע פונטים */}
            <div>
              <Label>צבע פונטים</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={config.textColor || "#ffffff"}
                  onChange={(e) => updateSectionConfig(selectedSection!, { textColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={config.textColor || "#ffffff"}
                  onChange={(e) => updateSectionConfig(selectedSection!, { textColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>כותרת</Label>
              <Input
                value={config.title || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { title: e.target.value })}
                placeholder="הזן כותרת..."
              />
            </div>
            <div>
              <Label>תת כותרת</Label>
              <Input
                value={config.subtitle || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { subtitle: e.target.value })}
                placeholder="הזן תת כותרת..."
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={config.description || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { description: e.target.value })}
                placeholder="הזן תיאור..."
                rows={3}
              />
            </div>
            <div>
              <Label>טקסט כפתור</Label>
              <Input
                value={config.buttonText || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { buttonText: e.target.value })}
                placeholder="לחץ כאן"
              />
            </div>
            <div>
              <Label>כתובת URL של הכפתור</Label>
              <Input
                type="url"
                value={config.buttonUrl || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { buttonUrl: e.target.value })}
                placeholder="/shop/שם-החנות/search או https://..."
              />
              <p className="text-xs text-gray-500 mt-1">
                השאר ריק לשימוש בכתובת ברירת מחדל
              </p>
            </div>
          </div>
        )

      case "new-arrivals":
      case "featured-products":
        return (
          <div className="space-y-4">
            <div>
              <Label>כותרת</Label>
              <Input
                value={config.title || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { title: e.target.value })}
                placeholder="הזן כותרת..."
              />
            </div>
            <div>
              <Label>תת כותרת (אופציונלי)</Label>
              <Input
                value={config.subtitle || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { subtitle: e.target.value })}
                placeholder="הזן תת כותרת..."
              />
            </div>
            <div>
              <Label>אייקון</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  { value: "sparkles", label: "כוכבים", icon: Sparkles },
                  { value: "trending-up", label: "עולה", icon: TrendingUp },
                  { value: "star", label: "כוכב", icon: Star },
                  { value: "heart", label: "לב", icon: Heart },
                  { value: "zap", label: "ברק", icon: Zap },
                  { value: "gift", label: "מתנה", icon: Gift },
                  { value: "award", label: "פרס", icon: Award },
                  { value: "flame", label: "להבה", icon: Flame },
                  { value: "shopping-bag", label: "תיק קניות", icon: ShoppingBag },
                  { value: "package", label: "חבילה", icon: Package },
                  { value: "tag", label: "תג", icon: Tag },
                  { value: "bell", label: "פעמון", icon: Bell },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateSectionConfig(selectedSection!, { icon: value })}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 border-2 rounded-lg transition-all",
                      config.icon === value
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5",
                      config.icon === value ? "text-emerald-600" : "text-gray-600"
                    )} />
                    <span className={cn(
                      "text-xs",
                      config.icon === value ? "text-emerald-600 font-medium" : "text-gray-600"
                    )}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>בחר מוצרים</Label>
              <p className="text-sm text-gray-500 mt-1">
                השאר ריק להצגת מוצרים אחרונים אוטומטית
              </p>
              <Input
                value={config.products?.join(",") || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { 
                  products: e.target.value ? e.target.value.split(",") : []
                })}
                placeholder="מזהי מוצרים מופרדים בפסיק"
              />
            </div>
          </div>
        )

      case "categories":
        return (
          <div className="space-y-4">
            <div>
              <Label>כותרת</Label>
              <Input
                value={config.title || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { title: e.target.value })}
                placeholder="קטגוריות"
              />
            </div>
            <div>
              <Label>תת כותרת</Label>
              <Input
                value={config.subtitle || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { subtitle: e.target.value })}
                placeholder="גלה את המוצרים שלנו"
              />
            </div>
            <div>
              <Label>בחר קטגוריות</Label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={config.categories?.[0] || "all"}
                onChange={(e) => updateSectionConfig(selectedSection!, { 
                  categories: [e.target.value]
                })}
              >
                <option value="all">כל הקטגוריות</option>
                <option value="specific">קטגוריות ספציפיות</option>
              </select>
              {config.categories?.[0] === "specific" && (
                <Input
                  className="mt-2"
                  value={config.categories?.slice(1).join(",") || ""}
                  onChange={(e) => updateSectionConfig(selectedSection!, { 
                    categories: ["specific", ...e.target.value.split(",").filter(Boolean)]
                  })}
                  placeholder="מזהי קטגוריות מופרדים בפסיק"
                />
              )}
            </div>
          </div>
        )

      case "about":
        return (
          <div className="space-y-4">
            <div>
              <Label>תמונה</Label>
              <Input
                type="url"
                value={config.backgroundImage || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { backgroundImage: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>כותרת</Label>
              <Input
                value={config.title || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { title: e.target.value })}
                placeholder="אודות"
              />
            </div>
            <div>
              <Label>תת כותרת</Label>
              <Input
                value={config.subtitle || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { subtitle: e.target.value })}
                placeholder="הסיפור שלנו"
              />
            </div>
            <div>
              <Label>תוכן</Label>
              <Textarea
                value={config.description || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { description: e.target.value })}
                placeholder="ספר את הסיפור שלך..."
                rows={5}
              />
            </div>
            <div>
              <Label>טקסט כפתור</Label>
              <Input
                value={config.buttonText || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { buttonText: e.target.value })}
                placeholder="קרא עוד"
              />
            </div>
            <div>
              <Label>כתובת URL של הכפתור</Label>
              <Input
                type="url"
                value={config.buttonUrl || ""}
                onChange={(e) => updateSectionConfig(selectedSection!, { buttonUrl: e.target.value })}
                placeholder="/shop/שם-החנות/search או https://..."
              />
              <p className="text-xs text-gray-500 mt-1">
                השאר ריק לשימוש בכתובת ברירת מחדל
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">סקשנים</h3>
      </div>

      {/* רשימת סקשנים */}
      <div className="space-y-2">
        {sections.sort((a, b) => a.position - b.position).map((section, index) => {
          const Icon = sectionIcons[section.type]
          const canMoveUp = index > 0
          const canMoveDown = index < sections.length - 1
          const isSelected = selectedSection === section.id
          const isHovered = hoveredSection === section.id

          // פונקציה לניווט לסקשן בתצוגה המקדימה
          const scrollToSection = () => {
            const iframe = document.querySelector('iframe') as HTMLIFrameElement
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({
                type: "scrollToSection",
                sectionId: section.id
              }, window.location.origin)
            }
          }

          return (
            <div
              key={section.id}
              className={cn(
                "border rounded-lg transition-all",
                section.visible ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200 opacity-60",
                isSelected && "ring-2 ring-emerald-500",
                isHovered && "ring-2 ring-emerald-400"
              )}
              onMouseEnter={() => setHoveredSection(section.id)}
              onMouseLeave={() => setHoveredSection(null)}
            >
              {/* Header - לחיצה כאן פותחת/סוגרת */}
              <div
                className="flex items-center gap-2 p-2 cursor-pointer"
                onClick={() => {
                  scrollToSection()
                  // אם הסקשן כבר פתוח, סגור אותו. אחרת, פתח אותו
                  setSelectedSection(isSelected ? null : section.id)
                }}
              >
                <div className="flex items-center gap-2 flex-1 text-right min-w-0">
                  <Icon className="w-4 h-4 flex-shrink-0 text-gray-600" />
                  <span className={cn("text-sm font-medium truncate", !section.visible && "text-gray-500")}>
                    {sectionLabels[section.type]}
                  </span>
                  {!section.visible && <EyeOff className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                </div>

                <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {canMoveUp && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        moveSection(section.id, "up")
                      }}
                      className="h-6 w-6 p-0"
                      title="העבר למעלה"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                  )}

                  {canMoveDown && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        moveSection(section.id, "down")
                      }}
                      className="h-6 w-6 p-0"
                      title="העבר למטה"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      updateSection(section.id, { visible: !section.visible })
                    }}
                    className="h-6 w-6 p-0"
                    title={section.visible ? "הסתר" : "הצג"}
                  >
                    {section.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              {/* הגדרות סקשן - לחיצה כאן לא תסגור את האקורדיון */}
              {isSelected && (
                <div className="px-2 pb-2 pt-0 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                  {renderSectionSettings()}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* כפתור שמירה ואיפוס */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        {hasChanges && (
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                שמור שינויים
              </>
            )}
          </Button>
        )}
        <Button 
          onClick={() => {
            if (confirm("האם אתה בטוח שברצונך לאפס את כל ההגדרות לתבנית ברירת מחדל? פעולה זו לא ניתנת לביטול.")) {
              setSections(defaultSections)
              setSelectedSection(null)
              setHasChanges(true)
              sendUpdateToPreview(defaultSections)
            }
          }}
          variant="outline"
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 ml-2" />
          איפוס לתבנית ברירת מחדל
        </Button>
      </div>

      {/* MediaPicker */}
      {shopId && selectedSection && mediaPickerType && (
        <MediaPicker
          open={mediaPickerOpen}
          onOpenChange={(open) => {
            setMediaPickerOpen(open)
            if (!open) {
              setMediaPickerType(null)
            }
          }}
          onSelect={(files) => {
            if (files.length > 0 && selectedSection && mediaPickerType) {
              const fileUrl = files[0]
              // עדכון ה-config של הסקשן
              if (mediaPickerType === "image-desktop") {
                updateSectionConfig(selectedSection, { backgroundImage: fileUrl })
              } else if (mediaPickerType === "image-mobile") {
                updateSectionConfig(selectedSection, { backgroundImageMobile: fileUrl })
              } else if (mediaPickerType === "video") {
                updateSectionConfig(selectedSection, { video: fileUrl })
              }
            }
            setMediaPickerOpen(false)
            setMediaPickerType(null)
          }}
          selectedFiles={[]}
          shopId={shopId}
          entityType="home-page"
          entityId="sections"
          multiple={false}
          title={
            mediaPickerType === "video" 
              ? "בחר סרטון" 
              : mediaPickerType === "image-mobile"
              ? "בחר תמונת רקע למובייל"
              : "בחר תמונת רקע"
          }
        />
      )}
    </div>
  )
}

