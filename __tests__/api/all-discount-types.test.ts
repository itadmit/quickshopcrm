import { GET as getCartHandler, POST as addToCartHandler, PUT as updateCartHandler } from '@/app/api/storefront/[slug]/cart/route'
import { NextRequest } from 'next/server'
import { createTestUser, createTestShop, createTestProduct, cleanupTestData } from '../setup/test-utils'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

describe('כל סוגי הקופונים וההנחות', () => {
  let testUser: any
  let testCompany: any
  let testShop: any
  let testProduct1: any
  let testProduct2: any
  let testProduct3: any
  let sessionId: string
  let mockCookies: any

  beforeEach(async () => {
    await cleanupTestData()
    const result = await createTestUser()
    testUser = result.user
    testCompany = result.company
    testShop = await createTestShop(testCompany.id, { name: 'Test Shop', slug: 'test-shop' })
    
    // כיבוי מע"מ כברירת מחדל
    await prisma.shop.update({
      where: { id: testShop.id },
      data: {
        taxEnabled: false,
        taxRate: 0,
      },
    })
    
    // יצירת מוצרים
    testProduct1 = await createTestProduct(testShop.id, { name: 'Product 1', price: 100 })
    testProduct2 = await createTestProduct(testShop.id, { name: 'Product 2', price: 200 })
    testProduct3 = await createTestProduct(testShop.id, { name: 'Product 3', price: 150 })
    
    // יצירת session ID
    sessionId = `cart_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    // הגדרת mock cookies
    mockCookies = {
      get: jest.fn((name: string) => {
        if (name === 'cart_session') {
          return { value: sessionId }
        }
        return undefined
      }),
      set: jest.fn(),
    }
    ;(cookies as jest.Mock).mockResolvedValue(mockCookies)
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  describe('1. קופון PERCENTAGE - אחוז הנחה', () => {
    it('אמור לחשב הנחה באחוזים נכון', async () => {
      // יצירת קופון 25%
      const coupon = await prisma.coupon.create({
        data: {
          shopId: testShop.id,
          code: 'PERCENT25',
          type: 'PERCENTAGE',
          value: 25,
          isActive: true,
        },
      })

      // הוספת מוצרים לעגלה
      await addToCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'POST',
          body: JSON.stringify({
            productId: testProduct1.id,
            quantity: 2,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      await addToCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'POST',
          body: JSON.stringify({
            productId: testProduct2.id,
            quantity: 1,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // יישום קופון
      await updateCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'PUT',
          body: JSON.stringify({
            couponCode: 'PERCENT25',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // קבלת עגלה
      const req = new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`)
      const response = await getCartHandler(req, { params: { slug: testShop.slug } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subtotal).toBe(400) // 2 * 100 + 1 * 200
      expect(data.couponDiscount).toBe(100) // 25% מ-400
      expect(data.total).toBe(300) // 400 - 100
    })
  })

  describe('2. קופון FIXED - סכום קבוע', () => {
    it('אמור לחשב הנחה קבועה נכון', async () => {
      // יצירת קופון 75 ש"ח
      const coupon = await prisma.coupon.create({
        data: {
          shopId: testShop.id,
          code: 'FIXED75',
          type: 'FIXED',
          value: 75,
          isActive: true,
        },
      })

      // הוספת מוצרים לעגלה
      await addToCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'POST',
          body: JSON.stringify({
            productId: testProduct1.id,
            quantity: 3,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // יישום קופון
      await updateCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'PUT',
          body: JSON.stringify({
            couponCode: 'FIXED75',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // קבלת עגלה
      const req = new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`)
      const response = await getCartHandler(req, { params: { slug: testShop.slug } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subtotal).toBe(300) // 3 * 100
      expect(data.couponDiscount).toBe(75)
      expect(data.total).toBe(225) // 300 - 75
    })
  })

  describe('3. קופון BUY_X_GET_Y - קנה X קבל Y', () => {
    it('אמור לחשב הנחת קנה 2 קבל 1 בחינם', async () => {
      // יצירת קופון: קנה 2 קבל 1 בחינם
      const coupon = await prisma.coupon.create({
        data: {
          shopId: testShop.id,
          code: 'BUY2GET1',
          type: 'BUY_X_GET_Y',
          value: 2, // buyQuantity
          buyQuantity: 2,
          getQuantity: 1,
          getDiscount: 100, // 100% הנחה על ה-Y
          isActive: true,
        },
      })

      // הוספת 3 מוצרים זהים לעגלה
      await addToCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'POST',
          body: JSON.stringify({
            productId: testProduct1.id,
            quantity: 3,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // יישום קופון
      await updateCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'PUT',
          body: JSON.stringify({
            couponCode: 'BUY2GET1',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // קבלת עגלה
      const req = new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`)
      const response = await getCartHandler(req, { params: { slug: testShop.slug } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subtotal).toBe(300) // 3 * 100
      // חישוב: קנה 2 קבל 1 בחינם, יש 3 מוצרים = 1 מוצר בחינם (100% הנחה)
      // applicableTimes = Math.floor(3 / 2) = 1
      // freeItems = Math.min(1 * 1, 3) = 1
      // הנחה = 100% מ-100 = 100
      expect(data.couponDiscount).toBe(100) // הנחה על מוצר אחד בחינם
      expect(data.total).toBe(200) // 300 - 100
    })
  })

  describe('4. קופון NTH_ITEM_DISCOUNT - הנחה על מוצר N', () => {
    it('אמור ליצור קופון הנחה על המוצר השלישי', async () => {
      // יצירת קופון: 20% הנחה על המוצר השלישי
      const coupon = await prisma.coupon.create({
        data: {
          shopId: testShop.id,
          code: 'NTH20',
          type: 'NTH_ITEM_DISCOUNT',
          value: 20, // אחוז הנחה
          nthItem: 3, // המוצר השלישי
          isActive: true,
        },
      })

      // הוספת 3 מוצרים זהים לעגלה
      await addToCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'POST',
          body: JSON.stringify({
            productId: testProduct1.id,
            quantity: 3,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // יישום קופון
      await updateCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'PUT',
          body: JSON.stringify({
            couponCode: 'NTH20',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // קבלת עגלה
      const req = new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`)
      const response = await getCartHandler(req, { params: { slug: testShop.slug } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subtotal).toBe(300) // 3 * 100
      // חישוב: 20% הנחה על המוצר השלישי
      // itemCounter = 3, 3 % 3 === 0, אז הנחה על המוצר השלישי
      // הנחה = 20% מ-100 = 20
      expect(data.couponDiscount).toBe(20) // 20% הנחה על המוצר השלישי
      expect(data.total).toBe(280) // 300 - 20
    })
  })

  describe('5. קופון VOLUME_DISCOUNT - הנחת כמות', () => {
    it('אמור ליצור קופון הנחת כמות', async () => {
      // יצירת קופון עם volumeRules
      const coupon = await prisma.coupon.create({
        data: {
          shopId: testShop.id,
          code: 'VOLUME10',
          type: 'VOLUME_DISCOUNT',
          value: 10, // אחוז הנחה בסיסי
          volumeRules: [
            { quantity: 3, discount: 10 },
            { quantity: 5, discount: 15 },
            { quantity: 10, discount: 20 },
          ],
          isActive: true,
        },
      })

      // הוספת 5 מוצרים זהים לעגלה
      await addToCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'POST',
          body: JSON.stringify({
            productId: testProduct1.id,
            quantity: 5,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // יישום קופון
      await updateCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'PUT',
          body: JSON.stringify({
            couponCode: 'VOLUME10',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // קבלת עגלה
      const req = new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`)
      const response = await getCartHandler(req, { params: { slug: testShop.slug } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subtotal).toBe(500) // 5 * 100
      // חישוב: volumeRules = [{quantity: 3, discount: 10}, {quantity: 5, discount: 15}, {quantity: 10, discount: 20}]
      // יש 5 מוצרים, אז ההנחה היא 15% (הכלל הגבוה ביותר שהלקוח זכאי לו)
      // הנחה = 15% מ-500 = 75
      expect(data.couponDiscount).toBe(75) // 15% מ-500
      expect(data.total).toBe(425) // 500 - 75
    })
  })

  describe('6. הנחה אוטומטית (Discount) - PERCENTAGE', () => {
    it('אמור ליצור הנחה אוטומטית באחוזים', async () => {
      // יצירת הנחה אוטומטית 15%
      const discount = await prisma.discount.create({
        data: {
          shopId: testShop.id,
          title: 'הנחה 15% על כל המוצרים',
          type: 'PERCENTAGE',
          value: 15,
          target: 'ALL_PRODUCTS',
          customerTarget: 'ALL_CUSTOMERS',
          isActive: true,
          isAutomatic: true,
        },
      })

      // הוספת מוצרים לעגלה
      await addToCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'POST',
          body: JSON.stringify({
            productId: testProduct1.id,
            quantity: 2,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // קבלת עגלה (הנחה אוטומטית אמורה להיות מוחלת)
      const req = new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`)
      const response = await getCartHandler(req, { params: { slug: testShop.slug } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subtotal).toBe(200) // 2 * 100
      // הנחה אוטומטית 15% אמורה להיות מוחלת
      // הנחה = 15% מ-200 = 30
      expect(data.automaticDiscount).toBe(30) // 15% מ-200
      expect(data.total).toBe(170) // 200 - 30
    })
  })

  describe('7. הנחה אוטומטית (Discount) - FIXED', () => {
    it('אמור ליצור הנחה אוטומטית בסכום קבוע', async () => {
      // יצירת הנחה אוטומטית 30 ש"ח
      const discount = await prisma.discount.create({
        data: {
          shopId: testShop.id,
          title: 'הנחה 30 ש"ח על כל המוצרים',
          type: 'FIXED',
          value: 30,
          target: 'ALL_PRODUCTS',
          customerTarget: 'ALL_CUSTOMERS',
          isActive: true,
          isAutomatic: true,
        },
      })

      // הוספת מוצר לעגלה
      await addToCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'POST',
          body: JSON.stringify({
            productId: testProduct1.id,
            quantity: 2,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // קבלת עגלה (הנחה אוטומטית אמורה להיות מוחלת)
      const req = new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`)
      const response = await getCartHandler(req, { params: { slug: testShop.slug } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subtotal).toBe(200) // 2 * 100
      // הנחה אוטומטית 30 ש"ח אמורה להיות מוחלת
      expect(data.automaticDiscount).toBe(30) // 30 ש"ח הנחה
      expect(data.total).toBe(170) // 200 - 30
    })
  })

  describe('8. הנחה אוטומטית (Discount) - BUY_X_GET_Y', () => {
    it('אמור ליצור הנחה אוטומטית קנה 3 קבל 1 בחינם', async () => {
      // יצירת הנחה אוטומטית: קנה 3 קבל 1 בחינם
      const discount = await prisma.discount.create({
        data: {
          shopId: testShop.id,
          title: 'קנה 3 קבל 1 בחינם',
          type: 'BUY_X_GET_Y',
          value: 3, // buyQuantity
          buyQuantity: 3,
          getQuantity: 1,
          getDiscount: 100, // 100% הנחה על ה-Y
          target: 'ALL_PRODUCTS',
          customerTarget: 'ALL_CUSTOMERS',
          isActive: true,
          isAutomatic: true,
        },
      })

      expect(discount).toBeTruthy()
      expect(discount.isAutomatic).toBe(true)
      expect(discount.type).toBe('BUY_X_GET_Y')
      expect(discount.buyQuantity).toBe(3)
      expect(discount.getQuantity).toBe(1)
    })
  })

  describe('9. הנחה אוטומטית (Discount) - NTH_ITEM_DISCOUNT', () => {
    it('אמור ליצור הנחה אוטומטית על המוצר הרביעי', async () => {
      // יצירת הנחה אוטומטית: 25% הנחה על המוצר הרביעי
      const discount = await prisma.discount.create({
        data: {
          shopId: testShop.id,
          title: '25% הנחה על המוצר הרביעי',
          type: 'NTH_ITEM_DISCOUNT',
          value: 25, // אחוז הנחה
          nthItem: 4, // המוצר הרביעי
          target: 'ALL_PRODUCTS',
          customerTarget: 'ALL_CUSTOMERS',
          isActive: true,
          isAutomatic: true,
        },
      })

      expect(discount).toBeTruthy()
      expect(discount.isAutomatic).toBe(true)
      expect(discount.type).toBe('NTH_ITEM_DISCOUNT')
      expect(discount.nthItem).toBe(4)
    })
  })

  describe('10. הנחה אוטומטית (Discount) - VOLUME_DISCOUNT', () => {
    it('אמור ליצור הנחה אוטומטית לפי כמות', async () => {
      // יצירת הנחה אוטומטית עם volumeRules
      const discount = await prisma.discount.create({
        data: {
          shopId: testShop.id,
          title: 'הנחת כמות',
          type: 'VOLUME_DISCOUNT',
          value: 10, // אחוז הנחה בסיסי
          volumeRules: [
            { quantity: 3, discount: 10 },
            { quantity: 5, discount: 15 },
            { quantity: 10, discount: 25 },
          ],
          target: 'ALL_PRODUCTS',
          customerTarget: 'ALL_CUSTOMERS',
          isActive: true,
          isAutomatic: true,
        },
      })

      expect(discount).toBeTruthy()
      expect(discount.isAutomatic).toBe(true)
      expect(discount.type).toBe('VOLUME_DISCOUNT')
      expect(discount.volumeRules).toBeTruthy()
    })
  })

  describe('11. שילוב קופון עם minOrder', () => {
    it('אמור לדחות קופון אם הסכום לא מספיק', async () => {
      // יצירת קופון עם מינימום הזמנה של 500 ש"ח
      const coupon = await prisma.coupon.create({
        data: {
          shopId: testShop.id,
          code: 'MIN500',
          type: 'PERCENTAGE',
          value: 20,
          minOrder: 500,
          isActive: true,
        },
      })

      // הוספת מוצר זול לעגלה (רק 100 ש"ח)
      await addToCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'POST',
          body: JSON.stringify({
            productId: testProduct1.id,
            quantity: 1,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // ניסיון ליישם קופון
      const req = new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
        method: 'PUT',
        body: JSON.stringify({
          couponCode: 'MIN500',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await updateCartHandler(req, { params: { slug: testShop.slug } })
      const data = await response.json()

      // הקופון צריך להידחות כי הסכום (100) קטן מ-minOrder (500)
      expect(response.status).toBe(400)
      expect(data.error).toContain('Minimum order amount')
    })
  })

  describe('12. שילוב קופון עם maxUses', () => {
    it('אמור ליצור קופון עם הגבלת שימושים', async () => {
      // יצירת קופון עם מקסימום 5 שימושים
      const coupon = await prisma.coupon.create({
        data: {
          shopId: testShop.id,
          code: 'MAX5',
          type: 'PERCENTAGE',
          value: 10,
          maxUses: 5,
          usedCount: 0,
          isActive: true,
        },
      })

      // הוספת מוצר לעגלה
      await addToCartHandler(
        new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
          method: 'POST',
          body: JSON.stringify({
            productId: testProduct1.id,
            quantity: 1,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        { params: { slug: testShop.slug } }
      )

      // הקופון צריך להתקבל כי usedCount (0) קטן מ-maxUses (5)
      const req = new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
        method: 'PUT',
        body: JSON.stringify({
          couponCode: 'MAX5',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await updateCartHandler(req, { params: { slug: testShop.slug } })
      expect(response.status).toBe(200)

      // עכשיו נבדוק קופון שכבר הגיע למקסימום שימושים
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: 5 },
      })

      const req2 = new NextRequest(`http://localhost/api/storefront/${testShop.slug}/cart`, {
        method: 'PUT',
        body: JSON.stringify({
          couponCode: 'MAX5',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response2 = await updateCartHandler(req2, { params: { slug: testShop.slug } })
      const data2 = await response2.json()

      expect(response2.status).toBe(400)
      expect(data2.error).toContain('usage limit reached')
    })
  })
})

