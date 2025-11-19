import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { jwtVerify } from "jose"

const addressSchema = z.object({
  firstName: z.string().min(1, "שם פרטי הוא חובה"),
  lastName: z.string().optional(),
  city: z.string().min(1, "עיר היא חובה"),
  address: z.string().min(1, "רחוב הוא חובה"),
  houseNumber: z.string().min(1, "מספר בית הוא חובה"),
  apartment: z.string().optional(),
  floor: z.string().optional(),
  zip: z.string().optional(),
})

// GET - קבלת כתובות של לקוח
export async function GET(
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

    // קבלת token מה-header
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

    // קבלת הלקוח
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        shopId: shop.id,
      },
      select: {
        addresses: true,
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "לקוח לא נמצא" },
        { status: 404 }
      )
    }

    // החזרת כתובות (אם יש)
    const addresses = customer.addresses && typeof customer.addresses === 'object' 
      ? (Array.isArray(customer.addresses) ? customer.addresses : [customer.addresses])
      : []

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error("Error fetching addresses:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - הוספת כתובת חדשה
export async function POST(
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

    // קבלת token מה-header
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

    const body = await req.json()
    const data = addressSchema.parse(body)

    // קבלת הלקוח עם הכתובות הקיימות
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        shopId: shop.id,
      },
      select: {
        addresses: true,
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "לקוח לא נמצא" },
        { status: 404 }
      )
    }

    // יצירת כתובת חדשה עם ID
    const newAddress = {
      id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      firstName: data.firstName,
      lastName: data.lastName || "",
      city: data.city,
      address: data.address,
      houseNumber: data.houseNumber,
      apartment: data.apartment || "",
      floor: data.floor || "",
      zip: data.zip || "",
      createdAt: new Date().toISOString(),
    }

    // עדכון הכתובות
    const existingAddresses = customer.addresses && typeof customer.addresses === 'object'
      ? (Array.isArray(customer.addresses) ? customer.addresses : [customer.addresses])
      : []

    const updatedAddresses = [...existingAddresses, newAddress]

    // עדכון הלקוח
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        addresses: updatedAddresses,
      },
    })

    return NextResponse.json({
      message: "כתובת נוספה בהצלחה",
      address: newAddress,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error adding address:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת כתובת
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

    // קבלת token מה-header
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

    const { searchParams } = new URL(req.url)
    const addressId = searchParams.get("addressId")

    if (!addressId) {
      return NextResponse.json(
        { error: "ID כתובת נדרש" },
        { status: 400 }
      )
    }

    // קבלת הלקוח עם הכתובות הקיימות
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        shopId: shop.id,
      },
      select: {
        addresses: true,
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "לקוח לא נמצא" },
        { status: 404 }
      )
    }

    // מחיקת הכתובת
    const existingAddresses = customer.addresses && typeof customer.addresses === 'object'
      ? (Array.isArray(customer.addresses) ? customer.addresses : [customer.addresses])
      : []

    const updatedAddresses = existingAddresses.filter(
      (addr: any) => addr.id !== addressId
    )

    // עדכון הלקוח
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        addresses: updatedAddresses,
      },
    })

    return NextResponse.json({
      message: "כתובת נמחקה בהצלחה",
    })
  } catch (error) {
    console.error("Error deleting address:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

