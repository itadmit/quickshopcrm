import { TrackingPixelProvider } from "@/components/storefront/TrackingPixelProvider"
import { StorefrontDataProvider } from "@/components/storefront/StorefrontDataProvider"
import { ScriptInjectorWrapper } from "@/components/plugins/ScriptInjectorWrapper"
import { PopupDisplay } from "@/components/storefront/PopupDisplay"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cookies } from "next/headers"
import { calculateCart } from "@/lib/cart-calculations"
import { getTranslations } from "next-intl/server"
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = params.slug
  const t = await getTranslations()
  
  try {
    const shop = await prisma.shop.findUnique({
      where: { slug },
      select: {
        name: true,
        description: true,
        logo: true,
        favicon: true,
      },
    })

    if (!shop) {
      return {
        title: t('shop.notFound'),
      }
    }

    return {
      title: shop.name,
      description: shop.description || t('shop.welcome', { name: shop.name }),
      icons: {
        icon: shop.favicon || shop.logo || '/favicon.ico',
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: t('shop.shop'),
    }
  }
}

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const slug = params.slug
  const session = await getServerSession(authOptions)
  const cookieStore = cookies()
  const customerIdCookie = cookieStore.get(`customer_${slug}`)
  const customerId = customerIdCookie?.value || null

  const shop = await prisma.shop.findUnique({
    where: { slug },
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
      companyId: true,
    },
  })

  const [navigation, isAdmin, cart] = await Promise.all([
    prisma.navigation.findFirst({
      where: {
        shop: { slug },
        location: 'MOBILE',
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

    (async () => {
      if (!customerId) return null
      
      const cartData = await prisma.cart.findUnique({
        where: { id: customerId },
        // items is a Json field, so we don't include it like a relation
      })

      if (!cartData || !shop) return null

      return calculateCart(
        shop.id,
        cartData.items as any,
        cartData.couponCode,
        customerId
      )
    })(),
  ])

  return (
    <TrackingPixelProvider shopSlug={slug}>
      <StorefrontDataProvider 
        slug={slug}
        initialShop={shop}
        initialNavigation={navigation as any}
        initialIsAdmin={isAdmin}
        initialCart={cart ? {
          ...cart,
          id: customerId || 'guest',
          coupon: (cart as any).couponStatus || (cart.couponDiscount ? { discount: cart.couponDiscount } : null),
          giftCardDiscount: 0,
        } as any : null}
        initialCustomerId={customerId}
      >
        <ScriptInjectorWrapper shopId={shop?.id} companyId={shop?.companyId} />
        {children}
        <PopupDisplay slug={slug} />
      </StorefrontDataProvider>
    </TrackingPixelProvider>
  )
}

