import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { createOrUpdateContact, initContactCategories } from "@/lib/contacts"

const newsletterSchema = z.object({
  email: z.string().email("אימייל לא תקין"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

// POST - הרשמה לניוזלטר
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

    const body = await req.json()
    const data = newsletterSchema.parse(body)

    // אתחול קטגוריות אם צריך
    await initContactCategories(shop.id)

    // יצירת/עדכון Contact עם קטגוריה NEWSLETTER
    await createOrUpdateContact({
      shopId: shop.id,
      email: data.email.toLowerCase(),
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      categoryTypes: ["NEWSLETTER"],
      emailMarketingConsent: true,
      emailMarketingConsentSource: "newsletter_form",
    })

    return NextResponse.json({
      success: true,
      message: "נרשמת בהצלחה לניוזלטר",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error subscribing to newsletter:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


