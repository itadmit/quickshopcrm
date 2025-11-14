import { prisma } from "@/lib/prisma"

export interface CollectionRule {
  field: "title" | "price" | "tag" | "sku" | "status" | "availability"
  condition: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "starts_with" | "ends_with"
  value: string
}

export interface CollectionRules {
  conditions: CollectionRule[]
  matchType: "all" | "any"
}

/**
 * מנוע סינון אוטומטי למוצרים לפי rules
 * דומה למה ששופיפיי עושה עם Smart Collections
 */
export async function applyCollectionRules(
  shopId: string,
  rules: CollectionRules
): Promise<string[]> {
  if (!rules.conditions || rules.conditions.length === 0) {
    return []
  }

  // סינון תנאים ריקים
  const activeConditions = rules.conditions.filter(c => c.value.trim())

  if (activeConditions.length === 0) {
    return []
  }

  // בניית where clause לפי matchType
  const whereConditions: any[] = []

  for (const rule of activeConditions) {
    const condition = buildWhereCondition(rule)
    if (condition) {
      whereConditions.push(condition)
    }
  }

  if (whereConditions.length === 0) {
    return []
  }

  // בניית where clause סופי
  const where: any = {
    shopId,
    status: "PUBLISHED", // רק מוצרים שפורסמו
  }

  if (rules.matchType === "all") {
    // כל התנאים חייבים להתקיים (AND)
    where.AND = whereConditions
  } else {
    // לפחות אחד מהתנאים חייב להתקיים (OR)
    where.OR = whereConditions
  }

  // ביצוע השאילתה
  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
    },
  })

  return products.map(p => p.id)
}

/**
 * בונה where condition עבור rule בודד
 */
function buildWhereCondition(rule: CollectionRule): any | null {
  const { field, condition, value } = rule

  if (!value.trim()) {
    return null
  }

  switch (field) {
    case "title":
      return buildStringCondition("name", condition, value)

    case "price":
      return buildPriceCondition(condition, value)

    case "tag":
      return buildTagCondition(condition, value)

    case "sku":
      // SKU יכול להיות null, אז צריך לטפל בזה
      if (condition === "equals" || condition === "contains" || condition === "starts_with" || condition === "ends_with") {
        return {
          AND: [
            { sku: { not: null } },
            buildStringCondition("sku", condition, value)
          ]
        }
      } else if (condition === "not_equals" || condition === "not_contains") {
        return {
          OR: [
            { sku: null },
            buildStringCondition("sku", condition, value)
          ]
        }
      }
      return buildStringCondition("sku", condition, value)

    case "status":
      return buildStringCondition("status", condition, value)

    case "availability":
      return buildStringCondition("availability", condition, value)

    default:
      return null
  }
}

/**
 * בונה condition עבור שדה טקסט
 */
function buildStringCondition(
  field: string,
  condition: CollectionRule["condition"],
  value: string
): any {
  const lowerValue = value.toLowerCase()

  switch (condition) {
    case "equals":
      return { [field]: { equals: value, mode: "insensitive" } }

    case "not_equals":
      return { [field]: { not: { equals: value, mode: "insensitive" } } }

    case "contains":
      return { [field]: { contains: value, mode: "insensitive" } }

    case "not_contains":
      return { [field]: { not: { contains: value, mode: "insensitive" } } }

    case "starts_with":
      return { [field]: { startsWith: value, mode: "insensitive" } }

    case "ends_with":
      return { [field]: { endsWith: value, mode: "insensitive" } }

    default:
      return null
  }
}

/**
 * בונה condition עבור שדה מספר (מחיר)
 */
function buildNumberCondition(
  field: string,
  condition: CollectionRule["condition"],
  value: string
): any {
  const numValue = parseFloat(value)

  if (isNaN(numValue)) {
    return null
  }

  switch (condition) {
    case "equals":
      return { [field]: numValue }

    case "not_equals":
      return { [field]: { not: numValue } }

    case "greater_than":
      return { [field]: { gt: numValue } }

    case "less_than":
      return { [field]: { lt: numValue } }

    default:
      return null
  }
}

/**
 * בונה condition עבור מחיר - מתחשב בוריאציות
 * אם למוצר יש וריאציות עם מחיר (לא null ולא 0), בודק את המחיר של הוריאציות
 * אחרת, בודק את המחיר של המוצר עצמו
 */
function buildPriceCondition(
  condition: CollectionRule["condition"],
  value: string
): any {
  const numValue = parseFloat(value)

  if (isNaN(numValue)) {
    return null
  }

  // בניית condition למחיר המוצר
  let productPriceCondition: any
  switch (condition) {
    case "equals":
      productPriceCondition = { price: numValue }
      break
    case "not_equals":
      productPriceCondition = { price: { not: numValue } }
      break
    case "greater_than":
      productPriceCondition = { price: { gt: numValue } }
      break
    case "less_than":
      productPriceCondition = { price: { lt: numValue } }
      break
    default:
      return null
  }

  // בניית condition למחיר וריאציות (רק וריאציות עם מחיר > 0)
  let variantPriceCondition: any
  switch (condition) {
    case "equals":
      variantPriceCondition = {
        variants: {
          some: {
            AND: [
              { price: { not: null } },
              { price: { not: 0 } },
              { price: numValue }
            ]
          }
        }
      }
      break
    case "not_equals":
      variantPriceCondition = {
        variants: {
          some: {
            AND: [
              { price: { not: null } },
              { price: { not: 0 } },
              { price: { not: numValue } }
            ]
          }
        }
      }
      break
    case "greater_than":
      variantPriceCondition = {
        variants: {
          some: {
            AND: [
              { price: { not: null } },
              { price: { not: 0 } },
              { price: { gt: numValue } }
            ]
          }
        }
      }
      break
    case "less_than":
      variantPriceCondition = {
        variants: {
          some: {
            AND: [
              { price: { not: null } },
              { price: { not: 0 } },
              { price: { lt: numValue } }
            ]
          }
        }
      }
      break
    default:
      return null
  }

  // OR: או שהמחיר של המוצר מתאים (כשאין וריאציות עם מחיר), או שיש וריאציה עם מחיר שמתאים
  return {
    OR: [
      // מקרה 1: אין וריאציות עם מחיר > 0, אז בודק את מחיר המוצר
      {
        AND: [
          productPriceCondition,
          {
            OR: [
              { variants: { none: {} } }, // אין וריאציות בכלל
              { variants: { none: { AND: [{ price: { not: null } }, { price: { not: 0 } }] } } } // אין וריאציות עם מחיר > 0
            ]
          }
        ]
      },
      // מקרה 2: יש וריאציות עם מחיר > 0, אז בודק את המחיר של הוריאציות
      {
        AND: [
          variantPriceCondition,
          { variants: { some: { AND: [{ price: { not: null } }, { price: { not: 0 } }] } } } // יש לפחות וריאציה אחת עם מחיר > 0
        ]
      }
    ]
  }
}

/**
 * בונה condition עבור תגים (tags)
 * תגים מאוחסנים בטבלה נפרדת ProductTag
 */
function buildTagCondition(
  condition: CollectionRule["condition"],
  value: string
): any {
  switch (condition) {
    case "equals":
      return {
        tags: {
          some: {
            name: { equals: value, mode: "insensitive" }
          }
        }
      }

    case "not_equals":
      return {
        tags: {
          none: {
            name: { equals: value, mode: "insensitive" }
          }
        }
      }

    case "contains":
      return {
        tags: {
          some: {
            name: { contains: value, mode: "insensitive" }
          }
        }
      }

    case "not_contains":
      return {
        tags: {
          none: {
            name: { contains: value, mode: "insensitive" }
          }
        }
      }

    case "starts_with":
      return {
        tags: {
          some: {
            name: { startsWith: value, mode: "insensitive" }
          }
        }
      }

    case "ends_with":
      return {
        tags: {
          some: {
            name: { endsWith: value, mode: "insensitive" }
          }
        }
      }

    default:
      return null
  }
}

/**
 * מעדכן את המוצרים בקולקציה אוטומטית לפי ה-rules
 */
export async function updateAutomaticCollection(
  collectionId: string,
  shopId: string,
  rules: CollectionRules
): Promise<{ added: number; removed: number }> {
  // קבלת רשימת מוצרים שמתאימים לתנאים
  const matchingProductIds = await applyCollectionRules(shopId, rules)

  // קבלת רשימת מוצרים נוכחית בקולקציה
  const currentProducts = await prisma.productCollection.findMany({
    where: { collectionId },
    select: { productId: true }
  })

  const currentProductIds = currentProducts.map(p => p.productId)

  // מציאת מוצרים להוספה והסרה
  const toAdd = matchingProductIds.filter(id => !currentProductIds.includes(id))
  const toRemove = currentProductIds.filter(id => !matchingProductIds.includes(id))

  // הסרת מוצרים שלא מתאימים יותר
  if (toRemove.length > 0) {
    await prisma.productCollection.deleteMany({
      where: {
        collectionId,
        productId: { in: toRemove }
      }
    })
  }

  // הוספת מוצרים חדשים
  if (toAdd.length > 0) {
    // קבלת position מקסימלי
    const maxPosition = await prisma.productCollection.findFirst({
      where: { collectionId },
      orderBy: { position: "desc" },
      select: { position: true }
    })

    let nextPosition = (maxPosition?.position ?? -1) + 1

    await Promise.all(
      toAdd.map((productId) =>
        prisma.productCollection.create({
          data: {
            collectionId,
            productId,
            position: nextPosition++
          }
        })
      )
    )
  }

  return {
    added: toAdd.length,
    removed: toRemove.length
  }
}

