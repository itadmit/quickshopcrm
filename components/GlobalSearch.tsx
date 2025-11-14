"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Search, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  LayoutDashboard,
  FileText,
  Tag,
  Gift,
  Palette,
  Bell,
  Webhook,
  Barcode,
  TrendingUp,
  Store,
  CreditCard,
  Percent,
  ArrowRight,
  Sparkles,
  Box,
  Archive,
  Command,
  Megaphone,
  Ticket
} from "lucide-react"
import { useShop } from "@/components/providers/ShopProvider"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// קיצורי דרך לניווט מהיר
const quickLinks = [
  { 
    title: "דשבורד", 
    icon: LayoutDashboard, 
    url: "/dashboard", 
    category: "ניווט",
    keywords: ["dashboard", "בית", "home"]
  },
  { 
    title: "מוצרים", 
    icon: Package, 
    url: "/products", 
    category: "ניווט",
    keywords: ["products", "פריטים", "items"]
  },
  { 
    title: "הזמנות", 
    icon: ShoppingCart, 
    url: "/orders", 
    category: "ניווט",
    keywords: ["orders", "קניות", "purchases"]
  },
  { 
    title: "לקוחות", 
    icon: Users, 
    url: "/customers", 
    category: "ניווט",
    keywords: ["customers", "clients", "קליינטים"]
  },
  { 
    title: "קולקציות", 
    icon: Archive, 
    url: "/collections", 
    category: "ניווט",
    keywords: ["collections", "אוספים"]
  },
  { 
    title: "חבילות", 
    icon: Box, 
    url: "/bundles", 
    category: "ניווט",
    keywords: ["bundles", "packages", "חבילות"]
  },
  { 
    title: "קופונים", 
    icon: Ticket, 
    url: "/coupons", 
    category: "ניווט",
    keywords: ["coupons", "קודים", "codes"]
  },
  { 
    title: "הנחות", 
    icon: Percent, 
    url: "/discounts", 
    category: "ניווט",
    keywords: ["discounts", "sales", "מבצעים"]
  },
  { 
    title: "כרטיסי מתנה", 
    icon: Gift, 
    url: "/gift-cards", 
    category: "ניווט",
    keywords: ["gift cards", "vouchers", "שוברים"]
  },
  { 
    title: "ביקורות", 
    icon: Sparkles, 
    url: "/reviews", 
    category: "ניווט",
    keywords: ["reviews", "ratings", "דירוגים"]
  },
  { 
    title: "החזרות", 
    icon: ArrowRight, 
    url: "/returns", 
    category: "ניווט",
    keywords: ["returns", "refunds", "החזר כספי"]
  },
  { 
    title: "קרדיט חנות", 
    icon: CreditCard, 
    url: "/store-credits", 
    category: "ניווט",
    keywords: ["store credit", "wallet", "ארנק"]
  },
  { 
    title: "אוטומציות", 
    icon: Command, 
    url: "/automations", 
    category: "ניווט",
    keywords: ["automations", "workflows", "תהליכים"]
  },
  { 
    title: "עגלות נטושות", 
    icon: ShoppingCart, 
    url: "/abandoned-carts", 
    category: "ניווט",
    keywords: ["abandoned carts", "עגלות", "cart recovery"]
  },
  { 
    title: "דפים", 
    icon: FileText, 
    url: "/pages", 
    category: "ניווט",
    keywords: ["pages", "content", "תוכן"]
  },
  { 
    title: "בלוג", 
    icon: FileText, 
    url: "/blog", 
    category: "ניווט",
    keywords: ["blog", "articles", "מאמרים"]
  },
  { 
    title: "ניווט", 
    icon: Barcode, 
    url: "/navigation", 
    category: "ניווט",
    keywords: ["navigation", "menu", "תפריט"]
  },
  { 
    title: "עיצוב", 
    icon: Palette, 
    url: "/appearance", 
    category: "ניווט",
    keywords: ["appearance", "theme", "עיצוב", "ערכת נושא"]
  },
  { 
    title: "אנליטיקס", 
    icon: TrendingUp, 
    url: "/analytics", 
    category: "ניווט",
    keywords: ["analytics", "stats", "סטטיסטיקה", "נתונים"]
  },
  { 
    title: "פיקסלים", 
    icon: Megaphone, 
    url: "/tracking-pixels", 
    category: "ניווט",
    keywords: ["pixels", "tracking", "מעקב", "facebook", "google"]
  },
  { 
    title: "webhooks", 
    icon: Webhook, 
    url: "/webhooks", 
    category: "ניווט",
    keywords: ["webhooks", "integrations", "אינטגרציות"]
  },
  { 
    title: "התראות", 
    icon: Bell, 
    url: "/notifications", 
    category: "ניווט",
    keywords: ["notifications", "alerts", "עדכונים"]
  },
  { 
    title: "הגדרות כלליות", 
    icon: Settings, 
    url: "/settings", 
    category: "הגדרות",
    keywords: ["settings", "configuration", "קונפיגורציה"]
  },
  { 
    title: "אינטגרציות", 
    icon: Webhook, 
    url: "/settings/integrations", 
    category: "הגדרות",
    keywords: ["integrations", "connections", "חיבורים"]
  },
  { 
    title: "שדות מותאמים", 
    icon: Tag, 
    url: "/settings/custom-fields", 
    category: "הגדרות",
    keywords: ["custom fields", "שדות", "fields"]
  },
  { 
    title: "תוספי מוצר", 
    icon: Package, 
    url: "/settings/product-addons", 
    category: "הגדרות",
    keywords: ["product addons", "extras", "תוספות"]
  },
  { 
    title: "ניהול חנויות", 
    icon: Store, 
    url: "/shops", 
    category: "ניהול",
    keywords: ["shops", "stores", "חנויות"]
  },
  { 
    title: "עמלות", 
    icon: CreditCard, 
    url: "/admin/commissions", 
    category: "ניהול",
    keywords: ["commissions", "עמלות", "fees"]
  },
]

interface SearchResult {
  type: string
  id: string
  title: string
  subtitle?: string
  meta?: string
  image?: string
  url: string
  shopName?: string
}

interface SearchResults {
  products: SearchResult[]
  orders: SearchResult[]
  customers: SearchResult[]
}

export function GlobalSearch() {
  const router = useRouter()
  const { selectedShop } = useShop()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults>({
    products: [],
    orders: [],
    customers: [],
  })
  const [filteredQuickLinks, setFilteredQuickLinks] = useState(quickLinks)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // חיפוש בזמן אמת
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setResults({ products: [], orders: [], customers: [] })
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ q: searchQuery })
      if (selectedShop?.id) {
        params.append("shopId", selectedShop.id)
      }

      console.log('Searching for:', searchQuery, 'with shopId:', selectedShop?.id)
      const response = await fetch(`/api/search/global?${params}`)
      console.log('Search response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Search data received:', {
          products: data.products?.length || 0,
          orders: data.orders?.length || 0,
          customers: data.customers?.length || 0,
          data
        })
        setResults(data || { products: [], orders: [], customers: [] })
      } else {
        const errorText = await response.text()
        console.error('Search response not ok:', response.status, errorText)
        setResults({ products: [], orders: [], customers: [] })
      }
    } catch (error) {
      console.error("Search error:", error)
      setResults({ products: [], orders: [], customers: [] })
    } finally {
      setLoading(false)
    }
  }, [selectedShop?.id])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        performSearch(query)
      }
    }, 500) // 500ms delay for Hebrew typing

    return () => clearTimeout(timer)
  }, [query, performSearch])

  // סינון קיצורי דרך
  useEffect(() => {
    if (query.length < 1) {
      setFilteredQuickLinks(quickLinks)
      return
    }

    const filtered = quickLinks.filter(link => {
      const searchLower = query.toLowerCase()
      return (
        link.title.toLowerCase().includes(searchLower) ||
        link.keywords.some(kw => kw.toLowerCase().includes(searchLower))
      )
    })
    setFilteredQuickLinks(filtered)
  }, [query])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 0)
      }

      // Close with Escape
      if (e.key === "Escape") {
        setIsOpen(false)
        setQuery("")
      }

      // Navigate with arrows
      if (isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault()
        const totalResults = 
          filteredQuickLinks.length + 
          results.products.length + 
          results.orders.length + 
          results.customers.length

        if (e.key === "ArrowDown") {
          setSelectedIndex(prev => (prev + 1) % totalResults)
        } else {
          setSelectedIndex(prev => (prev - 1 + totalResults) % totalResults)
        }
      }

      // Select with Enter
      if (isOpen && e.key === "Enter") {
        e.preventDefault()
        handleSelect(selectedIndex)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, selectedIndex, filteredQuickLinks, results])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (index: number) => {
    let currentIndex = 0
    
    // Check quick links
    if (index < filteredQuickLinks.length) {
      router.push(filteredQuickLinks[index].url)
      setIsOpen(false)
      setQuery("")
      return
    }
    currentIndex += filteredQuickLinks.length

    // Check products
    if (index < currentIndex + results.products.length) {
      router.push(results.products[index - currentIndex].url)
      setIsOpen(false)
      setQuery("")
      return
    }
    currentIndex += results.products.length

    // Check orders
    if (index < currentIndex + results.orders.length) {
      router.push(results.orders[index - currentIndex].url)
      setIsOpen(false)
      setQuery("")
      return
    }
    currentIndex += results.orders.length

    // Check customers
    if (index < currentIndex + results.customers.length) {
      router.push(results.customers[index - currentIndex].url)
      setIsOpen(false)
      setQuery("")
      return
    }
  }

  const ResultItem = ({ 
    result, 
    index, 
    icon: Icon 
  }: { 
    result: SearchResult | typeof quickLinks[0]
    index: number
    icon: any 
  }) => {
    const isQuickLink = 'category' in result
    const url = isQuickLink ? result.url : (result as SearchResult).url
    const title = result.title
    const subtitle = isQuickLink ? result.category : (result as SearchResult).subtitle
    const meta = isQuickLink ? undefined : (result as SearchResult).meta
    const image = isQuickLink ? undefined : (result as SearchResult).image

    return (
      <button
        onClick={() => {
          router.push(url)
          setIsOpen(false)
          setQuery("")
        }}
        onMouseEnter={() => setSelectedIndex(index)}
        className={cn(
          "w-full flex items-center gap-4 px-5 py-3.5 text-right transition-all duration-150",
          selectedIndex === index
            ? "bg-gradient-to-r from-purple-50 to-pink-50 border-r-3 border-[#6f65e2] shadow-sm"
            : "hover:bg-gray-50"
        )}
      >
        {image ? (
          <img src={image} alt={title} className="w-12 h-12 rounded-lg object-cover shadow-sm" />
        ) : (
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
            selectedIndex === index
              ? "prodify-gradient text-white"
              : "bg-gray-100 text-gray-600"
          )}>
            <Icon className="w-6 h-6" />
          </div>
        )}
        <div className="flex-1 text-right min-w-0">
          <div className="font-semibold text-sm text-gray-900 truncate mb-0.5">{title}</div>
          {subtitle && (
            <div className="text-xs text-gray-600 truncate">{subtitle}</div>
          )}
          {meta && (
            <div className="text-xs text-gray-500 truncate mt-0.5">{meta}</div>
          )}
        </div>
        {selectedIndex === index && (
          <div className="flex-shrink-0">
            <div className="w-6 h-6 rounded prodify-gradient text-white flex items-center justify-center">
              <ArrowRight className="w-4 h-4 rotate-180" />
            </div>
          </div>
        )}
      </button>
    )
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'product':
        return Package
      case 'order':
        return ShoppingCart
      case 'customer':
        return Users
      default:
        return FileText
    }
  }

  const totalResults = 
    filteredQuickLinks.length +
    results.products.length +
    results.orders.length +
    results.customers.length

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="חיפוש מוצרים, הזמנות, לקוחות... (Ctrl+K)"
          className="pr-11 pl-20 h-11 text-base"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded flex items-center">
            <Command className="w-3 h-3" />
          </kbd>
          <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded">K</kbd>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-[600px] overflow-hidden z-50 w-[650px]">
          <div className="overflow-y-auto max-h-[600px]">
            {loading && query.length >= 1 && (
              <div className="px-5 py-12 text-center text-gray-500">
                <div className="animate-spin w-8 h-8 border-3 border-[#6f65e2] border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-3 text-base font-medium">מחפש...</p>
              </div>
            )}

            {!loading && totalResults === 0 && query.length >= 1 && (
              <div className="px-5 py-12 text-center text-gray-500">
                <Search className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                <p className="text-base font-medium text-gray-700">לא נמצאו תוצאות</p>
                <p className="text-sm text-gray-500 mt-1">עבור "{query}"</p>
              </div>
            )}

            {/* Quick Links */}
            {filteredQuickLinks.length > 0 && (
              <div>
                <div className="px-5 py-3 text-xs font-bold text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 border-b border-gray-200">
                  {query ? "קיצורי דרך" : "ניווט מהיר"}
                </div>
                {filteredQuickLinks.map((link, idx) => (
                  <ResultItem
                    key={link.url}
                    result={link}
                    index={idx}
                    icon={link.icon}
                  />
                ))}
              </div>
            )}

            {/* Products */}
            {results.products.length > 0 && (
              <div>
                <div className="px-5 py-3 text-xs font-bold text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 border-b border-gray-200">
                  מוצרים
                </div>
                {results.products.map((result, idx) => (
                  <ResultItem
                    key={result.id}
                    result={result}
                    index={filteredQuickLinks.length + idx}
                    icon={getIcon(result.type)}
                  />
                ))}
              </div>
            )}

            {/* Orders */}
            {results.orders.length > 0 && (
              <div>
                <div className="px-5 py-3 text-xs font-bold text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 border-b border-gray-200">
                  הזמנות
                </div>
                {results.orders.map((result, idx) => (
                  <ResultItem
                    key={result.id}
                    result={result}
                    index={filteredQuickLinks.length + results.products.length + idx}
                    icon={getIcon(result.type)}
                  />
                ))}
              </div>
            )}

            {/* Customers */}
            {results.customers.length > 0 && (
              <div>
                <div className="px-5 py-3 text-xs font-bold text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 border-b border-gray-200">
                  לקוחות
                </div>
                {results.customers.map((result, idx) => (
                  <ResultItem
                    key={result.id}
                    result={result}
                    index={filteredQuickLinks.length + results.products.length + results.orders.length + idx}
                    icon={getIcon(result.type)}
                  />
                ))}
              </div>
            )}

            {/* Empty state - show quick links */}
            {!query && totalResults === 0 && (
              <div className="px-5 py-12 text-center text-gray-500">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-[#6f65e2]" />
                </div>
                <p className="text-base font-medium text-gray-700">התחל להקליד כדי לחפש</p>
                <p className="text-sm text-gray-500 mt-1">מוצרים, הזמנות, לקוחות, דפים ועוד</p>
              </div>
            )}
          </div>

          {/* Footer with shortcuts */}
          <div className="border-t border-gray-200 px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100 flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-medium">↑</kbd>
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-medium">↓</kbd>
                <span className="font-medium">ניווט</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-medium">Enter</kbd>
                <span className="font-medium">בחירה</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-medium">Esc</kbd>
                <span className="font-medium">סגירה</span>
              </div>
            </div>
            <div className="text-xs font-semibold text-gray-700">
              {totalResults > 0 && `${totalResults} תוצאות`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

