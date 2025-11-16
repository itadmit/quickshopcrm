import { prisma } from '../prisma'
import { getShippingProvider } from './registry'
import { createEvent } from '../events'
import { ShippingOrder, ShippingResponse } from './types'

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
      forceResend?: boolean
      userId?: string
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
          const timeout = provider.features.timeout || 30000
          
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
          
          if (response.success) break
          
          if (!response.retryable && retryAttempt < maxRetries) {
            break
          }
          
          if (retryAttempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (retryAttempt + 1)))
          }
        } catch (error: any) {
          lastError = error
          
          if (!this.isRetryableError(error)) {
            response = {
              success: false,
              error: error.message,
              retryable: false,
            }
            break
          }
          
          if (retryAttempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (retryAttempt + 1)))
          }
        }
      }
      
      if (!response! || !response.success) {
        response = {
          success: false,
          error: lastError?.message || response?.error || 'נכשל בשליחה',
          retryable: true,
        }
      }
      
      const durationMs = Date.now() - startTime
      
      // 10. שמירת לוג
      try {
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
      } catch (logError) {
        console.error('Error creating shipping log:', logError)
        // לא זורקים שגיאה - רק לוג
      }
      
      // 11. עדכון הזמנה
      if (response.success) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            shippingProvider: providerSlug,
            shippingProviderId: integration.id,
            shippingTrackingNumber: response.trackingNumber,
            shippingLabelUrl: response.labelUrl || null,
            shippingSentAt: new Date(),
            shippingStatus: 'sent',
            shippingStatusUpdatedAt: new Date(),
            shippingData: response.data,
            shippingError: null,
            shippingRetryCount: retryAttempt,
            shippingLastRetryAt: new Date(),
          },
        })
        
        // 11. יצירת אירוע
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
        await prisma.order.update({
          where: { id: orderId },
          data: {
            shippingError: response.error,
            shippingRetryCount: retryAttempt,
            shippingLastRetryAt: new Date(),
            shippingStatus: 'failed',
          },
        })
        
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
      throw error
    }
  }
  
  private static isRetryableError(error: any): boolean {
    if (error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
      return true
    }
    if (error.status >= 500) {
      return true
    }
    return false
  }
  
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
          quantity: 1,
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
   */
  static async checkAutoSend(orderId: string, eventType: string): Promise<void> {
    setImmediate(async () => {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { shop: { include: { company: true } } },
        })
        
        if (!order || order.shippingSentAt) return
        
        const integrations = await prisma.integration.findMany({
          where: {
            companyId: order.shop.companyId,
            type: { contains: '_SHIPPING' },
            isActive: true,
          },
        })
        
        const autoSendIntegrations = integrations.filter(integration => {
          const config = integration.config as any
          if (config?.autoSend !== true || config?.autoSendOn !== eventType) {
            return false
          }
          
          // בדיקה אם יש הגבלה על shipping methods
          const shippingMethods = config?.shippingMethods || []
          if (shippingMethods.length > 0) {
            // בדיקה מה שיטת המשלוח של ההזמנה
            const orderDeliveryMethod = (order as any).deliveryMethod || 'shipping'
            if (!shippingMethods.includes(orderDeliveryMethod)) {
              return false // לא לשלוח אם שיטת המשלוח לא נבחרה
            }
          }
          
          return true
        })
        
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
          }
        }
      } catch (error: any) {
        console.error('Error in checkAutoSend:', error)
      }
    })
  }
  
  /**
   * עדכון סטטוס משלוח
   */
  static async updateShippingStatus(
    orderId: string,
    status: string,
    data?: any
  ): Promise<void> {
    try {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          shippingStatus: status,
          shippingStatusUpdatedAt: new Date(),
          shippingData: data ? { ...((await prisma.order.findUnique({ where: { id: orderId } }))?.shippingData as any || {}), ...data } : undefined,
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
    } catch (error) {
      console.error('Error updating shipping status:', error)
      throw error
    }
  }
}

