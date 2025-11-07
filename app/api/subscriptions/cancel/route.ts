import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cancelSubscription, getCurrentSubscription } from "@/lib/subscription"
import { z } from "zod"

const cancelSchema = z.object({
  reason: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 }
      )
    }

    const companyId = session.user.companyId
    const body = await req.json()
    const { reason } = cancelSchema.parse(body)

    const subscription = await getCurrentSubscription(companyId)

    if (!subscription) {
      return NextResponse.json(
        { error: "מנוי לא נמצא" },
        { status: 404 }
      )
    }

    if (subscription.status === "CANCELLED") {
      return NextResponse.json(
        { error: "המנוי כבר בוטל" },
        { status: 400 }
      )
    }

    const cancelled = await cancelSubscription(companyId, reason)

    return NextResponse.json({
      message: "מנוי בוטל בהצלחה",
      subscription: cancelled,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error cancelling subscription:", error)
    return NextResponse.json(
      { error: "שגיאה בביטול מנוי" },
      { status: 500 }
    )
  }
}

