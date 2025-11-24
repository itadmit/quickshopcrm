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

  const [shop, navigation, isAdmin, cart] = await Promise.all([
    prisma.shop.findUnique({
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
      },
    }),

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
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: true,
                  price: true,
                },
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
          coupon: true,
        },
      })

      if (!cartData || !shop) return null

      return calculateCart(
        cartData.items,
        shop,
        cartData.coupon,
        null
      )
    })(),
  ])

  return (
    <TrackingPixelProvider shopSlug={slug}>
      <StorefrontDataProvider 
        slug={slug}
        initialShop={shop}
        initialNavigation={navigation}
        initialIsAdmin={isAdmin}
        initialCart={cart}
        initialCustomerId={customerId}
      >
        <ScriptInjectorWrapper shopId={shop?.id} companyId={shop?.companyId} />
        {children}
        <PopupDisplay slug={slug} />
      </StorefrontDataProvider>
    </TrackingPixelProvider>
  )
}

