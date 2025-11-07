export function CollectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="w-full h-48 bg-gray-100 animate-pulse"></div>
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="h-6 w-32 bg-gray-100 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-100 rounded animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-100 rounded animate-pulse"></div>
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div>
                <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div>
                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse mr-auto"></div>
              </div>
            </div>
          </div>
        ))}
    </div>
  )
}

