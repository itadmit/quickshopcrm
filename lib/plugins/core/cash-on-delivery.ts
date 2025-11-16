// Cash on Delivery Plugin - תשלום במזומן בעת המסירה
// מוסיף אפשרות תשלום במזומן בעת המסירה

import { PluginHook } from '../types'

export const CashOnDeliveryPlugin: PluginHook = {
  // הוספת שיטת תשלום "מזומן בעת המסירה"
  onPaymentMethodAdd: async (methods: any[], shopId: string) => {
    return [
      ...methods,
      {
        id: 'cash_on_delivery',
        name: 'מזומן בעת המסירה',
        description: 'תשלום במזומן בעת קבלת המשלוח',
        icon: '💵',
        enabled: true,
      },
    ]
  },

  // עיבוד תשלום במזומן - תמיד מצליח (כי התשלום בפועל בעת המסירה)
  onPaymentProcess: async (order: any, method: string, shopId: string) => {
    if (method === 'cash_on_delivery') {
      return {
        success: true,
        paymentId: `cod_${order.id}_${Date.now()}`,
      }
    }
    return { success: false, error: 'Unknown payment method' }
  },
}

