import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ProductPageClient } from "./ProductPageClient"
import { notFound } from "next/navigation"

export const revalidate = 300

export default async function ProductPage({ params }: { params: { slug: string; id: string } }) {
  const { slug, id: productId } = params
  const session = await getServerSession(authOptions)

  // Decode the productId in case it contains encoded characters (e.g., Hebrew)
  const decodedProductId = decodeURIComponent(productId)

  const [shop, product, navigation, isAdmin] = await Promise.all([
    prisma.shop.findFirst({
      where: {
        slug,
        ...(session?.user?.companyId ? { companyId: session.user.companyId } : { isPublished: true }),
      },
    }),

    prisma.product.findFirst({
      where: {
        OR: [{ id: decodedProductId }, { slug: decodedProductId }],
        shop: {
          slug,
          ...(session?.user?.companyId ? { companyId: session.user.companyId } : { isPublished: true }),
        },
      },
      include: {
        variants: true,
        options: true,
        categories: {
          include: {
            category: true,
          },
        },
        customFieldValues: {
          include: {
            definition: true,
          },
          where: {
            definition: {
              showInStorefront: true,
            },
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

  // Get product category IDs
  const productCategoryIds = (product as any).categories?.map((pc: any) => pc.category?.id).filter(Boolean) || []

  // טעינת תבנית עמוד מוצר - עדיפות: תבנית ספציפית למוצר > ברירת מחדל
  let productPageTemplate: { elements: any } | null = null
  
  // אם יש תבנית ספציפית למוצר
  if ((product as any).pageTemplateId) {
    try {
      const template = await prisma.productPageTemplate.findUnique({
        where: { id: (product as any).pageTemplateId },
        select: { elements: true },
      })
      if (template) {
        productPageTemplate = { elements: template.elements }
      }
    } catch (error) {
      // מודל לא קיים - דלג
    }
  }
  
  // אם אין תבנית ספציפית, נשתמש בתבנית ברירת מחדל
  if (!productPageTemplate) {
    try {
      const defaultTemplate = await prisma.productPageTemplate.findFirst({
        where: {
          shopId: shop.id,
          isActive: true,
          isDefault: true,
        },
        select: { elements: true },
      })
      if (defaultTemplate) {
        productPageTemplate = { elements: defaultTemplate.elements }
      }
    } catch (error) {
      // מודל לא קיים - דלג
    }
  }

  // בדיקה אם התוספים פעילים
  const [bundlePlugin, reviewsPlugin] = await Promise.all([
    (prisma as any).plugin.findFirst({
      where: {
        slug: 'bundle-products',
        isActive: true,
        isInstalled: true,
        OR: [
          { shopId: shop.id },
          { companyId: shop.companyId },
          { shopId: null, companyId: null },
        ],
      },
    }),
    (prisma as any).plugin.findFirst({
      where: {
        slug: 'reviews',
        isActive: true,
        isInstalled: true,
        OR: [
          { shopId: shop.id },
          { companyId: shop.companyId },
          { shopId: null, companyId: null },
        ],
      },
    }),
  ])

  // טעינת bundles שמכילים את המוצר הזה (רק אם התוסף פעיל)
  const bundlesContainingProduct = bundlePlugin ? await prisma.bundle.findMany({
    where: {
      shopId: shop.id,
      isActive: true,
      products: {
        some: {
          productId: product.id,
        },
      },
    },
    include: {
      products: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true,
            },
          },
        },
        orderBy: {
          position: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  }) : []

  const [reviewsData, relatedProducts, productAddons] = await Promise.all([
    // טעינת ביקורות רק אם התוסף פעיל
    reviewsPlugin ? prisma.review.findMany({
      where: {
        productId: product.id,
        isApproved: true, // רק ביקורות מאושרות בסטורפרונט
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    }) : Promise.resolve([]),

    prisma.product.findMany({
      where: {
        shopId: shop.id,
        id: { not: product.id },
      },
      include: {
        variants: true,
      },
      take: 4,
      orderBy: {
        createdAt: 'desc',
      },
    }),

    // טען addons רלוונטיים
    prisma.productAddon.findMany({
      where: {
        shopId: shop.id,
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'PRODUCT', productIds: { has: product.id } },
          { scope: 'CATEGORY', categoryIds: { hasSome: productCategoryIds } },
        ],
      },
      include: {
        values: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    }),
  ])

  const averageRating = reviewsPlugin && reviewsData.length > 0
    ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
    : 0
  const totalReviews = reviewsPlugin ? reviewsData.length : 0

  const themeSettings = (shop.themeSettings as any) || {}
  const galleryLayout = themeSettings.productGalleryLayout || 'standard'
  
  // עדיפות: shop.settings.productPageLayout (מה-DB) > תבנית מ-DB > תבנית מ-themeSettings > null
  const settings = (shop.settings as any) || {}
  const productPageLayout = settings.productPageLayout?.elements
    ? { elements: settings.productPageLayout.elements }
    : productPageTemplate?.elements 
    ? { elements: productPageTemplate.elements as any }
    : themeSettings.productPageLayout || null
    
  const autoOpenCart = settings.autoOpenCartAfterAdd !== false

  return (
    <ProductPageClient
      slug={slug}
      productId={decodedProductId}
      shop={shop}
      product={product as any}
      reviews={reviewsPlugin ? reviewsData : []}
      averageRating={averageRating}
      totalReviews={totalReviews}
      reviewsPluginActive={!!reviewsPlugin}
      relatedProducts={relatedProducts}
      galleryLayout={galleryLayout}
      productPageLayout={productPageLayout}
      theme={themeSettings}
      navigation={navigation ?? undefined}
      isAdmin={isAdmin}
      autoOpenCart={autoOpenCart}
      productAddons={productAddons as any}
      bundles={bundlesContainingProduct as any}
    />
  )
}

