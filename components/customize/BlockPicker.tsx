"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageType } from "./ThemeCustomizer"

interface BlockOption {
  id: string
  type: string
  name: string
  icon: any
  description?: string
  category?: string
  defaultConfig: any
}

interface BlockPickerProps {
  blocks: BlockOption[]
  onSelect: (blockType: string) => void
  pageType: PageType
}

const categories = {
  basic: { label: "בסיסי", order: 1 },
  content: { label: "תוכן", order: 2 },
  media: { label: "מדיה", order: 3 },
  products: { label: "מוצרים", order: 4 },
}

export function BlockPicker({ blocks, onSelect, pageType }: BlockPickerProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredBlocks = blocks.filter((block: any) =>
    block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    block.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedBlocks = filteredBlocks.reduce((acc, block) => {
    const category = block.category || "basic"
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(block)
    return acc
  }, {} as Record<string, BlockOption[]>)

  const sortedCategories = Object.keys(groupedBlocks).sort(
    (a, b) => (categories[a as keyof typeof categories]?.order || 99) - (categories[b as keyof typeof categories]?.order || 99)
  )

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all"
        >
          <Plus className="w-4 h-4 ml-2" />
          הוסף block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 p-0 max-h-[600px] overflow-hidden flex flex-col"
      >
        {/* Search */}
        <div className="p-3 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="חפש בלוק..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-9"
              autoFocus
            />
          </div>
        </div>

        {/* Blocks List */}
        <div className="overflow-y-auto sidebar-scroll flex-1 p-2">
          {sortedCategories.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">לא נמצאו בלוקים</p>
            </div>
          ) : (
            sortedCategories.map((category: any) => (
              <div key={category} className="mb-4 last:mb-0">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {categories[category as keyof typeof categories]?.label || category}
                </div>
                <div className="space-y-1">
                  {groupedBlocks[category].map((block: any) => {
                    const Icon = block.icon
                    return (
                      <button
                        key={block.type}
                        onClick={() => {
                          onSelect(block.type)
                          setOpen(false)
                          setSearchQuery("")
                        }}
                        className={cn(
                          "w-full flex items-start gap-3 p-3 rounded-lg transition-all text-right",
                          "hover:bg-gray-50 hover:shadow-sm",
                          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        )}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                          <Icon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {block.name}
                          </div>
                          {block.description && (
                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                              {block.description}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

