# ארכיטקטורת ספקי משלוחים (Shipping Providers)

## 🎯 מטרה

יצירת מערכת גנרית וניתנת להרחבה לניהול אינטגרציות עם חברות משלוחים שונות, בדומה לארכיטקטורת הפלאגינים.

## 📐 עקרונות עיצוב

1. **ממשק אחיד** - כל חברת משלוחים מיישמת את אותו ממשק
2. **רישום מרכזי** - כל החברות נרשמות במקום אחד
3. **הרחבה קלה** - הוספת חברה חדשה = יצירת קובץ אחד
4. **אוטומציה וגמישות** - תמיכה בשליחה אוטומטית וידנית
5. **מעקב סטטוס** - מעקב אחר סטטוס משלוחים
6. **אירועים** - רישום כל פעולה כאירוע במערכת

---

## 🏗️ מבנה מסד הנתונים

### עדכון מודל Order

```prisma
model Order {
  // ... שדות קיימים ...
  
  // מידע על משלוח
  shippingProvider         String?   // שם החברה (focus, dhl, וכו')
  shippingProviderId       String?   // ID של האינטגרציה
  shippingTrackingNumber   String?   // מספר מעקב מהחברה
  shippingLabelUrl         String?   // URL לתווית משלוח (אם שמור ב-S3)
  shippingLabelS3Key       String?   // S3 key לתווית (אם שמור ב-S3)
  shippingSentAt           DateTime? // מתי נשלח לחברת המשלוחים
  shippingStatus           String?   // סטטוס המשלוח (pending, sent, in_transit, delivered, cancelled, failed)
  shippingStatusUpdatedAt  DateTime? // מתי עודכן הסטטוס לאחרונה
  shippingData             Json?     // מידע נוסף מהחברה (shipment_id, response, וכו')
  shippingError            String?   // שגיאה אחרונה (אם נכשל)
  shippingRetryCount       Int       @default(0) // מספר ניסיונות שליחה
  shippingLastRetryAt      DateTime? // מתי ניסו לשלוח בפעם האחרונה
}
```

### מודל ShippingLog (לוגים וניסיונות)

```prisma
model ShippingLog {
  id              String   @id @default(cuid())
  orderId         String
  provider        String   // focus, dhl, וכו'
  action          String   // create, cancel, get_label, get_status
  status          String   // success, failed, pending
  requestData     Json?    // מה שנשלח
  responseData    Json?    // מה שהתקבל
  error           String?  // שגיאה (אם נכשל)
  durationMs      Int?     // כמה זמן לקח
  retryAttempt    Int      @default(0) // מספר ניסיון
  createdAt       DateTime @default(now())
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
  @@index([provider])
  @@index([status])
  @@index([createdAt])
  @@map("shipping_logs")
}
```

### מודל ShippingIntegration (אופציונלי - אם רוצים להפריד מ-Integration)

```prisma
model ShippingIntegration {
  id          String   @id @default(cuid())
  companyId   String
  provider     String   // focus, dhl, וכו'
  name         String
  apiKey       String?
  apiSecret    String?
  config       Json?    // הגדרות ספציפיות לחברה
  isActive     Boolean  @default(true)
  autoSend     Boolean  @default(false) // האם לשלוח אוטומטית
  autoSendOn   String?  // order.created או order.paid
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  company      Company  @relation(fields: [companyId], references: [id])
  
  @@unique([companyId, provider])
  @@index([companyId])
  @@map("shipping_integrations")
}
```

**או להשתמש ב-Integration הקיים עם סוג חדש:**

```prisma
enum IntegrationType {
  // ... קיימים ...
  FOCUS_SHIPPING
  DHL_SHIPPING
  ISRAEL_POST_SHIPPING
  // ... וכו'
}
```

---

## 🔌 ממשק גנרי (Interface)

```typescript
// lib/shipping/types.ts

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
```

---

## 📁 מבנה תיקיות

```
lib/
  shipping/
    types.ts                    # ממשקים וטיפוסים
    registry.ts                 # רישום כל החברות
    manager.ts                 # ניהול מרכזי
    providers/
      focus/
        index.ts               # מימוש Focus
        types.ts               # טיפוסים ספציפיים
        utils.ts               # פונקציות עזר
      dhl/
        index.ts
        types.ts
        utils.ts
      israel-post/
        index.ts
        types.ts
        utils.ts
```

---

## 📝 רישום חברות (Registry)

```typescript
// lib/shipping/registry.ts

import { ShippingProvider } from './types'
import { FocusShippingProvider } from './providers/focus'
// import { DHLShippingProvider } from './providers/dhl'
// import { IsraelPostShippingProvider } from './providers/israel-post'

export const shippingProviders: Record<string, ShippingProvider> = {
  focus: new FocusShippingProvider(),
  // dhl: new DHLShippingProvider(),
  // 'israel-post': new IsraelPostShippingProvider(),
}

export function getShippingProvider(slug: string): ShippingProvider | null {
  return shippingProviders[slug] || null
}

export function getAllProviders(): ShippingProvider[] {
  return Object.values(shippingProviders)
}
```

---

## 🚀 מימוש Focus (דוגמה)

```typescript
// lib/shipping/providers/focus/index.ts

import { 
  ShippingProvider, 
  ShippingOrder, 
  ShippingResponse,
  ShippingProviderConfig 
} from '../../types'

export class FocusShippingProvider implements ShippingProvider {
  name = 'פוקוס'
  slug = 'focus'
  requiredConfig = ['host', 'customerNumber', 'apiKey'] // אם יש
  
  async createShipment(
    order: ShippingOrder,
    config: ShippingProviderConfig
  ): Promise<ShippingResponse> {
    try {
      // בניית URL לפי ה-API של Focus
      const url = this.buildCreateUrl(order, config)
      
      const response = await fetch(url)
      const data = await this.parseResponse(response)
      
      if (data.error) {
        return {
          success: false,
          error: data.error,
        }
      }
      
      return {
        success: true,
        shipmentId: data.ship_create_num,
        trackingNumber: data.ship_create_num,
        data: data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }
  
  async cancelShipment(
    shipmentId: string,
    config: ShippingProviderConfig
  ): Promise<{ success: boolean; error?: string }> {
    // מימוש ביטול משלוח
  }
  
  async getLabel(
    shipmentId: string,
    config: ShippingProviderConfig
  ): Promise<{ success: boolean; pdfUrl?: string; pdfBuffer?: Buffer; error?: string }> {
    // מימוש קבלת תווית
  }
  
  async getTrackingStatus(
    shipmentId: string,
    config: ShippingProviderConfig
  ): Promise<ShippingStatus> {
    // מימוש מעקב
  }
  
  private buildCreateUrl(order: ShippingOrder, config: ShippingProviderConfig): string {
    // בניית URL לפי ה-API של Focus
    // ...
  }
  
  private parseResponse(response: Response): Promise<any> {
    // פענוח תשובה מ-Focus
    // ...
  }
}
```

---

## 🎛️ מנהל מרכזי (Manager)

```typescript
// lib/shipping/manager.ts

import { prisma } from '../prisma'
import { getShippingProvider } from './registry'
import { createEvent } from '../events'
import { ShippingOrder, ShippingResponse } from './types'
import { uploadToS3 } from '../s3' // אם יש S3

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000 // 5 שניות

export class ShippingManager {
  /**
   * שליחת הזמנה לחברת משלוחים
   */
  static async sendOrder(
    orderId: string,
    providerSlug: string,
    options?: {
      autoSend?: boolean
      triggerEvent?: string
      forceResend?: boolean // האם לשלוח שוב גם אם כבר נשלח
      userId?: string // מי ביצע את הפעולה
    }
  ): Promise<ShippingResponse> {
    const startTime = Date.now()
    let retryAttempt = 0
    
    try {
      // 1. טעינת הזמנה
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { shop: { include: { company: true } }, items: true },
      })
      
      if (!order) {
        throw new Error('הזמנה לא נמצאה')
      }
      
      // 2. בדיקה אם כבר נשלח (אלא אם forceResend)
      if (!options?.forceResend && order.shippingSentAt && order.shippingProvider === providerSlug) {
        throw new Error('ההזמנה כבר נשלחה לחברת המשלוחים. השתמש ב-"שלח שוב" אם צריך')
      }
      
      // 3. אימות כתובת משלוח
      const addressValidation = this.validateShippingAddress(order.shippingAddress)
      if (!addressValidation.valid) {
        throw new Error(`כתובת משלוח לא תקינה: ${addressValidation.error}`)
      }
      
      // 4. טעינת אינטגרציה
      const integration = await prisma.integration.findFirst({
        where: {
          companyId: order.shop.companyId,
          type: `${providerSlug.toUpperCase()}_SHIPPING` as any,
          isActive: true,
        },
      })
      
      if (!integration) {
        throw new Error('אינטגרציה לא נמצאה או לא פעילה')
      }
      
      // 5. טעינת provider
      const provider = getShippingProvider(providerSlug)
      if (!provider) {
        throw new Error(`חברת משלוחים ${providerSlug} לא נתמכת`)
      }
      
      // 6. אימות הגדרות
      if (provider.validateConfig) {
        const configValidation = await provider.validateConfig({
          apiKey: integration.apiKey,
          apiSecret: integration.apiSecret,
          ...(integration.config as any),
        })
        if (!configValidation.valid) {
          throw new Error(`הגדרות אינטגרציה לא תקינות: ${configValidation.error}`)
        }
      }
      
      // 7. המרת הזמנה לפורמט של ShippingOrder
      const shippingOrder = this.convertOrderToShippingOrder(order)
      
      // 8. אימות הזמנה (אם יש)
      if (provider.validateOrder) {
        const orderValidation = await provider.validateOrder(shippingOrder)
        if (!orderValidation.valid) {
          throw new Error(`הזמנה לא תקינה: ${orderValidation.error}`)
        }
      }
      
      // 9. שליחה לחברה (עם retry)
      let response: ShippingResponse
      let lastError: Error | null = null
      
      const maxRetries = provider.features.maxRetries || MAX_RETRIES
      
      for (retryAttempt = 0; retryAttempt <= maxRetries; retryAttempt++) {
        try {
          const timeout = provider.features.timeout || 30000 // 30 שניות ברירת מחדל
          
          response = await Promise.race([
            provider.createShipment(shippingOrder, {
              apiKey: integration.apiKey,
              apiSecret: integration.apiSecret,
              ...(integration.config as any),
            }),
            new Promise<ShippingResponse>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), timeout)
            ),
          ])
          
          // אם הצליח, יוצאים מהלולאה
          if (response.success) break
          
          // אם לא ניתן לנסות שוב, יוצאים
          if (!response.retryable && retryAttempt < maxRetries) {
            break
          }
          
          // מחכים לפני ניסיון הבא
          if (retryAttempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (retryAttempt + 1)))
          }
        } catch (error: any) {
          lastError = error
          
          // אם זה לא שגיאה שניתן לנסות שוב, יוצאים
          if (!this.isRetryableError(error)) {
            response = {
              success: false,
              error: error.message,
              retryable: false,
            }
            break
          }
          
          // מחכים לפני ניסיון הבא
          if (retryAttempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (retryAttempt + 1)))
          }
        }
      }
      
      // אם לא הצליח אחרי כל הניסיונות
      if (!response! || !response.success) {
        response = {
          success: false,
          error: lastError?.message || response?.error || 'נכשל בשליחה',
          retryable: true,
        }
      }
      
      const durationMs = Date.now() - startTime
      
      // 10. שמירת לוג
      await prisma.shippingLog.create({
        data: {
          orderId: order.id,
          provider: providerSlug,
          action: 'create',
          status: response.success ? 'success' : 'failed',
          requestData: shippingOrder as any,
          responseData: response as any,
          error: response.error,
          durationMs,
          retryAttempt,
        },
      })
      
      // 11. עדכון הזמנה
      if (response.success) {
        // שמירת תווית ב-S3 אם יש
        let labelS3Key: string | null = null
        if (response.labelBuffer) {
          labelS3Key = await this.saveLabelToS3(order.id, response.labelBuffer, providerSlug)
        }
        
        await prisma.order.update({
          where: { id: orderId },
          data: {
            shippingProvider: providerSlug,
            shippingProviderId: integration.id,
            shippingTrackingNumber: response.trackingNumber,
            shippingLabelUrl: response.labelUrl || (labelS3Key ? await this.getS3Url(labelS3Key) : null),
            shippingLabelS3Key: labelS3Key,
            shippingSentAt: new Date(),
            shippingStatus: 'sent',
            shippingStatusUpdatedAt: new Date(),
            shippingData: response.data,
            shippingError: null,
            shippingRetryCount: retryAttempt,
            shippingLastRetryAt: new Date(),
          },
        })
        
        // 12. יצירת אירוע
        await createEvent(
          order.shopId,
          'order.shipping.sent',
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            provider: providerSlug,
            trackingNumber: response.trackingNumber,
            autoSend: options?.autoSend || false,
            retryAttempt,
          },
          'order',
          order.id,
          options?.userId
        )
      } else {
        // עדכון עם שגיאה
        await prisma.order.update({
          where: { id: orderId },
          data: {
            shippingError: response.error,
            shippingRetryCount: retryAttempt,
            shippingLastRetryAt: new Date(),
            shippingStatus: 'failed',
          },
        })
        
        // יצירת אירוע שגיאה
        await createEvent(
          order.shopId,
          'order.shipping.failed',
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            provider: providerSlug,
            error: response.error,
            errorCode: response.errorCode,
            retryAttempt,
            retryable: response.retryable,
          },
          'order',
          order.id,
          options?.userId
        )
      }
      
      return response
    } catch (error: any) {
      // לוג שגיאה
      await prisma.shippingLog.create({
        data: {
          orderId,
          provider: providerSlug,
          action: 'create',
          status: 'failed',
          error: error.message,
          durationMs: Date.now() - startTime,
          retryAttempt,
        },
      })
      
      throw error
    }
  }
  
  /**
   * בדיקה אם שגיאה ניתנת לניסיון חוזר
   */
  private static isRetryableError(error: any): boolean {
    // שגיאות network - ניתן לנסות שוב
    if (error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
      return true
    }
    
    // שגיאות 5xx - ניתן לנסות שוב
    if (error.status >= 500) {
      return true
    }
    
    // שגיאות אחרות - לא לנסות שוב
    return false
  }
  
  /**
   * אימות כתובת משלוח
   */
  private static validateShippingAddress(address: any): { valid: boolean; error?: string } {
    if (!address) {
      return { valid: false, error: 'כתובת משלוח חסרה' }
    }
    
    if (!address.city || address.city.trim() === '') {
      return { valid: false, error: 'עיר משלוח חסרה' }
    }
    
    if (!address.street || address.street.trim() === '') {
      return { valid: false, error: 'רחוב משלוח חסר' }
    }
    
    return { valid: true }
  }
  
  /**
   * שמירת תווית ב-S3
   */
  private static async saveLabelToS3(orderId: string, buffer: Buffer, provider: string): Promise<string> {
    const key = `shipping-labels/${provider}/${orderId}-${Date.now()}.pdf`
    await uploadToS3(key, buffer, 'application/pdf')
    return key
  }
  
  /**
   * קבלת URL מ-S3
   */
  private static async getS3Url(key: string): Promise<string> {
    // מחזיר signed URL או public URL
    return `https://your-bucket.s3.amazonaws.com/${key}`
  }
  
  /**
   * המרת Order ל-ShippingOrder
   */
  private static convertOrderToShippingOrder(order: any): ShippingOrder {
    const shippingAddress = order.shippingAddress as any
    
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      reference: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone || '',
      customerEmail: order.customerEmail,
      shippingAddress: {
        name: shippingAddress.name || order.customerName,
        phone: shippingAddress.phone || order.customerPhone || '',
        email: shippingAddress.email || order.customerEmail,
        city: shippingAddress.city || '',
        street: shippingAddress.street || '',
        houseNumber: shippingAddress.houseNumber || shippingAddress.number,
        apartment: shippingAddress.apartment,
        floor: shippingAddress.floor,
        entrance: shippingAddress.entrance,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country || 'ישראל',
      },
      packages: [
        {
          quantity: 1, // ניתן לחשב לפי מספר פריטים
        },
      ],
      items: order.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
      })),
      notes: order.notes,
      total: order.total,
    }
  }
  
  /**
   * בדיקה אם צריך לשלוח אוטומטית
   * רץ ברקע ולא blocking
   */
  static async checkAutoSend(orderId: string, eventType: string): Promise<void> {
    // רץ ברקע - לא מחכים
    setImmediate(async () => {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { shop: { include: { company: true } } },
        })
        
        if (!order) return
        
        // בדיקה אם כבר נשלח (לא לשלוח שוב)
        if (order.shippingSentAt) {
          return
        }
        
        // מציאת אינטגרציות עם autoSend
        const integrations = await prisma.integration.findMany({
          where: {
            companyId: order.shop.companyId,
            type: { contains: '_SHIPPING' },
            isActive: true,
          },
        })
        
        // סינון אינטגרציות עם autoSend
        const autoSendIntegrations = integrations.filter(integration => {
          const config = integration.config as any
          return config?.autoSend === true && config?.autoSendOn === eventType
        })
        
        // אם יש כמה אינטגרציות, שולחים רק לראשונה (או לפי priority)
        // TODO: אפשר להוסיף priority או allowMultiple
        const integrationToUse = autoSendIntegrations[0]
        
        if (integrationToUse) {
          const providerSlug = integrationToUse.type.toLowerCase().replace('_shipping', '')
          try {
            await this.sendOrder(orderId, providerSlug, {
              autoSend: true,
              triggerEvent: eventType,
            })
          } catch (error: any) {
            console.error(`Error auto-sending to ${providerSlug}:`, error)
            // לא זורקים שגיאה - רק לוג
          }
        }
      } catch (error: any) {
        console.error('Error in checkAutoSend:', error)
        // לא זורקים שגיאה - רק לוג
      }
    })
  }
  
  /**
   * ביטול משלוח
   */
  static async cancelShipment(
    orderId: string,
    reason?: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shop: true },
    })
    
    if (!order) {
      throw new Error('הזמנה לא נמצאה')
    }
    
    if (!order.shippingProvider || !order.shippingTrackingNumber) {
      throw new Error('הזמנה לא נשלחה לחברת משלוחים')
    }
    
    const provider = getShippingProvider(order.shippingProvider)
    if (!provider) {
      throw new Error(`חברת משלוחים ${order.shippingProvider} לא נתמכת`)
    }
    
    const integration = await prisma.integration.findUnique({
      where: { id: order.shippingProviderId! },
    })
    
    if (!integration) {
      throw new Error('אינטגרציה לא נמצאה')
    }
    
    const result = await provider.cancelShipment(
      order.shippingTrackingNumber,
      {
        apiKey: integration.apiKey,
        apiSecret: integration.apiSecret,
        ...(integration.config as any),
      },
      reason
    )
    
    if (result.success) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          shippingStatus: 'cancelled',
          shippingStatusUpdatedAt: new Date(),
        },
      })
      
      await createEvent(
        order.shopId,
        'order.shipping.cancelled',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          provider: order.shippingProvider,
          reason,
        },
        'order',
        order.id,
        userId
      )
    }
    
    return result
  }
  
  /**
   * עדכון סטטוס משלוח (מ-webhook או polling)
   */
  static async updateShippingStatus(
    orderId: string,
    status: string,
    data?: any
  ): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingStatus: status,
        shippingStatusUpdatedAt: new Date(),
        shippingData: data,
      },
    })
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })
    
    if (order) {
      await createEvent(
        order.shopId,
        'order.shipping.status_updated',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status,
          data,
        },
        'order',
        order.id
      )
    }
  }
}
```

---

## 🔄 אינטגרציה עם אירועים

### הוספה ל-lib/events.ts

```typescript
// אחרי יצירת order.created או order.paid
await ShippingManager.checkAutoSend(order.id, 'order.paid')
```

### אירועים חדשים

- `order.shipping.sent` - הזמנה נשלחה לחברת משלוחים
- `order.shipping.failed` - נכשל בשליחה
- `order.shipping.cancelled` - משלוח בוטל
- `order.shipping.status_updated` - סטטוס משלוח עודכן

---

## 🎨 UI - דף אינטגרציות

### עדכון `/settings/integrations`

```typescript
// הוספת קטגוריית shipping עם רשימת חברות
const shippingProviders = [
  {
    id: 'focus',
    name: 'פוקוס',
    logo: '/logos/focus.svg',
    type: 'חברת משלוחים',
  },
  // ...
]
```

### כפתור "שלח משלוח" בעמוד הזמנה

```typescript
// app/orders/[id]/page.tsx
<Button 
  onClick={async () => {
    await fetch(`/api/shipping/send/${order.id}`, {
      method: 'POST',
      body: JSON.stringify({ provider: 'focus' })
    })
  }}
>
  שלח לפוקוס
</Button>
```

---

## 📡 API Routes

### `/api/shipping/providers`
- `GET` - רשימת כל החברות הזמינות
- Response: `Array<{ slug, name, displayName, features }>`

### `/api/shipping/send/[orderId]`
- `POST` - שליחת הזמנה לחברה
```json
{
  "provider": "focus",
  "forceResend": false // האם לשלוח שוב גם אם כבר נשלח
}
```
- Response: `ShippingResponse`
- Errors:
  - `400` - הזמנה כבר נשלחה (אלא אם forceResend=true)
  - `400` - כתובת לא תקינה
  - `404` - אינטגרציה לא נמצאה
  - `500` - שגיאה בשליחה

### `/api/shipping/cancel/[orderId]`
- `POST` - ביטול משלוח
```json
{
  "reason": "לקוח ביטל"
}
```
- Response: `{ success: boolean, error?: string }`
- Errors:
  - `400` - הזמנה לא נשלחה
  - `400` - לא ניתן לבטל (כבר בדרך)
  - `500` - שגיאה בביטול

### `/api/shipping/label/[orderId]`
- `GET` - קבלת תווית משלוח (PDF)
- Response: PDF file או redirect ל-S3
- Errors:
  - `404` - תווית לא נמצאה
  - `500` - שגיאה בקבלת תווית

### `/api/shipping/tracking/[orderId]`
- `GET` - מעקב אחר משלוח
- Response: `ShippingStatus`
- Errors:
  - `404` - הזמנה לא נשלחה
  - `500` - שגיאה בקבלת סטטוס

### `/api/shipping/webhook/[provider]`
- `POST` - Webhook מחברת משלוחים
- Headers: אימות לפי החברה
- Body: תלוי בחברה
- Response: `200` תמיד (גם אם יש שגיאה)

### `/api/shipping/retry/[orderId]`
- `POST` - ניסיון חוזר לשליחה שנכשלה
- Response: `ShippingResponse`

### `/api/shipping/logs/[orderId]`
- `GET` - היסטוריית לוגים של הזמנה
- Query params: `?limit=10&offset=0`
- Response: `Array<ShippingLog>`

---

## ✅ יתרונות הארכיטקטורה

1. **הרחבה קלה** - הוספת חברה חדשה = יצירת קובץ אחד
2. **קוד נקי** - כל חברה במודול נפרד
3. **בדיקות** - קל לבדוק כל חברה בנפרד
4. **תחזוקה** - שינוי בחברה אחת לא משפיע על אחרות
5. **גמישות** - תמיכה בשליחה אוטומטית וידנית
6. **מעקב** - כל פעולה נרשמת כאירוע

---

## 🚀 שלבי יישום

### שלב 1: תשתית בסיסית
1. ✅ עדכון schema.prisma
2. ✅ יצירת types.ts
3. ✅ יצירת registry.ts
4. ✅ יצירת manager.ts

### שלב 2: מימוש Focus
1. ✅ יצירת providers/focus/
2. ✅ מימוש כל הפונקציות
3. ✅ בדיקות

### שלב 3: UI
1. ✅ עדכון דף אינטגרציות
2. ✅ כפתור "שלח משלוח" בעמוד הזמנה
3. ✅ תצוגת סטטוס משלוח

### שלב 4: אוטומציה
1. ✅ הוספה ל-events.ts
2. ✅ הגדרות autoSend
3. ✅ בדיקת שליחה כפולה

### שלב 5: חברות נוספות
1. ✅ DHL
2. ✅ דואר ישראל
3. ✅ וכו'

---

## 📝 הערות חשובות

### אבטחה
1. **API Keys** - שמורים ב-Integration בלבד, לא ב-Order
2. **אימות Webhooks** - כל חברה צריכה לספק מנגנון אימות (HMAC, token, וכו')
3. **Rate Limiting** - הגבלת מספר ניסיונות שליחה
4. **Logging** - כל פעולה נרשמת (ללא API keys)

### ביצועים
1. **שליחה אוטומטית** - לא blocking, רץ ברקע
2. **Retry Mechanism** - ניסיונות חוזרים עם exponential backoff
3. **Timeout** - timeout לכל קריאה (30 שניות ברירת מחדל)
4. **Queue** - אפשר להוסיף queue system לשליחות אוטומטיות

### טיפול בשגיאות
1. **לוגים** - כל ניסיון נרשם ב-ShippingLog
2. **אירועים** - כל שגיאה נרשמת כאירוע
3. **Retryable Errors** - זיהוי שגיאות שניתן לנסות שוב
4. **User Feedback** - הודעות שגיאה ברורות למשתמש

### מקרי קצה
1. **שליחה כפולה** - בדיקה + אפשרות "שלח שוב"
2. **ביטול** - בדיקה אם ניתן לבטל
3. **כתובת חסרה** - אימות לפני שליחה
4. **API לא זמין** - retry + fallback
5. **כמה אינטגרציות** - שליחה רק לראשונה (או לפי priority)
6. **Webhook כפול** - idempotency key

### UX
1. **תצוגת סטטוס** - סטטוס משלוח בעמוד הזמנה
2. **היסטוריה** - לוגים וניסיונות
3. **כפתורים** - "שלח", "שלח שוב", "ביטול", "תווית", "מעקב"
4. **הודעות** - הודעות ברורות על הצלחה/כישלון

### תאימות
1. **Backward Compatibility** - שדות חדשים אופציונליים
2. **Migration** - migration script לשדות חדשים
3. **Default Values** - ערכי ברירת מחדל לכל השדות

---

## 🔄 Polling לעדכון סטטוס

אם חברת משלוחים לא תומכת ב-webhook, צריך polling:

```typescript
// lib/shipping/polling.ts

export async function pollShippingStatuses() {
  // מציאת כל ההזמנות שנשלחו אבל לא נמסרו
  const orders = await prisma.order.findMany({
    where: {
      shippingSentAt: { not: null },
      shippingStatus: { in: ['sent', 'in_transit'] },
      shippingStatusUpdatedAt: {
        // לא עודכן ב-24 שעות האחרונות
        lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    include: { shop: true },
  })
  
  for (const order of orders) {
    if (!order.shippingProvider || !order.shippingTrackingNumber) continue
    
    const provider = getShippingProvider(order.shippingProvider)
    if (!provider) continue
    
    const integration = await prisma.integration.findUnique({
      where: { id: order.shippingProviderId! },
    })
    
    if (!integration) continue
    
    try {
      const status = await provider.getTrackingStatus(
        order.shippingTrackingNumber,
        {
          apiKey: integration.apiKey,
          apiSecret: integration.apiSecret,
          ...(integration.config as any),
        }
      )
      
      // עדכון סטטוס אם השתנה
      if (status.status !== order.shippingStatus) {
        await ShippingManager.updateShippingStatus(order.id, status.status, status)
      }
    } catch (error: any) {
      console.error(`Error polling status for order ${order.id}:`, error)
    }
  }
}

// הרצה כל שעה (cron job)
```

## 🔔 Webhook Handling

```typescript
// app/api/shipping/webhook/[provider]/route.ts

export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = getShippingProvider(params.provider)
    if (!provider || !provider.processWebhook) {
      return NextResponse.json({ error: 'Provider not found or webhook not supported' }, { status: 404 })
    }
    
    const body = await req.json()
    const headers = Object.fromEntries(req.headers.entries())
    
    // מציאת כל האינטגרציות של החברה הזו
    const integrations = await prisma.integration.findMany({
      where: {
        type: `${params.provider.toUpperCase()}_SHIPPING` as any,
        isActive: true,
      },
    })
    
    // ניסיון לעבד עם כל אינטגרציה עד שמצאנו את הנכונה
    for (const integration of integrations) {
      const result = await provider.processWebhook(
        body,
        headers,
        {
          apiKey: integration.apiKey,
          apiSecret: integration.apiSecret,
          ...(integration.config as any),
        }
      )
      
      if (result.valid && result.trackingNumber) {
        // מציאת הזמנה לפי tracking number
        const order = await prisma.order.findFirst({
          where: {
            shippingTrackingNumber: result.trackingNumber,
            shippingProvider: params.provider,
          },
        })
        
        if (order && result.status) {
          await ShippingManager.updateShippingStatus(order.id, result.status, result.data)
        }
        
        // תמיד מחזירים 200 גם אם לא מצאנו הזמנה
        return NextResponse.json({ received: true })
      }
    }
    
    // אם לא מצאנו אינטגרציה תואמת
    return NextResponse.json({ received: true, error: 'No matching integration' })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    // תמיד מחזירים 200 כדי שהחברה לא תנסה שוב
    return NextResponse.json({ received: true, error: 'Internal error' })
  }
}
```

## 🧪 בדיקות (Testing)

```typescript
// lib/shipping/__tests__/manager.test.ts

describe('ShippingManager', () => {
  it('should send order successfully', async () => {
    // Mock provider
    const mockProvider = {
      name: 'Test Provider',
      slug: 'test',
      createShipment: jest.fn().mockResolvedValue({
        success: true,
        trackingNumber: '12345',
      }),
    }
    
    // Test
    const result = await ShippingManager.sendOrder('order-id', 'test')
    
    expect(result.success).toBe(true)
    expect(result.trackingNumber).toBe('12345')
  })
  
  it('should retry on network error', async () => {
    // Mock provider that fails first time
    let attempt = 0
    const mockProvider = {
      createShipment: jest.fn().mockImplementation(() => {
        attempt++
        if (attempt === 1) {
          throw new Error('Network error')
        }
        return Promise.resolve({ success: true, trackingNumber: '12345' })
      }),
    }
    
    // Test retry
    const result = await ShippingManager.sendOrder('order-id', 'test')
    
    expect(result.success).toBe(true)
    expect(mockProvider.createShipment).toHaveBeenCalledTimes(2)
  })
  
  it('should not send twice without forceResend', async () => {
    // Create order that already sent
    await prisma.order.update({
      where: { id: 'order-id' },
      data: { shippingSentAt: new Date() },
    })
    
    // Test
    await expect(
      ShippingManager.sendOrder('order-id', 'test')
    ).rejects.toThrow('כבר נשלח')
  })
})
```

## 📊 Monitoring & Alerts

```typescript
// lib/shipping/monitoring.ts

export async function checkShippingHealth() {
  // בדיקת הזמנות שנכשלו יותר מדי פעמים
  const failedOrders = await prisma.order.findMany({
    where: {
      shippingStatus: 'failed',
      shippingRetryCount: { gte: 3 },
      shippingLastRetryAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // ב-24 שעות האחרונות
      },
    },
  })
  
  if (failedOrders.length > 0) {
    // שליחת התראה
    await createEvent(
      'system',
      'shipping.health_check.failed',
      {
        count: failedOrders.length,
        orders: failedOrders.map(o => o.id),
      }
    )
  }
  
  // בדיקת אינטגרציות לא פעילות
  const inactiveIntegrations = await prisma.integration.findMany({
    where: {
      type: { contains: '_SHIPPING' },
      isActive: false,
    },
  })
  
  // וכו'...
}
```

## 🎯 Checklist לפני Deploy

- [ ] כל השדות ב-schema.prisma עם default values
- [ ] Migration script מוכן
- [ ] כל ה-API routes עם error handling
- [ ] Webhook routes עם אימות
- [ ] Retry mechanism מוכן
- [ ] Logging לכל פעולה
- [ ] Polling job מוכן (אם צריך)
- [ ] UI עם כל הכפתורים
- [ ] בדיקות יחידה
- [ ] תיעוד API

---

**עודכן:** 2025-01-XX  
**גרסה:** 2.0 (לאחר סקירת QA)

