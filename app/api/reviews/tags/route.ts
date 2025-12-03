import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isReviewsPluginActive } from "@/lib/plugins/reviews-helper"

const createTagSchema = z.object({
  shopId: z.string(),
  name: z.string().min(1).max(50),
  nameEn: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

// GET - קבלת תגיות לביקורות לחנות
export async function GET(req: NextRequest) {
  // TODO: ReviewTagDefinition model not implemented yet
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
}

// POST - יצירת תגית חדשה
export async function POST(req: NextRequest) {
  // TODO: ReviewTagDefinition model not implemented yet
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
}
