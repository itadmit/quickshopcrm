import { NextRequest, NextResponse } from "next/server"
import { searchStreets } from "@/lib/israel-cities-cache"

// GET - חיפוש רחובות
export function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q") || ""
    const city = searchParams.get("city") || ""

    if (!query || query.length < 2) {
      return NextResponse.json({ streets: [] })
    }

    const streets = searchStreets(city, query)

    return NextResponse.json({ 
      streets,
      cached: true,
    })
  } catch (error) {
    console.error("Error searching streets:", error)
    
    // במקרה של שגיאה - נחזיר מערך ריק
    return NextResponse.json({ 
      streets: [],
      error: "Search temporarily unavailable" 
    })
  }
}

