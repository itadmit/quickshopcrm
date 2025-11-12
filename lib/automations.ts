import { prisma } from "./prisma"
import { sendEmail, parseEmailTemplate } from "./email"

/**
 * מנוע הרצת אוטומציות
 * מאזין לאירועים ומריץ אוטומציות רלוונטיות
 */

export interface AutomationTrigger {
  type: string // Event type to listen to
  filters?: Record<string, any> // Optional filters
}

export interface AutomationCondition {
  field: string // Field path in event payload (e.g., "order.total", "customer.tier")
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "not_contains" | "in" | "not_in"
  value: any
  logicalOperator?: "AND" | "OR" // For multiple conditions
  thenActions?: AutomationAction[]  // Actions to execute if condition is true
  elseActions?: AutomationAction[]  // Actions to execute if condition is false
}

export interface AutomationAction {
  type: string // Action type
  config: Record<string, any> // Action configuration
}

/**
 * בדיקת תנאים
 */
function evaluateCondition(
  condition: AutomationCondition,
  eventPayload: any
): boolean {
  const fieldValue = getNestedValue(eventPayload, condition.field)
  
  switch (condition.operator) {
    case "equals":
      return fieldValue === condition.value
    case "not_equals":
      return fieldValue !== condition.value
    case "greater_than":
      return Number(fieldValue) > Number(condition.value)
    case "less_than":
      return Number(fieldValue) < Number(condition.value)
    case "contains":
      return String(fieldValue).includes(String(condition.value))
    case "not_contains":
      return !String(fieldValue).includes(String(condition.value))
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(fieldValue)
    case "not_in":
      return Array.isArray(condition.value) && !condition.value.includes(fieldValue)
    default:
      return false
  }
}

/**
 * בדיקת כל התנאים
 */
function evaluateConditions(
  conditions: AutomationCondition[],
  eventPayload: any
): boolean {
  if (!conditions || conditions.length === 0) {
    return true // No conditions = always true
  }

  let result = evaluateCondition(conditions[0], eventPayload)
  
  for (let i = 1; i < conditions.length; i++) {
    const condition = conditions[i]
    const conditionResult = evaluateCondition(condition, eventPayload)
    
    if (condition.logicalOperator === "OR") {
      result = result || conditionResult
    } else {
      // Default to AND
      result = result && conditionResult
    }
  }
  
  return result
}

/**
 * קבלת ערך מקונן באובייקט
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj)
}

/**
 * הרצת אקשן
 */
async function executeAction(
  action: AutomationAction,
  eventPayload: any,
  shopId: string
): Promise<any> {
  const startTime = Date.now()
  
  try {
    switch (action.type) {
      case "send_email":
        return await executeSendEmail(action, eventPayload, shopId)
      
      case "add_customer_tag":
        return await executeAddCustomerTag(action, eventPayload, shopId)
      
      case "update_order_status":
        return await executeUpdateOrderStatus(action, eventPayload, shopId)
      
      case "create_notification":
        return await executeCreateNotification(action, eventPayload, shopId)
      
      case "webhook":
        return await executeWebhook(action, eventPayload, shopId)
      
      case "delay":
        return await executeDelay(action, eventPayload, shopId)
      
      case "create_coupon":
        return await executeCreateCoupon(action, eventPayload, shopId)
      
      case "end":
        // סיום אוטומציה - מחזיר signal להפסקת הרצה
        return { success: true, end: true }
      
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  } catch (error) {
    console.error(`Error executing action ${action.type}:`, error)
    throw error
  } finally {
    const duration = Date.now() - startTime
    console.log(`Action ${action.type} executed in ${duration}ms`)
  }
}

/**
 * שליחת אימייל
 */
async function executeSendEmail(
  action: AutomationAction,
  eventPayload: any,
  shopId: string
): Promise<any> {
  const { to, subject, template, variables } = action.config
  
  // קבלת תבנית אימייל אם קיימת
  let emailBody = template || ""
  
  if (action.config.templateId) {
    const emailTemplate = await prisma.emailTemplate.findFirst({
      where: {
        companyId: (await prisma.shop.findUnique({ where: { id: shopId } }))?.companyId,
        id: action.config.templateId,
      },
    })
    
    if (emailTemplate) {
      emailBody = emailTemplate.body
    }
  }
  
  // החלפת משתנים
  // הוספת הקופון ל-variables אם קיים ב-eventPayload
  const mergedVariables = {
    ...eventPayload,
    ...variables,
    // אם יש קופון ב-eventPayload, הוסף אותו גם ישירות
    coupon: eventPayload.coupon || variables.coupon,
  }
  
  const parsedBody = parseEmailTemplate(emailBody, mergedVariables)
  const parsedSubject = parseEmailTemplate(subject, mergedVariables)
  
  // קבלת כתובת אימייל מהאירוע
  let recipientEmail = to
  
  // טיפול ב-toType
  if (action.config.toType === "customer") {
    recipientEmail = getNestedValue(eventPayload, "customer.email") || getNestedValue(eventPayload, "customerEmail") || to
  } else if (action.config.toType === "admin") {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { email: true, company: { select: { users: { select: { email: true }, take: 1 } } } }
    })
    recipientEmail = shop?.email || shop?.company?.users?.[0]?.email || to
  } else if (to?.startsWith("{{")) {
    const fieldPath = to.replace(/[{}]/g, "")
    recipientEmail = getNestedValue(eventPayload, fieldPath) || to
  }
  
  if (!recipientEmail) {
    throw new Error("No recipient email address found")
  }
  
  await sendEmail({
    to: recipientEmail,
    subject: parsedSubject,
    html: parsedBody,
  })
  
  return { success: true, sentTo: recipientEmail }
}

/**
 * הוספת תג ללקוח
 */
async function executeAddCustomerTag(
  action: AutomationAction,
  eventPayload: any,
  shopId: string
): Promise<any> {
  const { customerId, tags } = action.config
  
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId || eventPayload.customerId,
      shopId,
    },
  })
  
  if (!customer) {
    throw new Error("Customer not found")
  }
  
  const existingTags = customer.tags || []
  const newTags = Array.isArray(tags) ? tags : [tags]
  const updatedTags = Array.from(new Set([...existingTags, ...newTags]))
  
  await prisma.customer.update({
    where: { id: customer.id },
    data: { tags: updatedTags },
  })
  
  return { success: true, tags: updatedTags }
}

/**
 * עדכון סטטוס הזמנה
 */
async function executeUpdateOrderStatus(
  action: AutomationAction,
  eventPayload: any,
  shopId: string
): Promise<any> {
  const { orderId, status } = action.config
  
  const order = await prisma.order.findFirst({
    where: {
      id: orderId || eventPayload.orderId,
      shopId,
    },
  })
  
  if (!order) {
    throw new Error("Order not found")
  }
  
  await prisma.order.update({
    where: { id: order.id },
    data: { status: status as any },
  })
  
  return { success: true, orderId: order.id, status }
}

/**
 * יצירת התראה
 */
async function executeCreateNotification(
  action: AutomationAction,
  eventPayload: any,
  shopId: string
): Promise<any> {
  const { userId, title, message } = action.config
  
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { companyId: true },
  })
  
  if (!shop) {
    throw new Error("Shop not found")
  }
  
  await prisma.notification.create({
    data: {
      companyId: shop.companyId,
      userId: userId || eventPayload.userId,
      type: "automation",
      title: title || "אוטומציה הופעלה",
      message: message || "אוטומציה הופעלה בהצלחה",
    },
  })
  
  return { success: true }
}

/**
 * שליחת Webhook
 */
async function executeWebhook(
  action: AutomationAction,
  eventPayload: any,
  shopId: string
): Promise<any> {
  const { url, method = "POST", headers = {} } = action.config
  
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(eventPayload),
  })
  
  return {
    success: response.ok,
    statusCode: response.status,
    response: await response.text(),
  }
}

/**
 * המתנה (Delay) - Signal להפסיק ולתזמן המשך
 * 
 * פונקציה זו מחזירה signal מיוחד שאומר למערכת:
 * "עצור כאן, תזמן את המשך האוטומציה ל-[זמן]"
 * 
 * Bull Queue יטפל בתזמון בפועל.
 */
async function executeDelay(
  action: AutomationAction,
  eventPayload: any,
  shopId: string
): Promise<any> {
  const { amount, unit } = action.config
  
  // המרת זמן למילישניות
  let delayMs = 0
  switch (unit) {
    case "seconds":
      delayMs = amount * 1000
      break
    case "minutes":
      delayMs = amount * 60 * 1000
      break
    case "hours":
      delayMs = amount * 60 * 60 * 1000
      break
    case "days":
      delayMs = amount * 24 * 60 * 60 * 1000
      break
    case "weeks":
      delayMs = amount * 7 * 24 * 60 * 60 * 1000
      break
    default:
      delayMs = amount * 1000 // ברירת מחדל - שניות
  }
  
  console.log(`⏳ Scheduling delay: ${amount} ${unit} (${delayMs}ms)`)
  
  // מחזיר signal מיוחד שמפסיק את הביצוע הנוכחי
  // ומתזמן את המשך האוטומציה
  return {
    success: true,
    shouldSchedule: true, // Signal לתזמן את המשך
    delayMs,
    delayedFor: `${amount} ${unit}`,
  }
}

/**
 * יצירת קופון
 */
async function executeCreateCoupon(
  action: AutomationAction,
  eventPayload: any,
  shopId: string
): Promise<any> {
  const {
    code,
    type,
    value,
    buyQuantity,
    getQuantity,
    getDiscount,
    nthItem,
    volumeRules,
    minOrder,
    maxDiscount,
    maxUses,
    usesPerCustomer,
    startDate,
    endDate,
    isActive,
    applicableProducts,
    applicableCategories,
    applicableCustomers,
    canCombine,
    // אפשרות ליצירת קופון ייחודי לכל לקוח
    uniquePerCustomer = false,
  } = action.config
  
  // קבלת companyId מהחנות
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { companyId: true },
  })
  
  if (!shop) {
    throw new Error("Shop not found")
  }
  
  // קבלת customerId מהאירוע
  const customerId = getNestedValue(eventPayload, "customer.id") || 
                     getNestedValue(eventPayload, "customerId") ||
                     eventPayload.customerId
  
  // יצירת קוד אוטומטי אם לא סופק
  let couponCode = code
  if (!couponCode) {
    // אם זה קופון ייחודי ללקוח, נוסיף מזהה לקוח לקוד
    if (uniquePerCustomer && customerId) {
      couponCode = `AUTO-${customerId.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    } else {
      couponCode = `AUTO-${Date.now().toString(36).toUpperCase()}`
    }
  }
  
  // בדיקה אם קוד כבר קיים
  const existingCoupon = await prisma.coupon.findUnique({
    where: { code: couponCode },
  })
  
  if (existingCoupon) {
    // אם הקוד קיים, נוסיף מספר אקראי
    couponCode = `${couponCode}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  }
  
  // אם זה קופון ייחודי ללקוח, נגדיר אותו רק ללקוח הזה
  let finalApplicableCustomers = applicableCustomers || []
  if (uniquePerCustomer && customerId) {
    finalApplicableCustomers = [customerId]
  }
  
  // אם לא הוגדר maxUses ו-usesPerCustomer, וזה קופון ייחודי, נגדיר אותם ל-1
  let finalMaxUses = maxUses
  let finalUsesPerCustomer = usesPerCustomer !== undefined ? usesPerCustomer : 1
  if (uniquePerCustomer) {
    finalMaxUses = 1
    finalUsesPerCustomer = 1
  }
  
  // יצירת הקופון
  const coupon = await prisma.coupon.create({
    data: {
      shopId,
      code: couponCode,
      type: type || "PERCENTAGE",
      value: value || 10,
      buyQuantity: buyQuantity || null,
      getQuantity: getQuantity || null,
      getDiscount: getDiscount || null,
      nthItem: nthItem || null,
      volumeRules: volumeRules || null,
      minOrder: minOrder || null,
      maxDiscount: maxDiscount || null,
      maxUses: finalMaxUses || null,
      usesPerCustomer: finalUsesPerCustomer,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive: isActive !== false,
      applicableProducts: applicableProducts || [],
      applicableCategories: applicableCategories || [],
      applicableCustomers: finalApplicableCustomers,
      canCombine: canCombine || false,
    },
  })
  
  // יצירת אירוע
  await prisma.shopEvent.create({
    data: {
      shopId,
      type: "coupon.created",
      entityType: "coupon",
      entityId: coupon.id,
      payload: {
        couponId: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
    },
  })
  
  return {
    success: true,
    couponId: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
  }
}

/**
 * הרצת אוטומציה לאירוע
 */
export async function runAutomationsForEvent(
  shopId: string,
  eventType: string,
  eventPayload: any
): Promise<void> {
  try {
    // מציאת כל האוטומציות הפעילות שמאזינות לאירוע הזה
    const automations = await prisma.automation.findMany({
      where: {
        shopId,
        isActive: true,
      },
    })
    
    // סינון אוטומציות שהטריגר שלהן תואם לאירוע
    const matchingAutomations = automations.filter((automation) => {
      const trigger = automation.trigger as unknown as AutomationTrigger
      return trigger?.type === eventType
    })
    
    // הרצת כל אוטומציה תואמת
    for (const automation of matchingAutomations) {
      try {
        const startTime = Date.now()
        
        // פונקציה מקומית להרצת רשימת אקשנים
        const executeActions = async (
          actions: AutomationAction[], 
          payload: any,
          startFromIndex: number = 0
        ): Promise<{ results: any[], shouldSchedule?: boolean, delayMs?: number, nextIndex?: number }> => {
          const actionResults = []
          let accumulatedPayload = { ...payload }
          
          for (let i = startFromIndex; i < actions.length; i++) {
            const action = actions[i]
            
            try {
              const result = await executeAction(action, accumulatedPayload, shopId)
              actionResults.push({ action: action.type, success: true, result })
              
              // אם זו פעולת delay - עצור והחזר signal לתזמון
              if (action.type === "delay" && result?.shouldSchedule) {
                console.log(`🛑 Stopping at delay. Will resume at action ${i + 1}`)
                return {
                  results: actionResults,
                  shouldSchedule: true,
                  delayMs: result.delayMs,
                  nextIndex: i + 1, // האינדקס של הפעולה הבאה
                }
              }
              
              // העברת תוצאות הפעולה לפעולות הבאות
              if (result) {
                // אם נוצר קופון, הוסף אותו ל-payload
                if (result.couponId && result.code) {
                  accumulatedPayload.coupon = {
                    id: result.couponId,
                    code: result.code,
                    type: result.type,
                    value: result.value,
                  }
                }
                // העברת כל התוצאות האחרות
                accumulatedPayload = {
                  ...accumulatedPayload,
                  ...result,
                }
              }
              
              // אם זו פעולת end, הפסק את ההרצה
              if (result?.end === true) {
                break
              }
            } catch (error: any) {
              actionResults.push({
                action: action.type,
                success: false,
                error: error.message,
              })
              // גם במקרה של שגיאה, אם זו פעולת end, הפסק
              if (action.type === "end") {
                break
              }
            }
          }
          
          return { results: actionResults }
        }
        
        // בדיקת תנאים והרצת ענפים
        const conditions = automation.conditions as unknown as AutomationCondition[] | null
        const actions = automation.actions as unknown as AutomationAction[]
        let actionResults: any[] = []
        let accumulatedPayload = { ...eventPayload }
        
        // הרץ את ה-actions הראשיים (לפני התנאים)
        if (actions && actions.length > 0) {
          const startIndex = (eventPayload._resumeFromIndex as number) || 0
          const executionResult = await executeActions(actions, accumulatedPayload, startIndex)
          actionResults.push(...executionResult.results)
          
          // אם צריך לתזמן המשך (נתקלנו ב-delay)
          if (executionResult.shouldSchedule && executionResult.delayMs && executionResult.nextIndex !== undefined) {
            console.log(`📅 Scheduling continuation in ${executionResult.delayMs}ms (${executionResult.delayMs / 1000}s)`)
            
            // תזמן את המשך האוטומציה
            const { queueAutomation } = await import("./automation-queue")
            await queueAutomation(
              shopId,
              eventType,
              {
                ...eventPayload,
                _resumeFromIndex: executionResult.nextIndex, // שמור היכן להמשיך
                _automationId: automation.id,
              },
              executionResult.delayMs / 1000 // המרה לשניות
            )
            
            // שמור log חלקי
            await prisma.automationLog.create({
              data: {
                automationId: automation.id,
                status: "scheduled",
                eventType,
                eventPayload: {
                  ...eventPayload,
                  _note: `Paused at action ${executionResult.nextIndex - 1}, will resume in ${executionResult.delayMs}ms`,
                },
                actionResults: executionResult.results,
                durationMs: Date.now() - startTime,
              },
            })
            
            // סיים את הביצוע הנוכחי - ה-continuation יתבצע מאוחר יותר
            continue
          }
          
          // עדכן את ה-payload עם תוצאות ה-actions
          for (const result of executionResult.results) {
            if (result.result) {
              if (result.result.couponId && result.result.code) {
                accumulatedPayload.coupon = {
                  id: result.result.couponId,
                  code: result.result.code,
                  type: result.result.type,
                  value: result.result.value,
                }
              }
              accumulatedPayload = {
                ...accumulatedPayload,
                ...result.result,
              }
            }
          }
        }
        
        // אם יש תנאים עם ענפים (מבנה חדש)
        if (conditions && conditions.length > 0) {
          const condition = conditions[0] // נתמוך בתנאי אחד כרגע
          
          if (condition.thenActions || condition.elseActions) {
            // מבנה חדש עם ענפים
            const conditionMet = evaluateCondition(condition, accumulatedPayload)
            
            if (conditionMet && condition.thenActions) {
              // תנאי מתקיים - הרץ ענף "אז"
              const branchResults = await executeActions(condition.thenActions, accumulatedPayload)
              actionResults.push(...branchResults.results)
            } else if (!conditionMet && condition.elseActions) {
              // תנאי לא מתקיים - הרץ ענף "אחרת"
              const branchResults = await executeActions(condition.elseActions, accumulatedPayload)
              actionResults.push(...branchResults.results)
            } else {
              // אין אקשנים מתאימים - דילוג
              await prisma.automationLog.create({
                data: {
                  automationId: automation.id,
                  status: "skipped",
                  eventType,
                  eventPayload,
                  durationMs: Date.now() - startTime,
                },
              })
              continue
            }
          } else {
            // מבנה ישן - תנאים ללא ענפים
            if (!evaluateConditions(conditions, accumulatedPayload)) {
              // תנאים לא מתקיימים - דילוג על האוטומציה
              await prisma.automationLog.create({
                data: {
                  automationId: automation.id,
                  status: "skipped",
                  eventType,
                  eventPayload,
                  durationMs: Date.now() - startTime,
                },
              })
              continue
            }
          }
        }
        
        // שמירת לוג
        await prisma.automationLog.create({
          data: {
            automationId: automation.id,
            status: actionResults.every((r) => r.success) ? "success" : "failed",
            eventType,
            eventPayload,
            actionResults,
            durationMs: Date.now() - startTime,
          },
        })
      } catch (error: any) {
        // שגיאה בהרצת אוטומציה
        await prisma.automationLog.create({
          data: {
            automationId: automation.id,
            status: "failed",
            eventType,
            eventPayload,
            error: error.message,
          },
        })
        
        console.error(`Error running automation ${automation.id}:`, error)
      }
    }
  } catch (error) {
    console.error("Error running automations for event:", error)
  }
}

