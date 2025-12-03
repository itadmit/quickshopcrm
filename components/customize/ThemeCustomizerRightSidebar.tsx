"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  ChevronRight,
  X,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Video,
  Sparkles,
  TrendingUp,
  Star,
  Heart,
  Zap,
  Gift,
  Award,
  Flame,
  ShoppingBag,
  Package,
  Tag,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeSection, ThemeBlock, PageType } from "./ThemeCustomizer"
import { MediaPicker } from "@/components/MediaPicker"
import { useShop } from "@/components/providers/ShopProvider"
import { ElementSettingsContent } from "@/components/storefront/ElementSettingsContent"
import { ProductPageElementType } from "@/components/storefront/ProductPageLayoutDesigner"

interface ThemeCustomizerRightSidebarProps {
  selectedSectionId: string | null
  selectedBlockId: string | null
  sections: ThemeSection[]
  onSectionsChange: (sections: ThemeSection[]) => void
  onBack: () => void
  shopSlug: string
  pageType: PageType
  pageId?: string
  isMobile: boolean
}

export function ThemeCustomizerRightSidebar({
  selectedSectionId,
  selectedBlockId,
  sections,
  onSectionsChange,
  onBack,
  shopSlug,
  pageType,
  pageId,
  isMobile,
}: ThemeCustomizerRightSidebarProps) {
  const { selectedShop } = useShop()
  const [selectedSection, setSelectedSection] = useState<ThemeSection | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<ThemeBlock | null>(null)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [mediaPickerType, setMediaPickerType] = useState<"image-desktop" | "image-mobile" | "video" | null>(null)

  useEffect(() => {
    if (selectedSectionId) {
      const section = sections.find((s: any) => s.id === selectedSectionId)
      setSelectedSection(section || null)
    } else {
      setSelectedSection(null)
    }
  }, [selectedSectionId, sections])

  useEffect(() => {
    if (selectedBlockId && selectedSectionId) {
      const section = sections.find((s: any) => s.id === selectedSectionId)
      const block = section?.blocks?.find((b: any) => b.id === selectedBlockId)
      setSelectedBlock(block || null)
    } else {
      setSelectedBlock(null)
    }
  }, [selectedBlockId, selectedSectionId, sections])

  const updateBlockConfig = (configUpdates: any) => {
    if (!selectedBlockId || !selectedSectionId) return
    
    const updatedSections = sections.map((section: any) => {
      if (section.id === selectedSectionId) {
        return {
          ...section,
          blocks: section.blocks?.map((block: any) =>
            block.id === selectedBlockId
              ? { ...block, config: { ...block.config, ...configUpdates } }
              : block
          ),
        }
      }
      return section
    })
    onSectionsChange(updatedSections)
  }

  const handleConfigChange = (config: any) => {
    if (selectedBlockId && selectedSectionId) {
      updateBlockConfig(config)
    } else if (selectedSectionId) {
      const updatedSections = sections.map((section: any) =>
        section.id === selectedSectionId
          ? { ...section, config: { ...section.config, ...config } }
          : section
      )
      onSectionsChange(updatedSections)
    }
  }

  const handleDelete = () => {
    if (selectedBlockId && selectedSectionId) {
      const updatedSections = sections.map((section: any) => {
        if (section.id === selectedSectionId) {
          return {
            ...section,
            blocks: section.blocks?.filter((block: any) => block.id !== selectedBlockId),
          }
        }
        return section
      })
      onSectionsChange(updatedSections)
      onBack()
    } else if (selectedSectionId) {
      const updatedSections = sections.filter((section: any) => section.id !== selectedSectionId)
      onSectionsChange(updatedSections)
      onBack()
    }
  }

  const handleToggleVisibility = () => {
    if (selectedBlockId && selectedSectionId) {
      const updatedSections = sections.map((section: any) => {
        if (section.id === selectedSectionId) {
          return {
            ...section,
            blocks: section.blocks?.map((block: any) =>
              block.id === selectedBlockId
                ? { ...block, visible: !block.visible }
                : block
            ),
          }
        }
        return section
      })
      onSectionsChange(updatedSections)
    } else if (selectedSectionId) {
      const updatedSections = sections.map((section: any) =>
        section.id === selectedSectionId
          ? { ...section, visible: !section.visible }
          : section
      )
      onSectionsChange(updatedSections)
    }
  }

  const renderBlockSettings = () => {
    if (!selectedBlock) return null

    const { type, config } = selectedBlock

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
                  value={config?.backgroundImage || ""}
                  onChange={(e) => updateBlockConfig({ backgroundImage: e.target.value })}
                  placeholder="https://..."
                  className="flex-1"
                />
                {selectedShop?.id && (
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
              {config?.backgroundImage && (
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
                    value={config?.backgroundImageMobile || ""}
                    onChange={(e) => updateBlockConfig({ backgroundImageMobile: e.target.value })}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  {selectedShop?.id && (
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
                {config?.backgroundImageMobile && (
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
                    value={config?.video || ""}
                    onChange={(e) => updateBlockConfig({ video: e.target.value })}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  {selectedShop?.id && (
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
                {config?.video && (
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
                  checked={config?.addOverlay ?? false}
                  onCheckedChange={(checked) => {
                    updateBlockConfig({ addOverlay: checked as boolean })
                  }}
                />
                <Label htmlFor="addOverlay" className="cursor-pointer">
                  הוסף החשכה על הרקע
                </Label>
              </div>
            )}

            {/* צבע החשכה */}
            {type === "hero" && config?.addOverlay && (
              <div>
                <Label>צבע החשכה</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={config.overlayColor || "#000000"}
                    onChange={(e) => updateBlockConfig({ overlayColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.overlayColor || "#000000"}
                    onChange={(e) => updateBlockConfig({ overlayColor: e.target.value })}
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
                  value={config?.textColor || "#000000"}
                  onChange={(e) => updateBlockConfig({ textColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={config?.textColor || "#000000"}
                  onChange={(e) => updateBlockConfig({ textColor: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>כותרת</Label>
              <Input
                value={config?.title || ""}
                onChange={(e) => updateBlockConfig({ title: e.target.value })}
                placeholder="הזן כותרת..."
              />
            </div>
            <div>
              <Label>תת כותרת</Label>
              <Input
                value={config?.subtitle || ""}
                onChange={(e) => updateBlockConfig({ subtitle: e.target.value })}
                placeholder="הזן תת כותרת..."
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={config?.description || ""}
                onChange={(e) => updateBlockConfig({ description: e.target.value })}
                placeholder="הזן תיאור..."
                rows={3}
              />
            </div>
            <div>
              <Label>טקסט כפתור</Label>
              <Input
                value={config?.buttonText || ""}
                onChange={(e) => updateBlockConfig({ buttonText: e.target.value })}
                placeholder="לחץ כאן"
              />
            </div>
            <div>
              <Label>כתובת URL של הכפתור</Label>
              <Input
                type="url"
                value={config?.buttonUrl || ""}
                onChange={(e) => updateBlockConfig({ buttonUrl: e.target.value })}
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
                value={config?.title || ""}
                onChange={(e) => updateBlockConfig({ title: e.target.value })}
                placeholder="הזן כותרת..."
              />
            </div>
            <div>
              <Label>תת כותרת (אופציונלי)</Label>
              <Input
                value={config?.subtitle || ""}
                onChange={(e) => updateBlockConfig({ subtitle: e.target.value })}
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
                    onClick={() => updateBlockConfig({ icon: value })}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 border-2 rounded-lg transition-all",
                      config?.icon === value
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5",
                      config?.icon === value ? "text-emerald-600" : "text-gray-600"
                    )} />
                    <span className={cn(
                      "text-xs",
                      config?.icon === value ? "text-emerald-600 font-medium" : "text-gray-600"
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
                value={config?.products?.join(",") || ""}
                onChange={(e) => updateBlockConfig({ 
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
                value={config?.title || ""}
                onChange={(e) => updateBlockConfig({ title: e.target.value })}
                placeholder="קטגוריות"
              />
            </div>
            <div>
              <Label>תת כותרת</Label>
              <Input
                value={config?.subtitle || ""}
                onChange={(e) => updateBlockConfig({ subtitle: e.target.value })}
                placeholder="גלה את המוצרים שלנו"
              />
            </div>
            <div>
              <Label>בחר קטגוריות</Label>
              <Select
                value={config?.categories?.[0] || "all"}
                onValueChange={(value) => updateBlockConfig({ 
                  categories: [value]
                })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקטגוריות</SelectItem>
                  <SelectItem value="specific">קטגוריות ספציפיות</SelectItem>
                </SelectContent>
              </Select>
              {config?.categories?.[0] === "specific" && (
                <Input
                  className="mt-2"
                  value={config.categories?.slice(1).join(",") || ""}
                  onChange={(e) => updateBlockConfig({ 
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
                value={config?.backgroundImage || ""}
                onChange={(e) => updateBlockConfig({ backgroundImage: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>כותרת</Label>
              <Input
                value={config?.title || ""}
                onChange={(e) => updateBlockConfig({ title: e.target.value })}
                placeholder="אודות"
              />
            </div>
            <div>
              <Label>תת כותרת</Label>
              <Input
                value={config?.subtitle || ""}
                onChange={(e) => updateBlockConfig({ subtitle: e.target.value })}
                placeholder="הסיפור שלנו"
              />
            </div>
            <div>
              <Label>תוכן</Label>
              <Textarea
                value={config?.description || ""}
                onChange={(e) => updateBlockConfig({ description: e.target.value })}
                placeholder="ספר את הסיפור שלך..."
                rows={5}
              />
            </div>
            <div>
              <Label>טקסט כפתור</Label>
              <Input
                value={config?.buttonText || ""}
                onChange={(e) => updateBlockConfig({ buttonText: e.target.value })}
                placeholder="קרא עוד"
              />
            </div>
            <div>
              <Label>כתובת URL של הכפתור</Label>
              <Input
                type="url"
                value={config?.buttonUrl || ""}
                onChange={(e) => updateBlockConfig({ buttonUrl: e.target.value })}
                placeholder="/shop/שם-החנות/search או https://..."
              />
              <p className="text-xs text-gray-500 mt-1">
                השאר ריק לשימוש בכתובת ברירת מחדל
              </p>
            </div>
          </div>
        )

      case "slideshow":
        return (
          <div className="space-y-4">
            <div>
              <Label>Container type</Label>
              <Select
                value={config?.containerType || "full-width"}
                onValueChange={(value) => updateBlockConfig({ containerType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-width">Full width</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Slide height</Label>
              <Select
                value={config?.slideHeight || "adapt"}
                onValueChange={(value) => updateBlockConfig({ slideHeight: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adapt">Adapt to first slide image</SelectItem>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Only applies to screens &gt; 767px</p>
            </div>
            <div className="flex items-center justify-between">
              <Label>Show overlay</Label>
              <Switch
                checked={config?.showOverlay ?? true}
                onCheckedChange={(checked) => updateBlockConfig({ showOverlay: checked })}
              />
            </div>
            <div>
              <Label>Pagination position</Label>
              <div className="flex gap-2 mt-2">
                {["left", "bottom", "right"].map((pos: any) => (
                  <Button
                    key={pos}
                    variant={config?.paginationPosition === pos ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ paginationPosition: pos })}
                    className="flex-1"
                  >
                    {pos === "left" ? "שמאל" : pos === "bottom" ? "תחתית" : "ימין"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Controls color</Label>
              <div className="flex gap-2 mt-2">
                {["dark", "light"].map((color: any) => (
                  <Button
                    key={color}
                    variant={config?.controlsColor === color ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ controlsColor: color })}
                    className="flex-1"
                  >
                    {color === "dark" ? "כהה" : "בהיר"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Show pagination</Label>
              <Switch
                checked={config?.showPagination ?? true}
                onCheckedChange={(checked) => updateBlockConfig({ showPagination: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show navigation</Label>
              <Switch
                checked={config?.showNavigation ?? true}
                onCheckedChange={(checked) => updateBlockConfig({ showNavigation: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-rotate slides</Label>
              <Switch
                checked={config?.autoRotate ?? false}
                onCheckedChange={(checked) => updateBlockConfig({ autoRotate: checked })}
              />
            </div>
            {config?.autoRotate && (
              <div>
                <Label>Change slides every (seconds)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    value={config?.changeSlidesEvery || 4}
                    onChange={(e) => updateBlockConfig({ changeSlidesEvery: parseInt(e.target.value) || 4 })}
                    min="1"
                    max="60"
                  />
                  <span className="text-sm text-gray-500 flex items-center">s</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Work when auto-rotate</p>
              </div>
            )}
          </div>
        )

      case "image-slide":
        return (
          <div className="space-y-4">
            <div>
              <Label>Image on desktop</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="url"
                  value={config?.backgroundImage || ""}
                  onChange={(e) => updateBlockConfig({ backgroundImage: e.target.value })}
                  placeholder="https://..."
                  className="flex-1"
                />
                {selectedShop?.id && (
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
              {config?.backgroundImage && (
                <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border">
                  <img
                    src={config.backgroundImage}
                    alt="Desktop preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Recommended: 1920 x 900px</p>
            </div>
            <div>
              <Label>Image on mobile</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="url"
                  value={config?.backgroundImageMobile || ""}
                  onChange={(e) => updateBlockConfig({ backgroundImageMobile: e.target.value })}
                  placeholder="https://..."
                  className="flex-1"
                />
                {selectedShop?.id && (
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
              {config?.backgroundImageMobile && (
                <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border">
                  <img
                    src={config.backgroundImageMobile}
                    alt="Mobile preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Recommended: 600 x 480px</p>
            </div>
            <div className="flex items-center justify-between">
              <Label>Content in container box</Label>
              <Switch
                checked={config?.contentInContainer ?? false}
                onCheckedChange={(checked) => updateBlockConfig({ contentInContainer: checked })}
              />
            </div>
            <div>
              <Label>Content position</Label>
              <Select
                value={config?.contentPosition || "bottom-center"}
                onValueChange={(value) => updateBlockConfig({ contentPosition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-left">Top left</SelectItem>
                  <SelectItem value="top-center">Top center</SelectItem>
                  <SelectItem value="top-right">Top right</SelectItem>
                  <SelectItem value="middle-left">Middle left</SelectItem>
                  <SelectItem value="middle-center">Middle center</SelectItem>
                  <SelectItem value="middle-right">Middle right</SelectItem>
                  <SelectItem value="bottom-left">Bottom left</SelectItem>
                  <SelectItem value="bottom-center">Bottom center</SelectItem>
                  <SelectItem value="bottom-right">Bottom right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Content alignment</Label>
              <div className="flex gap-2 mt-2">
                {["left", "center", "right"].map((align: any) => (
                  <Button
                    key={align}
                    variant={config?.contentAlignment === align ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ contentAlignment: align })}
                    className="flex-1"
                  >
                    {align === "left" ? "שמאל" : align === "center" ? "מרכז" : "ימין"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Text size</Label>
              <div className="flex gap-2 mt-2">
                {["medium", "large"].map((size: any) => (
                  <Button
                    key={size}
                    variant={config?.textSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ textSize: size })}
                    className="flex-1"
                  >
                    {size === "medium" ? "בינוני" : "גדול"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Text color</Label>
              <div className="flex gap-2 mt-2">
                {["dark", "light"].map((color: any) => (
                  <Button
                    key={color}
                    variant={config?.textColor === color ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ textColor: color })}
                    className="flex-1"
                  >
                    {color === "dark" ? "כהה" : "בהיר"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Subheading</Label>
              <Textarea
                value={config?.subheading || ""}
                onChange={(e) => updateBlockConfig({ subheading: e.target.value })}
                placeholder="הזן תת כותרת..."
                rows={2}
              />
            </div>
            <div>
              <Label>Heading</Label>
              <Textarea
                value={config?.heading || ""}
                onChange={(e) => updateBlockConfig({ heading: e.target.value })}
                placeholder="הזן כותרת..."
                rows={2}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={config?.description || ""}
                onChange={(e) => updateBlockConfig({ description: e.target.value })}
                placeholder="הזן תיאור..."
                rows={3}
              />
            </div>
            <div>
              <Label>Image link</Label>
              <Input
                type="url"
                value={config?.imageLink || ""}
                onChange={(e) => updateBlockConfig({ imageLink: e.target.value })}
                placeholder="Paste a link or search"
              />
            </div>
            <div>
              <Label>First Button - Button label</Label>
              <Input
                value={config?.buttonLabel || ""}
                onChange={(e) => updateBlockConfig({ buttonLabel: e.target.value })}
                placeholder="לרכישה"
              />
            </div>
            <div>
              <Label>First Button - Button link</Label>
              <Input
                type="url"
                value={config?.buttonLink || ""}
                onChange={(e) => updateBlockConfig({ buttonLink: e.target.value })}
                placeholder="Paste a link or search"
              />
            </div>
            <div>
              <Label>First Button - Button style</Label>
              <Select
                value={config?.buttonStyle || "primary"}
                onValueChange={(value) => updateBlockConfig({ buttonStyle: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary button</SelectItem>
                  <SelectItem value="secondary">Secondary button</SelectItem>
                  <SelectItem value="outline">Outline button</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>First Button - Button size</Label>
              <Select
                value={config?.buttonSize || "medium"}
                onValueChange={(value) => updateBlockConfig({ buttonSize: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Button small</SelectItem>
                  <SelectItem value="medium">Button medium</SelectItem>
                  <SelectItem value="large">Button large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "video":
        return (
          <div className="space-y-4">
            <div>
              <Label>Container type</Label>
              <Select
                value={config?.containerType || "full-width"}
                onValueChange={(value) => updateBlockConfig({ containerType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-width">Full width</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color scheme</Label>
              <Select
                value={config?.colorScheme || "scheme-1"}
                onValueChange={(value) => updateBlockConfig({ colorScheme: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheme-1">Aa Scheme 1</SelectItem>
                  <SelectItem value="scheme-2">Aa Scheme 2</SelectItem>
                  <SelectItem value="scheme-3">Aa Scheme 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Video type</Label>
              <div className="flex gap-2 mt-2">
                {["shopify-hosted", "external"].map((type: any) => (
                  <Button
                    key={type}
                    variant={config?.videoType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ videoType: type })}
                    className="flex-1"
                  >
                    {type === "shopify-hosted" ? "Shopify hosted" : "External"}
                  </Button>
                ))}
              </div>
            </div>
            {config?.videoType === "shopify-hosted" && (
              <>
                <div>
                  <Label>Video</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="url"
                      value={config?.video || ""}
                      onChange={(e) => updateBlockConfig({ video: e.target.value })}
                      placeholder="Upload video..."
                      className="flex-1"
                    />
                    {selectedShop?.id && (
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
                </div>
              </>
            )}
            {config?.videoType === "external" && (
              <div>
                <Label>Video link</Label>
                <Input
                  type="url"
                  value={config?.videoLink || ""}
                  onChange={(e) => updateBlockConfig({ videoLink: e.target.value })}
                  placeholder="Paste a link"
                />
                <p className="text-xs text-gray-500 mt-1">Accepts YouTube or Vimeo links</p>
              </div>
            )}
            <div>
              <Label>Video ratio</Label>
              <Select
                value={config?.videoRatio || "9:16"}
                onValueChange={(value) => updateBlockConfig({ videoRatio: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9</SelectItem>
                  <SelectItem value="9:16">9:16</SelectItem>
                  <SelectItem value="4:3">4:3</SelectItem>
                  <SelectItem value="1:1">1:1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cover image</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="url"
                  value={config?.coverImage || ""}
                  onChange={(e) => updateBlockConfig({ coverImage: e.target.value })}
                  placeholder="https://..."
                  className="flex-1"
                />
                {selectedShop?.id && (
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
            </div>
            <div>
              <Label>Heading</Label>
              <Textarea
                value={config?.heading || ""}
                onChange={(e) => updateBlockConfig({ heading: e.target.value })}
                placeholder="הזן כותרת..."
                rows={2}
              />
            </div>
            <div>
              <Label>Text size</Label>
              <div className="flex gap-2 mt-2">
                {["medium", "large"].map((size: any) => (
                  <Button
                    key={size}
                    variant={config?.textSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ textSize: size })}
                    className="flex-1"
                  >
                    {size === "medium" ? "בינוני" : "גדול"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Text color</Label>
              <div className="flex gap-2 mt-2">
                {["light", "dark", "inherit"].map((color: any) => (
                  <Button
                    key={color}
                    variant={config?.textColor === color ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ textColor: color })}
                    className="flex-1"
                  >
                    {color === "light" ? "בהיר" : color === "dark" ? "כהה" : "ירושה"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Play button style</Label>
              <div className="flex gap-2 mt-2">
                {["outline", "solid"].map((style: any) => (
                  <Button
                    key={style}
                    variant={config?.playButtonStyle === style ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ playButtonStyle: style })}
                    className="flex-1"
                  >
                    {style === "outline" ? "Outline" : "Solid"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Play button size</Label>
              <div className="flex gap-2 mt-2">
                {["medium", "large"].map((size: any) => (
                  <Button
                    key={size}
                    variant={config?.playButtonSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ playButtonSize: size })}
                    className="flex-1"
                  >
                    {size === "medium" ? "בינוני" : "גדול"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Video width</Label>
              <Input
                type="text"
                value={config?.videoWidth || ""}
                onChange={(e) => updateBlockConfig({ videoWidth: e.target.value })}
                placeholder="450px"
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank for follow container width</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Autoplay</Label>
                <p className="text-xs text-gray-500">Only work if the muted box is checked</p>
              </div>
              <Switch
                checked={config?.autoplay ?? false}
                onCheckedChange={(checked) => updateBlockConfig({ autoplay: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Loop</Label>
              <Switch
                checked={config?.loop ?? false}
                onCheckedChange={(checked) => updateBlockConfig({ loop: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Muted</Label>
              <Switch
                checked={config?.muted ?? false}
                onCheckedChange={(checked) => updateBlockConfig({ muted: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Show controls</Label>
                <p className="text-xs text-gray-500">Only work when use Shopify hosted video type</p>
              </div>
              <Switch
                checked={config?.showControls ?? true}
                onCheckedChange={(checked) => updateBlockConfig({ showControls: checked })}
              />
            </div>
            <div>
              <Label>Padding Top</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.paddingTop || 44}
                  onChange={(e) => updateBlockConfig({ paddingTop: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div>
              <Label>Padding Bottom</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.paddingBottom || 44}
                  onChange={(e) => updateBlockConfig({ paddingBottom: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
          </div>
        )

      case "scrolling-promotion":
        return (
          <div className="space-y-4">
            <div>
              <Label>Container type</Label>
              <Select
                value={config?.containerType || "full-width"}
                onValueChange={(value) => updateBlockConfig({ containerType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-width">Full width</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Direction</Label>
              <div className="flex gap-2 mt-2">
                {["left", "right"].map((dir: any) => (
                  <Button
                    key={dir}
                    variant={config?.direction === dir ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ direction: dir })}
                    className="flex-1"
                  >
                    {dir === "left" ? "שמאל" : "ימין"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Speed (seconds)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.speed || 30}
                  onChange={(e) => updateBlockConfig({ speed: parseInt(e.target.value) || 30 })}
                  min="1"
                  max="100"
                />
                <span className="text-sm text-gray-500 flex items-center">s</span>
              </div>
            </div>
            <div>
              <Label>Item gap</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.itemGap || 50}
                  onChange={(e) => updateBlockConfig({ itemGap: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div>
              <Label>Item gap mobile</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.itemGapMobile || 30}
                  onChange={(e) => updateBlockConfig({ itemGapMobile: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div>
              <Label>Color scheme</Label>
              <Select
                value={config?.colorScheme || "scheme-3"}
                onValueChange={(value) => updateBlockConfig({ colorScheme: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheme-1">Aa Scheme 1</SelectItem>
                  <SelectItem value="scheme-2">Aa Scheme 2</SelectItem>
                  <SelectItem value="scheme-3">Aa Scheme 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Padding Top</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.paddingTop || 30}
                  onChange={(e) => updateBlockConfig({ paddingTop: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div>
              <Label>Padding Bottom</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.paddingBottom || 30}
                  onChange={(e) => updateBlockConfig({ paddingBottom: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
          </div>
        )

      case "custom-content":
        return (
          <div className="space-y-4">
            <div>
              <Label>Heading</Label>
              <Input
                value={config?.heading || ""}
                onChange={(e) => updateBlockConfig({ heading: e.target.value })}
                placeholder="הזן כותרת..."
              />
            </div>
            <div>
              <Label>Heading size</Label>
              <div className="flex gap-2 mt-2">
                {["medium", "large"].map((size: any) => (
                  <Button
                    key={size}
                    variant={config?.headingSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ headingSize: size })}
                    className="flex-1"
                  >
                    {size === "medium" ? "בינוני" : "גדול"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Subheading</Label>
              <Input
                value={config?.subheading || ""}
                onChange={(e) => updateBlockConfig({ subheading: e.target.value })}
                placeholder="הזן תת כותרת..."
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={config?.description || ""}
                onChange={(e) => updateBlockConfig({ description: e.target.value })}
                placeholder="הזן תיאור..."
                rows={4}
              />
            </div>
            <div>
              <Label>Text alignment</Label>
              <div className="flex gap-2 mt-2">
                {["left", "center"].map((align: any) => (
                  <Button
                    key={align}
                    variant={config?.textAlignment === align ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ textAlignment: align })}
                    className="flex-1"
                  >
                    {align === "left" ? "שמאל" : "מרכז"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Container type</Label>
              <Select
                value={config?.containerType || "default"}
                onValueChange={(value) => updateBlockConfig({ containerType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="full-width">Full width</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color scheme</Label>
              <Select
                value={config?.colorScheme || "scheme-1"}
                onValueChange={(value) => updateBlockConfig({ colorScheme: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheme-1">Aa Scheme 1</SelectItem>
                  <SelectItem value="scheme-2">Aa Scheme 2</SelectItem>
                  <SelectItem value="scheme-3">Aa Scheme 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Content color scheme</Label>
              <Select
                value={config?.contentColorScheme || "scheme-1"}
                onValueChange={(value) => updateBlockConfig({ contentColorScheme: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheme-1">Aa Scheme 1</SelectItem>
                  <SelectItem value="scheme-2">Aa Scheme 2</SelectItem>
                  <SelectItem value="scheme-3">Aa Scheme 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Background image</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="url"
                  value={config?.backgroundImage || ""}
                  onChange={(e) => updateBlockConfig({ backgroundImage: e.target.value })}
                  placeholder="https://..."
                  className="flex-1"
                />
                {selectedShop?.id && (
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
            </div>
            <div>
              <Label>Background image mobile</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="url"
                  value={config?.backgroundImageMobile || ""}
                  onChange={(e) => updateBlockConfig({ backgroundImageMobile: e.target.value })}
                  placeholder="https://..."
                  className="flex-1"
                />
                {selectedShop?.id && (
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
            </div>
            <div className="flex items-center justify-between">
              <Label>Enable parallax effect</Label>
              <Switch
                checked={config?.enableParallax ?? false}
                onCheckedChange={(checked) => updateBlockConfig({ enableParallax: checked })}
              />
            </div>
            {config?.enableParallax && (
              <div>
                <Label>Parallax direction</Label>
                <Select
                  value={config?.parallaxDirection || "vertical"}
                  onValueChange={(value) => updateBlockConfig({ parallaxDirection: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vertical">Vertical</SelectItem>
                    <SelectItem value="horizontal">Horizontal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Column gap</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.columnGap || 30}
                  onChange={(e) => updateBlockConfig({ columnGap: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div>
              <Label>Column gap mobile</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.columnGapMobile || 16}
                  onChange={(e) => updateBlockConfig({ columnGapMobile: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Enable horizontal scroll</Label>
              <Switch
                checked={config?.enableHorizontalScroll ?? false}
                onCheckedChange={(checked) => updateBlockConfig({ enableHorizontalScroll: checked })}
              />
            </div>
            <div>
              <Label>Padding Top</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.paddingTop || 100}
                  onChange={(e) => updateBlockConfig({ paddingTop: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div>
              <Label>Padding Bottom</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.paddingBottom || 100}
                  onChange={(e) => updateBlockConfig({ paddingBottom: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div>
              <Label>Custom classes</Label>
              <Input
                value={config?.customClasses || ""}
                onChange={(e) => updateBlockConfig({ customClasses: e.target.value })}
                placeholder="colflex"
              />
            </div>
          </div>
        )

      case "text-block":
        return (
          <div className="space-y-4">
            <div>
              <Label>Heading</Label>
              <Textarea
                value={config?.heading || ""}
                onChange={(e) => updateBlockConfig({ heading: e.target.value })}
                placeholder="הזן כותרת..."
                rows={2}
              />
            </div>
            <div>
              <Label>Subheading</Label>
              <Textarea
                value={config?.subheading || ""}
                onChange={(e) => updateBlockConfig({ subheading: e.target.value })}
                placeholder="הזן תת כותרת..."
                rows={2}
              />
            </div>
            <div>
              <Label>Text (Rich Text Editor)</Label>
              <Textarea
                value={config?.text || ""}
                onChange={(e) => updateBlockConfig({ text: e.target.value })}
                placeholder="הזן טקסט..."
                rows={4}
              />
            </div>
            <div>
              <Label>Container width</Label>
              <Select
                value={config?.containerWidth || "50%"}
                onValueChange={(value) => updateBlockConfig({ containerWidth: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25%">25%</SelectItem>
                  <SelectItem value="50%">50%</SelectItem>
                  <SelectItem value="75%">75%</SelectItem>
                  <SelectItem value="100%">100%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vertical alignment</Label>
              <div className="flex gap-2 mt-2">
                {["top", "middle", "bottom"].map((align: any) => (
                  <Button
                    key={align}
                    variant={config?.verticalAlignment === align ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ verticalAlignment: align })}
                    className="flex-1"
                  >
                    {align === "top" ? "עליון" : align === "middle" ? "אמצע" : "תחתון"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Horizontal alignment</Label>
              <div className="flex gap-2 mt-2">
                {["left", "center", "right"].map((align: any) => (
                  <Button
                    key={align}
                    variant={config?.horizontalAlignment === align ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ horizontalAlignment: align })}
                    className="flex-1"
                  >
                    {align === "left" ? "שמאל" : align === "center" ? "מרכז" : "ימין"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Text size</Label>
              <div className="flex gap-2 mt-2">
                {["small", "medium", "large"].map((size: any) => (
                  <Button
                    key={size}
                    variant={config?.textSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ textSize: size })}
                    className="flex-1"
                  >
                    {size === "small" ? "קטן" : size === "medium" ? "בינוני" : "גדול"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Text color</Label>
              <div className="flex gap-2 mt-2">
                {["light", "dark", "inherit"].map((color: any) => (
                  <Button
                    key={color}
                    variant={config?.textColor === color ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ textColor: color })}
                    className="flex-1"
                  >
                    {color === "light" ? "בהיר" : color === "dark" ? "כהה" : "ירושה"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Button label</Label>
              <Input
                value={config?.buttonLabel || ""}
                onChange={(e) => updateBlockConfig({ buttonLabel: e.target.value })}
                placeholder="הזן טקסט כפתור..."
              />
            </div>
            <div>
              <Label>Button link</Label>
              <Input
                type="url"
                value={config?.buttonLink || ""}
                onChange={(e) => updateBlockConfig({ buttonLink: e.target.value })}
                placeholder="Paste a link or search"
              />
            </div>
            <div>
              <Label>Button style</Label>
              <Select
                value={config?.buttonStyle || "primary"}
                onValueChange={(value) => updateBlockConfig({ buttonStyle: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary button</SelectItem>
                  <SelectItem value="secondary">Secondary button</SelectItem>
                  <SelectItem value="outline">Outline button</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Button size</Label>
              <Select
                value={config?.buttonSize || "medium"}
                onValueChange={(value) => updateBlockConfig({ buttonSize: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Button small</SelectItem>
                  <SelectItem value="medium">Button medium</SelectItem>
                  <SelectItem value="large">Button large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Custom classes</Label>
              <Input
                value={config?.customClasses || ""}
                onChange={(e) => updateBlockConfig({ customClasses: e.target.value })}
                placeholder="nogap"
              />
            </div>
          </div>
        )

      case "image":
        return (
          <div className="space-y-4">
            <div>
              <Label>Image</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="url"
                  value={config?.image || ""}
                  onChange={(e) => updateBlockConfig({ image: e.target.value })}
                  placeholder="https://..."
                  className="flex-1"
                />
                {selectedShop?.id && (
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
              {config?.image && (
                <div className="mt-2 relative w-full h-48 rounded-lg overflow-hidden border">
                  <img
                    src={config.image}
                    alt="Image preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            <div>
              <Label>Image link</Label>
              <Input
                type="url"
                value={config?.imageLink || ""}
                onChange={(e) => updateBlockConfig({ imageLink: e.target.value })}
                placeholder="Paste a link or search"
              />
            </div>
            <div>
              <Label>Container width</Label>
              <Select
                value={config?.containerWidth || "50%"}
                onValueChange={(value) => updateBlockConfig({ containerWidth: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25%">25%</SelectItem>
                  <SelectItem value="50%">50%</SelectItem>
                  <SelectItem value="75%">75%</SelectItem>
                  <SelectItem value="100%">100%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vertical alignment</Label>
              <div className="flex gap-2 mt-2">
                {["top", "middle", "bottom"].map((align: any) => (
                  <Button
                    key={align}
                    variant={config?.verticalAlignment === align ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ verticalAlignment: align })}
                    className="flex-1"
                  >
                    {align === "top" ? "עליון" : align === "middle" ? "אמצע" : "תחתון"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Custom classes</Label>
              <Input
                value={config?.customClasses || ""}
                onChange={(e) => updateBlockConfig({ customClasses: e.target.value })}
                placeholder="nogap"
              />
            </div>
          </div>
        )

      case "brands-list":
        return (
          <div className="space-y-4">
            <div>
              <Label>Heading</Label>
              <Input
                value={config?.heading || ""}
                onChange={(e) => updateBlockConfig({ heading: e.target.value })}
                placeholder="הצצה קטנה"
              />
            </div>
            <div>
              <Label>Heading size</Label>
              <div className="flex gap-2 mt-2">
                {["medium", "large"].map((size: any) => (
                  <Button
                    key={size}
                    variant={config?.headingSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ headingSize: size })}
                    className="flex-1"
                  >
                    {size === "medium" ? "בינוני" : "גדול"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Subheading</Label>
              <Input
                value={config?.subheading || ""}
                onChange={(e) => updateBlockConfig({ subheading: e.target.value })}
                placeholder="הזן תת כותרת..."
              />
            </div>
            <div>
              <Label>Text alignment</Label>
              <div className="flex gap-2 mt-2">
                {["left", "center"].map((align: any) => (
                  <Button
                    key={align}
                    variant={config?.textAlignment === align ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateBlockConfig({ textAlignment: align })}
                    className="flex-1"
                  >
                    {align === "left" ? "שמאל" : "מרכז"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Container type</Label>
              <Select
                value={config?.containerType || "default"}
                onValueChange={(value) => updateBlockConfig({ containerType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="full-width">Full width</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color scheme</Label>
              <Select
                value={config?.colorScheme || "scheme-1"}
                onValueChange={(value) => updateBlockConfig({ colorScheme: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheme-1">Aa Scheme 1</SelectItem>
                  <SelectItem value="scheme-2">Aa Scheme 2</SelectItem>
                  <SelectItem value="scheme-3">Aa Scheme 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Images per row</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.imagesPerRow || 4}
                  onChange={(e) => updateBlockConfig({ imagesPerRow: parseInt(e.target.value) || 4 })}
                  min="1"
                  max="12"
                />
              </div>
            </div>
            <div>
              <Label>Column gap</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.columnGap || 30}
                  onChange={(e) => updateBlockConfig({ columnGap: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div>
              <Label>Row gap</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.rowGap || 30}
                  onChange={(e) => updateBlockConfig({ rowGap: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div>
              <Label>Column gap mobile</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.columnGapMobile || 10}
                  onChange={(e) => updateBlockConfig({ columnGapMobile: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div>
              <Label>Row gap mobile</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.rowGapMobile || 10}
                  onChange={(e) => updateBlockConfig({ rowGapMobile: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable slider</Label>
                <p className="text-xs text-gray-500">Images must be greater than images per row</p>
              </div>
              <Switch
                checked={config?.enableSlider ?? true}
                onCheckedChange={(checked) => updateBlockConfig({ enableSlider: checked })}
              />
            </div>
            {config?.enableSlider && (
              <>
                <div className="flex items-center justify-between">
                  <Label>Show navigation</Label>
                  <Switch
                    checked={config?.showNavigation ?? false}
                    onCheckedChange={(checked) => updateBlockConfig({ showNavigation: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Show pagination</Label>
                  <Switch
                    checked={config?.showPagination ?? false}
                    onCheckedChange={(checked) => updateBlockConfig({ showPagination: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Auto-rotate slides</Label>
                  <Switch
                    checked={config?.autoRotate ?? false}
                    onCheckedChange={(checked) => updateBlockConfig({ autoRotate: checked })}
                  />
                </div>
                {config?.autoRotate && (
                  <div>
                    <Label>Change slides every (seconds)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        value={config?.changeSlidesEvery || 3}
                        onChange={(e) => updateBlockConfig({ changeSlidesEvery: parseInt(e.target.value) || 3 })}
                        min="1"
                        max="60"
                      />
                      <span className="text-sm text-gray-500 flex items-center">s</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div>
              <Label>Padding Top</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.paddingTop || 0}
                  onChange={(e) => updateBlockConfig({ paddingTop: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div>
              <Label>Padding Bottom</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={config?.paddingBottom || 100}
                  onChange={(e) => updateBlockConfig({ paddingBottom: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="text-sm text-gray-500 flex items-center">px</span>
              </div>
            </div>
            <div>
              <Label>Custom classes</Label>
              <Input
                value={config?.customClasses || ""}
                onChange={(e) => updateBlockConfig({ customClasses: e.target.value })}
                placeholder=""
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-4">
            <div>
              <Label>שם ה-block</Label>
              <Input
                value={selectedBlock.name || ""}
                onChange={(e) => {
                  const updatedSections = sections.map((section: any) => {
                    if (section.id === selectedSectionId) {
                      return {
                        ...section,
                        blocks: section.blocks?.map((block: any) =>
                          block.id === selectedBlockId
                            ? { ...block, name: e.target.value }
                            : block
                        ),
                      }
                    }
                    return section
                  })
                  onSectionsChange(updatedSections)
                }}
                className="mt-2"
              />
            </div>
            {config && Object.keys(config).length > 0 && (
              <div>
                <Label>הגדרות נוספות</Label>
                <Textarea
                  value={JSON.stringify(config, null, 2)}
                  readOnly
                  className="mt-2 font-mono text-xs"
                  rows={10}
                />
              </div>
            )}
          </div>
        )
    }
  }

  const selectedItem = selectedBlock || selectedSection
  if (!selectedItem) {
    return (
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-full" dir="rtl">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold">הגדרות</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-gray-500 text-center">
            בחר section או block לעריכה
          </p>
        </div>
      </div>
    )
  }

  const getBlockLabel = (blockType: string) => {
    const labels: Record<string, string> = {
      "hero": "הירו ראשון",
      "new-arrivals": "חדש באתר",
      "categories": "קטגוריות",
      "hero-cta": "הירו שני - מסר מותג",
      "featured-products": "מוצרים מומלצים",
      "about": "אודות",
    }
    return labels[blockType] || selectedBlock?.name || selectedSection?.name || ""
  }

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          <h3 className="text-lg font-bold flex-1">
            {selectedBlock ? getBlockLabel(selectedBlock.type) : selectedSection?.name}
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleVisibility}
            className="h-8"
          >
            {selectedItem.visible ? (
              <>
                <Eye className="w-4 h-4 ml-2" />
                מוצג
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 ml-2" />
                מוסתר
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 ml-2" />
            מחק
          </Button>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 sidebar-scroll">
        {selectedBlock ? (
          // אם זה עמוד מוצר, השתמש ב-ElementSettingsContent
          pageType === "product" && selectedBlock.type.startsWith("product-") ? (
            <ElementSettingsContent
              elementType={selectedBlock.type as ProductPageElementType}
              elementName={selectedBlock.name}
              currentConfig={{
                ...selectedBlock.config?.style,
                content: selectedBlock.config?.content,
                title: selectedBlock.config?.title,
              }}
              onSave={(styleConfig) => {
                updateBlockConfig({ 
                  style: styleConfig,
                  content: styleConfig.content,
                  title: styleConfig.title,
                })
              }}
              onStyleChange={(styleConfig) => {
                // עדכון בזמן אמת - לא שמירה למסד נתונים
                updateBlockConfig({ 
                  style: styleConfig,
                  content: styleConfig.content,
                  title: styleConfig.title,
                })
              }}
              onCancel={() => {}}
              productId={pageId}
              customFields={[]}
            />
          ) : (
            renderBlockSettings()
          )
        ) : selectedSection ? (
          // Section Settings
          <div className="space-y-6">
            <div>
              <Label>שם ה-section</Label>
              <Input
                value={selectedSection.name}
                onChange={(e) => {
                  const updatedSections = sections.map((section: any) =>
                    section.id === selectedSectionId
                      ? { ...section, name: e.target.value }
                      : section
                  )
                  onSectionsChange(updatedSections)
                }}
                className="mt-2"
              />
            </div>

            {/* Section-specific settings */}
            {selectedSection.id === "template" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>רוחב container</Label>
                  <Select
                    value={selectedSection.config?.containerType || "full-width"}
                    onValueChange={(value) =>
                      handleConfigChange({ containerType: value })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-width">Full width</SelectItem>
                      <SelectItem value="container">Container</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* MediaPicker */}
      {selectedShop?.id && selectedBlock && mediaPickerType && (
        <MediaPicker
          open={mediaPickerOpen}
          onOpenChange={(open) => {
            setMediaPickerOpen(open)
            if (!open) {
              setMediaPickerType(null)
            }
          }}
          onSelect={(files) => {
            if (files.length > 0 && selectedBlock && mediaPickerType) {
              const fileUrl = files[0]
              if (mediaPickerType === "image-desktop") {
                updateBlockConfig({ backgroundImage: fileUrl })
              } else if (mediaPickerType === "image-mobile") {
                updateBlockConfig({ backgroundImageMobile: fileUrl })
              } else if (mediaPickerType === "video") {
                updateBlockConfig({ video: fileUrl })
              }
            }
            setMediaPickerOpen(false)
            setMediaPickerType(null)
          }}
          selectedFiles={[]}
          shopId={selectedShop?.id || ""}
          entityType="home-page"
          entityId={selectedBlock.id}
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
