import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface ExtendedSession {
  user: {
    id: string
    companyId: string
  }
}

// GET - קבלת כל הקבצים (תמונות) של חנות או entity
export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as ExtendedSession | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")
    const entityType = searchParams.get("entityType") // products, collections וכו'
    const entityId = searchParams.get("entityId")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    // בניית where clause
    const where: any = {
      companyId: session.user.companyId,
      // רק תמונות
      mimeType: {
        startsWith: "image/",
      },
    }

    // אם יש shopId, נחפש קבצים של המוצרים/קטגוריות של החנות
    if (shopId) {
      const shop = await prisma.shop.findFirst({
        where: {
          id: shopId,
          companyId: session.user.companyId,
        },
        select: { slug: true },
      })

      if (shop?.slug) {
        if (entityType) {
          // קבצים של entity ספציפי
          if (entityId && entityId !== "new") {
            // קבצים של entity ספציפי - נחפש לפי path ב-S3
            where.path = {
              contains: `shops/${shop.slug}/${entityType}/${entityId}/`,
            }
          } else {
            // כל הקבצים של הסוג הזה בחנות
            where.path = {
              contains: `shops/${shop.slug}/${entityType}/`,
            }
          }
        } else {
          // כל הקבצים של החנות (כל ה-entities)
          where.path = {
            contains: `shops/${shop.slug}/`,
          }
        }
      }
    }

    // חיפוש לפי שם קובץ
    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      }
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        select: {
          id: true,
          name: true,
          path: true,
          size: true,
          mimeType: true,
          createdAt: true,
          entityType: true,
          entityId: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.file.count({ where }),
    ])

    return NextResponse.json({
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching files:", error)
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    )
  }
}

