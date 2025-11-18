"use client"

import { AlertCircle, Home, Search, Package } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader"
import { getThemeStyles } from "@/hooks/useShopTheme"

interface NotFoundPageProps {
  slug: string
  shop?: any
  cartItemCount?: number
  onCartUpdate?: () => void
  theme?: any
  title?: string
  message?: string
  type?: "category" | "product" | "collection" | "page" | "general"
}

export function NotFoundPage({
  slug,
  shop,
  cartItemCount = 0,
  onCartUpdate,
  theme,
  title,
  message,
  type = "general",
}: NotFoundPageProps) {
  // תוכן דינמי לפי סוג ה-404
  const content = {
    category: {
      title: "קטגוריה לא נמצאה",
      message: "מצטערים, הקטגוריה שחיפשת אינה קיימת או הוסרה מהמערכת.",
    },
    product: {
      title: "מוצר לא נמצא",
      message: "מצטערים, המוצר שחיפשת אינו קיים או הוסר מהמערכת.",
    },
    collection: {
      title: "אוסף לא נמצא",
      message: "מצטערים, האוסף שחיפשת אינו קיים או הוסר מהמערכת.",
    },
    page: {
      title: "דף לא נמצא",
      message: "מצטערים, הדף שחיפשת אינו קיים או הוסר מהמערכת.",
    },
    general: {
      title: "הדף לא נמצא",
      message: "מצטערים, הדף שחיפשת אינו קיים במערכת.",
    },
  }

  const currentContent = content[type]
  const displayTitle = title || currentContent.title
  const displayMessage = message || currentContent.message

  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl" style={getThemeStyles(theme)}>
      {/* Header */}
      <StorefrontHeader
        slug={slug}
        shop={shop}
        cartItemCount={cartItemCount}
        onCartUpdate={onCartUpdate}
      />

      {/* 404 Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-2xl">
          {/* 404 Icon with Animation */}
          <div className="mb-8 relative">
            <div 
              className="inline-flex items-center justify-center w-32 h-32 rounded-full shadow-lg animate-pulse"
              style={{
                background: `linear-gradient(to bottom right, ${theme?.primaryColor ? `${theme.primaryColor}15` : '#f3f4f6'}, ${theme?.primaryColor ? `${theme.primaryColor}25` : '#e5e7eb'})`,
              }}
            >
              <AlertCircle 
                className="w-16 h-16"
                style={{ color: theme?.primaryColor || '#9ca3af' }}
              />
            </div>
            {/* Decorative circles */}
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center -z-10">
              <div 
                className="w-40 h-40 rounded-full border-2 opacity-50"
                style={{ borderColor: theme?.primaryColor ? `${theme.primaryColor}40` : '#e5e7eb' }}
              ></div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center -z-20">
              <div 
                className="w-48 h-48 rounded-full border-2 opacity-30"
                style={{ borderColor: theme?.primaryColor ? `${theme.primaryColor}20` : '#f3f4f6' }}
              ></div>
            </div>
          </div>

          {/* 404 Text */}
          <h1 
            className="text-8xl font-bold mb-4"
            style={{
              background: theme?.primaryColor 
                ? `linear-gradient(to right, ${theme.primaryColor}, ${theme.primaryColor}dd)`
                : 'linear-gradient(to right, #374151, #111827)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            404
          </h1>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">{displayTitle}</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            {displayMessage}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/shop/${slug}`}>
              <Button 
                size="lg" 
                className="gap-2 min-w-[200px]"
                style={{
                  backgroundColor: theme?.primaryColor || '#000000',
                  color: theme?.primaryTextColor || '#ffffff',
                }}
              >
                <Home className="w-5 h-5" />
                חזרה לדף הבית
              </Button>
            </Link>
            <Link href={`/shop/${slug}/products`}>
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2 min-w-[200px]"
                style={{
                  borderColor: theme?.primaryColor || '#000000',
                  color: theme?.primaryColor || '#000000',
                }}
              >
                <Package className="w-5 h-5" />
                עיון במוצרים
              </Button>
            </Link>
          </div>

          {/* Helpful Links */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">אולי תמצא את מה שחיפשת כאן:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link 
                href={`/shop/${slug}`} 
                className="text-sm text-gray-600 underline transition-colors"
                style={{
                  ['--hover-color' as any]: theme?.primaryColor || '#000000',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = theme?.primaryColor || '#000000'}
                onMouseLeave={(e) => e.currentTarget.style.color = ''}
              >
                דף הבית
              </Link>
              <span className="text-gray-300">|</span>
              <Link 
                href={`/shop/${slug}/products`} 
                className="text-sm text-gray-600 underline transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.color = theme?.primaryColor || '#000000'}
                onMouseLeave={(e) => e.currentTarget.style.color = ''}
              >
                כל המוצרים
              </Link>
              {shop?.contactEmail && (
                <>
                  <span className="text-gray-300">|</span>
                  <Link 
                    href={`mailto:${shop.contactEmail}`} 
                    className="text-sm text-gray-600 underline transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.color = theme?.primaryColor || '#000000'}
                    onMouseLeave={(e) => e.currentTarget.style.color = ''}
                  >
                    צור קשר
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Search Suggestion - Optional */}
          <div className="mt-8">
            <p className="text-sm text-gray-500 mb-3">או נסה לחפש במערכת:</p>
            <div className="max-w-md mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="חיפוש מוצרים..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const searchTerm = (e.target as HTMLInputElement).value
                      if (searchTerm.trim()) {
                        window.location.href = `/shop/${slug}/products?search=${encodeURIComponent(searchTerm)}`
                      }
                    }
                  }}
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer 
        className="border-t border-gray-200 mt-auto"
        style={{
          backgroundColor: theme?.footerBgColor || '#ffffff',
          color: theme?.footerTextColor || '#6b7280',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">
              &copy; {new Date().getFullYear()} {shop?.name || "חנות"}. כל הזכויות שמורות.
            </p>
            {shop?.contactEmail && (
              <p className="text-sm">
                צור קשר: <a href={`mailto:${shop?.contactEmail}`} className="hover:underline transition-colors">{shop?.contactEmail}</a>
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}

