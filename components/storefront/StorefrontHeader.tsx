"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ShoppingCart,
  User,
  Heart,
  Search,
  Menu,
  X,
  ChevronDown,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { SlideOutCart } from "./SlideOutCart"
import { SearchDialog } from "./SearchDialog"
import { useShopTheme } from "@/hooks/useShopTheme"
import { useCart } from "@/hooks/useCart"

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
}

interface NavigationItem {
  type: "link" | "page" | "category" | "collection"
  label: string
  url?: string
  pageId?: string
  categoryId?: string
  collectionId?: string
  children?: NavigationItem[]
}

interface Navigation {
  id: string
  name: string
  location: string
  items: NavigationItem[]
}

interface StorefrontHeaderProps {
  slug: string
  shop: Shop | null
  cartItemCount?: number
  onCartUpdate?: () => void
  onOpenCart?: (callback: () => void) => void
  cartRefreshKey?: number
}

export function StorefrontHeader({ slug, shop, cartItemCount: propCartItemCount, onCartUpdate, onOpenCart, cartRefreshKey }: StorefrontHeaderProps) {
  const router = useRouter()
  const [navigation, setNavigation] = useState<Navigation | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { theme } = useShopTheme(slug)
  
  // שימוש ב-useCart לקבלת מספר פריטים בעגלה
  const { cart } = useCart(slug, customerId)
  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || propCartItemCount || 0

  // חשיפת פונקציה לפתיחת עגלה
  useEffect(() => {
    if (onOpenCart) {
      onOpenCart(() => {
        setCartOpen(true)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // ריצה פעם אחת בלבד בעת mount

  useEffect(() => {
    fetchNavigation()
    const customerData = localStorage.getItem(`storefront_customer_${slug}`)
    if (customerData) {
      try {
        const parsed = JSON.parse(customerData)
        setCustomerId(parsed.id)
      } catch (error) {
        console.error("Error parsing customer data:", error)
      }
    }
  }, [slug])

  const fetchNavigation = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/navigation?location=HEADER`)
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          setNavigation(data[0])
        }
      }
    } catch (error) {
      console.error("Error fetching navigation:", error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/shop/${slug}/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const renderNavigationItem = (item: NavigationItem, index: number) => {
    const hasChildren = item.children && item.children.length > 0

      if (item.type === "link") {
        return (
          <Link
            key={index}
            href={item.url || "#"}
            className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            {item.label}
          </Link>
        )
      } else if (item.type === "page") {
        return (
          <Link
            key={index}
            href={`/shop/${slug}/pages/${item.pageId}`}
            className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            {item.label}
          </Link>
        )
      } else if (item.type === "category") {
        return (
          <Link
            key={index}
            href={`/shop/${slug}/categories/${item.categoryId}`}
            className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            {item.label}
          </Link>
        )
      } else if (item.type === "collection") {
        return (
          <Link
            key={index}
            href={`/shop/${slug}/collections/${item.collectionId}`}
            className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            {item.label}
          </Link>
        )
      }
    return null
  }

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-200">
      {/* Main Header - בסגנון Horizon */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo & Shop Name */}
          <Link href={`/shop/${slug}`} className="flex items-center gap-3 group">
            {shop?.logo ? (
              <img
                src={shop.logo}
                alt={shop?.name || "Shop"}
                className="h-8 w-auto"
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                {shop?.name || "חנות"}
              </h1>
            )}
          </Link>

          {/* Navigation - Desktop */}
          {navigation && navigation.items && Array.isArray(navigation.items) && (
            <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
              {navigation.items.map((item, index) => renderNavigationItem(item, index))}
            </nav>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="p-2"
            >
              <Search className="w-5 h-5 text-gray-700" />
            </Button>

            {/* Account */}
            <Link href={customerId ? `/shop/${slug}/account` : `/shop/${slug}/login`}>
              <Button variant="ghost" size="sm" className="p-2">
                <User className="w-5 h-5 text-gray-700" />
              </Button>
            </Link>

            {/* Cart */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 relative"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {cartItemCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-700" />
              ) : (
                <Menu className="w-5 h-5 text-gray-700" />
              )}
            </Button>
          </div>
        </div>


        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 pt-4 pb-4 space-y-2">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="חיפוש מוצרים..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 w-full"
                />
              </div>
            </form>

            {/* Mobile Navigation */}
            {navigation && navigation.items && Array.isArray(navigation.items) && (
              <nav className="space-y-1">
                {navigation.items.map((item, index) => (
                  <div key={index}>
                    {renderNavigationItem(item, index)}
                  </div>
                ))}
              </nav>
            )}

            {/* Mobile Account Links */}
            <div className="pt-4 border-t border-gray-100 space-y-2">
              {customerId ? (
                <Link
                  href={`/shop/${slug}/account`}
                  className="block px-3 py-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                  חשבון שלי
                </Link>
              ) : (
                <>
                  <Link
                    href={`/shop/${slug}/login`}
                    className="block px-3 py-2 text-gray-700 hover:text-purple-600 transition-colors"
                  >
                    התחברות
                  </Link>
                  <Link
                    href={`/shop/${slug}/register`}
                    className="block px-3 py-2 text-gray-700 hover:text-purple-600 transition-colors"
                  >
                    הרשמה
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Slide-out Cart */}
      <SlideOutCart
        slug={slug}
        isOpen={cartOpen}
        onClose={() => {
          setCartOpen(false)
          if (onCartUpdate) {
            onCartUpdate()
          }
        }}
        customerId={customerId}
        onCartUpdate={onCartUpdate}
        refreshKey={cartRefreshKey}
      />

      {/* Search Dialog */}
      <SearchDialog
        slug={slug}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </header>
  )
}

