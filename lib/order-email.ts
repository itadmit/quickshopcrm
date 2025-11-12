import { sendEmail, getEmailTemplate } from "./email"
import { prisma } from "./prisma"

/**
 * שליחת מייל אישור הזמנה ללקוח אחרי תשלום מוצלח
 */
export async function sendOrderConfirmationEmail(orderId: string) {
  try {
    // קבלת פרטי ההזמנה
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: {
          select: { id: true, name: true, settings: true },
        },
        items: true,
      },
    })

    if (!order) {
      console.error(`Order ${orderId} not found for email`)
      return { success: false, error: "Order not found" }
    }

    const shopSettings = order.shop.settings as any
    const checkoutSettings = shopSettings?.checkoutPage || {}
    const customFieldsConfig = checkoutSettings.customFields || []
    
    // בניית רשימת פריטים
    const itemsList = order.items.map(item => 
      `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">₪${item.total.toFixed(2)}</td>
      </tr>`
    ).join('')

    // בניית רשימת קסטום פילדס
    let customFieldsHtml = ''
    if (order.customFields && typeof order.customFields === 'object') {
      const customFieldsList = Object.entries(order.customFields)
        .map(([key, value]) => {
          const fieldConfig = customFieldsConfig.find((f: any) => f.id === key)
          const fieldLabel = fieldConfig?.label || key
          const displayValue = value === true ? "כן" : value === false ? "לא" : String(value || "")
          
          if (!displayValue || displayValue === "false" || displayValue === "") {
            return null
          }
          
          return `<p><strong>${fieldLabel}:</strong> ${displayValue}</p>`
        })
        .filter(Boolean)
        .join('')
      
      if (customFieldsList) {
        customFieldsHtml = `
          <div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 8px;">
            <h3 style="margin-top: 0; margin-bottom: 10px;">פרטים נוספים</h3>
            ${customFieldsList}
          </div>
        `
      }
    }

    const emailContent = `
      <h2>תודה על ההזמנה שלך! 🎉</h2>
      <p>שלום ${order.customerName},</p>
      <p>הזמנתך התקבלה והתשלום אושר בהצלחה! מספר ההזמנה שלך הוא: <strong>${order.orderNumber}</strong></p>
      
      <h3>פרטי ההזמנה:</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">מוצר</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">כמות</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">מחיר</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>

      <div style="margin-top: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>סכום ביניים:</span>
          <strong>₪${order.subtotal.toFixed(2)}</strong>
        </div>
        ${order.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #059669;">
          <span>הנחה:</span>
          <strong>-₪${order.discount.toFixed(2)}</strong>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>משלוח:</span>
          <strong>₪${order.shipping.toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>מע"מ:</span>
          <strong>₪${order.tax.toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #ddd; font-size: 18px;">
          <strong>סה"כ ששולם:</strong>
          <strong style="color: #059669;">₪${order.total.toFixed(2)}</strong>
        </div>
      </div>

      ${customFieldsHtml}

      ${order.notes ? `
      <div style="margin-top: 20px; padding: 15px; background-color: #fff7ed; border-radius: 8px;">
        <h3 style="margin-top: 0; margin-bottom: 10px;">הערות:</h3>
        <p>${order.notes}</p>
      </div>
      ` : ''}

      <p style="margin-top: 30px;">נשלח אליך עדכון נוסף כשההזמנה תישלח.</p>
      <p>תודה שקנית אצלנו!</p>
    `

    await sendEmail({
      to: order.customerEmail,
      subject: `אישור הזמנה ותשלום #${order.orderNumber} - ${order.shop.name}`,
      html: getEmailTemplate({
        title: `אישור הזמנה #${order.orderNumber}`,
        content: emailContent,
        footer: `הודעה זו נשלחה מ-${order.shop.name}`,
      }),
    })
    
    console.log(`✅ Order confirmation email sent to ${order.customerEmail} for order ${order.orderNumber}`)
    return { success: true }
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error'
    if (errorMessage.includes('not configured') || errorMessage.includes('לא מוגדר')) {
      console.warn(`⚠️ SendGrid not configured. Order confirmation email not sent.`)
    } else {
      console.warn(`⚠️ Failed to send order confirmation email:`, errorMessage)
    }
    return { success: false, error: errorMessage }
  }
}

