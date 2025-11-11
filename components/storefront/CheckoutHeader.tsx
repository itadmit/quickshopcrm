"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface Shop {
  id: string
  name: string
  logo: string | null
}

interface CheckoutHeaderProps {
  slug: string
  shop: Shop
}

export function CheckoutHeader({ slug, shop }: CheckoutHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Back to Shop Link - on the left */}
          <Link 
            href={`/shop/${slug}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm z-10"
          >
              <ArrowRight className="w-4 h-4" />
            חזרה לחנות
          
          </Link>
          
          {/* Logo - Centered - עם placeholder למניעת layout shift */}
          <Link 
            href={`/shop/${slug}`} 
            className="flex items-center hover:opacity-80 transition-opacity absolute left-1/2 transform -translate-x-1/2 z-10"
          >
            {shop.logo ? (
              <div 
                className="flex items-center justify-center"
                style={{
                  height: "32px",
                  minWidth: "100px",
                }}
              >
                <img
                  src={shop.logo}
                  alt={shop.name}
                  className="h-8 w-auto object-contain max-w-[150px]"
                  style={{
                    height: "32px",
                  }}
                  loading="eager"
                  onLoad={(e) => {
                    // וידוא שהתמונה נטענה בגודל הנכון
                    const img = e.currentTarget
                    if (img.naturalHeight > 0) {
                      img.style.opacity = "1"
                    }
                  }}
                  onError={(e) => {
                    // במקרה של שגיאה, הצג טקסט
                    const target = e.currentTarget as HTMLImageElement
                    target.style.display = "none"
                  }}
                />
              </div>
            ) : (
              <span className="text-lg font-semibold text-gray-900">{shop.name}</span>
            )}
          </Link>
          
          {/* Spacer for balance - invisible but maintains layout */}
          <div className="w-24 opacity-0 pointer-events-none">
            חזרה לחנות
          </div>
        </div>
      </div>
    </header>
  )
}

