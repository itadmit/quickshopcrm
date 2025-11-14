import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * סקריפט למחיקת כל פריטי המתנה מהעגלות
 * שימוש: npx tsx scripts/remove-gift-items-from-cart.ts [shopId]
 */
async function removeGiftItemsFromCart(shopId?: string) {
  try {
    console.log('🔍 מחפש עגלות...')
    
    // מציאת כל העגלות (או עגלות של חנות ספציפית)
    const whereClause = shopId ? { shopId } : {}
    const carts = await prisma.cart.findMany({
      where: whereClause,
      include: {
        shop: true,
      },
    })

    console.log(`📦 נמצאו ${carts.length} עגלות`)

    let totalRemoved = 0
    let cartsUpdated = 0

    for (const cart of carts) {
      const items = (cart.items as any[]) || []
      const originalLength = items.length
      
      // סינון פריטי מתנה
      const itemsWithoutGifts = items.filter((item) => !item.isGift)
      const removedCount = originalLength - itemsWithoutGifts.length

      if (removedCount > 0) {
        await prisma.cart.update({
          where: { id: cart.id },
          data: { items: itemsWithoutGifts },
        })

        totalRemoved += removedCount
        cartsUpdated++
        
        console.log(`✅ עגלה ${cart.id} (חנות: ${cart.shop.name}): הוסרו ${removedCount} פריטי מתנה`)
      }
    }

    console.log('\n📊 סיכום:')
    console.log(`   עגלות עודכנו: ${cartsUpdated}`)
    console.log(`   סך פריטי מתנה שהוסרו: ${totalRemoved}`)
    
    if (totalRemoved === 0) {
      console.log('✨ לא נמצאו פריטי מתנה להסרה')
    }
  } catch (error) {
    console.error('❌ שגיאה:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// הרצת הסקריפט
const shopId = process.argv[2] // אופציונלי - אם רוצים למחוק רק מחנות ספציפית

if (shopId) {
  console.log(`🎯 מוחק פריטי מתנה מחנות: ${shopId}\n`)
} else {
  console.log('🌐 מוחק פריטי מתנה מכל החנויות\n')
}

removeGiftItemsFromCart(shopId)
  .then(() => {
    console.log('\n✅ הסקריפט הושלם בהצלחה!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ הסקריפט נכשל:', error)
    process.exit(1)
  })

