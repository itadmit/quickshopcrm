import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ShopPageClient } from "./ShopPageClient"
import { getShopNavigation } from "@/lib/navigation-server"

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
  isPublished: boolean
  settings?: {
    maintenanceMessage?: string
  } | null
  themeSettings?: any
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  images: string[]
  availability: string
}

interface ThemeSettings {
  primaryColor: string
  secondaryColor: string
  logoWidthMobile: number
  logoWidthDesktop: number
  logoPaddingMobile: number
  logoPaddingDesktop: number
  headerLayout?: "logo-left" | "logo-right" | "logo-center-menu-below"
  stickyHeader?: boolean
  transparentHeader?: boolean
  logoColorOnScroll?: "none" | "white" | "black"
}

const DEFAULT_THEME: ThemeSettings = {
  primaryColor: "#000000",
  secondaryColor: "#333333",
  logoWidthMobile: 85,
  logoWidthDesktop: 135,
  logoPaddingMobile: 0,
  logoPaddingDesktop: 0,
  headerLayout: "logo-left",
  stickyHeader: true,
  transparentHeader: false,
  logoColorOnScroll: "none",
}

export const revalidate = 300

export default async function ShopPage({ params }: { params: { slug: string } }) {
  const slug = params.slug

  // טעינת נתוני החנות מהשרת
  const session = await getServerSession(authOptions)
  
  let shop: Shop | null = null
  if (session?.user?.companyId) {
    shop = (await prisma.shop.findFirst({
      where: {
        slug: slug,
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        description: true,
        logo: true,
        favicon: true,
        category: true,
        email: true,
        phone: true,
        address: true,
        workingHours: true,
        currency: true,
        taxEnabled: true,
        taxRate: true,
        theme: true,
        themeSettings: true,
        settings: true,
        isPublished: true,
      },
    })) as Shop | null
  } else {
    shop = (await prisma.shop.findFirst({
      where: {
        slug: slug,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        description: true,
        logo: true,
        favicon: true,
        category: true,
        email: true,
        phone: true,
        address: true,
        workingHours: true,
        currency: true,
        taxEnabled: true,
        taxRate: true,
        theme: true,
        themeSettings: true,
        settings: true,
        isPublished: true,
      },
    })) as Shop | null
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">חנות לא נמצאה</p>
      </div>
    )
  }

  // טעינת מוצרים מהשרת
  let products: Product[] = []
  try {
    const shopForProducts = await prisma.shop.findFirst({
      where: {
        slug: slug,
        ...(session?.user?.companyId ? { companyId: session.user.companyId } : { isPublished: true }),
      },
    })

    if (shopForProducts) {
      const productsData = await prisma.product.findMany({
        where: {
          shopId: shopForProducts.id,
          status: "PUBLISHED",
          availability: {
            not: "DISCONTINUED",
          },
        },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          images: true,
          availability: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      products = productsData.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
        images: p.images as string[],
        availability: p.availability,
      }))
    }
  } catch (error) {
    console.error("Error fetching products:", error)
  }

  // הכנת טמפלה
  const themeSettings = (shop.themeSettings as ThemeSettings) || {}
  const theme: ThemeSettings = {
    primaryColor: themeSettings.primaryColor || DEFAULT_THEME.primaryColor,
    secondaryColor: themeSettings.secondaryColor || DEFAULT_THEME.secondaryColor,
    logoWidthMobile: themeSettings.logoWidthMobile || DEFAULT_THEME.logoWidthMobile,
    logoWidthDesktop: themeSettings.logoWidthDesktop || DEFAULT_THEME.logoWidthDesktop,
    logoPaddingMobile: themeSettings.logoPaddingMobile || DEFAULT_THEME.logoPaddingMobile,
    logoPaddingDesktop: themeSettings.logoPaddingDesktop || DEFAULT_THEME.logoPaddingDesktop,
    headerLayout: themeSettings.headerLayout || DEFAULT_THEME.headerLayout,
    stickyHeader: themeSettings.stickyHeader !== undefined ? themeSettings.stickyHeader : DEFAULT_THEME.stickyHeader,
    transparentHeader: themeSettings.transparentHeader !== undefined ? themeSettings.transparentHeader : DEFAULT_THEME.transparentHeader,
    logoColorOnScroll: themeSettings.logoColorOnScroll || DEFAULT_THEME.logoColorOnScroll,
  } as ThemeSettings

  // טעינת ניווט מהשרת
  const navigation = await getShopNavigation(slug, "HEADER")

  return <ShopPageClient shop={shop} products={products} slug={slug} theme={theme} navigation={navigation} />
}

