/**
 * סקריפט למחיקת כל ההזמנות מהמערכת
 * שימוש: node scripts/delete-all-orders.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteAllOrders() {
  try {
    console.log('🔍 מחפש הזמנות במערכת...\n')

    const orderCount = await prisma.order.count()
    console.log(`📊 נמצאו ${orderCount} הזמנות במערכת`)

    if (orderCount === 0) {
      console.log('✅ אין הזמנות למחיקה')
      return
    }

    console.log('🗑️  מוחק את כל ההזמנות...\n')

    const deletedOrders = await prisma.order.deleteMany({})
    console.log(`✓ נמחקו ${deletedOrders.count} הזמנות`)

    console.log('\n✅ כל ההזמנות נמחקו בהצלחה!\n')

  } catch (error) {
    console.error('\n❌ שגיאה במחיקת הזמנות:', error)
    if (error instanceof Error) {
      console.error('פרטי שגיאה:', error.message)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

console.log('═══════════════════════════════════════')
console.log('   🗑️  מחיקת כל ההזמנות')
console.log('═══════════════════════════════════════\n')

deleteAllOrders()
  .then(() => {
    console.log('✅ הסקריפט הושלם בהצלחה')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ הסקריפט נכשל:', error)
    process.exit(1)
  })



