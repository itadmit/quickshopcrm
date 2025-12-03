import { NextRequest, NextResponse } from "next/server"
import { identifyAbandonedCarts } from "@/lib/abandoned-carts"

export const dynamic = 'force-dynamic'

/**
 * Cron Job for identifying abandoned carts
 * This endpoint is called automatically by Vercel Cron every hour
 * 
 * Configured in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/abandoned-carts",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Verify this is a Vercel Cron request
    const authHeader = req.headers.get('authorization')
    
    // Vercel Cron sends a special header
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
    
    if (!isVercelCron && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('🛒 Starting abandoned cart check...')

    // זיהוי עגלות נטושות (עגלות שלא עודכנו במשך 24 שעות)
    const abandonedCount = await identifyAbandonedCarts()

    console.log(`✅ Identified ${abandonedCount} abandoned carts`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      abandonedCartsIdentified: abandonedCount,
    })
  } catch (error) {
    console.error("Error in abandoned carts cron job:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

