import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create demo company
  const demoCompany = await prisma.company.upsert({
    where: { apiKey: 'demo-company-key' },
    update: {},
    create: {
      name: 'חנות הדגמה',
      plan: 'premium',
      apiKey: 'demo-company-key',
      hmacSecret: 'demo-secret',
    },
  })

  console.log('✅ Company created:', demoCompany.name)

  // Create demo users
  const hashedPassword = await bcrypt.hash('123456', 10)
  
  const demoAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'מנהל הדגמה',
      password: hashedPassword,
      role: 'ADMIN',
      companyId: demoCompany.id,
    },
  })

  const demoUser = await prisma.user.upsert({
    where: { email: 'user@demo.com' },
    update: {},
    create: {
      email: 'user@demo.com',
      name: 'משתמש דמו',
      password: hashedPassword,
      role: 'USER',
      companyId: demoCompany.id,
    },
  })

  console.log('✅ Users created')

  // Create demo notifications
  const notifications = await Promise.all([
    prisma.notification.create({
      data: {
        type: 'welcome',
        title: 'ברוכים הבאים ל-Quick Shop!',
        message: 'התחילו ליצור את החנות הראשונה שלכם',
        companyId: demoCompany.id,
        userId: demoAdmin.id,
        isRead: false,
      },
    }),
    prisma.notification.create({
      data: {
        type: 'info',
        title: 'המערכת מוכנה לשימוש',
        message: 'אתם יכולים להתחיל ליצור מוצרים ולנהל את החנות',
        companyId: demoCompany.id,
        userId: demoAdmin.id,
        isRead: false,
      },
    }),
  ])

  console.log(`✅ Created ${notifications.length} notifications`)

  console.log('🎉 Seed completed successfully!')
  console.log('\n📧 Demo credentials:')
  console.log('Email: admin@demo.com')
  console.log('Password: 123456')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
