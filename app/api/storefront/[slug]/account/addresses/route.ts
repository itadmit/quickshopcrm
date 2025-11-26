import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { verifyStorefrontCustomer } from "@/lib/storefront-auth"

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
    // אימות לקוח (כולל בדיקה שהלקוח קיים)
    const auth = await verifyStorefrontCustomer(req, params.slug)
    if (!auth.success || !auth.customer) {
      return auth.error!
    }

    // החזרת כתובות (אם יש)
    const addresses = auth.customer.addresses && typeof auth.customer.addresses === 'object' 
      ? (Array.isArray(auth.customer.addresses) ? auth.customer.addresses : [auth.customer.addresses])
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
    // אימות לקוח (כולל בדיקה שהלקוח קיים)
    const auth = await verifyStorefrontCustomer(req, params.slug)
    if (!auth.success || !auth.customer) {
      return auth.error!
    }

    const body = await req.json()
    const data = addressSchema.parse(body)

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
    const existingAddresses = auth.customer.addresses && typeof auth.customer.addresses === 'object'
      ? (Array.isArray(auth.customer.addresses) ? auth.customer.addresses : [auth.customer.addresses])
      : []

    const updatedAddresses = [...existingAddresses, newAddress]

    // עדכון הלקוח
    await prisma.customer.update({
      where: { id: auth.customerId },
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
    // אימות לקוח (כולל בדיקה שהלקוח קיים)
    const auth = await verifyStorefrontCustomer(req, params.slug)
    if (!auth.success || !auth.customer) {
      return auth.error!
    }

    const { searchParams } = new URL(req.url)
    const addressId = searchParams.get("addressId")

    if (!addressId) {
      return NextResponse.json(
        { error: "ID כתובת נדרש" },
        { status: 400 }
      )
    }

    // מחיקת הכתובת
    const existingAddresses = auth.customer.addresses && typeof auth.customer.addresses === 'object'
      ? (Array.isArray(auth.customer.addresses) ? auth.customer.addresses : [auth.customer.addresses])
      : []

    const updatedAddresses = existingAddresses.filter(
      (addr: any) => addr.id !== addressId
    )

    // עדכון הלקוח
    await prisma.customer.update({
      where: { id: auth.customerId },
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

