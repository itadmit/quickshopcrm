import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * יצירת משתמש בדיקה
 */
export async function createTestUser(data?: {
  email?: string
  name?: string
  password?: string
  companyName?: string
  role?: 'ADMIN' | 'USER' | 'MANAGER' | 'SUPER_ADMIN'
}) {
  const email = data?.email || `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
  const name = data?.name || 'Test User'
  const password = data?.password || 'Test123456'
  const companyName = data?.companyName || `Test Company ${Date.now()}`
  const role = data?.role || 'ADMIN'

  const hashedPassword = await bcrypt.hash(password, 10)

  // יצירת חברה
  const company = await prisma.company.create({
    data: {
      name: companyName,
    },
  })

  // יצירת משתמש
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role,
      companyId: company.id,
    },
    include: {
      company: true,
    },
  })

  // יצירת מנוי נסיון
  const trialEndDate = new Date()
  trialEndDate.setDate(trialEndDate.getDate() + 7)

  await prisma.subscription.create({
    data: {
      companyId: company.id,
      plan: 'TRIAL',
      status: 'TRIAL',
      trialStartDate: new Date(),
      trialEndDate,
    },
  })

  return {
    user,
    company,
    password, // מחזיר את הסיסמה הלא מוצפנת לטסטים
  }
}

/**
 * יצירת חנות בדיקה
 */
export async function createTestShop(companyId: string, data?: {
  name?: string
  slug?: string
  description?: string
}) {
  const name = data?.name || `Test Shop ${Date.now()}`
  const slug = data?.slug || `test-shop-${Date.now()}-${Math.random().toString(36).substring(7)}`
  const description = data?.description || 'Test shop description'

  const shop = await prisma.shop.create({
    data: {
      name,
      slug,
      description,
      companyId,
      currency: 'ILS',
      taxEnabled: true,
      taxRate: 18,
      isPublished: true,
    },
  })

  return shop
}

/**
 * יצירת מוצר בדיקה
 */
export async function createTestProduct(shopId: string, data?: {
  name?: string
  price?: number
  inventoryQty?: number
}) {
  const name = data?.name || `Test Product ${Date.now()}`
  const price = data?.price || 100
  const inventoryQty = data?.inventoryQty ?? 10
  const uniqueSuffix = `-${Date.now()}-${Math.random().toString(36).substring(7)}`
  const slug = (data?.name || name).toLowerCase().replace(/\s+/g, '-') + uniqueSuffix

  const product = await prisma.product.create({
    data: {
      shopId,
      name,
      slug,
      price,
      inventoryQty,
      status: 'PUBLISHED',
      availability: 'IN_STOCK',
      inventoryEnabled: true,
    },
  })

  return product
}

/**
 * יצירת לקוח בדיקה
 */
export async function createTestCustomer(shopId: string, data?: {
  email?: string
  firstName?: string
  lastName?: string
}) {
  const email = data?.email || `customer-${Date.now()}@test.com`
  const firstName = data?.firstName || 'Test'
  const lastName = data?.lastName || 'Customer'

  const customer = await prisma.customer.create({
    data: {
      shopId,
      email,
      firstName,
      lastName,
      tier: 'REGULAR',
    },
  })

  return customer
}

/**
 * ניקוי נתוני בדיקה
 * הערה: אם אין הרשאות מחיקה, הפונקציה תדלג על הניקוי בשקט
 */
export async function cleanupTestData() {
  try {
    // מחיקת כל הנתונים בסדר הנכון (למניעת שגיאות foreign key)
    // כל פעולה עטופה ב-try-catch כדי לא לעצור אם אין הרשאות
    try {
      await prisma.giftCardTransaction.deleteMany({})
    } catch (e) {}
    try {
      await prisma.storeCreditTransaction.deleteMany({})
    } catch (e) {}
    try {
      await prisma.shopEvent.deleteMany({})
    } catch (e) {}
    try {
      await prisma.orderItem.deleteMany({})
    } catch (e) {}
    try {
      await prisma.order.deleteMany({})
    } catch (e) {}
    try {
      await prisma.cart.deleteMany({})
    } catch (e) {}
    try {
      await prisma.wishlistItem.deleteMany({})
    } catch (e) {}
    try {
      await prisma.review.deleteMany({})
    } catch (e) {}
    try {
      await prisma.blogComment.deleteMany({})
    } catch (e) {}
    try {
      await prisma.storeCredit.deleteMany({})
    } catch (e) {}
    try {
      await prisma.productTag.deleteMany({})
    } catch (e) {}
    try {
      await prisma.productCategory.deleteMany({})
    } catch (e) {}
    try {
      await prisma.productCollection.deleteMany({})
    } catch (e) {}
    try {
      await prisma.productVariant.deleteMany({})
    } catch (e) {}
    try {
      await prisma.productOption.deleteMany({})
    } catch (e) {}
    try {
      await prisma.product.deleteMany({})
    } catch (e) {}
    try {
      await prisma.customer.deleteMany({})
    } catch (e) {}
    try {
      await prisma.shop.deleteMany({})
    } catch (e) {}
    try {
      await prisma.subscription.deleteMany({})
    } catch (e) {}
    try {
      await prisma.user.deleteMany({})
    } catch (e) {}
    try {
      await prisma.company.deleteMany({})
    } catch (e) {}
  } catch (error) {
    // אם יש בעיה כללית, פשוט נדלג על הניקוי
    // זה בסדר - הטסטים יעבדו גם עם נתונים קיימים
  }
}

/**
 * יצירת session mock
 */
export function createMockSession(user: any) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company?.name || 'Test Company',
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

