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

    // המרת פריטי התפריט לפורמט שהפרונט מצפה לו
    const transformedNavigations = await Promise.all(
      navigations.map(async (nav) => {
        const items = (nav.items as any[]) || []
        const transformedItems = await Promise.all(
          items.map(async (item: any) => {
            // המרת type מ-uppercase ל-lowercase
            const type = item.type?.toLowerCase() || "link"
            
            // אם זה דף, נחלץ את ה-pageId מה-url או מה-id
            if (type === "page" || item.type === "PAGE") {
              let pageId = item.pageId
              
              // אם אין pageId אבל יש id שמתחיל ב-page-, נחלץ את ה-id
              if (!pageId && item.id?.startsWith("page-")) {
                pageId = item.id.replace("page-", "")
              }
              
              // אם עדיין אין pageId אבל יש url, נחפש את הדף לפי slug
              if (!pageId && item.url) {
                const urlMatch = item.url.match(/\/pages\/(.+)/)
                if (urlMatch) {
                  const pageSlug = urlMatch[1]
                  // נחפש את הדף לפי slug (ללא בדיקת isPublished כי הדף בתפריט)
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
              
              // נחפש את ה-slug של הדף
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
              }
            }
            
            // אם זה קישור חיצוני או כל דבר אחר
            return {
              type: "link",
              label: item.label,
              url: item.url || "#",
            }
          })
        )
        
        return {
          ...nav,
          items: transformedItems,
        }
      })
    )

    return NextResponse.json(transformedNavigations)
  } catch (error) {
    console.error("Error fetching navigation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

