import { NextRequest, NextResponse } from "next/server"

// TODO: TrafficSource model not implemented yet
export async function GET() {
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
}
