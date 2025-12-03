import { 
  ShippingProvider, 
  ShippingOrder, 
  ShippingResponse,
  ShippingProviderConfig,
  ShippingStatus
} from '../../types'
import { parseStringPromise } from 'xml2js'

/**
 * מימוש אינטגרציה עם פוקוס (Focus Shipping)
 * לפי ה-API של Run ERP
 */
export class FocusShippingProvider implements ShippingProvider {
  name = 'פוקוס'
  slug = 'focus'
  displayName = 'פוקוס'
  requiredConfig = ['host', 'customerNumber']
  
  features = {
    supportsPickupPoints: true,
    supportsCOD: true,
    supportsScheduledPickup: true,
    supportsWebhook: true, // לפי התיעוד יש PUSH
    maxRetries: 3,
    timeout: 30000, // 30 שניות
  }
  
  /**
   * אימות הגדרות
   */
  async validateConfig(config: ShippingProviderConfig): Promise<{ valid: boolean; error?: string }> {
    if (!config.host) {
      return { valid: false, error: 'כתובת שרת (host) חסרה' }
    }
    
    if (!config.customerNumber) {
      return { valid: false, error: 'מספר לקוח חסר' }
    }
    
    // בדיקת תקינות URL
    try {
      new URL(config.host)
    } catch {
      return { valid: false, error: 'כתובת שרת לא תקינה' }
    }
    
    return { valid: true }
  }
  
  /**
   * אימות הזמנה
   */
  async validateOrder(order: ShippingOrder): Promise<{ valid: boolean; error?: string }> {
    if (!order.shippingAddress.city || order.shippingAddress.city.trim() === '') {
      return { valid: false, error: 'עיר משלוח חסרה' }
    }
    
    if (!order.shippingAddress.street || order.shippingAddress.street.trim() === '') {
      return { valid: false, error: 'רחוב משלוח חסר' }
    }
    
    if (!order.shippingAddress.name || order.shippingAddress.name.trim() === '') {
      return { valid: false, error: 'שם מקבל חסר' }
    }
    
    if (!order.shippingAddress.phone || order.shippingAddress.phone.trim() === '') {
      return { valid: false, error: 'טלפון מקבל חסר' }
    }
    
    return { valid: true }
  }
  
  /**
   * יצירת משלוח
   */
  async createShipment(
    order: ShippingOrder,
    config: ShippingProviderConfig
  ): Promise<ShippingResponse> {
    try {
      // בניית URL
      const url = this.buildCreateUrl(order, config)
      
      // שליחה עם Authorization header אם יש
      const headers: Record<string, string> = {
        'Accept': 'application/xml, text/plain, */*',
      }
      
      if (config.apiKey) {
        headers['Authorization'] = config.apiKey
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error: 'אימות נכשל - בדוק את ה-API Key',
            errorCode: '401',
            retryable: false,
          }
        }
        
        return {
          success: false,
          error: `שגיאת שרת: ${response.status}`,
          errorCode: response.status.toString(),
          retryable: response.status >= 500,
        }
      }
      
      // פענוח תשובה
      const contentType = response.headers.get('content-type') || ''
      
      if (contentType.includes('xml')) {
        const xmlText = await response.text()
        return this.parseXmlResponse(xmlText, order)
      } else {
        // TXT format
        const text = await response.text()
        return this.parseTxtResponse(text, order)
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'שגיאה בשליחה',
        retryable: true,
      }
    }
  }
  
  /**
   * ביטול משלוח
   */
  async cancelShipment(
    shipmentId: string,
    config: ShippingProviderConfig,
    reason?: string
  ): Promise<{ success: boolean; error?: string; errorCode?: string; canRetry?: boolean }> {
    try {
      // צריך את ship_num_rand לביטול, לא ship_create_num
      // נשתמש ב-shipmentId כ-random number
      const url = `${config.host}/RunCom.Server/Request.aspx?APPNAME=run&PRGNAME=bitul_mishloah&ARGUMENTS=-A${shipmentId},-A,-A,-A,-N${config.customerNumber}`
      
      const headers: Record<string, string> = {}
      if (config.apiKey) {
        headers['Authorization'] = config.apiKey
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      })
      
      const text = await response.text()
      
      if (response.ok && text.includes('בוטל') || text.toLowerCase().includes('cancel')) {
        return { success: true }
      }
      
      return {
        success: false,
        error: text || 'לא ניתן לבטל את המשלוח',
        canRetry: false,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        canRetry: true,
      }
    }
  }
  
  /**
   * קבלת תווית משלוח
   */
  async getLabel(
    shipmentId: string,
    config: ShippingProviderConfig
  ): Promise<{ success: boolean; pdfUrl?: string; pdfBuffer?: Buffer; error?: string; errorCode?: string }> {
    try {
      // צריך reference number - נשתמש ב-shipmentId
      const url = `${config.host}/RunCom.Server/Request.aspx?APPNAME=run&PRGNAME=ship_print_ws&ARGUMENTS=-N${shipmentId},-A,-A,-A,-A,-A,-A,-N,-A${shipmentId}`
      
      const headers: Record<string, string> = {}
      if (config.apiKey) {
        headers['Authorization'] = config.apiKey
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      })
      
      if (!response.ok) {
        return {
          success: false,
          error: `שגיאה בקבלת תווית: ${response.status}`,
          errorCode: response.status.toString(),
        }
      }
      
      const buffer = Buffer.from(await response.arrayBuffer())
      
      return {
        success: true,
        pdfBuffer: buffer,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }
  
  /**
   * מעקב אחר סטטוס
   */
  async getTrackingStatus(
    shipmentId: string,
    config: ShippingProviderConfig
  ): Promise<ShippingStatus> {
    try {
      const url = `${config.host}/RunCom.Server/Request.aspx?APPNAME=run&PRGNAME=ship_status_xml&ARGUMENTS=-N${shipmentId},-A`
      
      const headers: Record<string, string> = {
        'Accept': 'application/xml',
      }
      if (config.apiKey) {
        headers['Authorization'] = config.apiKey
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      })
      
      if (!response.ok) {
        return {
          status: 'failed',
        }
      }
      
      const xmlText = await response.text()
      return this.parseTrackingXml(xmlText)
    } catch (error: any) {
      return {
        status: 'failed',
      }
    }
  }
  
  /**
   * קבלת נקודות חלוקה
   */
  async getPickupPoints(
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
  }>> {
    try {
      const url = `${config.host}/RunCom.Server/Request.aspx?APPNAME=run&PRGNAME=ws_spotslist&ARGUMENTS=-A${encodeURIComponent(city)},-A,-N`
      
      const headers: Record<string, string> = {
        'Accept': 'application/xml',
      }
      if (config.apiKey) {
        headers['Authorization'] = config.apiKey
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      })
      
      if (!response.ok) {
        return []
      }
      
      const xmlText = await response.text()
      return this.parsePickupPointsXml(xmlText)
    } catch (error) {
      return []
    }
  }
  
  /**
   * בניית URL ליצירת משלוח
   */
  private buildCreateUrl(order: ShippingOrder, config: ShippingProviderConfig): string {
    const params: string[] = []
    
    // P1 - מספר לקוח
    params.push(`-N${config.customerNumber}`)
    
    // P2 - מסירה (תמיד מסירה, לא איסוף)
    params.push('-Aמסירה')
    
    // P3 - סוג משלוח (ברירת מחדל 101, ניתן להגדיר ב-config)
    const shipmentType = config.shipmentType || '101'
    params.push(`-N${shipmentType}`)
    
    // P4 - שלב משלוח (ריק)
    params.push('-N')
    
    // P5 - שם המזמין
    params.push(`-A${this.sanitizeParam(order.customerName)}`)
    
    // P6 - ריק
    params.push('-A')
    
    // P7 - סוג מטען (ברירת מחדל 10, ניתן להגדיר ב-config)
    const cargoType = config.cargoType || '10'
    params.push(`-N${cargoType}`)
    
    // P8-P10 - ריק (איסוף)
    params.push('-N')
    params.push('-N')
    params.push('-N')
    
    // P11 - שם מקבל
    params.push(`-A${this.sanitizeParam(order.shippingAddress.name)}`)
    
    // P12 - קוד עיר (אופציונלי)
    params.push('-A')
    
    // P13 - שם עיר
    params.push(`-A${this.sanitizeParam(order.shippingAddress.city)}`)
    
    // P14 - קוד רחוב (אופציונלי)
    params.push('-A')
    
    // P15 - שם רחוב (יכול לכלול מספר בית)
    const street = order.shippingAddress.houseNumber 
      ? `${order.shippingAddress.street} ${order.shippingAddress.houseNumber}`
      : order.shippingAddress.street
    params.push(`-A${this.sanitizeParam(street)}`)
    
    // P16 - מספר בית (אם לא ב-P15)
    params.push(`-A${order.shippingAddress.houseNumber || ''}`)
    
    // P17 - כניסה
    params.push(`-A${order.shippingAddress.entrance || ''}`)
    
    // P18 - קומה
    params.push(`-A${order.shippingAddress.floor || ''}`)
    
    // P19 - דירה
    params.push(`-A${order.shippingAddress.apartment || ''}`)
    
    // P20 - טלפון ראשי
    params.push(`-A${this.sanitizeParam(order.shippingAddress.phone)}`)
    
    // P21 - טלפון נוסף
    params.push('-A')
    
    // P22 - אסמכתא ראשית (מספר הזמנה)
    params.push(`-A${order.reference || order.orderNumber}`)
    
    // P23 - מספר חבילות
    const packageCount = order.packages.reduce((sum, pkg) => sum + (pkg.quantity || 1), 0) || 1
    if (packageCount > 1) {
      params.push(`-N${packageCount}`)
    } else {
      params.push('-N')
    }
    
    // P24 - הערות כתובת
    params.push('-A')
    
    // P25 - הערות משלוח
    params.push(`-A${this.sanitizeParam(order.notes || '')}`)
    
    // P26 - אסמכתא 2
    params.push('-A')
    
    // P27-P28 - תאריך ושעה (ריק - לא תזמון)
    params.push('-A')
    params.push('-A')
    
    // P29 - ריק
    params.push('-N')
    
    // P30-P33 - תשלום (COD) - אם יש total ו-COD מופעל
    if (order.total && config.codEnabled) {
      params.push(`-N${config.codPaymentType || '1'}`) // P30
      params.push(`-N${order.total}`) // P31
      params.push('-A') // P32 - תאריך
      params.push('-A') // P33 - הערות
    } else {
      params.push('-N')
      params.push('-N')
      params.push('-A')
      params.push('-A')
    }
    
    // P34 - נקודת חלוקה מקור (ריק - לא איסוף)
    params.push('-N')
    
    // P35 - נקודת חלוקה יעד (אם נבחרה)
    params.push(`-N${config.pickupPointId || ''}`)
    
    // P36 - סוג תגובה (XML מומלץ)
    params.push('-AXML')
    
    // P37 - בחירה אוטומטית נקודת חלוקה
    params.push(`-A${config.autoPickupPoint || 'N'}`)
    
    // P38 - ריק
    params.push('-A')
    
    // P39 - ריק
    params.push('-N')
    
    // P40 - אימייל מקבל
    params.push(`-A${order.shippingAddress.email || order.customerEmail || ''}`)
    
    // P41-P42 - תאריך ושעת הכנה (ריק)
    params.push('-A')
    params.push('-A')
    
    const args = params.join(',')
    return `${config.host}/RunCom.Server/Request.aspx?APPNAME=run&PRGNAME=ship_create_anonymous&ARGUMENTS=${args}`
  }
  
  /**
   * ניקוי פרמטר (הסרת פסיקים ו-&)
   */
  private sanitizeParam(value: string): string {
    if (!value) return ''
    return value.replace(/,/g, '').replace(/&/g, '')
  }
  
  /**
   * פענוח תשובה XML
   */
  private async parseXmlResponse(xmlText: string, order: ShippingOrder): Promise<ShippingResponse> {
    try {
      const parsed = await parseStringPromise(xmlText, {
        explicitArray: false,
        mergeAttrs: true,
        explicitCharkey: false,
        trim: true,
      })
      
      const root = parsed.root || parsed
      
      // חיפוש שגיאות
      if (root.error || (root.result && root.result !== 'ok')) {
        const errorMsg = root.message || root.error || 'שגיאה לא ידועה'
        const errorCode = root.error_code || '0'
        
        return {
          success: false,
          error: Array.isArray(errorMsg) ? errorMsg[0] : errorMsg,
          errorCode: Array.isArray(errorCode) ? errorCode[0] : errorCode,
          retryable: !['500', '600'].includes(Array.isArray(errorCode) ? errorCode[0] : errorCode), // שגיאות של אסמכתא כפולה לא retryable
        }
      }
      
      // חיפוש מספר משלוח
      const mydata = root.mydata || root
      
      // Focus מחזיר את המספרים ב-CDATA או ישירות
      let shipmentNum = mydata.ship_create_num
      let randomNum = mydata.ship_num_rand
      
      // אם זה מערך, קח את הראשון
      if (Array.isArray(shipmentNum)) {
        shipmentNum = shipmentNum[0]
      }
      if (Array.isArray(randomNum)) {
        randomNum = randomNum[0]
      }
      
      // אם יש _ (CDATA wrapper)
      if (shipmentNum && typeof shipmentNum === 'object' && shipmentNum._) {
        shipmentNum = shipmentNum._
      }
      if (randomNum && typeof randomNum === 'object' && randomNum._) {
        randomNum = randomNum._
      }
      
      // המרה למחרוזת
      shipmentNum = String(shipmentNum || '').trim()
      randomNum = String(randomNum || '').trim()
      
      if (!shipmentNum || shipmentNum === '0' || shipmentNum === '') {
        return {
          success: false,
          error: 'לא התקבל מספר משלוח',
          retryable: true,
        }
      }
      
      return {
        success: true,
        shipmentId: shipmentNum,
        trackingNumber: shipmentNum,
        data: {
          shipmentNum,
          randomNum,
          fullResponse: parsed,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `שגיאה בפענוח תשובה: ${error.message}`,
        retryable: true,
      }
    }
  }
  
  /**
   * פענוח תשובה TXT
   */
  private parseTxtResponse(text: string, order: ShippingOrder): ShippingResponse {
    // פורמט: <shipment_number>,<distribution_line>,<distribution_area>,<error>
    const parts = text.split(',')
    
    if (parts.length < 1) {
      return {
        success: false,
        error: 'תשובה לא תקינה',
        retryable: true,
      }
    }
    
    const shipmentNum = parts[0].trim()
    const error = parts[3]?.trim()
    
    if (error && error !== '') {
      return {
        success: false,
        error,
        retryable: !error.includes('כבר נקלטה'), // אסמכתא כפולה לא retryable
      }
    }
    
    if (!shipmentNum || shipmentNum === '0') {
      return {
        success: false,
        error: 'לא התקבל מספר משלוח',
        retryable: true,
      }
    }
    
    return {
      success: true,
      shipmentId: shipmentNum,
      trackingNumber: shipmentNum,
      data: {
        shipmentNum,
        distributionLine: parts[1]?.trim(),
        distributionArea: parts[2]?.trim(),
      },
    }
  }
  
  /**
   * פענוח XML מעקב
   */
  private async parseTrackingXml(xmlText: string): Promise<ShippingStatus> {
    try {
      const parsed = await parseStringPromise(xmlText, {
        explicitArray: false,
        mergeAttrs: true,
        explicitCharkey: false,
        trim: true,
      })
      
      const root = parsed.root || parsed
      const mydata = root.mydata || root
      
      if (!mydata) {
        return { status: 'failed' }
      }
      
      // טיפול במערכים
      let statuses = mydata.status
      if (!Array.isArray(statuses)) {
        statuses = statuses ? [statuses] : []
      }
      
      const lastStatus = statuses[statuses.length - 1]
      
      let status: ShippingStatus['status'] = 'sent'
      
      const delivered = mydata.ship_delivered_yn
      if (delivered === 'y' || delivered === 'Y' || (Array.isArray(delivered) && delivered[0] === 'y')) {
        status = 'delivered'
      } else if (lastStatus) {
        const statusCode = Array.isArray(lastStatus.status_code) ? lastStatus.status_code[0] : lastStatus.status_code
        // מיפוי קודי סטטוס לפי התיעוד
        if (statusCode === '4') status = 'sent'
        else if (statusCode === '5') status = 'in_transit'
        else if (statusCode === '7') status = 'in_transit'
      }
      
      const events = statuses.map((s: any) => {
        const statusDate = Array.isArray(s.status_date) ? s.status_date[0] : s.status_date
        const statusTime = Array.isArray(s.status_time) ? s.status_time[0] : s.status_time
        const statusCode = Array.isArray(s.status_code) ? s.status_code[0] : s.status_code
        const statusDesc = Array.isArray(s.status_desc) ? s.status_desc[0] : s.status_desc
        
        return {
          date: new Date(`${statusDate} ${statusTime}`),
          status: statusCode || '',
          description: statusDesc || '',
          location: undefined,
        }
      })
      
      const shipNo = mydata.ship_no
      const driverName = mydata.driver_name
      
      return {
        status,
        trackingNumber: Array.isArray(shipNo) ? shipNo[0] : shipNo,
        lastUpdate: events.length > 0 ? events[events.length - 1].date : new Date(),
        driverName: Array.isArray(driverName) ? driverName[0] : driverName,
        driverPhone: undefined,
        events,
        canCancel: (status as string) === 'sent' || (status as string) === 'pending',
      }
    } catch (error) {
      return { status: 'failed' }
    }
  }
  
  /**
   * פענוח XML נקודות חלוקה
   */
  private async parsePickupPointsXml(xmlText: string): Promise<Array<{
    id: string
    name: string
    address: string
    city: string
    hours?: string
    type?: 'store' | 'locker'
    coordinates?: { lat: number; lng: number }
  }>> {
    try {
      const parsed = await parseStringPromise(xmlText, {
        explicitArray: false,
        mergeAttrs: true,
        explicitCharkey: false,
        trim: true,
      })
      
      const root = parsed.root || parsed
      let spots = root.spots?.spot_detail || []
      
      if (!Array.isArray(spots)) {
        spots = spots ? [spots] : []
      }
      
      return spots.map((spot: any) => {
        const nCode = Array.isArray(spot.n_code) ? spot.n_code[0] : spot.n_code
        const name = Array.isArray(spot.name) ? spot.name[0] : spot.name
        const street = Array.isArray(spot.street) ? spot.street[0] : spot.street
        const house = Array.isArray(spot.house) ? spot.house[0] : spot.house
        const city = Array.isArray(spot.city) ? spot.city[0] : spot.city
        const remarks = Array.isArray(spot.remarks) ? spot.remarks[0] : spot.remarks
        const type = Array.isArray(spot.type) ? spot.type[0] : spot.type
        const latitude = Array.isArray(spot.latitude) ? spot.latitude[0] : spot.latitude
        const longitude = Array.isArray(spot.longitude) ? spot.longitude[0] : spot.longitude
        
        return {
          id: String(nCode || ''),
          name: String(name || ''),
          address: `${street || ''} ${house || ''}`.trim(),
          city: String(city || ''),
          hours: remarks ? String(remarks) : undefined,
          type: type?.toLowerCase().includes('store') ? 'store' : 'locker',
          coordinates: latitude && longitude 
            ? { lat: parseFloat(String(latitude)), lng: parseFloat(String(longitude)) }
            : undefined,
        }
      })
    } catch (error) {
      return []
    }
  }
}

