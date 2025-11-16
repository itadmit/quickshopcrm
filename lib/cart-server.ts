import { prisma } from "@/lib/prisma"

/**
 * פונקציה מרכזית למציאת עגלה - בדיוק כמו בשופיפיי
 * תמיד מחזירה עגלה אחת בלבד עם הלוגיקה הנכונה
 * 
 * סדר עדיפויות:
 * 1. אם יש customerId - מחפש customer cart
 * 2. אם יש sessionId - מחפש session cart
 * 3. אחרת - מחזיר null (לא מחזיר עגלה של משתמש אחר!)
 */
export async function findCart(
  shopId: string,
  sessionId: string | null | undefined,
  customerId: string | null | undefined
) {
  let cart = null

  console.log(`[findCart] Looking for cart: shopId=${shopId}, customerId=${customerId || 'none'}, sessionId=${sessionId || 'none'}`)

  // אם יש customerId - זו העדיפות הראשונה
  if (customerId) {
    cart = await prisma.cart.findFirst({
      where: { 
        shopId, 
        customerId, 
        expiresAt: { gt: new Date() } 
      },
    })
    
    console.log(`[findCart] Customer cart found:`, cart ? { id: cart.id, itemsCount: (cart.items as any[]).length } : 'NOT FOUND')
    
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
          
          // מיזוג פריטים - גם לוקח בחשבון addons
          const mergedItems = [...customerItems]
          for (const sessionItem of sessionItems) {
            // חיפוש פריט קיים - גם עם addons
            const existingIndex = mergedItems.findIndex((item) => {
              const sameProduct = item.productId === sessionItem.productId &&
                (item.variantId === sessionItem.variantId || (!item.variantId && !sessionItem.variantId))
              
              // אם אין addons בשני המקרים - זה אותו פריט
              if (!item.addons && !sessionItem.addons) return sameProduct
              
              // אם יש addons רק באחד - זה לא אותו פריט
              if (!item.addons || !sessionItem.addons) return false
              
              // השווה addons - אם הם זהים, זה אותו פריט
              const itemAddonsStr = JSON.stringify(item.addons.sort((a: any, b: any) => 
                `${a.addonId}-${a.valueId || ''}`.localeCompare(`${b.addonId}-${b.valueId || ''}`)
              ))
              const sessionAddonsStr = JSON.stringify(sessionItem.addons.sort((a: any, b: any) => 
                `${a.addonId}-${a.valueId || ''}`.localeCompare(`${b.addonId}-${b.valueId || ''}`)
              ))
              
              return sameProduct && itemAddonsStr === sessionAddonsStr
            })
            
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
    
    console.log(`[findCart] Session cart found:`, cart ? { id: cart.id, itemsCount: (cart.items as any[]).length } : 'NOT FOUND')
    
    if (cart) {
      return cart
    }
  }
  
  // אין customerId ואין sessionId - מחזירים null
  // לא מחזירים עגלה של משתמש אחר (זה היה גורם לבעיה בגלישה בסתר)
  console.log(`[findCart] No cart found - returning null`)
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

