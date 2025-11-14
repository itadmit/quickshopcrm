import { TrackingPixelProvider } from "@/components/storefront/TrackingPixelProvider"
import { prisma } from "@/lib/prisma"
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

export default function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const slug = params.slug

  return (
    <TrackingPixelProvider shopSlug={slug}>
      {children}
    </TrackingPixelProvider>
  )
}

