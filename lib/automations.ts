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
  const mergedVariables = {
    ...eventPayload,
    ...variables,
  }
  
  const parsedBody = parseEmailTemplate(emailBody, mergedVariables)
  const parsedSubject = parseEmailTemplate(subject, mergedVariables)
  
  // קבלת כתובת אימייל מהאירוע
  let recipientEmail = to
  if (to?.startsWith("{{")) {
    const fieldPath = to.replace(/[{}]/g, "")
    recipientEmail = getNestedValue(eventPayload, fieldPath)
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
  const updatedTags = [...new Set([...existingTags, ...newTags])]
  
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
      const trigger = automation.trigger as AutomationTrigger
      return trigger.type === eventType
    })
    
    // הרצת כל אוטומציה תואמת
    for (const automation of matchingAutomations) {
      try {
        const startTime = Date.now()
        
        // בדיקת תנאים
        const conditions = automation.conditions as AutomationCondition[] | null
        if (conditions && !evaluateConditions(conditions, eventPayload)) {
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
        
        // הרצת אקשנים
        const actions = automation.actions as AutomationAction[]
        const actionResults = []
        
        for (const action of actions) {
          try {
            const result = await executeAction(action, eventPayload, shopId)
            actionResults.push({ action: action.type, success: true, result })
          } catch (error: any) {
            actionResults.push({
              action: action.type,
              success: false,
              error: error.message,
            })
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

