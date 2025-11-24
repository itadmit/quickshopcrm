import { prisma } from "./prisma"
import { getShopEmailSettings } from "./email"
import sgMail from "@sendgrid/mail"

/**
 * בדיקה ושליחת מיילים לרשימת המתנה כשמוצר חוזר למלאי
 */
export async function checkAndNotifyWaitlist(productId: string) {
  try {
    // מציאת כל הרשומות ברשימת המתנה למוצר זה שלא קיבלו עדיין מייל
    const waitlistItems = await prisma.waitlist.findMany({
      where: {
        productId,
        notifiedAt: null, // רק כאלה שעדיין לא קיבלו מייל
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            inventoryQty: true,
            availability: true,
            shopId: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            inventoryQty: true,
            option1: true,
            option1Value: true,
            option2: true,
            option2Value: true,
            option3: true,
            option3Value: true,
          },
        },
        shop: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    })

    if (waitlistItems.length === 0) {
      return { notified: 0 }
    }

    // קבלת הגדרות המייל של החנות
    const shopId = waitlistItems[0].shopId
    const emailSettings = await getShopEmailSettings(shopId)

    // קבלת הגדרות SendGrid
    const sendGridSettings = await getSendGridSettings()
    if (!sendGridSettings?.apiKey) {
      console.error("SendGrid API key not configured")
      return { notified: 0, error: "SendGrid not configured" }
    }

    sgMail.setApiKey(sendGridSettings.apiKey)

    let notifiedCount = 0

    // שליחה לכל רשומה
    for (const item of waitlistItems) {
      // אם יש variantId, בדוק רק את הווריאציה הזו
      if (item.variantId && item.variant) {
        // בדיקה אם הווריאציה זמינה
        const isVariantAvailable = 
          item.variant.inventoryQty === null || 
          item.variant.inventoryQty === undefined || 
          item.variant.inventoryQty > 0

        // אם הווריאציה לא זמינה, דלג
        if (!isVariantAvailable) {
          continue
        }
      } else {
        // אין variantId - בדוק את המוצר עצמו
        const isProductAvailable = 
          item.product.availability !== "OUT_OF_STOCK" &&
          (item.product.inventoryQty === null || item.product.inventoryQty === undefined || item.product.inventoryQty > 0)

        // אם המוצר לא זמין, דלג
        if (!isProductAvailable) {
          continue
        }
      }

      // בניית קישור למוצר
      const productUrl = `https://${item.shop.slug}.quickshop.co.il/products/${item.product.id}`

      // בניית תצוגת וריאציה
      const variantDisplay = item.variant
        ? (() => {
            const parts: string[] = []
            if (item.variant.option1 && item.variant.option1Value) {
              parts.push(`${item.variant.option1}: ${item.variant.option1Value}`)
            }
            if (item.variant.option2 && item.variant.option2Value) {
              parts.push(`${item.variant.option2}: ${item.variant.option2Value}`)
            }
            if (item.variant.option3 && item.variant.option3Value) {
              parts.push(`${item.variant.option3}: ${item.variant.option3Value}`)
            }
            return parts.length > 0 ? parts.join(", ") : item.variant.name
          })()
        : null

      // בניית תבנית המייל
      const emailHtml = generateWaitlistEmail({
        productName: item.product.name,
        productUrl,
        variantDisplay,
        shopName: item.shop.name,
        emailColor1: emailSettings.color1,
        emailColor2: emailSettings.color2,
        productImage: item.product.images?.[0],
      })

      try {
        await sgMail.send({
          to: item.email,
          from: {
            email: sendGridSettings.fromEmail || "noreply@quickshop.co.il",
            name: emailSettings.senderName || "Quick Shop",
          },
          subject: `המוצר ${item.product.name} חזר למלאי! 🎉`,
          html: emailHtml,
        })

        // עדכון ה-notifiedAt
        await prisma.waitlist.update({
          where: { id: item.id },
          data: { notifiedAt: new Date() },
        })

        notifiedCount++
      } catch (error) {
        console.error(`Error sending email to ${item.email}:`, error)
        // נמשיך לשאר הרשומות גם אם אחת נכשלה
      }
    }

    return { notified: notifiedCount }
  } catch (error) {
    console.error("Error checking and notifying waitlist:", error)
    return { notified: 0, error: String(error) }
  }
}

/**
 * קבלת הגדרות SendGrid
 */
async function getSendGridSettings() {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        type: "SENDGRID",
      },
    })

    if (!integration) {
      return null
    }

    return {
      apiKey: integration.apiKey || undefined,
      fromEmail: (integration.config as any)?.fromEmail || undefined,
    }
  } catch (error) {
    console.error("Error fetching SendGrid settings:", error)
    return null
  }
}

/**
 * יצירת תבנית המייל
 */
function generateWaitlistEmail({
  productName,
  productUrl,
  variantDisplay,
  shopName,
  emailColor1,
  emailColor2,
  productImage,
}: {
  productName: string
  productUrl: string
  variantDisplay: string | null
  shopName: string
  emailColor1: string
  emailColor2: string
  productImage?: string | null
}) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
      direction: rtl;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, ${emailColor1} 0%, ${emailColor2} 100%);
      padding: 30px 20px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px 20px;
      color: #333;
      line-height: 1.6;
    }
    .product-image {
      width: 100%;
      max-width: 300px;
      height: auto;
      border-radius: 8px;
      margin: 20px auto;
      display: block;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, ${emailColor1} 0%, ${emailColor2} 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin: 20px 0;
      text-align: center;
    }
    .variant-info {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
      border-right: 4px solid ${emailColor1};
    }
    .footer {
      background-color: #f9f9f9;
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 המוצר חזר למלאי!</h1>
    </div>
    <div class="content">
      <p>שלום!</p>
      <p>אנו שמחים להודיע לך שהמוצר <strong>${productName}</strong> חזר למלאי!</p>
      ${productImage ? `<img src="${productImage}" alt="${productName}" class="product-image" />` : ""}
      ${variantDisplay ? `<div class="variant-info"><strong>וריאציה:</strong> ${variantDisplay}</div>` : ""}
      <p>ממהרים? לחץ על הכפתור כדי לראות את המוצר:</p>
      <div style="text-align: center;">
        <a href="${productUrl}" class="button">צפה במוצר</a>
      </div>
      <p>תודה על הסבלנות שלך!</p>
      <p>צוות ${shopName}</p>
    </div>
    <div class="footer">
      <p>הודעה זו נשלחה אוטומטית מ-${shopName}</p>
      <p>אם לא נרשמת לרשימת המתנה, תוכל להתעלם מהודעה זו.</p>
    </div>
  </div>
</body>
</html>`
}

