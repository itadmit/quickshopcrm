import Queue from "bull"
import { prisma } from "./prisma"
import { runAutomationsForEvent } from "./automations"

/**
 * תור אוטומציות מבוסס Bull + Redis
 * מנהל delays, retries, ו-job persistence
 */

// יצירת תור לאוטומציות
export const automationQueue = new Queue("automations", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3, // 3 ניסיונות חוזרים
    backoff: {
      type: "exponential",
      delay: 5000, // התחל ב-5 שניות, הכפל בכל ניסיון
    },
    removeOnComplete: 100, // שמור רק 100 jobs מוצלחים
    removeOnFail: 500, // שמור 500 jobs כושלים
  },
})

// טיפוסי Jobs
interface AutomationJobData {
  shopId: string
  eventType: string
  eventPayload: any
  automationId?: string
}

interface DelayedActionJobData {
  shopId: string
  eventType: string
  eventPayload: any
  automationId: string
  actionIndex: number
  delayMs: number
}

/**
 * הוספת automation job לתור
 */
export async function queueAutomation(
  shopId: string,
  eventType: string,
  eventPayload: any,
  delay?: number // delay בשניות
) {
  return automationQueue.add(
    "run-automation",
    {
      shopId,
      eventType,
      eventPayload,
    } as AutomationJobData,
    {
      delay: delay ? delay * 1000 : undefined, // המרה לmilliseconds
      jobId: `${shopId}-${eventType}-${Date.now()}`, // ID ייחודי
    }
  )
}

/**
 * הוספת delayed action לתור
 */
export async function queueDelayedAction(
  shopId: string,
  eventType: string,
  eventPayload: any,
  automationId: string,
  actionIndex: number,
  delayMs: number
) {
  return automationQueue.add(
    "delayed-action",
    {
      shopId,
      eventType,
      eventPayload,
      automationId,
      actionIndex,
      delayMs,
    } as DelayedActionJobData,
    {
      delay: delayMs,
      jobId: `${automationId}-action-${actionIndex}-${Date.now()}`,
    }
  )
}

/**
 * טיפול ב-Jobs
 */
automationQueue.process("run-automation", async (job) => {
  const { shopId, eventType, eventPayload } = job.data as AutomationJobData

  console.log(`Processing automation: ${eventType} for shop ${shopId}`)

  try {
    await runAutomationsForEvent(shopId, eventType, eventPayload)
    return { success: true }
  } catch (error: any) {
    console.error("Error processing automation:", error)
    throw error // יזרוק שגיאה כדי שBull ינסה שוב
  }
})

/**
 * טיפול ב-Delayed Actions
 */
automationQueue.process("delayed-action", async (job) => {
  const { shopId, eventType, eventPayload, automationId, actionIndex, delayMs } =
    job.data as DelayedActionJobData

  console.log(`Processing delayed action: ${automationId} action ${actionIndex}`)

  try {
    // כאן תוכל לבצע את הפעולה המתוזמנת
    // לדוגמה: להריץ את המשך האוטומציה
    await runAutomationsForEvent(shopId, eventType, eventPayload)
    return { success: true, actionIndex }
  } catch (error: any) {
    console.error("Error processing delayed action:", error)
    throw error
  }
})

/**
 * Event listeners
 */
automationQueue.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result)
})

automationQueue.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error:`, err.message)
})

automationQueue.on("stalled", (job) => {
  console.warn(`Job ${job.id} stalled`)
})

/**
 * ניקוי תור - שימושי לפיתוח
 */
export async function cleanQueue() {
  await automationQueue.clean(0, "completed")
  await automationQueue.clean(0, "failed")
  await automationQueue.empty()
}

/**
 * סטטיסטיקות תור
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    automationQueue.getWaitingCount(),
    automationQueue.getActiveCount(),
    automationQueue.getCompletedCount(),
    automationQueue.getFailedCount(),
    automationQueue.getDelayedCount(),
  ])

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  }
}

/**
 * קבלת jobs לפי סטטוס
 */
export async function getJobs(status: "waiting" | "active" | "completed" | "failed" | "delayed") {
  return automationQueue.getJobs([status])
}

/**
 * ביטול job
 */
export async function cancelJob(jobId: string) {
  const job = await automationQueue.getJob(jobId)
  if (job) {
    await job.remove()
    return true
  }
  return false
}

export default automationQueue

