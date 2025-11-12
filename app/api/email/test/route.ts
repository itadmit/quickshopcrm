import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmail, verifyEmailConnection, getEmailTemplate } from "@/lib/email"

/**
 * Test email sending and verify SMTP connection
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { to, subject, message } = body

    // Verify SendGrid connection first
    const isConnected = await verifyEmailConnection()
    
    if (!isConnected) {
      return NextResponse.json({ 
        error: "SendGrid לא מוגדר",
        details: "אנא הגדר SendGrid בדף הסופר אדמין (/admin) לפני שליחת מיילים"
      }, { status: 500 })
    }

    // Send test email
    try {
      await sendEmail({
        to: to || session.user.email || 'quickshopil@gmail.com',
        subject: subject || 'בדיקת מערכת האימיילים - Quick Shop',
        html: getEmailTemplate({
          title: 'בדיקת מערכת האימיילים',
          content: `
            <h2>שלום ${session.user.name}! 👋</h2>
            <p>${message || 'זה אימייל בדיקה ממערכת Quick Shop.'}</p>
            <p>אם קיבלת אימייל זה, המערכת עובדת כראוי! ✅</p>
          `,
          footer: `אימייל זה נשלח מ-Quick Shop ב-${new Date().toLocaleString('he-IL')}`,
        }),
      })

      return NextResponse.json({ 
        success: true,
        message: "Test email sent successfully",
        sentTo: to || session.user.email,
      })
    } catch (emailError: any) {
      // אם יש שגיאה בשליחת המייל, נחזיר הודעה ברורה יותר
      const errorMessage = emailError?.message || 'Failed to send email'
      
      // בדיקה אם זו שגיאה של SendGrid או אם SendGrid לא מוגדר
      if (errorMessage.includes('not configured') || errorMessage.includes('לא מוגדר')) {
        return NextResponse.json({ 
          error: "SendGrid לא מוגדר",
          details: "אנא הגדר SendGrid בדף הסופר אדמין (/admin) לפני שליחת מיילים",
        }, { status: 500 })
      } else if (errorMessage.includes('SendGrid')) {
        return NextResponse.json({ 
          error: "שגיאה בשליחת מייל דרך SendGrid",
          details: "אנא בדוק את הגדרות SendGrid בדף הסופר אדמין",
          technicalError: errorMessage,
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: "Failed to send test email",
        details: errorMessage,
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Error sending test email:", error)
    return NextResponse.json({ 
      error: "Failed to send test email",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

/**
 * Verify email connection
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isConnected = await verifyEmailConnection()
    
    return NextResponse.json({ 
      connected: isConnected,
      provider: 'SendGrid',
      message: isConnected 
        ? 'SendGrid מוגדר ומוכן לשליחת מיילים'
        : 'SendGrid לא מוגדר - אנא הגדר בדף הסופר אדמין'
    })
  } catch (error) {
    console.error("Error verifying email connection:", error)
    return NextResponse.json({ 
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

