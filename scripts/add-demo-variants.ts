import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addDemoVariants() {
  try {
    // מציאת המוצר "נעליים ניייק Air Max"
    const product = await prisma.product.findFirst({
      where: { 
        name: { contains: 'Air Max' }
      },
      select: { id: true, name: true, shopId: true }
    })

    if (!product) {
      console.log('❌ מוצר Air Max לא נמצא')
      return
    }

    console.log('📦 מוצר נמצא:', product.name)

    // יצירת Options
    console.log('🎨 יוצר אופציות...')
    
    // אופציית צבע
    const colorOption = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: 'צבע',
        type: 'color',
        position: 0,
        values: [
          { id: 'black', label: 'שחור', metadata: { color: '#000000' } },
          { id: 'white', label: 'לבן', metadata: { color: '#FFFFFF' } },
          { id: 'yellow', label: 'צהוב', metadata: { color: '#FFD700' } }
        ]
      }
    })

    // אופציית מידה
    const sizeOption = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: 'מידה',
        type: 'button',
        position: 1,
        values: [
          { id: '38', label: '38' },
          { id: '39', label: '39' },
          { id: '40', label: '40' },
          { id: '41', label: '41' },
          { id: '42', label: '42' }
        ]
      }
    })

    console.log('✅ אופציות נוצרו')

    // יצירת Variants
    console.log('🔧 יוצר variants...')
    
    const colors = ['שחור', 'לבן', 'צהוב']
    const sizes = ['38', '39', '40', '41', '42']
    
    let variantCount = 0
    for (const color of colors) {
      for (const size of sizes) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: `${color} - ${size}`,
            price: 599.90,
            comparePrice: null,
            inventoryQty: Math.floor(Math.random() * 10) + 5, // 5-15 יחידות
            option1: 'צבע',
            option1Value: color,
            option2: 'מידה',
            option2Value: size,
          }
        })
        variantCount++
      }
    }

    console.log(`✅ נוצרו ${variantCount} variants`)
    console.log('')
    console.log('🎉 סיימתי! עכשיו רענן את הדפדפן ותראה:')
    console.log('   ○ ○ ○  ← עיגולי צבע (שחור, לבן, צהוב)')
    console.log('   [38] [39] [40] [41] [42]  ← כפתורי מידות')

  } catch (error) {
    console.error('❌ שגיאה:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addDemoVariants()

