import { GET as getProductsHandler, POST as createProductHandler } from '@/app/api/products/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createTestUser, createTestShop, createTestProduct, cleanupTestData } from '../setup/test-utils'
import { prisma } from '@/lib/prisma'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/subscription-middleware', () => ({
  checkSubscriptionAccess: jest.fn(() => Promise.resolve(null)),
}))

describe('Products API', () => {
  let testUser: any
  let testCompany: any
  let testShop: any
  let mockSession: any

  beforeEach(async () => {
    await cleanupTestData()
    const result = await createTestUser()
    testUser = result.user
    testCompany = result.company
    testShop = await createTestShop(testCompany.id)

    mockSession = {
      user: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
        companyId: testUser.companyId,
      },
    }

    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  describe('GET /api/products', () => {
    it('אמור להחזיר רשימת מוצרים', async () => {
      // יצירת מוצרים
      await createTestProduct(testShop.id, { name: 'Product 1', price: 100 })
      await createTestProduct(testShop.id, { name: 'Product 2', price: 200 })

      const req = new NextRequest(`http://localhost/api/products?shopId=${testShop.id}`)

      const response = await getProductsHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.products).toHaveLength(2)
      expect(data.pagination.total).toBe(2)
    })

    it('אמור לסנן מוצרים לפי סטטוס', async () => {
      await createTestProduct(testShop.id, { name: 'Published Product', price: 100 })
      
      // יצירת מוצר בטיוטה
      await createTestProduct(testShop.id, { name: 'Draft Product', price: 200 })
      await prisma.product.updateMany({
        where: { name: 'Draft Product' },
        data: { status: 'DRAFT' },
      })

      const req = new NextRequest(`http://localhost/api/products?shopId=${testShop.id}&status=PUBLISHED`)

      const response = await getProductsHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.products.every((p: any) => p.status === 'PUBLISHED')).toBe(true)
    })

    it('אמור לחפש מוצרים לפי שם', async () => {
      await createTestProduct(testShop.id, { name: 'Test Product', price: 100 })
      await createTestProduct(testShop.id, { name: 'Another Product', price: 200 })

      const req = new NextRequest(`http://localhost/api/products?shopId=${testShop.id}&search=Test`)

      const response = await getProductsHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.products).toHaveLength(1)
      expect(data.products[0].name).toBe('Test Product')
    })

    it('אמור לדחות גישה ללא אימות', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const req = new NextRequest(`http://localhost/api/products?shopId=${testShop.id}`)

      const response = await getProductsHandler(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/products', () => {
    it('אמור ליצור מוצר חדש', async () => {
      const requestBody = {
        shopId: testShop.id,
        name: 'New Product',
        price: 150,
        inventoryQty: 20,
        status: 'PUBLISHED',
      }

      const req = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createProductHandler(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Product')
      expect(data.price).toBe(150)
      expect(data.inventoryQty).toBe(20)

      // בדיקה שהמוצר נוצר ב-DB
      const product = await prisma.product.findUnique({
        where: { id: data.id },
      })

      expect(product).toBeTruthy()
      expect(product?.name).toBe('New Product')

      // בדיקה שאירוע נוצר
      const event = await prisma.shopEvent.findFirst({
        where: {
          shopId: testShop.id,
          type: 'product.created',
          entityId: data.id,
        },
      })

      expect(event).toBeTruthy()
    })

    it('אמור לדחות יצירת מוצר עם נתונים לא תקינים', async () => {
      const testCases = [
        {
          body: { shopId: testShop.id, name: 'P', price: 100 },
          expectedError: 'לפחות 2 תווים',
        },
        {
          body: { shopId: testShop.id, name: 'Product', price: -10 },
          expectedError: 'חיובי',
        },
        {
          body: { shopId: testShop.id, name: 'Product' },
          expectedError: 'price',
        },
      ]

      for (const testCase of testCases) {
        const req = new NextRequest('http://localhost/api/products', {
          method: 'POST',
          body: JSON.stringify(testCase.body),
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const response = await createProductHandler(req)
        const data = await response.json()

        expect(response.status).toBe(400)
      }
    })

    it('אמור לדחות יצירת מוצר בחנות שלא שייכת לחברה', async () => {
      // יצירת חברה אחרת וחנות
      const otherCompany = await prisma.company.create({
        data: { name: 'Other Company' },
      })
      const otherShop = await createTestShop(otherCompany.id)

      const requestBody = {
        shopId: otherShop.id,
        name: 'Product',
        price: 100,
      }

      const req = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createProductHandler(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Shop not found')
    })

    it('אמור ליצור slug אוטומטית אם לא סופק', async () => {
      const requestBody = {
        shopId: testShop.id,
        name: 'Test Product Name',
        price: 100,
      }

      const req = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createProductHandler(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.slug).toBeTruthy()
      expect(data.slug).toContain('test-product-name')
    })
  })
})

