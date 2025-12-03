import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  // TODO: preferredPaymentMethod field not implemented in Customer model
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
}
