"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
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
  Ticket,
  Plug
} from "lucide-react"
import { useShop } from "@/components/providers/ShopProvider"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// קיצורי דרך לניווט מהיר - יוגדרו דינמית לפי שפה
const getQuickLinks = (t: any) => [
  { 
    titleKey: "sidebar.home", 
    icon: LayoutDashboard, 
    url: "/dashboard", 
    categoryKey: "search.categories.navigation",
    keywords: ["dashboard", "בית", "home"]
  },
  { 
    titleKey: "sidebar.products", 
    icon: Package, 
    url: "/products", 
    categoryKey: "search.categories.navigation",
    keywords: ["products", "פריטים", "items"]
  },
  { 
    titleKey: "sidebar.orders", 
    icon: ShoppingCart, 
    url: "/orders", 
    categoryKey: "search.categories.navigation",
    keywords: ["orders", "קניות", "purchases"]
  },
  { 
    titleKey: "sidebar.customers", 
    icon: Users, 
    url: "/customers", 
    categoryKey: "search.categories.navigation",
    keywords: ["customers", "clients", "קליינטים"]
  },
  { 
    titleKey: "sidebar.categories", 
    icon: Archive, 
    url: "/collections", 
    categoryKey: "search.categories.navigation",
    keywords: ["collections", "אוספים"]
  },
  { 
    titleKey: "sidebar.bundles", 
    icon: Box, 
    url: "/bundles", 
    categoryKey: "search.categories.navigation",
    keywords: ["bundles", "packages", "חבילות"]
  },
  { 
    titleKey: "sidebar.coupons", 
    icon: Ticket, 
    url: "/coupons", 
    categoryKey: "search.categories.navigation",
    keywords: ["coupons", "קודים", "codes"]
  },
  { 
    titleKey: "sidebar.discounts", 
    icon: Percent, 
    url: "/discounts", 
    categoryKey: "search.categories.navigation",
    keywords: ["discounts", "sales", "מבצעים"]
  },
  { 
    titleKey: "sidebar.giftCards", 
    icon: Gift, 
    url: "/gift-cards", 
    categoryKey: "search.categories.navigation",
    keywords: ["gift cards", "vouchers", "שוברים"]
  },
  { 
    titleKey: "sidebar.reviews", 
    icon: Sparkles, 
    url: "/reviews", 
    categoryKey: "search.categories.navigation",
    keywords: ["reviews", "ratings", "דירוגים"]
  },
  { 
    titleKey: "sidebar.returns", 
    icon: ArrowRight, 
    url: "/returns", 
    categoryKey: "search.categories.navigation",
    keywords: ["returns", "refunds", "החזר כספי"]
  },
  { 
    titleKey: "sidebar.storeCredits", 
    icon: CreditCard, 
    url: "/store-credits", 
    categoryKey: "search.categories.navigation",
    keywords: ["store credit", "wallet", "ארנק"]
  },
  { 
    titleKey: "sidebar.automations", 
    icon: Command, 
    url: "/automations", 
    categoryKey: "search.categories.navigation",
    keywords: ["automations", "workflows", "תהליכים"]
  },
  { 
    titleKey: "sidebar.abandonedCarts", 
    icon: ShoppingCart, 
    url: "/abandoned-carts", 
    categoryKey: "search.categories.navigation",
    keywords: ["abandoned carts", "עגלות", "cart recovery"]
  },
  { 
    titleKey: "sidebar.pages", 
    icon: FileText, 
    url: "/pages", 
    categoryKey: "search.categories.navigation",
    keywords: ["pages", "content", "תוכן"]
  },
  { 
    titleKey: "sidebar.blog", 
    icon: FileText, 
    url: "/blog", 
    categoryKey: "search.categories.navigation",
    keywords: ["blog", "articles", "מאמרים"]
  },
  { 
    titleKey: "sidebar.navigation", 
    icon: Barcode, 
    url: "/navigation", 
    categoryKey: "search.categories.navigation",
    keywords: ["navigation", "menu", "תפריט"]
  },
  { 
    titleKey: "sidebar.appearance", 
    icon: Palette, 
    url: "/appearance", 
    categoryKey: "search.categories.navigation",
    keywords: ["appearance", "theme", "עיצוב", "ערכת נושא"]
  },
  { 
    titleKey: "sidebar.analytics", 
    icon: TrendingUp, 
    url: "/analytics", 
    categoryKey: "search.categories.navigation",
    keywords: ["analytics", "stats", "סטטיסטיקה", "נתונים"]
  },
  { 
    titleKey: "sidebar.trackingPixels", 
    icon: Megaphone, 
    url: "/tracking-pixels", 
    categoryKey: "search.categories.navigation",
    keywords: ["pixels", "tracking", "מעקב", "facebook", "google"]
  },
  { 
    titleKey: "sidebar.webhooks", 
    icon: Webhook, 
    url: "/webhooks", 
    categoryKey: "search.categories.navigation",
    keywords: ["webhooks", "integrations", "אינטגרציות"]
  },
  { 
    titleKey: "sidebar.notifications", 
    icon: Bell, 
    url: "/notifications", 
    categoryKey: "search.categories.navigation",
    keywords: ["notifications", "alerts", "עדכונים"]
  },
  { 
    titleKey: "sidebar.settings", 
    icon: Settings, 
    url: "/settings", 
    categoryKey: "search.categories.settings",
    keywords: ["settings", "configuration", "קונפיגורציה"]
  },
  { 
    titleKey: "sidebar.integrations", 
    icon: Webhook, 
    url: "/settings/integrations", 
    categoryKey: "search.categories.settings",
    keywords: ["integrations", "connections", "חיבורים"]
  },
  { 
    titleKey: "sidebar.customFields", 
    icon: Tag, 
    url: "/settings/custom-fields", 
    categoryKey: "search.categories.settings",
    keywords: ["custom fields", "שדות", "fields"]
  },
  { 
    titleKey: "sidebar.productAddons", 
    icon: Package, 
    url: "/settings/product-addons", 
    categoryKey: "search.categories.settings",
    keywords: ["product addons", "extras", "תוספות"]
  },
  { 
    titleKey: "sidebar.sections.sales", 
    icon: Store, 
    url: "/shops", 
    categoryKey: "search.categories.management",
    keywords: ["shops", "stores", "חנויות"]
  },
  { 
    titleKey: "sidebar.superAdmin.commissions", 
    icon: CreditCard, 
    url: "/admin/commissions", 
    categoryKey: "search.categories.management",
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
  plugins: SearchResult[]
}

interface GlobalSearchProps {
  isMobile?: boolean
  autoFocus?: boolean
  onSelect?: () => void
}

export function GlobalSearch({ isMobile = false, autoFocus = false, onSelect }: GlobalSearchProps) {
  const router = useRouter()
  const { selectedShop } = useShop()
  const t = useTranslations()
  const quickLinks = getQuickLinks(t)
  const [isOpen, setIsOpen] = useState(isMobile ? true : false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults>({
    products: [],
    orders: [],
    customers: [],
    plugins: [],
  })
  const [filteredQuickLinks, setFilteredQuickLinks] = useState(quickLinks)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // חיפוש בזמן אמת
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setResults({ products: [], orders: [], customers: [], plugins: [] })
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
        setResults(data || { products: [], orders: [], customers: [], plugins: [] })
      } else {
        const errorText = await response.text()
        console.error('Search response not ok:', response.status, errorText)
        setResults({ products: [], orders: [], customers: [], plugins: [] })
      }
    } catch (error) {
      console.error("Search error:", error)
        setResults({ products: [], orders: [], customers: [], plugins: [] })
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
      const title = link.titleKey ? t(link.titleKey) : (link as any).title || ''
      return (
        title.toLowerCase().includes(searchLower) ||
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
          results.customers.length +
          results.plugins.length

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

  // Auto focus on mobile
  useEffect(() => {
    if (isMobile && autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isMobile, autoFocus])

  // Click outside to close (not on mobile)
  useEffect(() => {
    if (isMobile) return

    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, isMobile])

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
    currentIndex += results.customers.length

    // Check plugins
    if (index < currentIndex + results.plugins.length) {
      router.push(results.plugins[index - currentIndex].url)
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
    const isQuickLink = 'categoryKey' in result || 'category' in result
    const url = isQuickLink ? result.url : (result as SearchResult).url
    let title = isQuickLink && 'titleKey' in result ? t(result.titleKey) : (result as any).title || result.title
    // Handle order title translation
    if (!isQuickLink && (result as SearchResult).type === 'order' && (result as any).titleKey) {
      title = t((result as any).titleKey, (result as any).titleParams || {})
    }
    const subtitle: string | undefined = isQuickLink && 'categoryKey' in result ? t(result.categoryKey) : (isQuickLink && 'category' in result ? (result as any).category : (result as SearchResult).subtitle)
    let meta: string | undefined = isQuickLink ? undefined : (result as SearchResult).meta
    // Translate meta for customers
    if (!isQuickLink && (result as SearchResult).type === 'customer' && meta) {
      const match = meta.match(/(\d+) orders • (₪[\d.]+)/)
      if (match) {
        meta = `${t('search.customerOrders', { count: parseInt(match[1]) })} • ${match[2]}`
      }
    }
    const image = isQuickLink ? undefined : (result as SearchResult).image

    return (
      <button
        onClick={() => {
          router.push(url)
          setIsOpen(false)
          setQuery("")
          onSelect?.()
        }}
        onMouseEnter={() => setSelectedIndex(index)}
        className={cn(
          "w-full flex items-center gap-4 px-5 py-3.5 text-right transition-all duration-150",
          selectedIndex === index
            ? "bg-gradient-to-r from-emerald-50 to-pink-50 border-r-3 border-[#15b981] shadow-sm"
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
      case 'plugin':
        return Plug
      default:
        return FileText
    }
  }

  const totalResults = 
    filteredQuickLinks.length +
    results.products.length +
    results.orders.length +
    results.customers.length +
    results.plugins.length

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={t('search.placeholder')}
          className={cn(
            "pr-11 h-11 text-sm",
            isMobile ? "pl-3" : "pl-20"
          )}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        {!isMobile && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded flex items-center justify-center h-5">
              <Command className="w-3 h-3" />
            </kbd>
            <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded flex items-center justify-center h-5">K</kbd>
          </div>
        )}
      </div>

      {isOpen && (
        <div className={cn(
          "bg-white rounded-xl shadow-2xl border border-gray-200 max-h-[600px] overflow-hidden z-50",
          isMobile 
            ? "w-full mt-2" 
            : "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-[650px]"
        )}>
          <div className="overflow-y-auto max-h-[600px]">
            {loading && query.length >= 1 && (
              <div className="px-5 py-12 text-center text-gray-500">
                <div className="animate-spin w-8 h-8 border-3 border-[#15b981] border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-3 text-base font-medium">{t('search.searching')}</p>
              </div>
            )}

            {!loading && totalResults === 0 && query.length >= 1 && (
              <div className="px-5 py-12 text-center text-gray-500">
                <Search className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                <p className="text-base font-medium text-gray-700">{t('search.noResults')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('search.for')} "{query}"</p>
              </div>
            )}

            {/* Quick Links */}
            {filteredQuickLinks.length > 0 && (
              <div>
                <div className="px-5 py-3 text-xs font-bold text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 border-b border-gray-200">
                  {query ? t('search.quickLinks') : t('search.quickNavigation')}
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
                  {t('search.products')}
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
                  {t('search.orders')}
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
                  {t('search.customers')}
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

            {/* Plugins */}
            {results.plugins.length > 0 && (
              <div>
                <div className="px-5 py-3 text-xs font-bold text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 border-b border-gray-200">
                  {t('search.plugins')}
                </div>
                {results.plugins.map((result, idx) => (
                  <ResultItem
                    key={result.id}
                    result={result}
                    index={filteredQuickLinks.length + results.products.length + results.orders.length + results.customers.length + idx}
                    icon={getIcon(result.type)}
                  />
                ))}
              </div>
            )}

            {/* Empty state - show quick links */}
            {!query && totalResults === 0 && (
              <div className="px-5 py-12 text-center text-gray-500">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-100 to-pink-100 rounded-2xl flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-[#15b981]" />
                </div>
                <p className="text-base font-medium text-gray-700">{t('search.startTyping')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('search.startTypingDescription')}</p>
              </div>
            )}
          </div>

          {/* Footer with shortcuts */}
          <div className="border-t border-gray-200 px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100 flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-medium">↑</kbd>
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-medium">↓</kbd>
                <span className="font-medium">{t('search.navigation')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-medium">Enter</kbd>
                <span className="font-medium">{t('search.select')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-medium">Esc</kbd>
                <span className="font-medium">{t('search.close')}</span>
              </div>
            </div>
            <div className="text-xs font-semibold text-gray-700">
              {totalResults > 0 && t('search.results', { count: totalResults })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

