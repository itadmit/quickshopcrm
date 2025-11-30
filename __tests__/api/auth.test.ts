import { POST as registerHandler } from '@/app/api/auth/register/route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createTestUser, cleanupTestData } from '../setup/test-utils'

describe('Auth API', () => {
  beforeEach(async () => {
    await cleanupTestData()
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  describe('POST /api/auth/register', () => {
    it('אמור ליצור משתמש חדש בהצלחה', async () => {
      const requestBody = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test123456',
        companyName: 'Test Company',
      }

      const req = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await registerHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('משתמש נוצר בהצלחה')
      expect(data.user.email).toBe('test@example.com')
      expect(data.user.name).toBe('Test User')

      // בדיקה שהמשתמש נוצר ב-DB
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
        include: { company: true },
      })

      expect(user).toBeTruthy()
      expect(user?.company.name).toBe('Test Company')
      expect(user?.role).toBe('ADMIN')

      // בדיקה שמנוי נסיון נוצר
      const subscription = await prisma.subscription.findUnique({
        where: { companyId: user!.companyId },
      })

      expect(subscription).toBeTruthy()
      expect(subscription?.plan).toBe('TRIAL')
      expect(subscription?.status).toBe('TRIAL')
    })

    it('אמור לדחות הרשמה עם אימייל קיים', async () => {
      // יצירת משתמש קיים
      await createTestUser({ email: 'existing@example.com' })

      const requestBody = {
        name: 'Another User',
        email: 'existing@example.com',
        password: 'Test123456',
        companyName: 'Another Company',
      }

      const req = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await registerHandler(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('כבר קיים')
    })

    it('אמור לדחות הרשמה עם נתונים לא תקינים', async () => {
      const testCases = [
        {
          body: { name: 'T', email: 'test@example.com', password: 'Test123456', companyName: 'Test Company' },
          expectedError: 'לפחות 2 תווים',
        },
        {
          body: { name: 'Test User', email: 'invalid-email', password: 'Test123456', companyName: 'Test Company' },
          expectedError: 'אימייל לא תקין',
        },
        {
          body: { name: 'Test User', email: 'test@example.com', password: 'short', companyName: 'Test Company' },
          expectedError: 'לפחות 8 תווים',
        },
        {
          body: { name: 'Test User', email: 'test@example.com', password: 'Test123456', companyName: 'T' },
          expectedError: 'לפחות 2 תווים',
        },
      ]

      for (const testCase of testCases) {
        const req = new NextRequest('http://localhost/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(testCase.body),
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const response = await registerHandler(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain(testCase.expectedError)
      }
    })

    it('אמור ליצור SUPER_ADMIN אם האימייל תואם', async () => {
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@test.com'

      const requestBody = {
        name: 'Super Admin',
        email: superAdminEmail,
        password: 'Test123456',
        companyName: 'Super Admin Company',
      }

      const req = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await registerHandler(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.role).toBe('SUPER_ADMIN')

      const user = await prisma.user.findUnique({
        where: { email: superAdminEmail },
      })

      expect(user?.role).toBe('SUPER_ADMIN')
    })
  })
})

