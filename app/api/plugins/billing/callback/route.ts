import { NextRequest, NextResponse } from "next/server"
import { redirect } from "next/navigation"

/**
 * Callback לאחר תשלום תוסף
 * PayPlus מפנה לכאן לאחר תשלום מוצלח/נכשל
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const pluginId = searchParams.get("pluginId")
  const companyId = searchParams.get("companyId")

  if (status === "success") {
    // הפניה לעמוד הצלחה
    return redirect(
      `/settings/plugins?success=payment_completed&pluginId=${pluginId}`
    )
  } else {
    // הפניה לעמוד כישלון
    return redirect(
      `/settings/plugins?error=payment_failed&pluginId=${pluginId}`
    )
  }
}

