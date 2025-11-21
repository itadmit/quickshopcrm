import { NextResponse } from 'next/server';
import { sendEmail, getEmailTemplate } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, website, revenue } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'אנא מלאו את כל שדות החובה' },
        { status: 400 }
      );
    }

    // יצירת תוכן המייל
    const emailContent = `
      <div style="font-family: sans-serif; direction: rtl; text-align: right;">
        <h2>בקשת הצטרפות ל-Quick Shop Payments 🚀</h2>
        <p>התקבל ליד חדש מהעמוד הייעודי.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin-top: 20px;">
          <p><strong>שם מלא:</strong> ${name}</p>
          <p><strong>אימייל:</strong> ${email}</p>
          <p><strong>טלפון:</strong> ${phone}</p>
          <p><strong>אתר אינטרנט:</strong> ${website || 'לא צוין'}</p>
          <p><strong>מחזור חודשי משוער:</strong> ₪${revenue?.toLocaleString() || '0'}</p>
        </div>

        <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
          נשלח אוטומטית ממערכת Quick Shop
        </p>
      </div>
    `;

    // שליחת המייל
    await sendEmail({
      to: 'itadmit@gmail.com',
      subject: `ליד חדש ל-Payments: ${name}`,
      html: getEmailTemplate({
        title: 'ליד חדש ל-Quick Shop Payments',
        content: emailContent,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending payments lead email:', error);
    return NextResponse.json(
      { error: 'שגיאה בשליחת הבקשה. אנא נסו שוב מאוחר יותר.' },
      { status: 500 }
    );
  }
}
