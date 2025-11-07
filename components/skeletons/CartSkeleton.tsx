import { Skeleton } from "@/components/ui/skeleton"

export function CartSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex gap-4 p-4 border border-gray-200 rounded-lg"
        >
          {/* Product Image */}
          <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />

          {/* Product Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1 border border-gray-300 rounded-sm">
              <Skeleton className="h-8 w-8 rounded-none" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8 rounded-none" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function CartSummarySkeleton() {
  return (
    <div className="space-y-4">
      {/* Coupon */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 w-16" />
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="border-t border-gray-300 pt-2 flex justify-between">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>

      <Skeleton className="h-3 w-full" />

      {/* Actions */}
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}

