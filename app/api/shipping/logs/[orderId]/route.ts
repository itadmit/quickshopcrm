import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - קבלת לוגי משלוחים להזמנה
export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  // TODO: ShippingLog model not implemented yet
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
}
