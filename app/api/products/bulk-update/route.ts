import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const bulkUpdateSchema = z.object({
  updates: z.array(
    z.object({
      type: z.enum(["product", "variant"]),
      id: z.string().optional(),
      productId: z.string(),
      variantId: z.string().optional(),
      changes: z.record(z.any()),
    })
  ),
})

// POST - עדכון קבוצתי של מוצרים ווריאציות
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = bulkUpdateSchema.parse(body)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    // עיבוד כל העדכונים
    for (const update of validated.updates) {
      try {
        if (update.type === "product") {
          // עדכון מוצר
          // בדיקה שהמוצר שייך לחברה
          const product = await prisma.product.findFirst({
            where: {
              id: update.productId,
              shop: {
                companyId: session.user.companyId,
              },
            },
          })

          if (!product) {
            results.failed++
            results.errors.push(`מוצר ${update.productId} לא נמצא`)
            continue
          }

          // הפרדת עדכון קטגוריה (collections) מעדכונים רגילים
          const { category, ...otherChanges } = update.changes as any
          
          // עדכון המוצר (ללא קטגוריה)
          if (Object.keys(otherChanges).length > 0) {
            await prisma.product.update({
              where: { id: update.productId },
              data: otherChanges,
            })
          }

          // עדכון קטגוריה (collections) אם קיים
          if (category !== undefined) {
            // מחיקת כל הקטגוריות הקיימות של המוצר
            await prisma.productCollection.deleteMany({
              where: { productId: update.productId },
            })

            // אם יש קטגוריה חדשה, חיפוש לפי שם ויצירת קישור
            if (category && category !== "") {
              const collectionRecord = await prisma.collection.findFirst({
                where: {
                  name: category,
                  shopId: product.shopId,
                },
              })

              if (collectionRecord) {
                await prisma.productCollection.create({
                  data: {
                    productId: update.productId,
                    collectionId: collectionRecord.id,
                    position: 0,
                  },
                })
              }
            }
          }

          results.success++
        } else if (update.type === "variant") {
          // עדכון וריאציה
          if (!update.variantId) {
            results.failed++
            results.errors.push("variantId חסר לעדכון וריאציה")
            continue
          }

          // בדיקה שהוריאציה שייכת למוצר ולחברה
          const variant = await prisma.productVariant.findFirst({
            where: {
              id: update.variantId,
              productId: update.productId,
              product: {
                shop: {
                  companyId: session.user.companyId,
                },
              },
            },
          })

          if (!variant) {
            results.failed++
            results.errors.push(`וריאציה ${update.variantId} לא נמצאה`)
            continue
          }

          // עדכון הוריאציה
          await prisma.productVariant.update({
            where: { id: update.variantId },
            data: update.changes,
          })

          results.success++
        }
      } catch (error: any) {
        results.failed++
        results.errors.push(
          `שגיאה בעדכון ${update.type} ${update.id || update.variantId}: ${error.message}`
        )
        console.error(`Error updating ${update.type}:`, error)
      }
    }

    if (results.failed > 0) {
      return NextResponse.json(
        {
          success: results.success,
          failed: results.failed,
          errors: results.errors,
        },
        { status: 207 } // Multi-Status
      )
    }

    return NextResponse.json({
      success: results.success,
      message: `עודכנו ${results.success} פריטים בהצלחה`,
    })
  } catch (error: any) {
    console.error("Error in bulk update:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    )
  }
}

