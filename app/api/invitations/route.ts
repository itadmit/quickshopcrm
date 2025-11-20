import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import crypto from "crypto"

// GET - קבלת כל ההזמנות של החברה
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        companyId: session.user.companyId,
      },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(invitations)
  } catch (error) {
    console.error("Error fetching invitations:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת הזמנה חדשה
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { email, name, role, permissions } = body

    if (!email || !permissions) {
      return NextResponse.json(
        { error: "Email and permissions are required" },
        { status: 400 }
      )
    }

    // בדיקת role תקין
    const validRoles = ["MANAGER", "USER", "INFLUENCER"]
    const userRole = role && validRoles.includes(role) ? role : "USER"

    // בדיקה אם המשתמש כבר קיים
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // בדיקה אם יש הזמנה פעילה לאותו אימייל
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        companyId: session.user.companyId,
        status: "PENDING",
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: "Invitation already exists for this email" },
        { status: 400 }
      )
    }

    // יצירת token
    const token = crypto.randomBytes(32).toString("hex")

    // תאריך תפוגה - 7 ימים מהיום
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // יצירת ההזמנה
    const invitation = await prisma.invitation.create({
      data: {
        companyId: session.user.companyId,
        email,
        name: name || null,
        token,
        invitedBy: session.user.id,
        role: userRole as any,
        permissions: permissions as any,
        expiresAt,
        status: "PENDING",
      },
      include: {
        inviter: {
          select: {
            name: true,
          },
        },
      },
    })

    // שליחת מייל עם קישור אישור
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/accept/${token}`
    
    // טקסט מותאם לפי סוג המשתמש
    const roleText = userRole === "INFLUENCER" 
      ? "כמשפיען/ית" 
      : userRole === "MANAGER" 
      ? "כמנהל" 
      : "כעובד"
    
    const roleDescription = userRole === "INFLUENCER"
      ? "תקבל/י גישה לדשבורד משפיען/ית ייעודי עם כלים לניהול קופונים והזמנות."
      : "תקבל/י גישה למערכת בהתאם להרשאות שהוגדרו עבורך."
    
    let emailSent = false
    let emailError: string | null = null
    
    try {
      console.log(`📧 Attempting to send invitation email to ${email}...`)
      await sendEmail({
        to: email,
        subject: `הזמנה להצטרפות ל-Quick Shop ${roleText}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #15b981;">הזמנה להצטרפות ל-Quick Shop</h2>
            <p>שלום ${name || email},</p>
            <p>${session.user.name} הזמין אותך להצטרף לצוות ב-Quick Shop ${roleText}.</p>
            <p>${roleDescription}</p>
            <p>לחץ על הקישור הבא כדי לאשר את ההזמנה וליצור חשבון:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" style="background: linear-gradient(135deg, #15b981 0%, #10b981 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                אישור והצטרפות
              </a>
            </p>
            <p style="color: #666; font-size: 12px;">
              הקישור תקף למשך 7 ימים.
            </p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              אם הכפתור לא עובד, תוכל/י להעתיק ולהדביק את הקישור הבא בדפדפן:<br>
              <a href="${acceptUrl}" style="color: #15b981; word-break: break-all;">${acceptUrl}</a>
            </p>
          </div>
        `,
      })
      emailSent = true
      console.log(`✅ Invitation email sent successfully to ${email}`)
    } catch (emailErr: any) {
      // אם יש בעיה עם הגדרות אימייל, נרשום לוג אבל נמשיך
      const errorMessage = emailErr?.message || 'Unknown error'
      emailError = errorMessage
      
      console.error(`❌ Failed to send invitation email to ${email}:`, errorMessage)
      console.error('Full error details:', {
        message: errorMessage,
        stack: emailErr?.stack,
        response: emailErr?.response?.body,
      })
      
      if (errorMessage.includes('not configured') || errorMessage.includes('לא מוגדר')) {
        console.warn(`⚠️ SendGrid not configured. Invitation created but email not sent to ${email}. Please configure SendGrid in Super Admin settings.`)
      } else {
        console.warn(`⚠️ Failed to send invitation email to ${email}:`, errorMessage)
      }
      // לא נזרוק שגיאה - ההזמנה נוצרה, רק המייל לא נשלח
    }

    return NextResponse.json({
      ...invitation,
      emailSent,
      emailError: emailError || undefined,
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating invitation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - שליחה מחדש של הזמנה
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const invitationId = searchParams.get("id")
    const action = searchParams.get("action")

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      )
    }

    // בדיקה שההזמנה שייכת לחברה של המשתמש
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        companyId: session.user.companyId,
      },
      include: {
        inviter: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    // אם הפעולה היא resend - שליחה מחדש
    if (action === "resend") {
      // עדכון תאריך תפוגה - 7 ימים מהיום
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await prisma.invitation.update({
        where: {
          id: invitationId,
        },
        data: {
          expiresAt,
        },
      })

      // שליחת מייל עם קישור אישור
      const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/accept/${invitation.token}`
      
      // טקסט מותאם לפי סוג המשתמש
      const roleText = invitation.role === "INFLUENCER" 
        ? "כמשפיען/ית" 
        : invitation.role === "MANAGER" 
        ? "כמנהל" 
        : "כעובד"
      
      const roleDescription = invitation.role === "INFLUENCER"
        ? "תקבל/י גישה לדשבורד משפיען/ית ייעודי עם כלים לניהול קופונים והזמנות."
        : "תקבל/י גישה למערכת בהתאם להרשאות שהוגדרו עבורך."
      
      let emailSent = false
      let emailError: string | null = null
      
      try {
        console.log(`📧 Attempting to resend invitation email to ${invitation.email}...`)
        await sendEmail({
          to: invitation.email,
          subject: `הזמנה להצטרפות ל-Quick Shop ${roleText}`,
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #15b981;">הזמנה להצטרפות ל-Quick Shop</h2>
              <p>שלום ${invitation.name || invitation.email},</p>
              <p>${invitation.inviter?.name || session.user.name} הזמין אותך להצטרף לצוות ב-Quick Shop ${roleText}.</p>
              <p>${roleDescription}</p>
              <p>לחץ על הקישור הבא כדי לאשר את ההזמנה וליצור חשבון:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${acceptUrl}" style="background: linear-gradient(135deg, #15b981 0%, #10b981 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  אישור והצטרפות
                </a>
              </p>
              <p style="color: #666; font-size: 12px;">
                הקישור תקף למשך 7 ימים.
              </p>
              <p style="color: #666; font-size: 12px; margin-top: 20px;">
                אם הכפתור לא עובד, תוכל/י להעתיק ולהדביק את הקישור הבא בדפדפן:<br>
                <a href="${acceptUrl}" style="color: #15b981; word-break: break-all;">${acceptUrl}</a>
              </p>
            </div>
          `,
        })
        emailSent = true
        console.log(`✅ Invitation email resent successfully to ${invitation.email}`)
      } catch (emailErr: any) {
        const errorMessage = emailErr?.message || 'Unknown error'
        emailError = errorMessage
        
        console.error(`❌ Failed to resend invitation email to ${invitation.email}:`, errorMessage)
        console.error('Full error details:', {
          message: errorMessage,
          stack: emailErr?.stack,
          response: emailErr?.response?.body,
        })
        
        if (errorMessage.includes('not configured') || errorMessage.includes('לא מוגדר')) {
          console.warn(`⚠️ SendGrid not configured. Invitation email not sent to ${invitation.email}. Please configure SendGrid in Super Admin settings.`)
        } else {
          console.warn(`⚠️ Failed to resend invitation email to ${invitation.email}:`, errorMessage)
        }
        // נזרוק שגיאה רק אם זה לא בעיית הגדרות
        if (!errorMessage.includes('not configured') && !errorMessage.includes('לא מוגדר')) {
          throw emailErr
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: "Invitation resent successfully",
        emailSent,
        emailError: emailError || undefined,
      })
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error resending invitation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - מחיקת הזמנה
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const invitationId = searchParams.get("id")

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      )
    }

    // בדיקה שההזמנה שייכת לחברה של המשתמש
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        companyId: session.user.companyId,
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    // מחיקת ההזמנה
    await prisma.invitation.delete({
      where: {
        id: invitationId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invitation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

