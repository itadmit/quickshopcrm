// Reviews Plugin - מערכת ביקורות מתקדמת
// מאפשר ללקוחות לכתוב ביקורות עם תמונות ווידאו, בדומה ל-Yotpo

import { PluginHook } from '../types'

export const ReviewsPlugin: PluginHook = {
  // כאשר הזמנה הושלמה, נשלח אימייל ללקוח לבקש ביקורת
  onOrderComplete: async (order: any, shopId: string) => {
    // הלוגיקה תיושם ב-API route של ההזמנות
    // נשלח אימייל ללקוח עם קישור לכתיבת ביקורת
    console.log('Order completed, can send review request email:', order)
  },

  // כאשר מוצר נצפה, נציג את הביקורות
  onProductView: async (product: any, shopId: string) => {
    // הלוגיקה תיושם ב-ProductPageClient
    // נטען את הביקורות ונציג אותן
    console.log('Product viewed, loading reviews:', product)
  },
}

