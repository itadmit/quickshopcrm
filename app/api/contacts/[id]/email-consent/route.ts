import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PUT - עדכון אישור דיוור
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
    const { emailMarketingConsent, source } = body

    if (typeof emailMarketingConsent !== "boolean") {
      return NextResponse.json(
        { error: "emailMarketingConsent חייב להיות boolean" },
        { status: 400 }
      )
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

    const updateData: any = {
      emailMarketingConsent,
    }

    if (emailMarketingConsent === true) {
      updateData.emailMarketingConsentAt = new Date()
      if (source) {
        updateData.emailMarketingConsentSource = source
      }
    } else {
      // אם מבטלים אישור, לא נמחק את התאריך (לשמירת היסטוריה)
      // אבל נוסיף הערה
      updateData.emailMarketingConsentSource = source || contact.emailMarketingConsentSource
    }

    const updatedContact = await prisma.contact.update({
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

    return NextResponse.json(updatedContact)
  } catch (error: any) {
    console.error("Error updating email consent:", error)
    return NextResponse.json(
      {
        error: error.message || "שגיאה בעדכון אישור דיוור",
      },
      { status: 500 }
    )
  }
}


