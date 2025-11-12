import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ProductPageSkeleton() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Header Skeleton - מתאים ל-StorefrontHeader */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Skeleton className="h-10 w-32" />
            {/* Navigation */}
            <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            {/* Actions */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Gallery Skeleton */}
          <div className="space-y-4">
            <Skeleton className="w-full aspect-square rounded-lg" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="w-full aspect-square rounded-lg" />
              ))}
            </div>
          </div>

          {/* Product Info Skeleton */}
          <div className="space-y-6">
            {/* Product Name */}
            <div>
              <Skeleton className="h-10 w-4/5 mb-2" />
              <Skeleton className="h-6 w-2/5" />
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>

            {/* Variants/Options */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-24" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-20 rounded-md" />
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-12 w-32 rounded-md" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Skeleton className="h-14 flex-1 rounded-lg" />
              <Skeleton className="h-14 w-14 rounded-lg" />
            </div>

            {/* Additional Info */}
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        <div className="mt-16">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-full">
                <CardContent className="p-0">
                  <Skeleton className="w-full aspect-square rounded-t-lg" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

