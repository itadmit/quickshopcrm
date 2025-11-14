import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ProductPageSkeleton() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Header Skeleton - מתאים ל-StorefrontHeader */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* 3 עיגולים קטנים משמאל (browser controls) */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-3 rounded-full" />
            </div>
            {/* 5 מלבנים אופקיים (navigation) */}
            <div className="hidden md:flex items-center gap-4 flex-1 justify-center">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <div className="w-4" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
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
          {/* Product Info Skeleton - עמודה שמאלית */}
          <div className="space-y-6 order-2 lg:order-1">
            {/* כותרת ראשית ארוכה */}
            <Skeleton className="h-10 w-full rounded" />
            
            {/* 2 תת-כותרות קצרות */}
            <div className="space-y-2 pr-4">
              <Skeleton className="h-5 w-3/5 rounded" />
              <Skeleton className="h-5 w-2/5 rounded" />
            </div>

            {/* 2 שורות טקסט בינוניות */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-4/5 rounded" />
            </div>

            {/* 4 ריבועים קטנים (כפתורים/תגים) */}
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20 rounded" />
              <Skeleton className="h-10 w-20 rounded" />
              <Skeleton className="h-10 w-20 rounded" />
              <Skeleton className="h-10 w-20 rounded" />
            </div>

            {/* עוד 2 שורות טקסט */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-4 w-2/5 rounded" />
            </div>

            {/* מלבן ארוך רחב (שדה קלט/כפתור) */}
            <Skeleton className="h-14 w-full rounded" />

            {/* 3 שורות עם עיגול קטן ומלבן קצר (רשימה) */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
                <Skeleton className="h-4 w-48 rounded" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
                <Skeleton className="h-4 w-40 rounded" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
                <Skeleton className="h-4 w-56 rounded" />
              </div>
            </div>
          </div>

          {/* Gallery Skeleton - עמודה ימנית */}
          <div className="space-y-4 order-1 lg:order-2">
            {/* תמונה ראשית גדולה */}
            <Skeleton className="w-full aspect-square rounded-lg" />
            {/* 4 ריבועים קטנים למטה */}
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="w-full aspect-square rounded-lg" />
              ))}
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        <div className="mt-16">
          <Skeleton className="h-8 w-48 mb-8 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-full">
                <CardContent className="p-0">
                  <Skeleton className="w-full aspect-square rounded-t-lg" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-4 w-1/2 rounded" />
                    <Skeleton className="h-6 w-20 rounded" />
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

