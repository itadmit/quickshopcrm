import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendEmail, getEmailTemplate, getShopEmailSettings } from "@/lib/email"

const otpSchema = z.object({
  email: z.string().email("אימייל לא תקין").optional(),
  phone: z.string().optional(), // טלפון או מייל - אחד מהם חובה
}).refine((data) => data.email || data.phone, {
  message: "אנא הזן טלפון או אימייל",
})

// POST - שליחת OTP
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
    const data = otpSchema.parse(body)

    // מציאת לקוח לפי אימייל או טלפון
    let customer = null
    let emailToUse: string | null = null

    if (data.email) {
      emailToUse = data.email.toLowerCase()
      customer = await prisma.customer.findFirst({
        where: {
          shopId: shop.id,
          email: emailToUse,
        },
      })
    } else if (data.phone) {
      // חיפוש לפי טלפון - רק לחשבון רשום
      customer = await prisma.customer.findFirst({
        where: {
          shopId: shop.id,
          phone: data.phone,
        },
      })
      
      if (customer) {
        // אם יש לקוח, נשתמש במייל שלו
        emailToUse = customer.email
      }
    }

    // אם לא מצאנו לקוח, נחזיר שגיאה ברורה וננקה OTP tokens ישנים
    if (!customer) {
      // ניקוי OTP tokens ישנים של אימייל/טלפון זה - למקרה שהלקוח נמחק
      if (emailToUse) {
        await prisma.otpToken.deleteMany({
          where: {
            shopId: shop.id,
            email: emailToUse,
          },
        })
      } else if (data.phone) {
        // אם יש טלפון אבל לא מצאנו לקוח, ננסה למצוא OTP tokens לפי טלפון
        // (אבל אין לנו שדה טלפון ב-OtpToken, אז נדלג על זה)
      }
      
      console.log(`[OTP] Customer not found for ${emailToUse || data.phone} - returning error`)
      // החזרת 200 עם error כדי למנוע שגיאה 404 בקונסול
      return NextResponse.json(
        { error: "חשבון לא נמצא. אנא הירשם תחילה", success: false },
        { status: 200 }
      )
    }

    console.log(`[OTP] Customer found: ${customer.id} - sending OTP to ${emailToUse}`)

    // וידוא שיש אימייל ללקוח
    if (!emailToUse || !customer.email) {
      return NextResponse.json(
        { error: "לא נמצא אימייל לחשבון. אנא פנה לתמיכה" },
        { status: 400 }
      )
    }

    // יצירת קוד OTP (6 ספרות)
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10) // תפוגה תוך 10 דקות

    // מחיקת OTP קודמים שלא שימשו (למניעת הצטברות)
    await prisma.otpToken.deleteMany({
      where: {
        shopId: shop.id,
        email: emailToUse,
        used: false,
        expiresAt: { lt: new Date() },
      },
    })

    // שמירת OTP במסד הנתונים
    await prisma.otpToken.create({
      data: {
        shopId: shop.id,
        email: emailToUse,
        code,
        expiresAt,
      },
    })

    // שליחת אימייל עם קוד OTP - רק אם הלקוח קיים
    try {
      const emailSettings = await getShopEmailSettings(shop.id)
      const gradient = `linear-gradient(135deg, ${emailSettings.color1} 0%, ${emailSettings.color2} 100%)`
      
      await sendEmail({
        to: emailToUse,
        subject: `קוד התחברות ל-${shop.name}`,
        shopId: shop.id, // העברת shopId כדי להשתמש בשם השולח מההגדרות
        html: getEmailTemplate({
          title: "קוד התחברות",
          content: `
            <h2>שלום!</h2>
            <p>קיבלנו בקשה להתחברות לחשבון שלך ב-${shop.name}.</p>
            <p>הקוד שלך הוא:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; padding: 20px 40px; background: ${gradient}; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px;">
                ${code}
              </div>
            </div>
            <p style="color: #666; font-size: 14px;">הקוד תקף למשך 10 דקות בלבד.</p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">אם לא ביקשת התחברות, תוכל להתעלם מהאימייל הזה.</p>
          `,
          color1: emailSettings.color1,
          color2: emailSettings.color2,
          senderName: emailSettings.senderName,
        }),
      })
    } catch (emailError) {
      console.error("Error sending OTP email:", emailError)
      // לא נחזיר שגיאה - נגיד שהאימייל נשלח (למניעת enumeration)
    }

    return NextResponse.json({
      message: "נשלח קוד התחברות",
      email: emailToUse, // נשלח את האימייל כדי להציג אותו בממשק
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error sending OTP:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

