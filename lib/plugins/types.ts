// סוגי תוספים וממשקים

export type PluginType = 'CORE' | 'SCRIPT'
export type PluginCategory = 
  | 'ANALYTICS'
  | 'MARKETING'
  | 'PAYMENT'
  | 'INVENTORY'
  | 'COMMUNICATION'
  | 'OPERATIONS'
  | 'CUSTOMIZATION'

export type ScriptLocation = 'HEAD' | 'BODY_START' | 'BODY_END'

export interface PluginConfig {
  [key: string]: any
}

export interface PluginMetadata {
  screenshots?: string[]
  documentation?: string
  changelog?: string[]
  supportUrl?: string
  menuItem?: {
    icon?: string
    labelKey?: string
    href?: string
    permission?: string
    section?: string
  }
}

export interface PluginRequirements {
  minVersion?: string
  dependencies?: string[] // slugs של תוספים אחרים
  incompatible?: string[] // slugs של תוספים לא תואמים
}

// ממשק לתוסף Core
export interface PluginHook {
  // אירועי עגלה
  onCartAdd?: (item: any, shopId: string) => Promise<void>
  onCartUpdate?: (cart: any, shopId: string) => Promise<void>
  onCartRemove?: (itemId: string, shopId: string) => Promise<void>
  
  // אירועי הזמנה
  onOrderCreate?: (order: any, shopId: string) => Promise<void>
  onOrderUpdate?: (order: any, shopId: string) => Promise<void>
  onOrderComplete?: (order: any, shopId: string) => Promise<void>
  
  // אירועי מוצר
  onProductView?: (product: any, shopId: string) => Promise<void>
  onProductPurchase?: (product: any, order: any, shopId: string) => Promise<void>
  
  // אירועי תשלום
  onPaymentMethodAdd?: (methods: any[], shopId: string) => Promise<any[]>
  onPaymentProcess?: (order: any, method: string, shopId: string) => Promise<{ success: boolean; paymentId?: string | null; error?: string }>
  
  // אירועי storefront
  onStorefrontRender?: (shop: any) => Promise<React.ReactNode | null>
  onCheckoutRender?: (checkout: any) => Promise<React.ReactNode | null>
  
  // אירועי לוח זמנים
  onScheduleCheck?: (date: Date, shopId: string) => Promise<boolean> // האם להפעיל/לכבות משהו
}

// הגדרת תוסף
export interface PluginDefinition {
  slug: string
  name: string
  description?: string
  icon?: string
  version: string
  author?: string
  type: PluginType
  category: PluginCategory
  isBuiltIn?: boolean
  
  // תמחור
  isFree?: boolean // האם התוסף חינמי
  price?: number // מחיר חודשי (אם לא חינמי)
  
  // Script plugin
  scriptUrl?: string
  scriptContent?: string
  injectLocation?: ScriptLocation
  
  // Core plugin
  hooks?: PluginHook
  
  // Config
  configSchema?: any // Zod schema
  defaultConfig?: PluginConfig
  
  // Metadata
  metadata?: PluginMetadata
  requirements?: PluginRequirements
}

// תוסף מותקן (מהדאטאבייס)
export interface InstalledPlugin {
  id: string
  shopId?: string | null
  companyId?: string | null
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  version: string
  author?: string | null
  type: PluginType
  category: PluginCategory
  isActive: boolean
  isInstalled: boolean
  isBuiltIn: boolean
  scriptUrl?: string | null
  scriptContent?: string | null
  injectLocation?: ScriptLocation | null
  configSchema?: any
  config?: PluginConfig | null
  metadata?: PluginMetadata | null
  requirements?: PluginRequirements | null
  createdAt: Date
  updatedAt: Date
  installedAt?: Date | null
}

