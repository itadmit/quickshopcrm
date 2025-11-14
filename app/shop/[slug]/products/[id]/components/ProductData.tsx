import { prisma } from "@/lib/prisma"
import { ProductPageClient } from "../ProductPageClient"
import { getShopNavigation } from "@/lib/navigation-server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

interface ProductDataProps {
  slug: string
  productId: string
  shop: any
  session: any
}

export async function ProductData({ slug, productId, shop, session }: ProductDataProps) {
  // טעינת כל הנתונים במקביל
  const [
    product,
    reviewsData,
    relatedProducts,
    navigation,
  ] = await Promise.all([
    // טעינת מוצר עם כל הנתונים
    prisma.product.findFirst({
      where: {
        OR: [
          { id: productId },
          { slug: productId }
        ],
        shopId: shop.id,
        status: "PUBLISHED",
      },
      include: {
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        tags: true,
        variants: true,
        options: true,
        reviews: {
          where: {
            isApproved: true,
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
            createdAt: "desc",
          },
          take: 20,
        },
      },
    }),
    // טעינת ביקורות וסטטיסטיקות
    (async () => {
      const productForReviews = await prisma.product.findFirst({
        where: {
          OR: [
            { id: productId },
            { slug: productId }
          ],
          shopId: shop.id,
          status: "PUBLISHED",
        },
        select: { id: true },
      })
      if (!productForReviews) {
        return { _avg: { rating: null }, _count: { rating: 0 } }
      }
      
      return prisma.review.aggregate({
        where: {
          productId: productForReviews.id,
          isApproved: true,
        },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      })
    })(),
    // טעינת מוצרים קשורים
    (async () => {
      const currentProduct = await prisma.product.findFirst({
        where: {
          OR: [
            { id: productId },
            { slug: productId }
          ],
          shopId: shop.id,
          status: "PUBLISHED",
        },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          tags: true,
        },
      })

      if (!currentProduct) return []

      const categoryIds = currentProduct.categories.map((pc) => pc.categoryId)
      const tagNames = currentProduct.tags.map((t) => t.name)

      // מוצרים מאותה קטגוריה
      let relatedProducts = []
      if (categoryIds.length > 0) {
        relatedProducts = await prisma.product.findMany({
          where: {
            shopId: shop.id,
            status: "PUBLISHED",
            availability: {
              not: "OUT_OF_STOCK",
            },
            id: {
              not: currentProduct.id,
            },
            categories: {
              some: {
                categoryId: {
                  in: categoryIds,
                },
              },
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            images: true,
            availability: true,
          },
          take: 8,
          orderBy: {
            createdAt: "desc",
          },
        })
      }

      // אם אין מספיק, הוסף לפי תגיות
      if (relatedProducts.length < 8 && tagNames.length > 0) {
        const additionalProducts = await prisma.product.findMany({
          where: {
            shopId: shop.id,
            status: "PUBLISHED",
            availability: {
              not: "OUT_OF_STOCK",
            },
            id: {
              not: {
                in: [currentProduct.id, ...relatedProducts.map((p) => p.id)],
              },
            },
            tags: {
              some: {
                name: {
                  in: tagNames,
                },
              },
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            images: true,
            availability: true,
          },
          take: 8 - relatedProducts.length,
          orderBy: {
            createdAt: "desc",
          },
        })
        relatedProducts = [...relatedProducts, ...additionalProducts]
      }

      return relatedProducts
    })(),
    // טעינת ניווט
    getShopNavigation(slug, "HEADER"),
  ])

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">מוצר לא נמצא</p>
      </div>
    )
  }

  // בדיקת admin status
  let isAdmin = false
  if (session?.user?.companyId && shop.companyId === session.user.companyId) {
    isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER"
  }

  // הכנת נתוני ביקורות
  const reviews = product.reviews || []
  const averageRating = reviewsData._avg.rating || 0
  const totalReviews = reviewsData._count.rating || 0

  // הכנת theme עם כל ההגדרות של עמוד מוצר
  const themeSettings = (shop.themeSettings as any) || {}
  const theme = {
    primaryColor: themeSettings.primaryColor || "#000000",
    secondaryColor: themeSettings.secondaryColor || "#333333",
    logoWidthMobile: themeSettings.logoWidthMobile || 85,
    logoWidthDesktop: themeSettings.logoWidthDesktop || 135,
    logoPaddingMobile: themeSettings.logoPaddingMobile || 0,
    logoPaddingDesktop: themeSettings.logoPaddingDesktop || 0,
    headerLayout: themeSettings.headerLayout || "logo-left",
    stickyHeader: themeSettings.stickyHeader !== undefined ? themeSettings.stickyHeader : true,
    transparentHeader: themeSettings.transparentHeader !== undefined ? themeSettings.transparentHeader : false,
    logoColorOnScroll: themeSettings.logoColorOnScroll || "none",
    // הגדרות עמוד מוצר
    productImageRatio: themeSettings.productImageRatio || "9:16",
    productImagePosition: themeSettings.productImagePosition || "left",
    productShowMobileThumbs: themeSettings.productShowMobileThumbs !== undefined ? themeSettings.productShowMobileThumbs : true,
    productShowDiscountBadge: themeSettings.productShowDiscountBadge !== undefined ? themeSettings.productShowDiscountBadge : true,
    productShowQuantityButtons: themeSettings.productShowQuantityButtons !== undefined ? themeSettings.productShowQuantityButtons : true,
    productShowInventory: themeSettings.productShowInventory !== undefined ? themeSettings.productShowInventory : false,
    productShowFavoriteButton: themeSettings.productShowFavoriteButton !== undefined ? themeSettings.productShowFavoriteButton : true,
    productShowShareButton: themeSettings.productShowShareButton !== undefined ? themeSettings.productShowShareButton : true,
    productImageBorderRadius: themeSettings.productImageBorderRadius || 8,
    productMobileImagePadding: themeSettings.productMobileImagePadding || false,
    productDiscountBadgeRounded: themeSettings.productDiscountBadgeRounded !== undefined ? themeSettings.productDiscountBadgeRounded : true,
    productStickyAddToCart: themeSettings.productStickyAddToCart !== undefined ? themeSettings.productStickyAddToCart : true,
    productImageButtonsColor: themeSettings.productImageButtonsColor || "white",
    productDiscountBadgeColor: themeSettings.productDiscountBadgeColor || "red",
    productShowGalleryArrows: themeSettings.productShowGalleryArrows !== undefined ? themeSettings.productShowGalleryArrows : true,
    productGalleryArrowsColor: themeSettings.productGalleryArrowsColor || "white",
    productRelatedRatio: themeSettings.productRelatedRatio || "9:16",
    productRelatedBgColor: themeSettings.productRelatedBgColor || "#f8f9fa",
    productCompleteLookBgColor: themeSettings.productCompleteLookBgColor || "#f1f3f4",
    productCompleteLookTitle: themeSettings.productCompleteLookTitle || "השלם את הלוק",
    productContentDisplay: themeSettings.productContentDisplay || "accordion",
    productStrengths: themeSettings.productStrengths || [],
  }

  // הכנת shop settings
  const shopSettings = (shop.settings as any) || {}
  const galleryLayout = shopSettings.productGalleryLayout || "standard"
  const productPageLayout = shopSettings.productPageLayout || null
  const autoOpenCart = shopSettings.autoOpenCartAfterAdd !== false

  return (
    <ProductPageClient
      slug={slug}
      productId={productId}
      shop={shop}
      product={product}
      reviews={reviews}
      averageRating={averageRating}
      totalReviews={totalReviews}
      relatedProducts={relatedProducts}
      galleryLayout={galleryLayout as any}
      productPageLayout={productPageLayout}
      theme={theme}
      navigation={navigation}
      isAdmin={isAdmin}
      autoOpenCart={autoOpenCart}
    />
  )
}

