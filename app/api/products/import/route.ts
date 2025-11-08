import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - ייבוא מוצרים מקובץ CSV
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // בדיקת גישה לתכונות מסחר
    const { checkSubscriptionAccess } = await import("@/lib/subscription-middleware")
    const accessCheck = await checkSubscriptionAccess(true, false)
    if (accessCheck) {
      return accessCheck
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const shopId = formData.get("shopId") as string

    if (!file) {
      return NextResponse.json({ error: "קובץ לא סופק" }, { status: 400 })
    }

    if (!shopId) {
      return NextResponse.json({ error: "shopId לא סופק" }, { status: 400 })
    }

    // בדיקה שהחנות שייכת לחברה
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        companyId: session.user.companyId,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // קריאת הקובץ
    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: "הקובץ ריק או לא תקין" }, { status: 400 })
    }

    // פענוח header
    const headers = lines[0].split(",").map((h) => h.trim())
    const requiredHeaders = ["name", "price"]
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `חסרים שדות חובה: ${missingHeaders.join(", ")}` },
        { status: 400 }
      )
    }

    // עיבוד שורות
    const products = []
    const errors = []
    let successCount = 0
    let errorCount = 0

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim())
      if (values.length !== headers.length) {
        errors.push(`שורה ${i + 1}: מספר עמודות לא תואם`)
        errorCount++
        continue
      }

      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ""
      })

      // ולידציה בסיסית
      if (!row.name || !row.price) {
        errors.push(`שורה ${i + 1}: שם ומחיר הם שדות חובה`)
        errorCount++
        continue
      }

      const price = parseFloat(row.price)
      if (isNaN(price) || price < 0) {
        errors.push(`שורה ${i + 1}: מחיר לא תקין`)
        errorCount++
        continue
      }

      // יצירת slug
      let slug = row.slug || row.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

      // בדיקה אם slug כבר קיים
      const existingProduct = await prisma.product.findFirst({
        where: {
          shopId,
          slug,
        },
      })

      if (existingProduct) {
        slug = `${slug}-${Date.now()}-${i}`
      }

      try {
        const product = await prisma.product.create({
          data: {
            shopId,
            name: row.name,
            slug,
            description: row.description || null,
            sku: row.sku || null,
            price,
            comparePrice: row.comparePrice ? parseFloat(row.comparePrice) : null,
            cost: row.cost ? parseFloat(row.cost) : null,
            taxEnabled: row.taxEnabled !== "false",
            inventoryEnabled: row.inventoryEnabled !== "false",
            inventoryQty: row.inventoryQty ? parseInt(row.inventoryQty) : 0,
            lowStockAlert: row.lowStockAlert ? parseInt(row.lowStockAlert) : null,
            weight: row.weight ? parseFloat(row.weight) : null,
            status: (row.status as any) || "DRAFT",
            images: row.images ? row.images.split("|").filter((img: string) => img.trim()) : [],
            video: row.video || null,
            minQuantity: row.minQuantity ? parseInt(row.minQuantity) : null,
            maxQuantity: row.maxQuantity ? parseInt(row.maxQuantity) : null,
            availability: (row.availability as any) || "IN_STOCK",
            seoTitle: row.seoTitle || null,
            seoDescription: row.seoDescription || null,
          },
        })

        products.push(product)
        successCount++

        // יצירת אירוע
        await prisma.shopEvent.create({
          data: {
            shopId: product.shopId,
            type: "product.created",
            entityType: "product",
            entityId: product.id,
            payload: {
              productId: product.id,
              name: product.name,
              price: product.price,
              shopId: product.shopId,
              imported: true,
            },
            userId: session.user.id,
          },
        })
      } catch (error: any) {
        errors.push(`שורה ${i + 1}: ${error.message || "שגיאה ביצירת מוצר"}`)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      imported: successCount,
      errors: errorCount,
      products: products.map((p) => ({ id: p.id, name: p.name })),
      errorDetails: errors,
    })
  } catch (error: any) {
    console.error("Error importing products:", error)
    return NextResponse.json(
      { error: error.message || "שגיאה בייבוא מוצרים" },
      { status: 500 }
    )
  }
}

