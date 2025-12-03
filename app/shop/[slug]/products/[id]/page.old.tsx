"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { ProductPageClient } from "./ProductPageClient"
import { ProductPageSkeleton } from "@/components/skeletons/ProductPageSkeleton"

export default function ProductPage() {
  const params = useParams()
  const slug = params.slug as string
  const productId = params.id as string

  const [shop, setShop] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [navigation, setNavigation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetchProductData()
  }, [slug, productId])

  const fetchProductData = async () => {
    setLoading(true)
    try {
      // טעינת כל הנתונים במקביל
      const [shopRes, productRes, navigationRes] = await Promise.all([
        fetch(`/api/storefront/${slug}/info`),
        fetch(`/api/storefront/${slug}/products/${productId}`),
        fetch(`/api/storefront/${slug}/navigation?location=HEADER`),
      ])

      if (shopRes.ok) {
        const shopData = await shopRes.json()
        setShop(shopData)
      }

      if (productRes.ok) {
        const productData = await productRes.json()
        setProduct(productData)
        
        // טעינת ביקורות ומוצרים קשורים במקביל
        const [reviewsRes, relatedRes] = await Promise.all([
          fetch(`/api/storefront/${slug}/products/${productId}/reviews`),
          fetch(`/api/storefront/${slug}/products/${productId}/related`),
        ])

        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json()
          setReviews(reviewsData.reviews || [])
          setAverageRating(reviewsData.averageRating || 0)
          setTotalReviews(reviewsData.totalReviews || 0)
        }

        if (relatedRes.ok) {
          const relatedData = await relatedRes.json()
          setRelatedProducts(relatedData.products || [])
        }
      }

      if (navigationRes.ok) {
        const navData = await navigationRes.json()
        setNavigation(navData.length > 0 ? navData[0] : null)
      }
    } catch (error) {
      console.error("Error fetching product data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <ProductPageSkeleton />
  }

  if (!shop || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p className="text-gray-600">מוצר לא נמצא</p>
      </div>
    )
  }

  // הכנת theme
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
      navigation={navigation ?? undefined}
      isAdmin={isAdmin}
      autoOpenCart={autoOpenCart}
    />
  )
}
