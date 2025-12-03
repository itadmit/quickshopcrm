export function NewDiscountSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-9 w-40 bg-gray-200 rounded"></div>
          <div className="h-5 w-64 bg-gray-200 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-20 bg-gray-200 rounded"></div>
          <div className="h-10 w-24 bg-gradient-to-r from-emerald-200 to-emerald-300 rounded"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" dir="rtl">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
              <div className="h-6 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="h-4 w-16 bg-gray-200 rounded"></div>
                <div className="h-10 w-full bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                <div className="h-24 w-full bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-10 w-full bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-28 bg-gray-200 rounded"></div>
                <div className="h-10 w-full bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>

          {/* Discount Type Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
              <div className="h-6 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-10 w-full bg-gray-200 rounded"></div>
              <div className="h-10 w-full bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Target Products Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
              <div className="h-6 w-24 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i: any) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Target Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
              <div className="h-6 w-40 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i: any) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                    <div className="h-4 w-40 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dates & Limits Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
              <div className="h-6 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-10 w-full bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-10 w-full bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-6">
          {/* Settings Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="h-6 w-20 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i: any) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-5 bg-gray-200 rounded"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
              ))}
              <div className="space-y-2 pt-2">
                <div className="h-4 w-16 bg-gray-200 rounded"></div>
                <div className="h-10 w-full bg-gray-200 rounded"></div>
                <div className="h-3 w-48 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

