import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - קבלת איש קשר ספציפי
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
      include: {
        categoryAssignments: {
          include: {
            category: true,
          },
        },
        customer: {
          include: {
            orders: {
              select: {
                id: true,
                orderNumber: true,
                total: true,
                status: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 10,
            },
          },
        },
      },
    })

    if (!contact) {
      return NextResponse.json(
        { error: "איש קשר לא נמצא" },
        { status: 404 }
      )
    }

    return NextResponse.json(contact)
  } catch (error: any) {
    console.error("Error fetching contact:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה בקבלת איש קשר",
      },
      { status: 500 }
    )
  }
}

// PUT - עדכון איש קשר
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    const body = await req.json()
    const {
      firstName,
      lastName,
      phone,
      company,
      notes,
      tags,
      emailMarketingConsent,
    } = body

    // בדיקה שהאיש קשר שייך לחברה
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!existingContact) {
      return NextResponse.json(
        { error: "איש קשר לא נמצא" },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (phone !== undefined) updateData.phone = phone
    if (company !== undefined) updateData.company = company
    if (notes !== undefined) updateData.notes = notes
    if (tags !== undefined) updateData.tags = tags
    if (emailMarketingConsent !== undefined) {
      updateData.emailMarketingConsent = emailMarketingConsent
      if (emailMarketingConsent === true && !existingContact.emailMarketingConsent) {
        updateData.emailMarketingConsentAt = new Date()
      }
    }

    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: updateData,
      include: {
        categoryAssignments: {
          include: {
            category: true,
          },
        },
        customer: true,
      },
    })

    return NextResponse.json(contact)
  } catch (error: any) {
    console.error("Error updating contact:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה בעדכון איש קשר",
      },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת איש קשר
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "לא מאומת" }, { status: 401 })
    }

    // בדיקה שהאיש קשר שייך לחברה
    const contact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        shop: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!contact) {
      return NextResponse.json(
        { error: "איש קשר לא נמצא" },
        { status: 404 }
      )
    }

    await prisma.contact.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting contact:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה במחיקת איש קשר",
      },
      { status: 500 }
    )
  }
}

