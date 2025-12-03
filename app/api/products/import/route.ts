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
    const lines = text.split("\n").filter((line: any) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: "הקובץ ריק או לא תקין" }, { status: 400 })
    }

    // פענוח header
    const headers = lines[0].split(",").map((h: any) => h.trim())
    const requiredHeaders = ["name", "price"]
    const missingHeaders = requiredHeaders.filter((h: any) => !headers.includes(h))

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
      const values = lines[i].split(",").map((v: any) => v.trim())
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
        // בדיקה אם יש שדות variants/options
        const hasVariants = headers.some(h => h.startsWith('variant_') || h.startsWith('option1') || h.startsWith('option2') || h.startsWith('option3'))
        
        const productData: any = {
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
        }

        // אם יש variants, נוסיף אותם
        if (hasVariants && (row.option1 || row.option2 || row.option3)) {
          // איסוף כל הoptions הייחודיים
          const optionsMap = new Map<string, Set<string>>()
          
          if (row.option1 && row.option1Value) {
            if (!optionsMap.has(row.option1)) {
              optionsMap.set(row.option1, new Set())
            }
            optionsMap.get(row.option1)!.add(row.option1Value)
          }
          
          if (row.option2 && row.option2Value) {
            if (!optionsMap.has(row.option2)) {
              optionsMap.set(row.option2, new Set())
            }
            optionsMap.get(row.option2)!.add(row.option2Value)
          }
          
          if (row.option3 && row.option3Value) {
            if (!optionsMap.has(row.option3)) {
              optionsMap.set(row.option3, new Set())
            }
            optionsMap.get(row.option3)!.add(row.option3Value)
          }

          // יצירת options
          const optionsToCreate: any[] = []
          let position = 0
          for (const [optionName, valuesSet] of optionsMap.entries()) {
            const values = Array.from(valuesSet).map(value => ({
              id: value,
              label: value,
            }))
            
            optionsToCreate.push({
              name: optionName,
              type: 'button',
              values: values,
              position: position++,
            })
          }

          if (optionsToCreate.length > 0) {
            productData.options = {
              create: optionsToCreate
            }
          }

          // יצירת variant אחד
          const variantData: any = {
            name: `${row.option1Value || ''}${row.option2Value ? ' / ' + row.option2Value : ''}${row.option3Value ? ' / ' + row.option3Value : ''}`.trim(),
            sku: row.variantSku || row.sku || null,
            price: row.variantPrice ? parseFloat(row.variantPrice) : price,
            comparePrice: row.variantComparePrice ? parseFloat(row.variantComparePrice) : (row.comparePrice ? parseFloat(row.comparePrice) : null),
            inventoryQty: row.variantInventoryQty ? parseInt(row.variantInventoryQty) : (row.inventoryQty ? parseInt(row.inventoryQty) : 0),
          }

          if (row.option1 && row.option1Value) {
            variantData.option1 = row.option1
            variantData.option1Value = row.option1Value
          }
          if (row.option2 && row.option2Value) {
            variantData.option2 = row.option2
            variantData.option2Value = row.option2Value
          }
          if (row.option3 && row.option3Value) {
            variantData.option3 = row.option3
            variantData.option3Value = row.option3Value
          }

          productData.variants = {
            create: [variantData]
          }
        }

        const product = await prisma.product.create({
          data: productData,
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
      products: products.map((p: any) => ({ id: p.id, name: p.name })),
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

