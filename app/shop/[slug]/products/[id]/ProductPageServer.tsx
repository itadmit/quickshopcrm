import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProductData } from "./components/ProductData"
import { ProductPageSkeleton } from "@/components/skeletons/ProductPageSkeleton"

interface ProductPageServerProps {
  slug: string
  productId: string
}

export async function ProductPageServer({ slug, productId }: ProductPageServerProps) {
  // טעינת הנתונים עם Suspense - כך העמוד יופיע מיד עם skeleton
  // כל הטעינה נעשית ב-ProductData עם Suspense boundary
  return (
    <Suspense fallback={<ProductPageSkeleton />}>
      <ProductDataWrapper slug={slug} productId={productId} />
    </Suspense>
  )
}

async function ProductDataWrapper({ slug, productId }: { slug: string; productId: string }) {
  // טעינת session וחנות - זה מהיר יחסית
  const [session, shop] = await Promise.all([
    getServerSession(authOptions),
    prisma.shop.findFirst({
      where: {
        OR: [
          { slug, isPublished: true },
          { slug }
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        description: true,
        logo: true,
        favicon: true,
        themeSettings: true,
        settings: true,
        isPublished: true,
        companyId: true,
      },
    }),
  ])

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">חנות לא נמצאה</p>
      </div>
    )
  }

  return <ProductData slug={slug} productId={productId} shop={shop} session={session} />
}

