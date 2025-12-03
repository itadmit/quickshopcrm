import { Card, CardContent } from "@/components/ui/card"

export function ProductsSkeleton() {
  return (
    <>
      {/* Desktop View - Hidden on Mobile */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Table Header */}
                <div className="bg-gray-50 border-b">
                  <div className="grid grid-cols-8 gap-4 px-6 py-3">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
                {/* Table Rows */}
                <div className="divide-y divide-gray-200">
                  {[1, 2, 3, 4, 5].map((i: any) => (
                    <div key={i} className="grid grid-cols-8 gap-4 px-6 py-4">
                      <div className="w-12 h-12 bg-gray-100 rounded animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
                        <div className="h-3 w-24 bg-gray-100 rounded animate-pulse"></div>
                      </div>
                      <div className="h-4 w-20 bg-gray-100 rounded animate-pulse"></div>
                      <div className="space-y-1">
                        <div className="h-4 w-16 bg-gray-100 rounded animate-pulse"></div>
                        <div className="h-3 w-12 bg-gray-100 rounded animate-pulse"></div>
                      </div>
                      <div className="h-4 w-12 bg-gray-100 rounded animate-pulse"></div>
                      <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div>
                      <div className="h-4 w-20 bg-gray-100 rounded animate-pulse"></div>
                      <div className="h-8 w-8 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile View - Hidden on Desktop */}
      <div className="md:hidden space-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i: any) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex gap-3">
                {/* Image Skeleton */}
                <div className="w-16 h-16 bg-gray-200 rounded-lg animate-pulse flex-shrink-0"></div>
                
                {/* Content Skeleton */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Title */}
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  
                  {/* Price and Meta */}
                  <div className="flex items-center gap-2">
                    <div className="h-5 bg-gray-200 rounded animate-pulse w-20"></div>
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-16"></div>
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-2">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-24"></div>
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-16"></div>
                  </div>
                </div>
                
                {/* Action Button Skeleton */}
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse flex-shrink-0"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

