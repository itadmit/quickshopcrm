import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { updateAutomaticCollection } from "@/lib/collection-engine"

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

// GET - קבלת פרטי אוסף
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const collection = await prisma.collection.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                comparePrice: true,
                images: true,
                status: true,
                availability: true,
                sku: true,
              },
            },
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    })

    if (!collection) {
      return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 404 })
    }

    return NextResponse.json(collection)
  } catch (error) {
    console.error("Error fetching collection:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - עדכון אוסף
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהאוסף שייך לחברה
    const existingCollection = await prisma.collection.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingCollection) {
      return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateCollectionSchema.parse(body)

    // אם משנים slug, בדיקה שהוא לא תפוס
    if (data.slug && data.slug !== existingCollection.slug) {
      const slugExists = await prisma.collection.findFirst({
        where: {
          shopId: existingCollection.shopId,
          slug: data.slug,
          NOT: {
            id: existingCollection.id
          }
        },
      })

      if (slugExists) {
        return NextResponse.json(
          { error: "אוסף עם slug זה כבר קיים בחנות זו" },
          { status: 400 }
        )
      }
    }

    // עדכון האוסף
    const collection = await prisma.collection.update({
      where: { id: existingCollection.id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        image: data.image,
        type: data.type,
        isPublished: data.isPublished,
        rules: data.rules,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
      },
    })

    // עדכון מוצרים - ידני או אוטומטי
    const finalType = data.type ?? existingCollection.type
    
    if (finalType === "AUTOMATIC" && data.rules) {
      // קטגוריה אוטומטית - עדכון לפי rules
      await updateAutomaticCollection(existingCollection.id, existingCollection.shopId, data.rules)
    } else if (data.productIds !== undefined) {
      // קטגוריה ידנית - עדכון מוצרים שנבחרו
      // מחיקת כל הקשרים הקיימים
      await prisma.productCollection.deleteMany({
        where: { collectionId: existingCollection.id },
      })

      // יצירת קשרים חדשים
      if (data.productIds.length > 0) {
        await Promise.all(
          data.productIds.map((productId, index) =>
            prisma.productCollection.create({
              data: {
                productId,
                collectionId: existingCollection.id,
                position: index,
              },
            })
          )
        )
      }
    } else if (data.type === "AUTOMATIC" && existingCollection.rules) {
      // אם משנים ל-AUTOMATIC אבל לא סופקו rules חדשים, עדכן לפי ה-rules הקיימים
      await updateAutomaticCollection(existingCollection.id, existingCollection.shopId, existingCollection.rules as any)
    }

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: collection.shopId,
        type: "collection.updated",
        entityType: "collection",
        entityId: collection.id,
        payload: {
          collectionId: collection.id,
          changes: data,
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

    return NextResponse.json(collectionWithProducts)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating collection:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת אוסף
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקה שהאוסף שייך לחברה
    const collection = await prisma.collection.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!collection) {
      return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 404 })
    }

    // מחיקת האוסף (עם כל הקשרים - cascade)
    await prisma.collection.delete({
      where: { id: collection.id },
    })

    // יצירת אירוע
    await prisma.shopEvent.create({
      data: {
        shopId: collection.shopId,
        type: "collection.deleted",
        entityType: "collection",
        entityId: params.id,
        payload: {
          collectionId: params.id,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: "הקטגוריה נמחקה בהצלחה" })
  } catch (error) {
    console.error("Error deleting collection:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

