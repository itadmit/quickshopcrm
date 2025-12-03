import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isReviewsPluginActive } from "@/lib/plugins/reviews-helper"

const createReplySchema = z.object({
  comment: z.string().min(1).max(1000),
  customerId: z.string().optional(),
})

// GET - קבלת תגובות לביקורת
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: ReviewReply model not implemented yet
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
}

// POST - יצירת תגובה חדשה
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: ReviewReply model not implemented yet
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
}
