"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackPageView } from "@/lib/tracking-events"
import { useEffect } from "react"
import { ProductBadges } from "@/components/storefront/ProductBadges"
import { getProductPrice, formatProductPrice, formatComparePrice } from "@/lib/product-price"

interface CollectionClientProps {
  collection: any
  products: any[]
  slug: string
}

export function CollectionClient({ collection, products, slug }: CollectionClientProps) {
  const { trackEvent } = useTracking()

  useEffect(() => {
    trackPageView({
      page_title: collection.name,
      page_location: window.location.href,
      page_path: window.location.pathname,
    })
    
    trackEvent('view_item_list', {
      item_list_id: collection.id,
      item_list_name: collection.name,
      items: products.slice(0, 10).map((product, index) => ({
        item_id: product.id,
        item_name: product.name,
        item_list_id: collection.id,
        item_list_name: collection.name,
        index,
        price: product.price,
      })),
    })
  }, [collection.id])

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href={`/shop/${slug}`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="w-4 h-4 ml-1" />
            חזרה לחנות
          </Link>

          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{collection.name}</h1>
            {collection.description && (
              <p className="text-lg text-gray-600">{collection.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              {collection._count.products} מוצרים
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">אין מוצרים באוסף זה</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link key={product.id} href={`/shop/${slug}/products/${product.slug || product.id}`}>
                <Card className="group hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="p-0">
                    <div className="relative aspect-square overflow-hidden rounded-t-lg">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      <ProductBadges
                        badges={product.badges || []}
                        isSoldOut={product.availability === "OUT_OF_STOCK"}
                        comparePrice={product.comparePrice}
                        price={product.price}
                      />
                    </div>

                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                        {product.name}
                      </h3>

                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold text-gray-900">
                            {formatProductPrice(product)}
                          </span>
                          {formatComparePrice(product) && (() => {
                            const priceInfo = getProductPrice(product)
                            return priceInfo.comparePrice && priceInfo.comparePrice > priceInfo.price ? (
                              <span className="text-sm text-gray-400 line-through">
                                {formatComparePrice(product)}
                              </span>
                            ) : null
                          })()}
                        </div>
                      </div>

                      {product.availability !== 'IN_STOCK' && (
                        <Badge variant="secondary" className="mt-2">
                          אזל מהמלאי
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


