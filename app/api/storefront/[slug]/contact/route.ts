import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { createOrUpdateContact, initContactCategories } from "@/lib/contacts"

const contactFormSchema = z.object({
  email: z.string().email("אימייל לא תקין"),
  name: z.string().min(1, "שם הוא חובה"),
  phone: z.string().optional(),
  company: z.string().optional(),
  message: z.string().min(1, "הודעה היא חובה"),
  subject: z.string().optional(),
})

// POST - שליחת טופס יצירת קשר
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
    const data = contactFormSchema.parse(body)

    // אתחול קטגוריות אם צריך
    await initContactCategories(shop.id)

    // פיצול שם לשם פרטי ומשפחה
    const nameParts = data.name.split(" ")
    const firstName = nameParts[0] || null
    const lastName = nameParts.slice(1).join(" ") || null

    // בדיקת תמיכה VIP
    let isVipSupport = false
    const customer = await prisma.customer.findFirst({
      where: {
        shopId: shop.id,
        email: data.email.toLowerCase(),
      },
      select: {
        id: true,
        premiumClubTier: true,
      },
    })

    if (customer?.premiumClubTier) {
      const premiumClubPlugin = await prisma.plugin.findFirst({
        where: {
          slug: 'premium-club',
          shopId: shop.id,
          isActive: true,
          isInstalled: true,
        },
        select: { config: true },
      })

      if (premiumClubPlugin?.config) {
        const config = premiumClubPlugin.config as any
        if (config.enabled && config.benefits?.vipSupport) {
          const tier = config.tiers?.find((t: any) => t.slug === customer.premiumClubTier)
          isVipSupport = tier?.benefits?.vipSupport || false
        }
      }
    }

    // יצירת/עדכון Contact עם קטגוריה CONTACT_FORM
    const notesPrefix = isVipSupport ? "⭐ VIP SUPPORT ⭐\n\n" : ""
    await createOrUpdateContact({
      shopId: shop.id,
      email: data.email.toLowerCase(),
      firstName,
      lastName,
      phone: data.phone || null,
      company: data.company || null,
      notes: `${notesPrefix}נושא: ${data.subject || "ללא נושא"}\n\nהודעה:\n${data.message}`,
      categoryTypes: ["CONTACT_FORM"],
      emailMarketingConsent: false,
      emailMarketingConsentSource: "contact_form",
    })

    // יצירת אירוע VIP אם זה תמיכה VIP
    if (isVipSupport && customer) {
      await prisma.shopEvent.create({
        data: {
          shopId: shop.id,
          type: "premium_club.vip_support",
          entityType: "customer",
          entityId: customer.id,
          payload: {
            tier: customer.premiumClubTier,
            subject: data.subject || "ללא נושא",
            priority: "high",
          },
        },
      })
    }

    // כאן אפשר להוסיף שליחת אימייל לבעל החנות

    return NextResponse.json({
      success: true,
      message: isVipSupport 
        ? "הודעתך נשלחה בהצלחה. כחבר מועדון פרימיום, תקבל תשובה בעדיפות גבוהה."
        : "הודעתך נשלחה בהצלחה. נחזור אליך בהקדם",
      isVipSupport,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error submitting contact form:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

