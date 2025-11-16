import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAllProviders } from "@/lib/shipping/registry"

// GET - רשימת כל חברות המשלוחים הזמינות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const providers = getAllProviders()
    
    return NextResponse.json(
      providers.map(p => ({
        slug: p.slug,
        name: p.name,
        displayName: p.displayName,
        features: p.features,
      }))
    )
  } catch (error) {
    console.error("Error fetching shipping providers:", error)
    return NextResponse.json(
      { error: "שגיאה בקבלת רשימת חברות המשלוחים" },
      { status: 500 }
    )
  }
}

