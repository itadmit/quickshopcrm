import { NextRequest, NextResponse } from "next/server"

// GET - קבלת כל טבלאות המידות
export async function GET(req: NextRequest) {
  // TODO: SizeChart model not implemented yet
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
}

// POST - יצירת טבלת מידות חדשה
export async function POST(req: NextRequest) {
  // TODO: SizeChart model not implemented yet
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
}
