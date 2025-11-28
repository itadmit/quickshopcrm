import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET - קבלת כל הקטגוריות האוטומטיות שהמוצר נמצא בהן
// הערה: קטגוריות לא תומכות ב-automatic rules כמו collections, אז מחזירים רשימה ריקה
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // קטגוריות לא תומכות ב-automatic rules, אז מחזירים רשימה ריקה
    return NextResponse.json({
      automaticCategories: [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

