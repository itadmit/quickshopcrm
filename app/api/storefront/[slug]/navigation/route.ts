import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - קבלת תפריטי ניווט לפרונט
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // מציאת החנות
    const shop = await prisma.shop.findUnique({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    let location = searchParams.get("location") // HEADER, FOOTER, MOBILE, SIDEBAR

    // המרת HEADER ל-DESKTOP (תאימות עם התפריטים הקיימים)
    if (location === "HEADER") {
      location = "DESKTOP"
    }
    // MOBILE נשאר כמו שהוא (כי יש תפריטים עם location="MOBILE")

    const where: any = {
      shopId: shop.id,
    }

    if (location) {
      where.location = location
    }

    const navigations = await prisma.navigation.findMany({
      where,
      select: {
        id: true,
        name: true,
        location: true,
        items: true,
      },
    })

    // פונקציה רקורסיבית להמרת פריטי תפריט
    const transformItem = async (item: any): Promise<any> => {
      const type = item.type?.toLowerCase() || "link"
      
      let transformedItem: any = {
        type,
        label: item.label,
      }
      
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
        
        transformedItem.pageSlug = pageSlug || null
        transformedItem.pageId = pageId || null
      }
      
      // אם זה קטגוריה
      if (type === "category" || item.type === "CATEGORY") {
        let categoryId = item.categoryId
        if (!categoryId && item.id?.startsWith("category-")) {
          categoryId = item.id.replace("category-", "")
        }
        transformedItem.categoryId = categoryId || null
      }
      
      // אם זה קולקציה
      if (type === "collection" || item.type === "COLLECTION") {
        let collectionId = item.collectionId
        if (!collectionId && item.id?.startsWith("collection-")) {
          collectionId = item.id.replace("collection-", "")
        }
        transformedItem.collectionId = collectionId || null
      }
      
      // אם זה קישור חיצוני
      if (type === "link" || item.type === "EXTERNAL") {
        transformedItem.url = item.url || "#"
      }
      
      // הוספת שדות מגה מניו
      if (item.image) {
        transformedItem.image = item.image
      }
      if (item.columnTitle) {
        transformedItem.columnTitle = item.columnTitle
      }
      
      // טיפול בילדים (רקורסיבי)
      if (item.children && Array.isArray(item.children) && item.children.length > 0) {
        transformedItem.children = await Promise.all(
          item.children.map((child: any) => transformItem(child))
        )
      }
      
      return transformedItem
    }
    
    // המרת פריטי התפריט לפורמט שהפרונט מצפה לו
    const transformedNavigations = await Promise.all(
      navigations.map(async (nav) => {
        const items = (nav.items as any[]) || []
        const transformedItems = await Promise.all(
          items.map((item: any) => transformItem(item))
        )
        
        return {
          ...nav,
          items: transformedItems,
        }
      })
    )

    return NextResponse.json(transformedNavigations, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    })
  } catch (error) {
    console.error("Error fetching navigation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

