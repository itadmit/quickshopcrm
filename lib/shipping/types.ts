// סוגים וממשקים לספקי משלוחים

export interface ShippingAddress {
  name: string
  phone: string
  email?: string
  city: string
  street: string
  houseNumber?: string
  apartment?: string
  floor?: string
  entrance?: string
  zipCode?: string
  country?: string
}

export interface ShippingPackage {
  weight?: number // בק"ג
  dimensions?: {
    length?: number // בס"מ
    width?: number
    height?: number
  }
  quantity?: number // מספר חבילות
}

export interface ShippingOrder {
  orderId: string
  orderNumber: string
  reference?: string // מספר אסמכתא (orderNumber בדרך כלל)
  customerName: string
  customerPhone: string
  customerEmail?: string
  shippingAddress: ShippingAddress
  packages: ShippingPackage[]
  items?: Array<{
    name: string
    quantity: number
    weight?: number
  }>
  notes?: string
  total?: number // סכום ההזמנה (למקרה של COD)
}

export interface ShippingResponse {
  success: boolean
  shipmentId?: string // מספר משלוח מהחברה
  trackingNumber?: string
  labelUrl?: string // URL לתווית (אם החברה מחזירה URL)
  labelBuffer?: Buffer // Buffer של PDF (אם צריך לשמור)
  error?: string
  errorCode?: string // קוד שגיאה מהחברה
  data?: any // מידע נוסף
  retryable?: boolean // האם ניתן לנסות שוב
}

export interface ShippingStatus {
  status: 'pending' | 'sent' | 'in_transit' | 'delivered' | 'cancelled' | 'failed' | 'returned'
  trackingNumber?: string
  lastUpdate?: Date
  location?: string
  estimatedDelivery?: Date
  driverName?: string
  driverPhone?: string
  events?: Array<{
    date: Date
    status: string
    description: string
    location?: string
  }>
  canCancel?: boolean // האם ניתן לבטל
  cancelDeadline?: Date // עד מתי ניתן לבטל
}

export interface ShippingProviderConfig {
  apiKey?: string
  apiSecret?: string
  host?: string
  customerNumber?: string
  [key: string]: any // הגדרות ספציפיות
}

/**
 * ממשק שכל חברת משלוחים חייבת לממש
 */
export interface ShippingProvider {
  // שם החברה
  name: string
  slug: string
  displayName: string // שם להצגה
  
  // הגדרות נדרשות
  requiredConfig: string[] // ['apiKey', 'apiSecret', 'host']
  
  // תכונות
  features: {
    supportsPickupPoints?: boolean
    supportsCOD?: boolean // Cash on Delivery
    supportsScheduledPickup?: boolean
    supportsWebhook?: boolean // האם החברה שולחת webhook
    maxRetries?: number // מספר ניסיונות מקסימלי
    timeout?: number // timeout במילישניות
  }
  
  /**
   * אימות הגדרות לפני שימוש
   */
  validateConfig?(config: ShippingProviderConfig): Promise<{ valid: boolean; error?: string }>
  
  /**
   * אימות הזמנה לפני שליחה
   */
  validateOrder?(order: ShippingOrder): Promise<{ valid: boolean; error?: string }>
  
  /**
   * יצירת משלוח
   */
  createShipment(
    order: ShippingOrder,
    config: ShippingProviderConfig
  ): Promise<ShippingResponse>
  
  /**
   * ביטול משלוח
   * מחזיר מידע האם הביטול הצליח ואם לא - למה
   */
  cancelShipment(
    shipmentId: string,
    config: ShippingProviderConfig,
    reason?: string
  ): Promise<{ 
    success: boolean
    error?: string
    errorCode?: string
    canRetry?: boolean
  }>
  
  /**
   * קבלת תווית משלוח (PDF)
   */
  getLabel(
    shipmentId: string,
    config: ShippingProviderConfig
  ): Promise<{ 
    success: boolean
    pdfUrl?: string
    pdfBuffer?: Buffer
    error?: string
    errorCode?: string
  }>
  
  /**
   * מעקב אחר סטטוס משלוח
   */
  getTrackingStatus(
    shipmentId: string,
    config: ShippingProviderConfig
  ): Promise<ShippingStatus>
  
  /**
   * קבלת נקודות חלוקה (אם רלוונטי)
   */
  getPickupPoints?(
    city: string,
    config: ShippingProviderConfig
  ): Promise<Array<{
    id: string
    name: string
    address: string
    city: string
    hours?: string
    type?: 'store' | 'locker'
    coordinates?: { lat: number; lng: number }
  }>>
  
  /**
   * עיבוד Webhook מהחברה (אם יש)
   */
  processWebhook?(
    payload: any,
    headers: Record<string, string>,
    config: ShippingProviderConfig
  ): Promise<{
    valid: boolean
    orderId?: string
    trackingNumber?: string
    status?: string
    data?: any
  }>
}

