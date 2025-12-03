import { Card, CardContent } from "@/components/ui/card"

export function OrdersSkeleton() {
  return (
    <div className="space-y-0">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Mobile Filters Skeleton */}
      <div className="md:hidden space-y-0">
        {/* Search and Filter Button */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 h-10 bg-gray-100 rounded-lg animate-pulse"></div>
          <div className="w-10 h-10 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>

        {/* Filter Pills */}
        <div className="pt-4 pb-4">
          <div className="flex gap-2 overflow-x-auto pl-4">
            <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div>
            <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div>
            <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div>
            <div className="h-6 w-14 bg-gray-100 rounded-full animate-pulse"></div>
            <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Mobile Cards Skeleton */}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i: any) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gray-100 rounded animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-24 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-3 w-40 bg-gray-100 rounded animate-pulse"></div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse ml-auto"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-5 w-12 bg-gray-100 rounded-full animate-pulse ml-auto"></div>
                  </div>
                  <div className="w-7 h-7 bg-gray-100 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Desktop Table Skeleton */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Table Header */}
              <div className="bg-gray-50 border-b">
                <div className="grid grid-cols-7 gap-4 px-6 py-3">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              {/* Table Rows */}
              <div className="divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((i: any) => (
                  <div key={i} className="grid grid-cols-7 gap-4 px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-100 rounded animate-pulse"></div>
                      <div className="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
                      <div className="h-3 w-40 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                    <div className="h-4 w-28 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div>
                    <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse"></div>
                    <div className="h-4 w-20 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-8 w-16 bg-gray-100 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

