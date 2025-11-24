import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - קבלת כל המדיה של הלקוח
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") // all, images, fonts, videos
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    // בניית תנאי סינון לפי סוג
    // קבלת כל הקבצים של הלקוח
    const where: any = {
      companyId: session.user.companyId,
    }

    if (type && type !== "all") {
      if (type === "images") {
        where.mimeType = { startsWith: "image/" }
      } else if (type === "fonts") {
        // עבור פונטים, נשתמש ב-OR ברמה העליונה של ה-where
        // Prisma דורש שה-companyId יהיה בכל ה-OR conditions או להשתמש ב-AND
        const fontConditions: any[] = [
          { mimeType: { contains: "font" } },
          { mimeType: { contains: "ttf" } },
          { mimeType: { contains: "otf" } },
          { mimeType: { contains: "woff" } },
          { name: { endsWith: ".ttf", mode: "insensitive" } },
          { name: { endsWith: ".otf", mode: "insensitive" } },
          { name: { endsWith: ".woff", mode: "insensitive" } },
          { name: { endsWith: ".woff2", mode: "insensitive" } },
        ]

        const andConditions: any[] = [
          { companyId: session.user.companyId },
          { OR: fontConditions },
        ]

        // אם יש חיפוש, נוסיף אותו ל-AND
        if (search) {
          andConditions.push({
            name: {
              contains: search,
              mode: "insensitive",
            },
          })
        }

        where.AND = andConditions
        delete where.companyId
      } else if (type === "videos") {
        where.mimeType = { startsWith: "video/" }
      }
    }

    // חיפוש לפי שם קובץ (רק אם לא fonts - כי fonts כבר טופל למעלה)
    if (search && type !== "fonts") {
      where.name = {
        contains: search,
        mode: "insensitive",
      }
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          path: true,
          size: true,
          mimeType: true,
          entityType: true,
          entityId: true,
          createdAt: true,
        },
      }),
      prisma.file.count({ where }),
    ])

    // חישוב שטח אחסון כולל
    const storageStats = await prisma.file.aggregate({
      where: { companyId: session.user.companyId },
      _sum: { size: true },
    })

    const totalSize = storageStats._sum.size || 0
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2)

    // קבלת הגבלת שטח אחסון של החברה (אם יש)
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { storageLimitMB: true } as any,
    })

    const storageLimitMB = (company as any)?.storageLimitMB || null

    return NextResponse.json({
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      storage: {
        used: parseFloat(totalSizeMB),
        usedBytes: totalSize,
        limit: storageLimitMB, // null = אין הגבלה
      },
    })
  } catch (error) {
    console.error("Error fetching media:", error)
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    )
  }
}

