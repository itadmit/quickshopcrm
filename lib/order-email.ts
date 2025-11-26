import { sendEmail, getEmailTemplate, getShopEmailSettings } from "./email"
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
          select: { id: true, name: true, slug: true, domain: true, settings: true },
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
        <td style="padding: 10px; border-bottom: 1px solid #eee; direction: rtl; text-align: right;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; direction: rtl; text-align: right;">₪${item.total.toFixed(2)}</td>
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
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; direction: rtl;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd; direction: rtl;">מוצר</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">כמות</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd; direction: rtl;">מחיר</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>

      <div style="margin-top: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 8px; direction: rtl; text-align: right;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; direction: rtl;">
          <span>סכום ביניים:</span>
          <strong>₪${order.subtotal.toFixed(2)}</strong>
        </div>
        ${order.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #059669; direction: rtl;">
          <span>הנחה:</span>
          <strong>-₪${order.discount.toFixed(2)}</strong>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; direction: rtl;">
          <span>משלוח:</span>
          <strong>₪${order.shipping.toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #ddd; font-size: 18px; direction: rtl;">
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

      <div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 8px; text-align: center;">
        <p style="margin-bottom: 15px;">רוצה לעקוב אחר המשלוח שלך?</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shop/${order.shop.slug}/track-order?order=${order.orderNumber}&phone=${encodeURIComponent(order.phone || '')}" 
           style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
          🚚 עקוב אחר ההזמנה
        </a>
        <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">
          או העתק את הקישור: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shop/${order.shop.slug}/track-order?order=${order.orderNumber}
        </p>
      </div>

      <p style="margin-top: 30px;">נשלח אליך עדכון נוסף כשההזמנה תישלח.</p>
      <p>תודה שקנית אצלנו!</p>
    `

    const emailSettings = await getShopEmailSettings(order.shop.id)
    
    await sendEmail({
      to: order.customerEmail,
      subject: `אישור הזמנה ותשלום #${order.orderNumber} - ${order.shop.name}`,
      shopId: order.shop.id, // העברת shopId כדי להשתמש בשם השולח מההגדרות
      html: getEmailTemplate({
        title: `אישור הזמנה #${order.orderNumber}`,
        content: emailContent,
        footer: `הודעה זו נשלחה מ-${emailSettings.senderName}`,
        color1: emailSettings.color1,
        color2: emailSettings.color2,
        senderName: emailSettings.senderName,
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

/**
 * שליחת מייל אישור החזרה ללקוח אחרי אישור החזרה
 */
export async function sendReturnApprovalEmail(returnId: string) {
  try {
    // קבלת פרטי ההחזרה
    const returnRequest = await prisma.return.findUnique({
      where: { id: returnId },
      include: {
        shop: {
          select: { id: true, name: true, settings: true },
        },
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                  },
                },
                variant: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!returnRequest) {
      console.error(`Return ${returnId} not found for email`)
      return { success: false, error: "Return not found" }
    }

    if (!returnRequest.customer.email) {
      console.error(`Customer ${returnRequest.customerId} has no email`)
      return { success: false, error: "Customer email not found" }
    }

    const returnItems = returnRequest.items as Array<{
      orderItemId: string
      quantity: number
      reason?: string
    }>

    // בניית רשימת פריטים מוחזרים
    const itemsList = returnItems.map(returnItem => {
      const orderItem = returnRequest.order.items.find(
        (item) => item.id === returnItem.orderItemId
      )
      
      const productName = orderItem?.product?.name || orderItem?.name || "מוצר לא נמצא"
      const variantName = orderItem?.variant?.name
      const itemPrice = orderItem ? (orderItem.total / orderItem.quantity) : 0
      const itemTotal = itemPrice * returnItem.quantity
      
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee; direction: rtl; text-align: right;">${productName}${variantName ? ` - ${variantName}` : ''}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${returnItem.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; direction: rtl; text-align: right;">₪${itemTotal.toFixed(2)}</td>
        </tr>
      `
    }).join('')

    const customerName = returnRequest.customer.firstName 
      ? `${returnRequest.customer.firstName} ${returnRequest.customer.lastName || ''}`.trim()
      : returnRequest.customer.email

    const refundAmount = returnRequest.refundAmount || returnRequest.order.total || 0
    const refundMethodText = returnRequest.refundMethod === "STORE_CREDIT" 
      ? "קרדיט בחנות" 
      : "שיטת התשלום המקורית"

    const emailContent = `
      <h2>החזרתך אושרה! ✅</h2>
      <p>שלום ${customerName},</p>
      <p>בקשת ההחזרה שלך אושרה בהצלחה! מספר ההחזרה: <strong>#${returnId.slice(-6)}</strong></p>
      <p>מספר ההזמנה המקורי: <strong>${returnRequest.order.orderNumber}</strong></p>
      
      <h3>פרטי החזרה:</h3>
      <p><strong>סיבה:</strong> ${returnRequest.reason}</p>
      
      <h3>פריטים מוחזרים:</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; direction: rtl;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd; direction: rtl;">מוצר</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">כמות</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd; direction: rtl;">סכום</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>

      <div style="margin-top: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 8px; direction: rtl; text-align: right;">
        <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #ddd; font-size: 18px; direction: rtl;">
          <strong>סכום החזר:</strong>
          <strong style="color: #059669;">₪${refundAmount.toFixed(2)}</strong>
        </div>
        <p style="margin-top: 10px; font-size: 14px; color: #666;">
          שיטת החזר: ${refundMethodText}
        </p>
      </div>

      ${returnRequest.notes ? `
      <div style="margin-top: 20px; padding: 15px; background-color: #fff7ed; border-radius: 8px;">
        <h3 style="margin-top: 0; margin-bottom: 10px;">הערות:</h3>
        <p>${returnRequest.notes}</p>
      </div>
      ` : ''}

      <p style="margin-top: 30px;">
        ${returnRequest.refundMethod === "STORE_CREDIT" 
          ? "הזיכוי יועבר לחשבון שלך בחנות ותוכל להשתמש בו בקנייה הבאה." 
          : "הזיכוי יבוצע אוטומטית לחשבון/כרטיס שממנו בוצע התשלום המקורי."}
      </p>
      <p>תודה שקנית אצלנו!</p>
    `

    const emailSettings = await getShopEmailSettings(returnRequest.shop.id)
    
    await sendEmail({
      to: returnRequest.customer.email,
      subject: `אישור החזרה #${returnId.slice(-6)} - ${returnRequest.shop.name}`,
      shopId: returnRequest.shop.id,
      html: getEmailTemplate({
        title: `אישור החזרה #${returnId.slice(-6)}`,
        content: emailContent,
        footer: `הודעה זו נשלחה מ-${emailSettings.senderName}`,
        color1: emailSettings.color1,
        color2: emailSettings.color2,
        senderName: emailSettings.senderName,
      }),
    })
    
    console.log(`✅ Return approval email sent to ${returnRequest.customer.email} for return ${returnId.slice(-6)}`)
    return { success: true }
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error'
    if (errorMessage.includes('not configured') || errorMessage.includes('לא מוגדר')) {
      console.warn(`⚠️ SendGrid not configured. Return approval email not sent.`)
    } else {
      console.warn(`⚠️ Failed to send return approval email:`, errorMessage)
    }
    return { success: false, error: errorMessage }
  }
}

