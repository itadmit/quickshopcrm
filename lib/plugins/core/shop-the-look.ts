// Shop the Look Plugin - סימון פריטים על תמונה
// מאפשר לסמן פריטים על תמונה ולקשר אותם למוצרים

import { PluginHook } from '../types'

export const ShopTheLookPlugin: PluginHook = {
  // רינדור קומפוננטה במוצר
  onStorefrontRender: async (shop: any) => {
    // הקומפוננטה תתווסף ישירות בדף המוצר
    // זה יטופל ב-React component
    return null
  },
}

