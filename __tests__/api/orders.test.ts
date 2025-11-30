import { GET as getOrdersHandler } from '@/app/api/orders/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { createTestUser, createTestShop, createTestProduct, createTestCustomer, cleanupTestData } from '../setup/test-utils'
import { prisma } from '@/lib/prisma'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

describe('Orders API', () => {
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

  describe('GET /api/orders', () => {
    it('אמור להחזיר רשימת הזמנות', async () => {
      // יצירת הזמנה
      const customer = await createTestCustomer(testShop.id)
      const product = await createTestProduct(testShop.id, { name: 'Test Product', price: 100 })

      const order = await prisma.order.create({
        data: {
          shopId: testShop.id,
          orderNumber: `ORD-${Date.now()}`,
          customerId: customer.id,
          customerName: 'Test Customer',
          customerEmail: customer.email!,
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            zip: '12345',
          },
          subtotal: 100,
          shipping: 20,
          tax: 18,
          discount: 0,
          total: 138,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          fulfillmentStatus: 'UNFULFILLED',
        },
      })

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          name: product.name,
          quantity: 1,
          price: 100,
          total: 100,
        },
      })

      const req = new NextRequest(`http://localhost/api/orders?shopId=${testShop.id}`)

      const response = await getOrdersHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.orders).toHaveLength(1)
      expect(data.orders[0].orderNumber).toBe(order.orderNumber)
      expect(data.pagination.total).toBe(1)
    })

    it('אמור לסנן הזמנות לפי סטטוס', async () => {
      const customer = await createTestCustomer(testShop.id)

      const pendingOrder = await prisma.order.create({
        data: {
          shopId: testShop.id,
          orderNumber: `ORD-PENDING-${Date.now()}`,
          customerId: customer.id,
          customerName: 'Test Customer',
          customerEmail: customer.email!,
          shippingAddress: { street: '123 Test St' },
          subtotal: 100,
          shipping: 20,
          tax: 18,
          total: 138,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          fulfillmentStatus: 'UNFULFILLED',
        },
      })

      const confirmedOrder = await prisma.order.create({
        data: {
          shopId: testShop.id,
          orderNumber: `ORD-CONFIRMED-${Date.now()}`,
          customerId: customer.id,
          customerName: 'Test Customer',
          customerEmail: customer.email!,
          shippingAddress: { street: '123 Test St' },
          subtotal: 100,
          shipping: 20,
          tax: 18,
          total: 138,
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          fulfillmentStatus: 'UNFULFILLED',
        },
      })

      const req = new NextRequest(`http://localhost/api/orders?shopId=${testShop.id}&status=PENDING`)

      const response = await getOrdersHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.orders.every((o: any) => o.status === 'PENDING')).toBe(true)
      expect(data.orders.some((o: any) => o.id === pendingOrder.id)).toBe(true)
      expect(data.orders.some((o: any) => o.id === confirmedOrder.id)).toBe(false)
    })

    it('אמור לחפש הזמנות לפי מספר הזמנה או שם לקוח', async () => {
      const customer = await createTestCustomer(testShop.id, { firstName: 'John' })
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(7)}`

      const order = await prisma.order.create({
        data: {
          shopId: testShop.id,
          orderNumber: orderNumber,
          customerId: customer.id,
          customerName: 'John Doe',
          customerEmail: customer.email!,
          shippingAddress: { street: '123 Test St' },
          subtotal: 100,
          shipping: 20,
          tax: 18,
          total: 138,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          fulfillmentStatus: 'UNFULFILLED',
        },
      })

      const req = new NextRequest(`http://localhost/api/orders?shopId=${testShop.id}&search=${orderNumber.substring(4)}`)

      const response = await getOrdersHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.orders.length).toBeGreaterThanOrEqual(1)
      expect(data.orders.some((o: any) => o.orderNumber === orderNumber)).toBe(true)
    })

    it('אמור לדחות גישה ללא אימות', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const req = new NextRequest(`http://localhost/api/orders?shopId=${testShop.id}`)

      const response = await getOrdersHandler(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('אמור להחזיר רק הזמנות של החברה', async () => {
      // יצירת חברה אחרת וחנות
      const otherCompany = await prisma.company.create({
        data: { name: 'Other Company' },
      })
      const otherShop = await createTestShop(otherCompany.id)
      const otherCustomer = await createTestCustomer(otherShop.id)

      // יצירת הזמנה בחברה אחרת
      await prisma.order.create({
        data: {
          shopId: otherShop.id,
          orderNumber: 'ORD-OTHER',
          customerId: otherCustomer.id,
          customerName: 'Other Customer',
          customerEmail: otherCustomer.email!,
          shippingAddress: { street: '123 Test St' },
          subtotal: 100,
          shipping: 20,
          tax: 18,
          total: 138,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          fulfillmentStatus: 'UNFULFILLED',
        },
      })

      // יצירת הזמנה בחברה הנוכחית
      const customer = await createTestCustomer(testShop.id)
      await prisma.order.create({
        data: {
          shopId: testShop.id,
          orderNumber: 'ORD-MINE',
          customerId: customer.id,
          customerName: 'My Customer',
          customerEmail: customer.email!,
          shippingAddress: { street: '123 Test St' },
          subtotal: 100,
          shipping: 20,
          tax: 18,
          total: 138,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          fulfillmentStatus: 'UNFULFILLED',
        },
      })

      const req = new NextRequest(`http://localhost/api/orders?shopId=${testShop.id}`)

      const response = await getOrdersHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.orders.every((o: any) => o.orderNumber !== 'ORD-OTHER')).toBe(true)
      expect(data.orders.some((o: any) => o.orderNumber === 'ORD-MINE')).toBe(true)
    })
  })
})

