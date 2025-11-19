import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE - מחיקה קבוצתית של מוצרים
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { productIds }: { productIds: string[] } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: "Invalid product IDs" }, { status: 400 })
    }

    // בדיקה שכל המוצרים שייכים לחברה
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        shop: {
          companyId: session.user.companyId,
        },
      },
      select: {
        id: true,
        shopId: true,
      },
    })

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Some products not found or unauthorized" },
        { status: 404 }
      )
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    // מחיקת כל מוצר בנפרד כדי לטפל בקשרים
    for (const product of products) {
      try {
        // הסר את המוצר מכל ה-ProductAddons לפני המחיקה
        try {
          const addonsWithProduct = await prisma.productAddon.findMany({
            where: {
              shopId: product.shopId,
              productIds: {
                has: product.id,
              },
            },
            select: { id: true, productIds: true },
          })

          await Promise.all(
            addonsWithProduct.map(async (addon) => {
              const updatedProductIds = addon.productIds.filter(
                (pid) => pid !== product.id
              )
              await prisma.productAddon.update({
                where: { id: addon.id },
                data: { productIds: updatedProductIds },
              })
            })
          )
        } catch (error) {
          console.error("Error removing product from addons:", error)
          // ממשיכים למחיקה גם אם זה נכשל
        }

        // מחיקת המוצר (עם כל הקשרים - cascade)
        await prisma.product.delete({
          where: { id: product.id },
        })

        // יצירת אירוע
        await prisma.shopEvent.create({
          data: {
            shopId: product.shopId,
            type: "product.deleted",
            entityType: "product",
            entityId: product.id,
            payload: {
              productId: product.id,
            },
            userId: session.user.id,
          },
        })

        results.success++
      } catch (error) {
        console.error(`Error deleting product ${product.id}:`, error)
        results.failed++
        results.errors.push(`Failed to delete product ${product.id}`)
      }
    }

    return NextResponse.json({
      message: "Bulk delete completed",
      results,
    })
  } catch (error) {
    console.error("Error bulk deleting products:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

