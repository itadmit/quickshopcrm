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
    // Verify cron secret to prevent unauthorized access
    // Vercel Cron sends: Authorization: Bearer ${CRON_SECRET}
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'change-this-in-production'
    
    // In production, require authentication. In development, allow if secret matches or if no secret is set
    if (process.env.NODE_ENV === 'production') {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else {
      // In development, warn if no secret is set but allow for testing
      if (!process.env.CRON_SECRET) {
        console.warn('⚠️  CRON_SECRET not set - allowing request in development mode')
      } else if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
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

