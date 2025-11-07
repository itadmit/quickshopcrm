import { Card, CardContent } from "@/components/ui/card"

export function ProductsSkeleton() {
  return (
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
              {[1, 2, 3, 4, 5].map((i) => (
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
  )
}

