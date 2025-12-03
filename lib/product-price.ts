/**
 * פונקציות עזר לחישוב מחירי מוצרים עם התחשבות בוריאציות
 */

export interface ProductVariant {
  id: string
  name: string
  price: number | null
  comparePrice: number | null
  [key: string]: any // Allow additional properties
}

export interface Product {
  id: string
  name: string
  price: number
  comparePrice: number | null
  variants?: ProductVariant[]
}

/**
 * מחשב את המחיר הנכון של מוצר - מתחשב בוריאציות
 * אם יש וריאציות, תמיד נשתמש במחירי הוריאציות (גם אם המחיר של המוצר הוא 0)
 * אחרת, נשתמש במחיר של המוצר עצמו
 */
export function getProductPrice(product: Product): {
  price: number
  comparePrice: number | null
  hasVariants: boolean
  minPrice?: number
  maxPrice?: number
} {
  // בדיקה אם יש וריאציות בכלל
  const hasVariants = product.variants && product.variants.length > 0

  if (hasVariants) {
    // יש וריאציות - נשתמש במחירי הוריאציות (גם אם המחיר של המוצר הוא 0)
    const variantsWithPrice = (product.variants || []).filter(
      (v: any) => v.price !== null && v.price !== undefined && v.price >= 0
    )

    if (variantsWithPrice.length > 0) {
      // יש וריאציות עם מחיר - נשתמש במחירי הוריאציות
      const prices = variantsWithPrice.map(v => v.price!).filter(p => p >= 0)
      const comparePrices = variantsWithPrice
        .map(v => v.comparePrice)
        .filter((p): p is number => p !== null && p !== undefined && p >= 0)

      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const minComparePrice = comparePrices.length > 0 ? Math.min(...comparePrices) : null
      const maxComparePrice = comparePrices.length > 0 ? Math.max(...comparePrices) : null

      return {
        price: minPrice === maxPrice ? minPrice : minPrice, // אם יש טווח, נחזיר את המינימום
        comparePrice: minComparePrice && maxComparePrice && minComparePrice === maxComparePrice 
          ? minComparePrice 
          : minComparePrice,
        hasVariants: true,
        minPrice,
        maxPrice: minPrice !== maxPrice ? maxPrice : undefined,
      }
    }
  }

  // אין וריאציות או אין וריאציות עם מחיר - נשתמש במחיר המוצר
  return {
    price: product.price,
    comparePrice: product.comparePrice,
    hasVariants: false,
  }
}

/**
 * מחזיר את המחיר בפורמט תצוגה (עם טווח אם יש)
 */
export function formatProductPrice(product: Product): string {
  const priceInfo = getProductPrice(product)
  
  if (priceInfo.hasVariants && priceInfo.minPrice !== undefined && priceInfo.maxPrice !== undefined) {
    if (priceInfo.minPrice === priceInfo.maxPrice) {
      return `₪${priceInfo.minPrice.toFixed(2)}`
    }
    // אם יש טווח מחירים, נציג "החל מ-"
    return `החל מ-₪${priceInfo.minPrice.toFixed(2)}`
  }
  
  // אם המחיר 0 או שלילי (לא תקין), נחזיר טקסט ברור
  if (priceInfo.price <= 0) {
    return 'בחר אפשרויות'
  }
  
  return `₪${priceInfo.price.toFixed(2)}`
}

/**
 * מחזיר את המחיר להשוואה (comparePrice) בפורמט תצוגה
 */
export function formatComparePrice(product: Product): string | null {
  const priceInfo = getProductPrice(product)
  
  if (!priceInfo.comparePrice) {
    return null
  }
  
  return `₪${priceInfo.comparePrice.toFixed(2)}`
}

