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

  // Create super admin
  const superAdminPassword = await bcrypt.hash('aA0542284283!!', 10)
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'itadmit@gmail.com' },
    update: {
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'itadmit@gmail.com',
      name: 'Super Admin',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      companyId: demoCompany.id,
    },
  })

  console.log('✅ Super Admin created:', superAdmin.email)

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

  console.log('✅ Demo users created')

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

  // Create demo shop
  const demoShop = await prisma.shop.upsert({
    where: { slug: 'adika' },
    update: {},
    create: {
      name: 'Adika',
      slug: 'adika',
      description: 'חנות אופנה מודרנית',
      companyId: demoCompany.id,
      isPublished: true,
      currency: 'ILS',
      taxEnabled: true,
      taxRate: 18,
      pricesIncludeTax: true,
    },
  })

  console.log('✅ Demo shop created:', demoShop.name)

  // Create categories
  const categories = await Promise.all([
    prisma.collection.create({
      data: {
        name: 'מוצרים מומלצים',
        slug: 'featured',
        type: 'MANUAL',
        shopId: demoShop.id,
      },
    }),
    prisma.collection.create({
      data: {
        name: 'מבצעים',
        slug: 'sale',
        type: 'MANUAL',
        shopId: demoShop.id,
      },
    }),
  ])

  console.log(`✅ Created ${categories.length} categories`)

  // Create products with variants
  console.log('🎨 Creating products with variants...')

  // מוצר 1: נעליים עם מידות וצבעים
  const product1 = await prisma.product.create({
    data: {
      name: 'נעליים ניייק Air Max',
      slug: 'air-max-nike',
      description: 'נעלי ספורט איכותיות וסטייל',
      price: 599.90,
      comparePrice: 849.90,
      images: ['https://picsum.photos/seed/nike1/800/800'],
      status: 'PUBLISHED',
      availability: 'IN_STOCK',
      inventoryQty: 0,
      shopId: demoShop.id,
    },
  })

  // אופציות למוצר 1
  const colorOption1 = await prisma.productOption.create({
    data: {
      productId: product1.id,
      name: 'צבע',
      type: 'color',
      position: 0,
      values: [
        { id: 'black', label: 'שחור', metadata: { color: '#000000' } },
        { id: 'white', label: 'לבן', metadata: { color: '#FFFFFF' } },
        { id: 'yellow', label: 'צהוב', metadata: { color: '#FFD700' } },
      ],
    },
  })

  const sizeOption1 = await prisma.productOption.create({
    data: {
      productId: product1.id,
      name: 'מידה',
      type: 'button',
      position: 1,
      values: [
        { id: '38', label: '38' },
        { id: '39', label: '39' },
        { id: '40', label: '40' },
        { id: '41', label: '41' },
        { id: '42', label: '42' },
      ],
    },
  })

  // יצירת variants למוצר 1
  const colors1 = [
    { name: 'שחור', value: 'black' },
    { name: 'לבן', value: 'white' },
    { name: 'צהוב', value: 'yellow' },
  ]
  const sizes1 = ['38', '39', '40', '41', '42']

  let variantCount = 0
  for (const color of colors1) {
    for (const size of sizes1) {
      // מידה 38 תהיה ללא מלאי כדי להדגים את הקו האלכסוני
      const inventoryQty = size === '38' ? 0 : Math.floor(Math.random() * 15) + 5
      
      await prisma.productVariant.create({
        data: {
          productId: product1.id,
          name: `${color.name} - ${size}`,
          price: 599.90,
          comparePrice: 849.90,
          inventoryQty: inventoryQty,
          option1: 'צבע',
          option1Value: color.name,
          option2: 'מידה',
          option2Value: size,
        },
      })
      variantCount++
    }
  }

  console.log(`✅ Created product "${product1.name}" with ${variantCount} variants`)

  // מוצר 2: חולצה עם צבעים ומידות
  const product2 = await prisma.product.create({
    data: {
      name: 'חולצה אדידס קלאסית',
      slug: 'adidas-classic-shirt',
      description: 'חולצת כותנה איכותית',
      price: 149.90,
      comparePrice: 199.90,
      images: ['https://picsum.photos/seed/adidas1/800/800'],
      status: 'PUBLISHED',
      availability: 'IN_STOCK',
      inventoryQty: 0,
      shopId: demoShop.id,
    },
  })

  const colorOption2 = await prisma.productOption.create({
    data: {
      productId: product2.id,
      name: 'צבע',
      type: 'color',
      position: 0,
      values: [
        { id: 'black', label: 'שחור', metadata: { color: '#000000' } },
        { id: 'white', label: 'לבן', metadata: { color: '#FFFFFF' } },
      ],
    },
  })

  const sizeOption2 = await prisma.productOption.create({
    data: {
      productId: product2.id,
      name: 'מידה',
      type: 'button',
      position: 1,
      values: [
        { id: 'S', label: 'S' },
        { id: 'M', label: 'M' },
        { id: 'L', label: 'L' },
        { id: 'XL', label: 'XL' },
      ],
    },
  })

  const colors2 = [
    { name: 'שחור', value: 'black' },
    { name: 'לבן', value: 'white' },
  ]
  const sizes2 = ['S', 'M', 'L', 'XL']

  variantCount = 0
  for (const color of colors2) {
    for (const size of sizes2) {
      // מידה S תהיה ללא מלאי כדי להדגים את הקו האלכסוני
      const inventoryQty = size === 'S' ? 0 : Math.floor(Math.random() * 20) + 10
      
      await prisma.productVariant.create({
        data: {
          productId: product2.id,
          name: `${color.name} - ${size}`,
          price: 149.90,
          comparePrice: 199.90,
          inventoryQty: inventoryQty,
          option1: 'צבע',
          option1Value: color.name,
          option2: 'מידה',
          option2Value: size,
        },
      })
      variantCount++
    }
  }

  console.log(`✅ Created product "${product2.name}" with ${variantCount} variants`)

  // קישור מוצרים לקטגוריות
  await prisma.productCollection.createMany({
    data: [
      { productId: product1.id, collectionId: categories[0].id },
      { productId: product1.id, collectionId: categories[1].id },
      { productId: product2.id, collectionId: categories[0].id },
      { productId: product2.id, collectionId: categories[1].id },
    ],
  })

  console.log('✅ Products linked to categories')

  // Create or update navigation
  const navigation = await prisma.navigation.upsert({
    where: {
      shopId_location: {
        shopId: demoShop.id,
        location: 'DESKTOP'
      }
    },
    update: {
      items: [
        {
          id: 'home',
          label: 'בית',
          url: `/shop/adika`,
          type: 'custom'
        },
        {
          id: 'featured',
          label: 'מוצרים',
          url: `/shop/adika/categories/${categories[0].id}`,
          type: 'collection',
          collectionId: categories[0].id
        },
        {
          id: 'sale',
          label: 'מבצעים',
          url: `/shop/adika/categories/${categories[1].id}`,
          type: 'collection',
          collectionId: categories[1].id
        },
        {
          id: 'about',
          label: 'אודות',
          url: `/shop/adika/pages/about`,
          type: 'page'
        },
        {
          id: 'contact',
          label: 'צור קשר',
          url: `/shop/adika/pages/contact`,
          type: 'page'
        }
      ]
    },
    create: {
      shopId: demoShop.id,
      name: 'תפריט ראשי',
      location: 'DESKTOP',
      items: [
        {
          id: 'home',
          label: 'בית',
          url: `/shop/adika`,
          type: 'custom'
        },
        {
          id: 'featured',
          label: 'מוצרים',
          url: `/shop/adika/categories/${categories[0].id}`,
          type: 'collection',
          collectionId: categories[0].id
        },
        {
          id: 'sale',
          label: 'מבצעים',
          url: `/shop/adika/categories/${categories[1].id}`,
          type: 'collection',
          collectionId: categories[1].id
        },
        {
          id: 'about',
          label: 'אודות',
          url: `/shop/adika/pages/about`,
          type: 'page'
        },
        {
          id: 'contact',
          label: 'צור קשר',
          url: `/shop/adika/pages/contact`,
          type: 'page'
        }
      ]
    }
  })

  console.log('✅ Navigation created with', (navigation.items as any[]).length, 'items')

  console.log('🎉 Seed completed successfully!')
  console.log('\n📧 Super Admin credentials:')
  console.log('Email: itadmit@gmail.com')
  console.log('Password: aA0542284283!!')
  console.log('\n📧 Demo credentials:')
  console.log('Email: admin@demo.com')
  console.log('Password: 123456')
  console.log('\n🛍️  Demo shop:')
  console.log('URL: http://localhost:3000/shop/adika')
  console.log('Categories: http://localhost:3000/shop/adika/categories/featured')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
