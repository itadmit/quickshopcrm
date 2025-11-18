import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function CartSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-5 w-64 mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row gap-4 p-4">
                    {/* Product Image */}
                    <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg flex-shrink-0 mx-auto sm:mx-0" />

                    {/* Product Info */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                          <Skeleton className="h-8 w-8 rounded flex-shrink-0" />
                        </div>
                      </div>

                      {/* Quantity Controls and Total */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                        <div className="flex items-center border rounded-lg overflow-hidden">
                          <Skeleton className="h-8 w-8 rounded-none" />
                          <Skeleton className="h-8 w-10 rounded-none" />
                          <Skeleton className="h-8 w-8 rounded-none" />
                        </div>
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div>
            <Card className="shadow-lg sticky top-8">
              <CardContent className="p-6">
                <Skeleton className="h-7 w-32 mb-6" />
                <CartSummarySkeleton />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export function CartSummarySkeleton() {
  return (
    <div className="space-y-6">
      {/* Coupon */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 mb-2" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="border-t border-gray-200 pt-3 flex justify-between">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      {/* Checkout Button */}
      <Skeleton className="h-14 w-full rounded-lg" />
      
      {/* Security Text */}
      <Skeleton className="h-4 w-40 mx-auto" />
    </div>
  )
}

