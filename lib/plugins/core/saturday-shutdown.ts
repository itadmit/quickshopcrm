// Saturday Shutdown Plugin - כיבוי האתר בשבת
// מכבה את האתר בשבת (או יום אחר שניתן להגדרה)

import { PluginHook } from '../types'

export const SaturdayShutdownPlugin: PluginHook = {
  // בדיקה אם האתר צריך להיות כבוי
  onScheduleCheck: async (date: Date, shopId: string) => {
    const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
    
    // אם זה שבת (6), האתר כבוי
    if (dayOfWeek === 6) {
      return false // האתר כבוי
    }
    
    return true // האתר פעיל
  },
}

