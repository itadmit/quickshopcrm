import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { updateAutomaticCollection } from "@/lib/collection-engine"

const createCollectionSchema = z.object({
  shopId: z.string(),
  name: z.string().min(2, "שם האוסף חייב להכיל לפחות 2 תווים"),
  slug: z.string().min(2).regex(/^[\u0590-\u05FFa-zA-Z0-9\-]+$/).optional(), // תומך בעברית
  description: z.string().optional(),
  image: z.string().optional(),
  type: z.enum(["MANUAL", "AUTOMATIC"]).default("MANUAL"),
  isPublished: z.boolean().default(true),
  rules: z.any().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  productIds: z.array(z.string()).optional(),
})

const updateCollectionSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[\u0590-\u05FFa-zA-Z0-9\-]+$/).optional(), // תומך בעברית
  description: z.string().optional(),
  image: z.string().optional(),
  type: z.enum(["MANUAL", "AUTOMATIC"]).optional(),
  isPublished: z.boolean().optional(),
  rules: z.any().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  productIds: z.array(z.string()).optional(),
})

// GET - קבלת כל האוספים
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")

    const where: any = {
      shop: {
        companyId: session.user.companyId,
      },
    }

    if (shopId) {
      where.shopId = shopId
    }

    const collections = await prisma.collection.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        type: true,
        isPublished: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
          },
        },
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
                status: true,
              },
            },
          },
          orderBy: {
            position: "asc",
          },
          take: 5, // מוגבל ל-5 מוצרים לתצוגה מהירה
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(collections)
  } catch (error) {
    console.error("Error fetching collections:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת אוסף חדש
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createCollectionSchema.parse(body)

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // יצירת slug אם לא סופק (תומך בעברית)
    let slug = data.slug
    if (!slug) {
      slug = data.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-") // החלפת רווחים במקפים
        .replace(/[^\u0590-\u05FFa-zA-Z0-9\-]+/g, "") // שמירה על עברית, אנגלית, מספרים ומקפים
        .replace(/-+/g, "-") // החלפת מקפים מרובים במקף אחד
        .replace(/^-+|-+$/g, "") // הסרת מקפים מהתחלה וסוף
    }

    // בדיקה אם slug כבר קיים בחנות זו
    const existingCollection = await prisma.collection.findFirst({
      where: {
        shopId: data.shopId,
        slug,
      },
    })

    if (existingCollection) {
      slug = `${slug}-${Date.now()}`
    }

    // יצירת האוסף
    const collection = await prisma.collection.create({
      data: {
        shopId: data.shopId,
        name: data.name,
        slug,
        description: data.description,
        image: data.image,
        type: data.type,
        isPublished: data.isPublished ?? true, // ברירת מחדל - פורסם
        rules: data.rules,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
      },
    })

    // הוספת מוצרים - ידני או אוטומטי
    if (data.type === "AUTOMATIC" && data.rules) {
      // קולקציה אוטומטית - עדכון לפי rules
      await updateAutomaticCollection(collection.id, data.shopId, data.rules)
    } else if (data.productIds && data.productIds.length > 0) {
      // קולקציה ידנית - הוספת מוצרים שנבחרו
      await Promise.all(
        data.productIds.map((productId, index) =>
          prisma.productCollection.create({
            data: {
              productId,
              collectionId: collection.id,
              position: index,
            },
          })
        )
      )
    }

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: collection.shopId,
        type: "collection.created",
        entityType: "collection",
        entityId: collection.id,
        payload: {
          collectionId: collection.id,
          name: collection.name,
        },
        userId: session.user.id,
      },
    })

    const collectionWithProducts = await prisma.collection.findUnique({
      where: { id: collection.id },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
                status: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(collectionWithProducts, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating collection:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

