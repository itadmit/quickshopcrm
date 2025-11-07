"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  ChevronLeft,
} from "lucide-react"
import Link from "next/link"
import { ProductGridSkeleton } from "@/components/skeletons/ProductCardSkeleton"
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackPageView } from "@/lib/tracking-events"

interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  type: string
  seoTitle: string | null
  seoDescription: string | null
  _count: {
    products: number
  }
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  images: string[]
  availability: string
}

export default function CollectionPage() {
  const params = useParams()
  const slug = params.slug as string
  const collectionId = params.id as string

  const [collection, setCollection] = useState<Collection | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { trackEvent } = useTracking()

  useEffect(() => {
    fetchCollection()
    fetchProducts()
  }, [slug, collectionId])

  useEffect(() => {
    if (collection) {
      // PageView event - רק פעם אחת כשהקולקציה נטענת
      trackPageView(trackEvent, `/shop/${slug}/collections/${collectionId}`, collection.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection?.id, slug, collectionId]) // רק כשהקולקציה משתנה, לא trackEvent

  const fetchCollection = async () => {
    try {
      const response = await fetch(`/api/storefront/${slug}/collections/${collectionId}`)
      if (response.ok) {
        const data = await response.json()
        setCollection(data)
      }
    } catch (error) {
      console.error("Error fetching collection:", error)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/storefront/${slug}/products?collection=${collectionId}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !collection) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">קולקציה לא נמצאה</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href={`/shop/${slug}`} className="hover:text-purple-600">
              בית
            </Link>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-gray-900 font-medium">{collection.name}</span>
          </div>
          <div className="flex items-center gap-4">
            {collection.image && (
              <img 
                src={collection.image} 
                alt={collection.name} 
                className="h-20 w-20 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{collection.name}</h1>
              {collection.description && (
                <p className="text-gray-600 mt-2">{collection.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge>
                  {collection._count.products} מוצרים
                </Badge>
                {collection.type === "AUTOMATIC" && (
                  <Badge variant="outline">קולקציה אוטומטית</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Products Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">אין מוצרים בקולקציה זו</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/shop/${slug}/products/${product.id}`}
                className="group"
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="relative aspect-square overflow-hidden rounded-t-lg">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      {product.availability === "OUT_OF_STOCK" && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-red-500">אזל מהמלאי</Badge>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-purple-600">
                          ₪{product.price.toFixed(2)}
                        </span>
                        {product.comparePrice && (
                          <span className="text-sm text-gray-500 line-through">
                            ₪{product.comparePrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

