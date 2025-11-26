import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { applyCollectionRules } from "@/lib/collection-engine"

// GET - קבלת כל הקטגוריות האוטומטיות שהמוצר נמצא בהן
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id }
        ],
        shop: {
          companyId: session.user.companyId,
        },
      },
      select: {
        id: true,
        shopId: true,
        name: true,
        price: true,
        status: true,
        availability: true,
        sku: true,
        tags: {
          select: {
            name: true,
          },
        },
        variants: {
          select: {
            id: true,
            price: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // קבלת כל הקטגוריות האוטומטיות בחנות
    const automaticCollections = await prisma.collection.findMany({
      where: {
        shopId: product.shopId,
        type: "AUTOMATIC",
        isPublished: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        rules: true,
      },
    })

    // בדיקה אילו קטגוריות מכילות את המוצר
    const matchingCollections = []

    for (const collection of automaticCollections) {
      if (!collection.rules) continue

      try {
        const rules = collection.rules as any
        
        // בניית where clause ספציפי למוצר הזה
        const whereConditions: any[] = []
        const activeConditions = rules.conditions?.filter((c: any) => c.value?.trim()) || []

        if (activeConditions.length === 0) continue

        // בניית תנאים לפי המוצר
        for (const rule of activeConditions) {
          let condition: any = null
          const ruleValue = rule.value?.toLowerCase() || ""
          const productName = product.name?.toLowerCase() || ""
          const productSku = product.sku?.toLowerCase() || ""
          const tagNames = product.tags?.map(t => t.name.toLowerCase()) || []
          
          switch (rule.field) {
            case "title":
              if (rule.condition === "contains" && productName.includes(ruleValue)) {
                condition = true
              } else if (rule.condition === "not_contains" && !productName.includes(ruleValue)) {
                condition = true
              } else if (rule.condition === "equals" && productName === ruleValue) {
                condition = true
              } else if (rule.condition === "not_equals" && productName !== ruleValue) {
                condition = true
              } else if (rule.condition === "starts_with" && productName.startsWith(ruleValue)) {
                condition = true
              } else if (rule.condition === "ends_with" && productName.endsWith(ruleValue)) {
                condition = true
              }
              break
              
            case "price":
              const priceValue = parseFloat(rule.value)
              if (!isNaN(priceValue)) {
                // בדיקה אם יש וריאציות עם מחיר > 0
                const variantsWithPrice = product.variants?.filter(
                  v => v.price !== null && v.price !== undefined && v.price > 0
                ) || []
                
                let productPriceMatches = false
                let variantPriceMatches = false
                
                // בדיקת מחיר המוצר (רק אם אין וריאציות עם מחיר)
                if (variantsWithPrice.length === 0) {
                  if (rule.condition === "greater_than" && product.price > priceValue) {
                    productPriceMatches = true
                  } else if (rule.condition === "less_than" && product.price < priceValue) {
                    productPriceMatches = true
                  } else if (rule.condition === "equals" && product.price === priceValue) {
                    productPriceMatches = true
                  } else if (rule.condition === "not_equals" && product.price !== priceValue) {
                    productPriceMatches = true
                  }
                }
                
                // בדיקת מחירי וריאציות (אם יש)
                if (variantsWithPrice.length > 0) {
                  if (rule.condition === "greater_than") {
                    variantPriceMatches = variantsWithPrice.some(v => v.price! > priceValue)
                  } else if (rule.condition === "less_than") {
                    variantPriceMatches = variantsWithPrice.some(v => v.price! < priceValue)
                  } else if (rule.condition === "equals") {
                    variantPriceMatches = variantsWithPrice.some(v => v.price === priceValue)
                  } else if (rule.condition === "not_equals") {
                    variantPriceMatches = variantsWithPrice.some(v => v.price !== priceValue)
                  }
                }
                
                // המוצר מתאים אם אחד מהמקרים מתקיים
                condition = productPriceMatches || variantPriceMatches
              }
              break
              
            case "status":
              if (rule.condition === "equals" && product.status === rule.value) {
                condition = true
              } else if (rule.condition === "not_equals" && product.status !== rule.value) {
                condition = true
              }
              break
              
            case "availability":
              if (rule.condition === "equals" && product.availability === rule.value) {
                condition = true
              } else if (rule.condition === "not_equals" && product.availability !== rule.value) {
                condition = true
              }
              break
              
            case "sku":
              if (product.sku) {
                if (rule.condition === "contains" && productSku.includes(ruleValue)) {
                  condition = true
                } else if (rule.condition === "not_contains" && !productSku.includes(ruleValue)) {
                  condition = true
                } else if (rule.condition === "equals" && productSku === ruleValue) {
                  condition = true
                } else if (rule.condition === "not_equals" && productSku !== ruleValue) {
                  condition = true
                } else if (rule.condition === "starts_with" && productSku.startsWith(ruleValue)) {
                  condition = true
                } else if (rule.condition === "ends_with" && productSku.endsWith(ruleValue)) {
                  condition = true
                }
              } else if (rule.condition === "not_equals" || rule.condition === "not_contains") {
                // אם אין מקט ויש תנאי not_equals או not_contains, זה מתקיים
                condition = true
              }
              break
              
            case "tag":
              if (rule.condition === "contains" && tagNames.some(t => t.includes(ruleValue))) {
                condition = true
              } else if (rule.condition === "not_contains" && !tagNames.some(t => t.includes(ruleValue))) {
                condition = true
              } else if (rule.condition === "equals" && tagNames.includes(ruleValue)) {
                condition = true
              } else if (rule.condition === "not_equals" && !tagNames.includes(ruleValue)) {
                condition = true
              } else if (rule.condition === "starts_with" && tagNames.some(t => t.startsWith(ruleValue))) {
                condition = true
              } else if (rule.condition === "ends_with" && tagNames.some(t => t.endsWith(ruleValue))) {
                condition = true
              }
              break
          }
          
          if (condition) {
            whereConditions.push(condition)
          }
        }

        // בדיקה אם המוצר מתאים לתנאים
        let matches = false
        if (rules.matchType === "all") {
          // כל התנאים חייבים להתקיים
          matches = whereConditions.length === activeConditions.length && whereConditions.length > 0
        } else {
          // לפחות אחד מהתנאים חייב להתקיים
          matches = whereConditions.length > 0
        }
        
        // גם צריך לבדוק שהמוצר פורסם (כמו ב-applyCollectionRules)
        // אבל נציג גם מוצרים שלא פורסמו כדי שהמשתמש יראה את החיווי
        if (matches) {
          matchingCollections.push({
            id: collection.id,
            name: collection.name,
            slug: collection.slug,
            isPublished: product.status === "PUBLISHED", // נציין אם המוצר פורסם
          })
        }
      } catch (error) {
        console.error(`Error checking collection ${collection.id}:`, error)
        // ממשיכים לקטגוריה הבאה
      }
    }

    return NextResponse.json({
      automaticCollections: matchingCollections,
    })
  } catch (error) {
    console.error("Error fetching automatic collections:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

