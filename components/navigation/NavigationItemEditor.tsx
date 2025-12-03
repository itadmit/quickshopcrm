"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GripVertical, Trash2, Plus, ChevronDown, ChevronUp, Image as ImageIcon, Upload, X, Search } from "lucide-react"
import { MediaPicker } from "@/components/MediaPicker"
import { cn } from "@/lib/utils"

interface NavigationItem {
  id: string
  label: string
  type: "PAGE" | "CATEGORY" | "EXTERNAL"
  url: string | null
  position: number
  parentId: string | null
  children?: NavigationItem[]
  categoryId?: string
  image?: string
  bannerImage?: string
  columnTitle?: string
}

interface NavigationItemEditorProps {
  item: NavigationItem
  shopId: string
  location?: "DESKTOP" | "MOBILE" | "FOOTER" | "CHECKOUT" | "HEADER" | "SIDEBAR"
  onUpdate: (id: string, updates: Partial<NavigationItem>) => void
  onRemove: (id: string) => void
  onAddChild: (parentId: string) => void
  pageSearchQueries: Record<string, string>
  pageSearchResults: Record<string, Array<{ id: string; title: string; slug: string }>>
  loadingPages: Record<string, boolean>
  categorySearchQueries: Record<string, string>
  categorySearchResults: Record<string, Array<{ id: string; name: string; slug: string }>>
  loadingCategories: Record<string, boolean>
  onPageSearch: (itemId: string, query: string) => void
  onCategorySearch: (itemId: string, query: string) => void
  onSelectPage: (itemId: string, page: { slug: string; title: string }) => void
  onSelectCategory: (itemId: string, category: { id: string; slug: string; name: string }) => void
  expandedItems: Set<string>
  onToggleExpand: (itemId: string) => void
  level?: number
}

export function NavigationItemEditor({
  item,
  shopId,
  location = "DESKTOP",
  onUpdate,
  onRemove,
  onAddChild,
  pageSearchQueries,
  pageSearchResults,
  loadingPages,
  categorySearchQueries,
  categorySearchResults,
  loadingCategories,
  onPageSearch,
  onCategorySearch,
  onSelectPage,
  onSelectCategory,
  expandedItems,
  onToggleExpand,
  level = 0,
}: NavigationItemEditorProps) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedItems.has(item.id)
  const isMobile = location === "MOBILE"

  const handleMediaSelect = (files: string[]) => {
    console.log("NavigationItemEditor handleMediaSelect:", { files, itemId: item.id, itemLabel: item.label })
    if (files.length > 0) {
      onUpdate(item.id, { image: files[0] })
      setMediaPickerOpen(false)
    } else {
      console.warn("No files selected in handleMediaSelect")
    }
  }

  return (
    <div className={cn("space-y-4", level > 0 && "mr-6 border-r-2 border-gray-200 pr-4")}>
      <div className="flex items-start gap-4 p-4 border rounded-lg bg-white">
        <GripVertical className="w-5 h-5 text-gray-400 mt-2" />
        
        <div className="flex-1 space-y-4">
          {/* שורה ראשונה - תווית, סוג, URL */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>תווית</Label>
              <Input
                value={item.label}
                onChange={(e) => onUpdate(item.id, { label: e.target.value })}
              />
            </div>
            <div>
              <Label>סוג</Label>
              <Select
                value={item.type}
                onValueChange={(value: any) => {
                  onUpdate(item.id, { 
                    type: value,
                    url: value === "EXTERNAL" ? item.url : null
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAGE">דף</SelectItem>
                  <SelectItem value="CATEGORY">קטגוריה</SelectItem>
                  <SelectItem value="EXTERNAL">קישור חיצוני</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <Label>URL</Label>
              <div className="relative">
                <Input
                  value={item.url || ""}
                  onChange={(e) => {
                    onUpdate(item.id, { url: e.target.value })
                    if (item.type === "PAGE") {
                      onPageSearch(item.id, e.target.value)
                    } else if (item.type === "CATEGORY") {
                      onCategorySearch(item.id, e.target.value)
                    }
                  }}
                  onFocus={() => {
                    if (item.type === "PAGE" && !pageSearchQueries[item.id]) {
                      onPageSearch(item.id, item.url || "")
                    } else if (item.type === "CATEGORY" && !categorySearchQueries[item.id]) {
                      onCategorySearch(item.id, item.url || "")
                    }
                  }}
                  placeholder={
                    item.type === "PAGE" 
                      ? "חפש דף..." 
                      : item.type === "CATEGORY"
                      ? "חפש קטגוריה..."
                      : "/page-slug"
                  }
                  className={(item.type === "PAGE" || item.type === "CATEGORY") ? "pr-10" : ""}
                />
                {(item.type === "PAGE" || item.type === "CATEGORY") && (
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                )}
              </div>
              
              {/* תוצאות חיפוש */}
              {item.type === "PAGE" && pageSearchResults[item.id] && pageSearchResults[item.id].length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {pageSearchResults[item.id].map((page: any) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => onSelectPage(item.id, page)}
                      className="w-full text-right px-4 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-sm">{page.title}</div>
                      <div className="text-xs text-gray-500">{page.slug}</div>
                    </button>
                  ))}
                </div>
              )}
              
              {item.type === "CATEGORY" && categorySearchResults[item.id] && categorySearchResults[item.id].length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {categorySearchResults[item.id].map((category: any) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => onSelectCategory(item.id, category)}
                      className="w-full text-right px-4 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-sm">{category.name}</div>
                      <div className="text-xs text-gray-500">{category.slug}</div>
                    </button>
                  ))}
                </div>
              )}
              
            </div>
          </div>

          {/* שורה שנייה - תמונות (רק לתפריט DESKTOP) */}
          {!isMobile && (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              {/* תמונה לפריט */}
              <div>
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  תמונה לפריט (אופציונלי)
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  תמונה שתוצג לצד הפריט במגה מניו
                </p>
                <div className="mt-2">
                  {item.image ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                      <img src={item.image} alt={item.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setMediaPickerOpen(true)
                          }}
                        >
                          <ImageIcon className="w-3 h-3 ml-1" />
                          שנה
                        </Button>
                        <button
                          type="button"
                          onClick={() => onUpdate(item.id, { image: undefined })}
                          className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-colors h-auto"
                      onClick={() => {
                        setMediaPickerOpen(true)
                      }}
                    >
                      <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">בחר תמונה</span>
                      <span className="text-xs text-gray-400 mt-1">מומלץ: 100x100px</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* כותרת עמודה למגה מניו (רק לתפריט DESKTOP) */}
          {!isMobile && hasChildren && (
            <div>
              <Label className="flex items-center gap-2">
                כותרת עמודה (מגה מניו)
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                כותרת שתוצג בראש העמודה הראשונה במגה מניו
              </p>
              <Input
                value={item.columnTitle || ""}
                onChange={(e) => onUpdate(item.id, { columnTitle: e.target.value })}
                placeholder="לדוגמה: קטגוריות פופולריות"
              />
            </div>
          )}

          {/* כפתורים */}
          <div className="flex items-center gap-2">
            {hasChildren && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleExpand(item.id)}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 ml-2" />
                    הסתר ילדים ({item.children!.length})
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 ml-2" />
                    הצג ילדים ({item.children!.length})
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddChild(item.id)}
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף ילד
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ילדים */}
      {hasChildren && isExpanded && (
        <div className="space-y-2 mr-4">
          {item.children!.map((child, index) => (
            <NavigationItemEditor
              key={child.id}
              item={child}
              shopId={shopId}
              location={location}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAddChild={onAddChild}
              pageSearchQueries={pageSearchQueries}
              pageSearchResults={pageSearchResults}
              loadingPages={loadingPages}
              categorySearchQueries={categorySearchQueries}
              categorySearchResults={categorySearchResults}
              loadingCategories={loadingCategories}
              onPageSearch={onPageSearch}
              onCategorySearch={onCategorySearch}
              onSelectPage={onSelectPage}
              onSelectCategory={onSelectCategory}
              expandedItems={expandedItems}
              onToggleExpand={onToggleExpand}
              level={level + 1}
            />
          ))}
        </div>
      )}

      {/* MediaPicker */}
      {shopId && (
        <MediaPicker
          open={mediaPickerOpen}
          onOpenChange={(open) => {
            setMediaPickerOpen(open)
          }}
          onSelect={handleMediaSelect}
          selectedFiles={item.image ? [item.image] : []}
          shopId={shopId}
          entityType="navigations"
          entityId={item.id}
          multiple={false}
          title="בחר תמונה לפריט"
        />
      )}
    </div>
  )
}

