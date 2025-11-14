import { TrackingPixelProvider } from "@/components/storefront/TrackingPixelProvider"
import { StorefrontDataProvider } from "@/components/storefront/StorefrontDataProvider"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = params.slug
  
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
        title: 'חנות לא נמצאה',
      }
    }

    return {
      title: shop.name,
      description: shop.description || `ברוכים הבאים ל-${shop.name}`,
      icons: {
        icon: shop.favicon || shop.logo || '/favicon.ico',
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'חנות',
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

  const [shop, navigation, isAdmin] = await Promise.all([
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
  ])

  return (
    <TrackingPixelProvider shopSlug={slug}>
      <StorefrontDataProvider 
        slug={slug}
        initialShop={shop}
        initialNavigation={navigation}
        initialIsAdmin={isAdmin}
      >
        {children}
      </StorefrontDataProvider>
    </TrackingPixelProvider>
  )
}

