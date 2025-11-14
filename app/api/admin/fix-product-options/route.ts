import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * תיקון מוצרים קיימים - יצירת options מתוך variants
 * 
 * API זה עובר על כל המוצרים שיש להם variants עם option1/option2/option3
 * ויוצר עבורם ProductOption מתאים
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const allowedRoles = ['ADMIN', 'MANAGER', 'SUPER_ADMIN']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized - Admin or Manager only" }, { status: 401 })
    }

    const companyId = session.user.companyId

    console.log('🔧 Starting to fix product options for company:', companyId)

    // מצא את כל החנויות של החברה
    const shops = await prisma.shop.findMany({
      where: { companyId },
      select: { id: true, name: true }
    })

    let totalFixed = 0
    let totalSkipped = 0
    const errors: string[] = []

    for (const shop of shops) {
      console.log(`\n📦 Processing shop: ${shop.name}`)

      // מצא מוצרים עם variants אבל בלי options
      const products = await prisma.product.findMany({
        where: {
          shopId: shop.id,
        },
        include: {
          variants: true,
          options: true,
        },
      })

      for (const product of products) {
        try {
          // דלג על מוצרים שאין להם variants
          if (!product.variants || product.variants.length === 0) {
            continue
          }

          // דלג על מוצרים שכבר יש להם options
          if (product.options && product.options.length > 0) {
            totalSkipped++
            continue
          }

          // בדוק אם יש variants עם option fields
          const hasOptionFields = product.variants.some(
            v => v.option1 || v.option2 || v.option3
          )

          if (!hasOptionFields) {
            totalSkipped++
            continue
          }

          console.log(`  ⚙️  Fixing product: ${product.name}`)

          // איסוף כל סוגי האופציות
          const optionTypesMap = new Map<string, Set<string>>()

          for (const variant of product.variants) {
            // Option 1
            if (variant.option1 && variant.option1Value) {
              if (!optionTypesMap.has(variant.option1)) {
                optionTypesMap.set(variant.option1, new Set())
              }
              optionTypesMap.get(variant.option1)!.add(variant.option1Value)
            }

            // Option 2
            if (variant.option2 && variant.option2Value) {
              if (!optionTypesMap.has(variant.option2)) {
                optionTypesMap.set(variant.option2, new Set())
              }
              optionTypesMap.get(variant.option2)!.add(variant.option2Value)
            }

            // Option 3
            if (variant.option3 && variant.option3Value) {
              if (!optionTypesMap.has(variant.option3)) {
                optionTypesMap.set(variant.option3, new Set())
              }
              optionTypesMap.get(variant.option3)!.add(variant.option3Value)
            }
          }

          // יצירת options
          let position = 0
          const optionsArray = Array.from(optionTypesMap.entries())
          for (const [optionName, valuesSet] of optionsArray) {
            const values = Array.from(valuesSet).map(value => ({
              id: value,
              label: value,
            }))

            await prisma.productOption.create({
              data: {
                productId: product.id,
                name: optionName,
                type: 'button', // ברירת מחדל
                values: values,
                position: position++,
              },
            })

            console.log(`    ✅ Created option: ${optionName} with ${values.length} values`)
          }

          totalFixed++

        } catch (error: any) {
          const errorMsg = `Product ${product.name} (${product.id}): ${error.message}`
          console.error(`  ❌ ${errorMsg}`)
          errors.push(errorMsg)
        }
      }
    }

    console.log(`\n✨ Fix completed!`)
    console.log(`  Fixed: ${totalFixed} products`)
    console.log(`  Skipped: ${totalSkipped} products`)
    console.log(`  Errors: ${errors.length}`)

    return NextResponse.json({
      success: true,
      fixed: totalFixed,
      skipped: totalSkipped,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error: any) {
    console.error("Error fixing product options:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message 
      },
      { status: 500 }
    )
  }
}


