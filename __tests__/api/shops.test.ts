import { GET as getShopsHandler, POST as createShopHandler } from '@/app/api/shops/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { createTestUser, createTestShop, cleanupTestData } from '../setup/test-utils'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

describe('Shops API', () => {
  let testUser: any
  let testCompany: any
  let mockSession: any

  beforeEach(async () => {
    await cleanupTestData()
    const result = await createTestUser()
    testUser = result.user
    testCompany = result.company

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

  describe('GET /api/shops', () => {
    it('אמור להחזיר רשימת חנויות', async () => {
      await createTestShop(testCompany.id, { name: 'Shop 1', slug: 'shop-1' })
      await createTestShop(testCompany.id, { name: 'Shop 2', slug: 'shop-2' })

      const req = new NextRequest('http://localhost/api/shops')

      const response = await getShopsHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThanOrEqual(2)
    })

    it('אמור להחזיר רק חנויות של החברה', async () => {
      // יצירת חברה אחרת וחנות
      const otherCompany = await prisma.company.create({
        data: { name: 'Other Company' },
      })
      await createTestShop(otherCompany.id, { name: 'Other Shop', slug: 'other-shop' })

      // יצירת חנות של החברה הנוכחית
      await createTestShop(testCompany.id, { name: 'My Shop', slug: 'my-shop' })

      const req = new NextRequest('http://localhost/api/shops')

      const response = await getShopsHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.every((shop: any) => shop.id !== 'other-shop')).toBe(true)
    })

    it('אמור לדחות גישה ללא אימות', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const req = new NextRequest('http://localhost/api/shops')

      const response = await getShopsHandler(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/shops', () => {
    it('אמור ליצור חנות חדשה', async () => {
      const requestBody = {
        name: 'New Shop',
        slug: 'new-shop',
        description: 'Test shop description',
        currency: 'ILS',
        taxEnabled: true,
        taxRate: 18,
      }

      const req = new NextRequest('http://localhost/api/shops', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createShopHandler(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Shop')
      expect(data.slug).toBe('new-shop')
      expect(data.isPublished).toBe(true)

      // בדיקה שהחנות נוצרה ב-DB
      const shop = await prisma.shop.findUnique({
        where: { id: data.id },
      })

      expect(shop).toBeTruthy()
      expect(shop?.companyId).toBe(testCompany.id)

      // בדיקה שאירוע נוצר
      const event = await prisma.shopEvent.findFirst({
        where: {
          shopId: data.id,
          type: 'shop.created',
        },
      })

      expect(event).toBeTruthy()
    })

    it('אמור לדחות יצירת חנות עם slug קיים', async () => {
      await createTestShop(testCompany.id, { name: 'Existing Shop', slug: 'existing-shop' })

      const requestBody = {
        name: 'Another Shop',
        slug: 'existing-shop', // slug קיים
        description: 'Test shop',
      }

      const req = new NextRequest('http://localhost/api/shops', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createShopHandler(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('כבר קיימת')
    })

    it('אמור לדחות יצירת חנות עם נתונים לא תקינים', async () => {
      const testCases = [
        {
          body: { name: 'S', slug: 'shop' },
          expectedError: 'לפחות 2 תווים',
        },
        {
          body: { name: 'Shop', slug: 'invalid slug' }, // רווחים ב-slug
          expectedError: 'רק אותיות קטנות',
        },
        {
          body: { name: 'Shop', slug: 'S' },
          expectedError: 'לפחות 2 תווים',
        },
      ]

      for (const testCase of testCases) {
        const req = new NextRequest('http://localhost/api/shops', {
          method: 'POST',
          body: JSON.stringify(testCase.body),
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const response = await createShopHandler(req)
        const data = await response.json()

        expect(response.status).toBe(400)
      }
    })
  })
})

// Import prisma for direct DB access in tests
import { prisma } from '@/lib/prisma'

