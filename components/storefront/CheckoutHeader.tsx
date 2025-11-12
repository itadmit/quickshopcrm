import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface CheckoutHeaderProps {
  shopName: string
  shopLogo?: string | null
  shopSlug: string
}

export function CheckoutHeader({ shopName, shopLogo, shopSlug }: CheckoutHeaderProps) {
  return (
    <div className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-3 items-center gap-4">
          {/* חזרה לחנות - ימין */}
          <div className="flex justify-start">
            <Link 
              href={`/shop/${shopSlug}`}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              <span>חזרה לחנות</span>
            </Link>
          </div>
          
          {/* לוגו - אמצע */}
          <div className="flex justify-center">
            {shopLogo && (
              <img
                src={shopLogo}
                alt={shopName}
                className="h-10 w-10 object-contain"
              />
            )}
          </div>
          
          {/* שם החנות - שמאל */}
          <div className="flex justify-end">
            <h1 className="text-xl font-bold uppercase">{shopName}</h1>
          </div>
        </div>
      </div>
    </div>
  )
}
