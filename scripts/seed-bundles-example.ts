/**
 * סקריפט ליצירת מוצרים ו-bundles לדוגמה
 * 
 * שימוש:
 * npx tsx scripts/seed-bundles-example.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 מתחיל יצירת מוצרים ו-bundles לדוגמה...\n')

  // מציאת המשתמש
  const userEmail = 'itadmit@gmail.com'
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      company: {
        include: {
          shops: {
            where: {
              isPublished: true,
            },
            take: 1,
          },
        },
      },
    },
  })

  if (!user) {
    console.log(`⚠️  לא נמצא משתמש עם האימייל: ${userEmail}`)
    return
  }

  if (!user.company) {
    console.log(`⚠️  למשתמש ${userEmail} אין חברה`)
    return
  }

  // מציאת חנות ראשונה של המשתמש
  let shop: any = user.company.shops[0] || null

  if (!shop) {
    // אם אין חנות, נחפש כל חנות של החברה
    shop = await prisma.shop.findFirst({
      where: {
        companyId: user.company.id,
      },
    })
  }

  if (!shop) {
    console.log('⚠️  לא נמצאה חנות. נא ליצור חנות קודם.')
    return
  }

  console.log(`✅ נמצא משתמש: ${user.name} (${user.email})`)
  console.log(`✅ נמצאה חנות: ${shop.name} (ID: ${shop.id})\n`)

  // יצירת מוצר לדוגמה - GET SPICY
  console.log('📦 יוצר מוצר "GET SPICY"...')
  const spicyProduct = await prisma.product.create({
    data: {
      shopId: shop.id,
      name: 'GET SPICY',
      slug: 'get-spicy',
      description: 'מחקרים הראו שחשק מיני נמוך (ליבידו) הוא תופעה נפוצה, וכאן נכנסים לתמונה רכיבים מעוררים וטבעיים כמו פסיפלורה, מאקה, אשווגנדה וג\'ינסנג סיבירי שעוזרים לך להיכנס למצב רוח, להרגיש אנרגטי ומושך יותר בכל לילה.',
      price: 179,
      comparePrice: 199,
      sku: 'GET-SPICY-001',
      status: 'PUBLISHED',
      availability: 'IN_STOCK',
      inventoryQty: 1000,
      images: ['https://via.placeholder.com/800x800?text=GET+SPICY'],
      seoTitle: 'GET SPICY - תוסף טבעי להגברת החשק המיני',
      seoDescription: 'תוסף טבעי להגברת החשק המיני עם רכיבים מעוררים וטבעיים',
    },
  })
  console.log(`✅ נוצר מוצר: ${spicyProduct.name} (ID: ${spicyProduct.id})\n`)

  // יצירת bundles - מארז יחיד, זוגי ושלישייה
  console.log('📦 יוצר bundles...\n')

  // Bundle 1: מארז יחיד
  const bundle1 = await prisma.bundle.create({
    data: {
      shopId: shop.id,
      name: 'מארז יחיד',
      description: 'יחידה אחת - 179₪ ליחידה',
      price: 179,
      comparePrice: 199,
      isActive: true,
      products: {
        create: [
          {
            productId: spicyProduct.id,
            quantity: 1,
            position: 0,
          },
        ],
      },
    },
  })
  console.log(`✅ נוצר bundle: ${bundle1.name} - ${bundle1.price}₪`)

  // Bundle 2: מארז זוגי
  const bundle2 = await prisma.bundle.create({
    data: {
      shopId: shop.id,
      name: 'מארז זוגי',
      description: '2 יחידות - 124.5₪ ליחידה (הכי נמכר)',
      price: 249,
      comparePrice: 358, // 179 * 2
      isActive: true,
      products: {
        create: [
          {
            productId: spicyProduct.id,
            quantity: 2,
            position: 0,
          },
        ],
      },
    },
  })
  console.log(`✅ נוצר bundle: ${bundle2.name} - ${bundle2.price}₪`)

  // Bundle 3: מארז שלישייה
  const bundle3 = await prisma.bundle.create({
    data: {
      shopId: shop.id,
      name: 'מארז שלישייה',
      description: '3 יחידות - 99.66₪ ליחידה (הכי משתלם)',
      price: 299,
      comparePrice: 537, // 179 * 3
      isActive: true,
      products: {
        create: [
          {
            productId: spicyProduct.id,
            quantity: 3,
            position: 0,
          },
        ],
      },
    },
  })
  console.log(`✅ נוצר bundle: ${bundle3.name} - ${bundle3.price}₪\n`)

  // יצירת מוצר נוסף לדוגמה - עם bundles
  console.log('📦 יוצר מוצר נוסף "VITAMIN D3"...')
  const vitaminProduct = await prisma.product.create({
    data: {
      shopId: shop.id,
      name: 'VITAMIN D3',
      slug: 'vitamin-d3',
      description: 'ויטמין D3 במינון גבוה - תוסף תזונה איכותי לבריאות העצמות והמערכת החיסונית',
      price: 89,
      comparePrice: 99,
      sku: 'VIT-D3-001',
      status: 'PUBLISHED',
      availability: 'IN_STOCK',
      inventoryQty: 500,
      images: ['https://via.placeholder.com/800x800?text=VITAMIN+D3'],
      seoTitle: 'VITAMIN D3 - ויטמין D3 במינון גבוה',
      seoDescription: 'ויטמין D3 במינון גבוה - תוסף תזונה איכותי',
    },
  })
  console.log(`✅ נוצר מוצר: ${vitaminProduct.name} (ID: ${vitaminProduct.id})\n`)

  // יצירת bundles לוויטמין D3 - בסדר הפוך (3, 2, 1)
  console.log('📦 יוצר bundles לוויטמין D3 (בסדר הפוך)...\n')

  // Bundle 3: מארז שלישייה (ראשון)
  const vitaminBundle3 = await prisma.bundle.create({
    data: {
      shopId: shop.id,
      name: 'ויטמין D3 - מארז שלישייה',
      description: '3 יחידות - 69₪ ליחידה (הכי משתלם)',
      price: 207,
      comparePrice: 297, // 99 * 3
      isActive: true,
      products: {
        create: [
          {
            productId: vitaminProduct.id,
            quantity: 3,
            position: 0,
          },
        ],
      },
    },
  })
  console.log(`✅ נוצר bundle: ${vitaminBundle3.name} - ${vitaminBundle3.price}₪`)

  // Bundle 2: מארז זוגי (שני)
  const vitaminBundle2 = await prisma.bundle.create({
    data: {
      shopId: shop.id,
      name: 'ויטמין D3 - מארז זוגי',
      description: '2 יחידות - 79₪ ליחידה (הכי נמכר)',
      price: 158,
      comparePrice: 198, // 99 * 2
      isActive: true,
      products: {
        create: [
          {
            productId: vitaminProduct.id,
            quantity: 2,
            position: 0,
          },
        ],
      },
    },
  })
  console.log(`✅ נוצר bundle: ${vitaminBundle2.name} - ${vitaminBundle2.price}₪`)

  // Bundle 1: מארז יחיד (שלישי)
  const vitaminBundle1 = await prisma.bundle.create({
    data: {
      shopId: shop.id,
      name: 'ויטמין D3 - מארז יחיד',
      description: 'יחידה אחת',
      price: 89,
      comparePrice: 99,
      isActive: true,
      products: {
        create: [
          {
            productId: vitaminProduct.id,
            quantity: 1,
            position: 0,
          },
        ],
      },
    },
  })
  console.log(`✅ נוצר bundle: ${vitaminBundle1.name} - ${vitaminBundle1.price}₪\n`)

  // יצירת bundle מורכב - כמה מוצרים שונים
  console.log('📦 יוצר bundle מורכב (כמה מוצרים שונים)...\n')

  const complexBundle = await prisma.bundle.create({
    data: {
      shopId: shop.id,
      name: 'חבילת בריאות מלאה',
      description: 'GET SPICY + VITAMIN D3 - חבילה מיוחדת',
      price: 249,
      comparePrice: 298, // 179 + 99 + 20 הנחה
      isActive: true,
      products: {
        create: [
          {
            productId: spicyProduct.id,
            quantity: 1,
            position: 0,
          },
          {
            productId: vitaminProduct.id,
            quantity: 1,
            position: 1,
          },
        ],
      },
    },
  })
  console.log(`✅ נוצר bundle מורכב: ${complexBundle.name} - ${complexBundle.price}₪\n`)

  console.log('✨ סיום! נוצרו:')
  console.log(`   - 2 מוצרים`)
  console.log(`   - 7 bundles`)
  console.log(`\n💡 טיפ: ודא שהתוסף "Bundle Products" פעיל כדי לראות את ה-bundles בדף המוצר`)
}

main()
  .catch((e) => {
    console.error('❌ שגיאה:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

