import { NextRequest, NextResponse } from "next/server"

// GET - קבלת טבלת מידות ספציפית
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: SizeChart model not implemented yet
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
}

// PUT - עדכון טבלת מידות
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: SizeChart model not implemented yet
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
}

// DELETE - מחיקת טבלת מידות
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: SizeChart model not implemented yet
  return NextResponse.json({ error: "Feature not implemented" }, { status: 501 })
}
