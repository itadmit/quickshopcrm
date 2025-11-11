import { prisma } from "@/lib/prisma"

/**
 * פונקציה מרכזית למציאת עגלה - בדיוק כמו בשופיפיי
 * תמיד מחזירה עגלה אחת בלבד עם הלוגיקה הנכונה
 * 
 * סדר עדיפויות:
 * 1. אם יש customerId - מחפש customer cart
 * 2. אם יש sessionId - מחפש session cart
 * 3. אחרת - מחפש כל עגלה פעילה של החנות (fallback)
 */
export async function findCart(
  shopId: string,
  sessionId: string | null | undefined,
  customerId: string | null | undefined
) {
  let cart = null

  // אם יש customerId - זו העדיפות הראשונה
  if (customerId) {
    cart = await prisma.cart.findFirst({
      where: { 
        shopId, 
        customerId, 
        expiresAt: { gt: new Date() } 
      },
    })
    
    // אם יש גם session cart - נמזג אותו
    if (sessionId) {
      const sessionCart = await prisma.cart.findFirst({
        where: { 
          shopId, 
          sessionId, 
          expiresAt: { gt: new Date() } 
        },
      })
      
      if (sessionCart) {
        if (!cart) {
          // אין customer cart - נהפוך session cart ל-customer cart
          cart = await prisma.cart.update({
            where: { id: sessionCart.id },
            data: { customerId, sessionId: null },
          })
        } else {
          // יש customer cart - נמזג פריטים מ-session cart ונמחק אותו
          const customerItems = (cart.items as any[]) || []
          const sessionItems = (sessionCart.items as any[]) || []
          
          // מיזוג פריטים
          const mergedItems = [...customerItems]
          for (const sessionItem of sessionItems) {
            const existingIndex = mergedItems.findIndex(
              item => item.productId === sessionItem.productId && 
                     item.variantId === sessionItem.variantId
            )
            if (existingIndex >= 0) {
              mergedItems[existingIndex].quantity += sessionItem.quantity
            } else {
              mergedItems.push(sessionItem)
            }
          }
          
          // עדכון customer cart עם הפריטים הממוזגים
          cart = await prisma.cart.update({
            where: { id: cart.id },
            data: { items: mergedItems },
          })
          
          // מחיקת session cart
          await prisma.cart.delete({ where: { id: sessionCart.id } })
        }
      }
    }
    
    return cart
  }
  
  // אין customer - מחפשים לפי session
  if (sessionId) {
    cart = await prisma.cart.findFirst({
      where: { 
        shopId, 
        sessionId, 
        expiresAt: { gt: new Date() } 
      },
    })
    
    if (cart) {
      return cart
    }
  }
  
  // Fallback - מחפשים כל עגלה פעילה של החנות (למקרה שיש בעיה עם cookies)
  const allCarts = await prisma.cart.findMany({
    where: {
      shopId,
      expiresAt: {
        gt: new Date(),
      },
      items: {
        not: {
          equals: [],
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 1,
  })
  
  if (allCarts.length > 0) {
    return allCarts[0]
  }
  
  return null
}

/**
 * בדיקה אם העגלה ריקה
 * מחזיר true אם העגלה null או ריקה
 */
export function isCartEmpty(cart: any): cart is null | undefined {
  return !cart || !cart.items || (cart.items as any[]).length === 0
}

/**
 * Type guard - בודק אם יש עגלה תקינה
 */
export function hasValidCart(cart: any): cart is NonNullable<any> {
  return cart && cart.items && (cart.items as any[]).length > 0
}

