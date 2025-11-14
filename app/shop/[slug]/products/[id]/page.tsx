import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ProductPageClient } from "./ProductPageClient"
import { notFound } from "next/navigation"

export const revalidate = 300

export default async function ProductPage({ params }: { params: { slug: string; id: string } }) {
  const { slug, id: productId } = params
  const session = await getServerSession(authOptions)

  const [shop, product, navigation, isAdmin] = await Promise.all([
    prisma.shop.findFirst({
      where: {
        slug,
        ...(session?.user?.companyId ? { companyId: session.user.companyId } : { isPublished: true }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        description: true,
        theme: true,
        themeSettings: true,
        settings: true,
        taxEnabled: true,
        taxRate: true,
        pricesIncludeTax: true,
      },
    }),

    prisma.product.findFirst({
      where: {
        OR: [{ id: productId }, { slug: productId }],
        shop: {
          slug,
          ...(session?.user?.companyId ? { companyId: session.user.companyId } : { isPublished: true }),
        },
      },
      include: {
        variants: true,
        collections: {
          include: {
            collection: true,
          },
        },
      },
    }),

    prisma.navigation.findFirst({
      where: {
        shop: { slug },
        location: 'DESKTOP',
      },
      select: {
        id: true,
        name: true,
        location: true,
        items: true,
      },
    }),

    (async () => {
      if (!session?.user?.companyId) return false
      const adminShop = await prisma.shop.findFirst({
        where: {
          slug,
          companyId: session.user.companyId,
        },
        select: { id: true },
      })
      return !!adminShop
    })(),
  ])

  if (!shop || !product) {
    notFound()
  }

  const [reviewsData, relatedProducts] = await Promise.all([
    prisma.review.findMany({
      where: {
        productId: product.id,
        status: 'APPROVED',
      },
      include: {
        customer: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    }),

    prisma.product.findMany({
      where: {
        shopId: shop.id,
        id: { not: product.id },
        status: 'ACTIVE',
      },
      include: {
        variants: true,
      },
      take: 4,
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ])

  const averageRating = reviewsData.length > 0
    ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
    : 0

  return (
    <ProductPageClient
      shop={shop}
      product={product}
      reviews={reviewsData}
      averageRating={averageRating}
      totalReviews={reviewsData.length}
      relatedProducts={relatedProducts}
      navigation={navigation}
      isAdmin={isAdmin}
      slug={slug}
    />
  )
}

