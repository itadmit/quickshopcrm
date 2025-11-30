import { GET as getCustomersHandler, POST as createCustomerHandler } from '@/app/api/customers/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { createTestUser, createTestShop, createTestCustomer, cleanupTestData } from '../setup/test-utils'
import { prisma } from '@/lib/prisma'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

describe('Customers API', () => {
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

  describe('GET /api/customers', () => {
    it('אמור להחזיר רשימת לקוחות', async () => {
      await createTestCustomer(testShop.id, { email: 'customer1@test.com', firstName: 'John' })
      await createTestCustomer(testShop.id, { email: 'customer2@test.com', firstName: 'Jane' })

      const req = new NextRequest(`http://localhost/api/customers?shopId=${testShop.id}`)

      const response = await getCustomersHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customers).toHaveLength(2)
      expect(data.pagination.total).toBe(2)
    })

    it('אמור לסנן לקוחות לפי tier', async () => {
      await createTestCustomer(testShop.id, { email: 'vip@test.com' })
      await prisma.customer.updateMany({
        where: { email: 'vip@test.com' },
        data: { tier: 'VIP' },
      })

      await createTestCustomer(testShop.id, { email: 'regular@test.com' })

      const req = new NextRequest(`http://localhost/api/customers?shopId=${testShop.id}&tier=VIP`)

      const response = await getCustomersHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customers.every((c: any) => c.tier === 'VIP')).toBe(true)
    })

    it('אמור לחפש לקוחות לפי אימייל או שם', async () => {
      await createTestCustomer(testShop.id, { email: 'john@test.com', firstName: 'John' })
      await createTestCustomer(testShop.id, { email: 'jane@test.com', firstName: 'Jane' })

      const req = new NextRequest(`http://localhost/api/customers?shopId=${testShop.id}&search=john`)

      const response = await getCustomersHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customers.length).toBeGreaterThanOrEqual(1)
      expect(data.customers.some((c: any) => c.email === 'john@test.com')).toBe(true)
    })

    it('אמור לדחות גישה ללא אימות', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const req = new NextRequest(`http://localhost/api/customers?shopId=${testShop.id}`)

      const response = await getCustomersHandler(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/customers', () => {
    it('אמור ליצור לקוח חדש', async () => {
      const requestBody = {
        shopId: testShop.id,
        email: 'newcustomer@test.com',
        firstName: 'New',
        lastName: 'Customer',
        phone: '0501234567',
        tier: 'REGULAR',
      }

      const req = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createCustomerHandler(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.email).toBe('newcustomer@test.com')
      expect(data.firstName).toBe('New')
      expect(data.lastName).toBe('Customer')

      // בדיקה שהלקוח נוצר ב-DB
      const customer = await prisma.customer.findUnique({
        where: { id: data.id },
      })

      expect(customer).toBeTruthy()

      // בדיקה שאירוע נוצר
      const event = await prisma.shopEvent.findFirst({
        where: {
          shopId: testShop.id,
          type: 'customer.created',
          entityId: data.id,
        },
      })

      expect(event).toBeTruthy()
    })

    it('אמור לדחות יצירת לקוח עם אימייל קיים', async () => {
      const existingEmail = `existing-${Date.now()}@test.com`
      await createTestCustomer(testShop.id, { email: existingEmail })

      const requestBody = {
        shopId: testShop.id,
        email: existingEmail,
        firstName: 'Test',
      }

      const req = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createCustomerHandler(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('already exists')
    })

    it('אמור לדחות יצירת לקוח על ידי משתמש שאינו ADMIN', async () => {
      // יצירת משתמש רגיל
      const regularUserEmail = `regular-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      const regularUser = await prisma.user.create({
        data: {
          email: regularUserEmail,
          name: 'Regular User',
          password: 'hashed',
          role: 'USER',
          companyId: testCompany.id,
        },
      })

      mockSession.user.role = 'USER'
      mockSession.user.id = regularUser.id

      const requestBody = {
        shopId: testShop.id,
        email: 'customer@test.com',
      }

      const req = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createCustomerHandler(req)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('אמור לדחות יצירת לקוח בחנות שלא שייכת לחברה', async () => {
      const otherCompany = await prisma.company.create({
        data: { name: 'Other Company' },
      })
      const otherShop = await createTestShop(otherCompany.id)

      const requestBody = {
        shopId: otherShop.id,
        email: 'customer@test.com',
      }

      const req = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createCustomerHandler(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Shop not found')
    })
  })
})

