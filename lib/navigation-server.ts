import { prisma } from "@/lib/prisma"

export interface NavigationItem {
  type: "link" | "page" | "category" | "collection"
  label: string
  url?: string
  pageId?: string
  pageSlug?: string
  categoryId?: string
  collectionId?: string
  children?: NavigationItem[]
  image?: string
  columnTitle?: string
}

export interface Navigation {
  id: string
  name: string
  location: string
  items: NavigationItem[]
}

/**
 * טוען את נתוני הניווט של החנות מהשרת עם transformation כמו ה-API
 * @param slug - slug של החנות
 * @param location - מיקום הניווט (HEADER, FOOTER)
 * @returns נתוני הניווט או null
 */
export async function getShopNavigation(
  slug: string,
  location: "HEADER" | "FOOTER" = "HEADER"
): Promise<Navigation | null> {
  try {
    const shop = await prisma.shop.findFirst({
      where: { slug },
      select: { id: true },
    })

    if (!shop) {
      return null
    }

    // המרת HEADER ל-DESKTOP (תאימות עם התפריטים הקיימים)
    const dbLocation = location === "HEADER" ? "DESKTOP" : location

    const navigation = await prisma.navigation.findFirst({
      where: {
        shopId: shop.id,
        location: dbLocation,
      },
      select: {
        id: true,
        name: true,
        location: true,
        items: true,
      },
    })

    if (!navigation) {
      return null
    }

    // Transformation של items כמו ב-API
    const items = (navigation.items as any[]) || []
    
    // פונקציה רקורסיבית לטרנספורמציה של ילדים
    const transformChildren = async (children: any[]): Promise<NavigationItem[]> => {
      return Promise.all(
        children.map(async (child: any) => {
          const childType = child.type?.toLowerCase() || "link"
          
          if (childType === "page" || child.type === "PAGE") {
            let pageId = child.pageId
            if (!pageId && child.id?.startsWith("page-")) {
              pageId = child.id.replace("page-", "")
            }
            
            let pageSlug = child.url?.replace("/pages/", "") || null
            if (pageId && !pageSlug) {
              const pageData = await prisma.page.findFirst({
                where: { id: pageId, shopId: shop.id },
                select: { slug: true },
              })
              if (pageData) {
                pageSlug = pageData.slug
              }
            }
            
            return {
              type: "page" as const,
              label: child.label,
              pageSlug: pageSlug || null,
              children: child.children ? await transformChildren(child.children) : undefined,
              image: child.image || undefined,
              columnTitle: child.columnTitle || undefined,
            }
          }
          
          if (childType === "category" || child.type === "CATEGORY") {
            return {
              type: "category" as const,
              label: child.label,
              categoryId: child.categoryId || null,
              children: child.children ? await transformChildren(child.children) : undefined,
              image: child.image || undefined,
              columnTitle: child.columnTitle || undefined,
            }
          }
          
          if (childType === "collection" || child.type === "COLLECTION") {
            return {
              type: "collection" as const,
              label: child.label,
              collectionId: child.collectionId || null,
              children: child.children ? await transformChildren(child.children) : undefined,
              image: child.image || undefined,
              columnTitle: child.columnTitle || undefined,
            }
          }
          
          return {
            type: "link" as const,
            label: child.label,
            url: child.url || "#",
            children: child.children ? await transformChildren(child.children) : undefined,
            image: child.image || undefined,
            bannerImage: child.bannerImage || undefined,
            columnTitle: child.columnTitle || undefined,
          }
        })
      )
    }
    
    const transformedItems = await Promise.all(
      items.map(async (item: any) => {
        const type = item.type?.toLowerCase() || "link"
        
        // אם זה דף
        if (type === "page" || item.type === "PAGE") {
          let pageId = item.pageId
          
          if (!pageId && item.id?.startsWith("page-")) {
            pageId = item.id.replace("page-", "")
          }
          
          if (!pageId && item.url) {
            const urlMatch = item.url.match(/\/pages\/(.+)/)
            if (urlMatch) {
              const pageSlug = urlMatch[1]
              const page = await prisma.page.findFirst({
                where: {
                  shopId: shop.id,
                  slug: pageSlug,
                },
                select: {
                  id: true,
                },
              })
              if (page) {
                pageId = page.id
              }
            }
          }
          
          let pageSlug = item.url?.replace("/pages/", "") || null
          if (pageId && !pageSlug) {
            const pageData = await prisma.page.findFirst({
              where: {
                id: pageId,
                shopId: shop.id,
              },
              select: {
                slug: true,
              },
            })
            if (pageData) {
              pageSlug = pageData.slug
            }
          }
          
          return {
            type: "page",
            label: item.label,
            pageSlug: pageSlug || null,
            children: item.children ? await transformChildren(item.children) : undefined,
            image: item.image || undefined,
            columnTitle: item.columnTitle || undefined,
          }
        }
        
        // אם זה קטגוריה/קולקציה
        if (type === "category" || item.type === "CATEGORY") {
          let categoryId = item.categoryId
          if (!categoryId && item.id?.startsWith("category-")) {
            categoryId = item.id.replace("category-", "")
          }
          return {
            type: "category",
            label: item.label,
            categoryId: categoryId || null,
            children: item.children ? await transformChildren(item.children) : undefined,
            image: item.image || undefined,
            columnTitle: item.columnTitle || undefined,
          }
        }
        
        // אם זה קטגוריה/קולקציה
        if (type === "collection" || item.type === "COLLECTION") {
          let collectionId = item.collectionId
          if (!collectionId && item.id?.startsWith("collection-")) {
            collectionId = item.id.replace("collection-", "")
          }
          return {
            type: "collection",
            label: item.label,
            collectionId: collectionId || null,
            children: item.children ? await transformChildren(item.children) : undefined,
            image: item.image || undefined,
            columnTitle: item.columnTitle || undefined,
          }
        }
        
        // אם זה קישור חיצוני או כל דבר אחר
        return {
          type: "link",
          label: item.label,
          url: item.url || "#",
          children: item.children ? await transformChildren(item.children) : undefined,
          image: item.image || undefined,
          bannerImage: item.bannerImage || undefined,
          columnTitle: item.columnTitle || undefined,
        }
      })
    )

    return {
      id: navigation.id,
      name: navigation.name,
      location: navigation.location,
      items: transformedItems,
    }
  } catch (error) {
    console.error("Error fetching navigation:", error)
    return null
  }
}

