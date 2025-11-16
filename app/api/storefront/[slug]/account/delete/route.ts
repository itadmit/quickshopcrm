import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { jwtVerify } from "jose"

// DELETE - מחיקת חשבון לקוח
export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const shop = await prisma.shop.findUnique({
      where: {
        slug: params.slug,
        isPublished: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })
    }

    // קבלת token מה-header או מה-body
    const authHeader = req.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "") || req.headers.get("x-customer-token")

    if (!token) {
      return NextResponse.json(
        { error: "אימות נדרש" },
        { status: 401 }
      )
    }

    // אימות JWT token
    let customerId: string | null = null
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
      const { payload } = await jwtVerify(token, secret)
      
      // בדיקה שהטוקן שייך לחנות הנכונה
      if (payload.shopId !== shop.id) {
        return NextResponse.json(
          { error: "אימות נכשל" },
          { status: 401 }
        )
      }
      
      customerId = payload.customerId as string
    } catch (jwtError) {
      return NextResponse.json(
        { error: "אימות נכשל" },
        { status: 401 }
      )
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "אימות נכשל" },
        { status: 401 }
      )
    }

    // בדיקה שהלקוח קיים ושייך לחנות
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        shopId: shop.id,
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "לקוח לא נמצא" },
        { status: 404 }
      )
    }

    // מחיקת הלקוח (Cascade ימחק גם את כל הקשרים)
    await prisma.customer.delete({
      where: {
        id: customerId,
      },
    })

    // יצירת אירוע מחיקת חשבון
    await prisma.shopEvent.create({
      data: {
        shopId: shop.id,
        type: "customer.deleted",
        entityType: "customer",
        entityId: customerId,
        payload: {
          customerId: customerId,
          email: customer.email,
          method: "self_delete",
        },
      },
    })

    return NextResponse.json({
      message: "החשבון נמחק בהצלחה",
    })
  } catch (error) {
    console.error("Error deleting customer account:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

