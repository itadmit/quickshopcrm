"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

interface SearchDialogProps {
  slug: string
  isOpen: boolean
  onClose: () => void
}

export function SearchDialog({ slug, isOpen, onClose }: SearchDialogProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [popularSearches] = useState<string[]>([
    "חולצות",
    "מכנסיים",
    "נעליים",
    "תיקים",
    "שעונים",
  ])

  useEffect(() => {
    // טעינת חיפושים אחרונים מ-localStorage
    const saved = localStorage.getItem(`recent_searches_${slug}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setRecentSearches(parsed)
      } catch (error) {
        console.error("Error parsing recent searches:", error)
      }
    }
  }, [slug])

  const handleSearch = (query?: string) => {
    const searchTerm = query || searchQuery.trim()
    if (!searchTerm) return

    // שמירת חיפוש אחרון
    const updated = [searchTerm, ...recentSearches.filter((s) => s !== searchTerm)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem(`recent_searches_${slug}`, JSON.stringify(updated))

    // מעבר לדף תוצאות
    onClose()
    router.push(`/shop/${slug}/search?q=${encodeURIComponent(searchTerm)}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch()
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem(`recent_searches_${slug}`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-bold">חיפוש מוצרים</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="חפש מוצרים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 text-lg py-6"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full mt-4 prodify-gradient text-white"
              disabled={!searchQuery.trim()}
            >
              <Search className="w-4 h-4 ml-2" />
              חפש
            </Button>
          </form>

          {/* חיפושים אחרונים */}
          {recentSearches.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">חיפושים אחרונים</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  <X className="w-3 h-3 ml-1" />
                  נקה
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch(search)}
                    className="text-sm"
                  >
                    {search}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* חיפושים פופולרים */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">חיפושים פופולרים</h3>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map((search, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSearch(search)}
                  className="text-sm"
                >
                  {search}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

