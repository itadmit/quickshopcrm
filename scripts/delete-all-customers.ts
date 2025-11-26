/**
 * סקריפט למחיקת כל הלקוחות מהמערכת
 * שימוש: npx ts-node scripts/delete-all-customers.ts
 * 
 * ⚠️ אזהרה: הסקריפט ימחק את כל הלקוחות ללא אפשרות שחזור!
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteAllCustomers() {
  try {
    console.log('🔍 מחפש לקוחות במערכת...\n')

    // ספירת הלקוחות לפני המחיקה
    const customerCount = await prisma.customer.count()
    console.log(`📊 נמצאו ${customerCount} לקוחות במערכת`)

    if (customerCount === 0) {
      console.log('✅ אין לקוחות למחיקה')
      return
    }

    // קבלת אישור מהמשתמש
    console.log('\n⚠️  אתה עומד למחוק את כל הלקוחות!')
    console.log('⚠️  פעולה זו תמחק גם:')
    console.log('   - הזמנות הלקוחות')
    console.log('   - החזרות')
    console.log('   - כתובות')
    console.log('   - קרדיט בחנות')
    console.log('   - ביקורות ושאלות')
    console.log('   - עגלות קניות')
    console.log('   - רשימות משאלות\n')

    // בדיקה אם זה סביבת ייצור
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ הסקריפט חסום בסביבת ייצור!')
      console.error('❌ אם אתה בטוח שאתה רוצה להמשיך, הסר את הבדיקה מהקוד')
      process.exit(1)
    }

    console.log('🗑️  מתחיל מחיקה...\n')

    // מחיקת נתונים קשורים ראשית (כדי למנוע שגיאות foreign key)
    
    // 1. מחיקת פריטי עגלה
    const deletedCarts = await prisma.cart.deleteMany({})
    console.log(`✓ נמחקו ${deletedCarts.count} עגלות`)

    // 2. מחיקת ביקורות
    const deletedReviews = await prisma.review.deleteMany({
      where: { customerId: { not: null } }
    })
    console.log(`✓ נמחקו ${deletedReviews.count} ביקורות`)

    // 3. מחיקת תגובות לביקורות
    const deletedReviewReplies = await prisma.reviewReply.deleteMany({
      where: { customerId: { not: null } }
    })
    console.log(`✓ נמחקו ${deletedReviewReplies.count} תגובות לביקורות`)

    // 4. מחיקת שאלות על מוצרים
    const deletedQuestions = await prisma.productQuestion.deleteMany({
      where: { customerId: { not: null } }
    })
    console.log(`✓ נמחקו ${deletedQuestions.count} שאלות`)

    // 5. מחיקת תשובות לשאלות
    const deletedAnswers = await prisma.productAnswer.deleteMany({
      where: { customerId: { not: null } }
    })
    console.log(`✓ נמחקו ${deletedAnswers.count} תשובות`)

    // 6. מחיקת רשימות משאלות
    const deletedWishlistItems = await prisma.wishlistItem.deleteMany({})
    console.log(`✓ נמחקו ${deletedWishlistItems.count} פריטי רשימת משאלות`)

    // 7. מחיקת רשימות המתנה
    const deletedWaitlist = await prisma.waitlist.deleteMany({})
    console.log(`✓ נמחקו ${deletedWaitlist.count} פריטי רשימת המתנה`)

    // 8. מחיקת פניות
    const deletedContacts = await prisma.contact.deleteMany({
      where: { customerId: { not: null } }
    })
    console.log(`✓ נמחקו ${deletedContacts.count} פניות`)

    // 9. מחיקת הערות בבלוג
    const deletedBlogComments = await prisma.blogComment.deleteMany({
      where: { customerId: { not: null } }
    })
    console.log(`✓ נמחקו ${deletedBlogComments.count} הערות בבלוג`)

    // 10. מחיקת קרדיט בחנות (וטרנזקציות)
    const deletedStoreCredit = await prisma.storeCredit.deleteMany({})
    console.log(`✓ נמחק קרדיט בחנות`)

    // 11. מחיקת החזרות (Returns)
    const deletedReturns = await prisma.return.deleteMany({})
    console.log(`✓ נמחקו ${deletedReturns.count} החזרות`)

    // 12. מחיקת הזמנות (מחיקה cascade תמחק גם את OrderItems)
    const deletedOrders = await prisma.order.deleteMany({
      where: { customerId: { not: null } }
    })
    console.log(`✓ נמחקו ${deletedOrders.count} הזמנות`)

    // 13. סוף סוף - מחיקת הלקוחות עצמם
    const deletedCustomers = await prisma.customer.deleteMany({})
    console.log(`✓ נמחקו ${deletedCustomers.count} לקוחות`)

    console.log('\n✅ כל הלקוחות נמחקו בהצלחה!')
    console.log(`📊 סה"כ נמחקו ${deletedCustomers.count} לקוחות\n`)

  } catch (error) {
    console.error('\n❌ שגיאה במחיקת לקוחות:', error)
    if (error instanceof Error) {
      console.error('פרטי שגיאה:', error.message)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// הפעלת הסקריפט
console.log('═══════════════════════════════════════')
console.log('   🗑️  מחיקת כל הלקוחות מהמערכת')
console.log('═══════════════════════════════════════\n')

deleteAllCustomers()
  .then(() => {
    console.log('✅ הסקריפט הושלם בהצלחה')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ הסקריפט נכשל:', error)
    process.exit(1)
  })


