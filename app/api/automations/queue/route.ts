import { NextRequest, NextResponse } from "next/server"
import { getQueueStats, getJobs, cancelJob, cleanQueue } from "@/lib/automation-queue"

/**
 * GET /api/automations/queue
 * קבלת סטטיסטיקות ו-jobs מהתור
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as "waiting" | "active" | "completed" | "failed" | "delayed" | null

    if (status) {
      // קבלת jobs לפי סטטוס
      const jobs = await getJobs(status)
      const jobsData = await Promise.all(
        jobs.map(async (job) => ({
          id: job.id,
          name: job.name,
          data: job.data,
          progress: job.progress(),
          attemptsMade: job.attemptsMade,
          finishedOn: job.finishedOn,
          processedOn: job.processedOn,
          timestamp: job.timestamp,
          delay: job.opts.delay,
        }))
      )
      return NextResponse.json({ jobs: jobsData })
    } else {
      // קבלת סטטיסטיקות כלליות
      const stats = await getQueueStats()
      return NextResponse.json(stats)
    }
  } catch (error: any) {
    console.error("Error getting queue info:", error)
    return NextResponse.json(
      { error: "Failed to get queue info", details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/automations/queue
 * ביטול job או ניקוי תור
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("jobId")
    const clean = searchParams.get("clean") === "true"

    if (clean) {
      // ניקוי כל התור
      await cleanQueue()
      return NextResponse.json({ message: "Queue cleaned successfully" })
    } else if (jobId) {
      // ביטול job ספציפי
      const cancelled = await cancelJob(jobId)
      if (cancelled) {
        return NextResponse.json({ message: "Job cancelled successfully" })
      } else {
        return NextResponse.json({ error: "Job not found" }, { status: 404 })
      }
    } else {
      return NextResponse.json({ error: "Missing jobId or clean parameter" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Error managing queue:", error)
    return NextResponse.json(
      { error: "Failed to manage queue", details: error.message },
      { status: 500 }
    )
  }
}

