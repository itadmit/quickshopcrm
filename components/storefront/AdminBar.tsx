"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LayoutDashboard, Palette, Eye, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useStorefrontData } from "./StorefrontDataProvider"

interface AdminBarProps {
  slug: string
  pageType?: 'home' | 'product' | 'category' | 'page' | 'checkout' | 'other'
  pageId?: string
  categoryId?: string
  productSlug?: string
}

export function AdminBar({ slug, pageType = 'other', pageId, categoryId, productSlug }: AdminBarProps) {
  const { isAdmin } = useStorefrontData()
  const [mounted, setMounted] = useState(false)
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    setMounted(true)
    const hidden = sessionStorage.getItem('adminBarHidden')
    if (hidden === 'true') {
      setIsHidden(true)
    }
  }, [slug])

  const getCustomizeLink = () => {
    // קישור להתאמת מראה בהתאם לסוג העמוד
    switch (pageType) {
      case 'home':
        return '/customize?page=home'
      case 'product':
        return productSlug ? `/customize?page=product&id=${productSlug}` : '/customize?page=product'
      case 'category':
        return categoryId ? `/customize?page=category&id=${categoryId}` : '/customize?page=category'
      case 'page':
        return '/customize'
      default:
        return '/customize'
    }
  }

  const getDashboardLink = () => {
    // קישור ספציפי בדשבורד בהתאם לסוג העמוד
    switch (pageType) {
      case 'product':
        return productSlug ? `/products/${productSlug}/edit` : '/products'
      case 'category':
        return categoryId ? `/categories/${categoryId}` : '/categories'
      case 'page':
        return pageId ? `/pages/${pageId}` : '/pages'
      default:
        return '/dashboard'
    }
  }

  const handleHide = () => {
    setIsHidden(true)
    sessionStorage.setItem('adminBarHidden', 'true')
  }

  if (!mounted || !isAdmin || isHidden) {
    return null
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden under the admin bar */}
      <div className="h-14" aria-hidden="true" />
      
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/90 backdrop-blur-sm border-t border-gray-700/50 shadow-lg" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Right side - Info */}
            <div className="flex items-center gap-2 text-white text-sm">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">אתה צופה כמנהל</span>
              <span className="sm:hidden">מנהל</span>
            </div>

            {/* Left side - Actions */}
            <div className="flex items-center gap-2">
              {/* Dashboard Button */}
              <Link href="/dashboard" target="_blank">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 hover:border-gray-500 gap-2 h-9"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">דשבורד</span>
                </Button>
              </Link>

              {/* Edit Page/Product Button */}
              {(pageType === 'product' || pageType === 'category' || pageType === 'page') && (
                <Link href={getDashboardLink()} target="_blank">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 hover:border-gray-500 gap-2 h-9"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">ערוך</span>
                  </Button>
                </Link>
              )}

              {/* Customize Appearance Button */}
              {pageType !== 'checkout' && pageType !== 'other' && (
                <Link href={getCustomizeLink()} target="_blank">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 hover:border-gray-500 gap-2 h-9"
                  >
                    <Palette className="w-4 h-4" />
                    <span className="hidden sm:inline">עיצוב</span>
                  </Button>
                </Link>
              )}

              {/* Hide Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleHide}
                className="text-white hover:bg-gray-800 h-9 w-9 p-0"
                title="הסתר עד הרענון הבא"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

