export function DiscountsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="h-6 w-32 bg-gray-200 rounded flex-1"></div>
                <div className="flex flex-col gap-2">
                  <div className="h-5 w-16 bg-gray-200 rounded"></div>
                  <div className="h-5 w-20 bg-gray-200 rounded"></div>
                </div>
              </div>

              {/* Type and Value */}
              <div className="flex items-center gap-2">
                <div className="h-6 w-20 bg-gray-200 rounded"></div>
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </div>

              {/* Usage */}
              <div className="flex items-center justify-between">
                <div className="h-4 w-16 bg-gray-200 rounded"></div>
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <div className="h-9 flex-1 bg-gray-200 rounded"></div>
                <div className="h-9 flex-1 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
    </div>
  )
}

