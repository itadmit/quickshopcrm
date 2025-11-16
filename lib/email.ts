import sgMail from '@sendgrid/mail'
import { prisma } from './prisma'

/**
 * Get email settings from shop theme settings
 */
export async function getShopEmailSettings(shopId: string): Promise<{
  senderName: string
  color1: string
  color2: string
}> {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        name: true,
        themeSettings: true,
      },
    })

    if (!shop) {
      return {
        senderName: 'Quick Shop',
        color1: '#6f65e2',
        color2: '#b965e2',
      }
    }

    const themeSettings = (shop.themeSettings as any) || {}
    
    return {
      senderName: themeSettings.emailSenderName || shop.name || 'Quick Shop',
      color1: themeSettings.emailColor1 || '#6f65e2',
      color2: themeSettings.emailColor2 || '#b965e2',
    }
  } catch (error) {
    console.error('Error fetching shop email settings:', error)
    return {
      senderName: 'Quick Shop',
      color1: '#6f65e2',
      color2: '#b965e2',
    }
  }
}

/**
 * Get SendGrid settings from database
 */
async function getSendGridSettings() {
  try {
    const settings = await prisma.company.findUnique({
      where: { id: "SENDGRID_GLOBAL_SETTINGS" },
      select: {
        settings: true,
      },
    })

    if (!settings || !settings.settings) {
      return null
    }

    const sendgridSettings = (settings.settings as any)?.sendgrid
    if (!sendgridSettings || !sendgridSettings.apiKey) {
      return null
    }

    return {
      apiKey: sendgridSettings.apiKey,
      fromEmail: sendgridSettings.fromEmail || 'no-reply@my-quickshop.com',
      fromName: sendgridSettings.fromName || 'Quick Shop',
    }
  } catch (error) {
    console.error('Error fetching SendGrid settings:', error)
    return null
  }
}

/**
 * Send an email using SendGrid only
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  attachments,
  shopId,
}: {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
  shopId?: string // אם מועבר, נשתמש בשם השולח מההגדרות של החנות
}): Promise<void> {
  // Get SendGrid settings - required!
  const sendgridSettings = await getSendGridSettings()
  
  if (!sendgridSettings || !sendgridSettings.apiKey) {
    throw new Error('SendGrid is not configured. Please configure SendGrid in Super Admin settings (/admin) before sending emails.')
  }

  try {
    sgMail.setApiKey(sendgridSettings.apiKey)
    
    // Parse 'from' parameter or use SendGrid settings
    let fromEmail = sendgridSettings.fromEmail
    let fromName = sendgridSettings.fromName
    
    // אם יש shopId, נשתמש בשם השולח מההגדרות של החנות
    if (shopId) {
      try {
        const emailSettings = await getShopEmailSettings(shopId)
        if (emailSettings.senderName) {
          fromName = emailSettings.senderName
        }
      } catch (error) {
        console.warn('Failed to get shop email settings, using default:', error)
        // נמשיך עם ברירת המחדל
      }
    }
    
    if (from) {
      // Parse "Name <email@example.com>" format
      const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/)
      if (fromMatch) {
        fromName = fromMatch[1].trim()
        fromEmail = fromMatch[2].trim()
      } else if (from.includes('@')) {
        fromEmail = from
      }
    }

    // Convert recipients to array
    const recipients = Array.isArray(to) ? to : [to]
    
    // Validate from email format
    if (!fromEmail || !fromEmail.includes('@')) {
      throw new Error('Invalid from email address. Please configure a valid email address in SendGrid settings.')
    }

    // Send email - SendGrid supports multiple recipients in 'to' field
    const msg: any = {
      to: recipients,
      from: {
        email: fromEmail,
        name: fromName || 'Quick Shop',
      },
      subject: subject || 'No Subject',
    }

    // Add content - SendGrid requires at least one of html or text
    if (html) {
      msg.html = html
    }
    if (text) {
      msg.text = text
    }
    // If no html or text provided, use empty string
    if (!html && !text) {
      msg.text = ''
      msg.html = ''
    }

    // Add attachments if any
    if (attachments && attachments.length > 0) {
      msg.attachments = attachments.map(att => ({
        content: typeof att.content === 'string' 
          ? att.content 
          : Buffer.isBuffer(att.content)
          ? att.content.toString('base64')
          : String(att.content),
        filename: att.filename,
        type: att.contentType || 'application/octet-stream',
        disposition: 'attachment',
      }))
    }

    await sgMail.send(msg)
    console.log('✅ Email sent successfully via SendGrid to', recipients.length, 'recipient(s)')
  } catch (error: any) {
    console.error('❌ Error sending email via SendGrid:', error?.message || error)
    
    // Log more details for debugging
    if (error.response) {
      console.error('SendGrid response body:', error.response.body)
      console.error('SendGrid response headers:', error.response.headers)
    }
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send email via SendGrid'
    if (error.response?.body) {
      const body = typeof error.response.body === 'string' 
        ? JSON.parse(error.response.body) 
        : error.response.body
      
      if (body.errors && Array.isArray(body.errors)) {
        errorMessage = body.errors.map((e: any) => e.message || e).join(', ')
      } else if (body.message) {
        errorMessage = body.message
      }
    } else if (error.message) {
      errorMessage = error.message
    }
    
    throw new Error(`SendGrid error: ${errorMessage}. Please check your SendGrid API key, from email (must be verified in SendGrid), and settings.`)
  }
}

/**
 * Parse email template with variables
 */
export function parseEmailTemplate(
  template: string,
  variables: Record<string, any>
): string {
  let parsed = template

  // Replace {{variable}} with actual values
  // First handle nested paths like {{customer.name}} or {{coupon.code}}
  const nestedRegex = /\{\{([\w.]+)\}\}/g
  parsed = parsed.replace(nestedRegex, (match, path) => {
    const value = getNestedValue(variables, path)
    return value !== undefined && value !== null ? String(value) : match
  })

  // Then handle simple variables for backward compatibility
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    parsed = parsed.replace(regex, value !== undefined && value !== null ? String(value) : '')
  })

  return parsed
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined
    return current[key]
  }, obj)
}

/**
 * Get email template with default styling
 */
export function getEmailTemplate({
  title,
  content,
  footer,
  color1 = '#6f65e2',
  color2 = '#b965e2',
  senderName = 'Quick Shop',
}: {
  title: string
  content: string
  footer?: string
  color1?: string
  color2?: string
  senderName?: string
}): string {
  const gradient = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`
  const defaultFooter = footer || `הודעה זו נשלחה אוטומטית מ-${senderName}`
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>${title}</title>
  <style>
    * {
      direction: rtl;
      text-align: right;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
      direction: rtl;
      text-align: right;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: ${gradient};
      padding: 30px 20px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
      color: #333;
      line-height: 1.6;
      direction: rtl;
      text-align: right;
    }
    .content h2 {
      direction: rtl;
      text-align: right;
    }
    .content p {
      direction: rtl;
      text-align: right;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #eee;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: ${gradient};
      color: white !important;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: 600;
    }
    .button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>${defaultFooter}</p>
      <p>${senderName} © ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Pre-built email templates
 */
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: 'ברוך הבא ל-Quick Shop! 🎉',
    html: getEmailTemplate({
      title: 'ברוך הבא!',
      content: `
        <p>שלום ${name},</p>
        <p>תודה שנרשמת ל-Quick Shop! אנחנו שמחים שהצטרפת אלינו.</p>
        <p>המערכת שלנו תעזור לך לנהל את החנות שלך בצורה יעילה ופשוטה.</p>
        <p>אם יש לך שאלות, אנחנו כאן כדי לעזור!</p>
        <p><strong>בהצלחה,<br>צוות Quick Shop</strong></p>
      `,
    }),
  }),

  leadCreated: (leadName: string, leadEmail: string, source: string) => ({
    subject: `ליד חדש נוצר: ${leadName}`,
    html: getEmailTemplate({
      title: 'ליד חדש נוסף!',
      content: `
        <h2>ליד חדש נוסף למערכת 🎯</h2>
        <p><strong>שם:</strong> ${leadName}</p>
        <p><strong>אימייל:</strong> ${leadEmail}</p>
        <p><strong>מקור:</strong> ${source}</p>
        <p>זה הזמן לפנות אליו ולהתחיל תהליך מכירה!</p>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/leads" class="button">
          צפה בליד
        </a>
      `,
    }),
  }),

  taskAssigned: (taskTitle: string, assigneeName: string, dueDate?: string) => ({
    subject: `משימה חדשה הוקצתה לך: ${taskTitle}`,
    html: getEmailTemplate({
      title: 'משימה חדשה',
      content: `
        <h2>הוקצתה לך משימה חדשה 📋</h2>
        <p><strong>כותרת:</strong> ${taskTitle}</p>
        ${assigneeName ? `<p><strong>מקבל המשימה:</strong> ${assigneeName}</p>` : ''}
        ${dueDate ? `<p><strong>תאריך יעד:</strong> ${dueDate}</p>` : ''}
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tasks/my" class="button">
          צפה במשימה
        </a>
      `,
    }),
  }),

  meetingReminder: (title: string, startTime: string, location: string) => ({
    subject: `תזכורת: פגישה - ${title}`,
    html: getEmailTemplate({
      title: 'תזכורת לפגישה',
      content: `
        <h2>תזכורת לפגישה הקרובה 📅</h2>
        <p><strong>נושא:</strong> ${title}</p>
        <p><strong>זמן:</strong> ${startTime}</p>
        <p><strong>מקום:</strong> ${location}</p>
        <p>נתראה שם! 👋</p>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/calendar" class="button">
          צפה ביומן
        </a>
      `,
    }),
  }),

  custom: (subject: string, title: string, content: string) => ({
    subject,
    html: getEmailTemplate({
      title,
      content,
    }),
  }),

  quoteApproved: (quoteNumber: string, leadName: string, total: number) => ({
    subject: `הצעה אושרה: ${quoteNumber}`,
    html: getEmailTemplate({
      title: 'הצעה אושרה! 🎉',
      content: `
        <h2>הצעה אושרה בהצלחה</h2>
        <p><strong>מספר הצעה:</strong> ${quoteNumber}</p>
        <p><strong>לקוח:</strong> ${leadName}</p>
        <p><strong>סכום:</strong> ₪${total.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</p>
        <p>ההצעה אושרה על ידי הלקוח. כעת תוכל להתחיל את הפרויקט!</p>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/quotes" class="button">
          צפה בהצעה
        </a>
      `,
    }),
  }),

  paymentReceived: (amount: number, quoteNumber?: string, clientName?: string, transactionId?: string) => ({
    subject: `💰 תשלום חדש התקבל: ₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    html: getEmailTemplate({
      title: 'תשלום חדש התקבל! 💰',
      content: `
        <h2>תשלום חדש התקבל בהצלחה</h2>
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 24px; font-weight: bold; color: #059669; margin: 0;">
            ₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
          </p>
        </div>
        ${quoteNumber ? `<p><strong>מספר הצעה:</strong> ${quoteNumber}</p>` : ''}
        ${clientName ? `<p><strong>לקוח:</strong> ${clientName}</p>` : ''}
        ${transactionId ? `<p><strong>מספר עסקה:</strong> ${transactionId}</p>` : ''}
        <p>התשלום התקבל והתועד במערכת. הפרויקט נוצר אוטומטית.</p>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payments" class="button">
          צפה בתשלומים
        </a>
      `,
    }),
  }),
}

/**
 * Verify SendGrid connection
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const sendgridSettings = await getSendGridSettings()
    
    if (!sendgridSettings || !sendgridSettings.apiKey) {
      console.warn('⚠️ SendGrid is not configured')
      return false
    }

    // Try to set the API key - if it's invalid, SendGrid will throw an error when we try to send
    sgMail.setApiKey(sendgridSettings.apiKey)
    console.log('✅ SendGrid is configured')
    return true
  } catch (error) {
    console.error('❌ SendGrid connection failed:', error)
    return false
  }
}

