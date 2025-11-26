// Premium Club Plugin - מערכת חברי מועדון פרימיום
// מערכת רמות מתקדמת עם הנחות, הטבות ופיצ'רים נוספים

import { PluginHook } from '../types'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export const PremiumClubPlugin: PluginHook = {
  // עדכון רמת הלקוח אחרי הזמנה
  onOrderComplete: async (order: any, shopId: string) => {
    if (!order.customerId) return

    try {
      // חיפוש התוסף - קודם ספציפי לחנות, אחר כך גלובלי
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { companyId: true },
      })

      const plugin = await prisma.plugin.findFirst({
        where: {
          slug: 'premium-club',
          isActive: true,
          isInstalled: true,
          OR: [
            { shopId },
            { companyId: shop?.companyId, shopId: null },
            { shopId: null, companyId: null },
          ],
        },
        select: { config: true },
      })

      if (!plugin?.config) return

      const config = plugin.config as PremiumClubConfig

      // בדיקה אם התוסף מופעל
      if (!config.enabled || !config.tiers || config.tiers.length === 0) return

      // קבלת הלקוח עם סטטיסטיקות (אחרי עדכון totalSpent ו-orderCount ב-checkout)
      const customer = await prisma.customer.findUnique({
        where: { id: order.customerId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          totalSpent: true,
          orderCount: true,
          premiumClubTier: true,
        },
      })

      if (!customer) return

      // חישוב רמה חדשה לפי ההגדרות הגנריות (הערכים כבר עודכנו ב-checkout)
      const newTier = calculateTier(
        customer.totalSpent,
        customer.orderCount,
        config.tiers
      )

      // עדכון רמה אם השתנתה
      if (newTier && newTier !== customer.premiumClubTier) {
        const oldTier = customer.premiumClubTier
        const tier = config.tiers.find((t) => t.slug === newTier)
        
        await prisma.customer.update({
          where: { id: customer.id },
          data: { premiumClubTier: newTier },
        })

        // שליחת התראה אם מוגדר
        if (config.notifications?.tierUpgradeEmail && customer.email && tier) {
          try {
            const customerName = customer.firstName || customer.email.split('@')[0]
            const tierName = tier.name
            const oldTierName = oldTier 
              ? config.tiers.find((t) => t.slug === oldTier)?.name || oldTier
              : 'רגיל'
            
            // בניית תוכן האימייל
            const emailSubject = `🎉 מזל טוב! עלית לרמה ${tierName} במועדון הפרימיום!`
            const emailHtml = `
              <!DOCTYPE html>
              <html dir="rtl" lang="he">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                <title>עלית לרמה ${tierName}</title>
                <style>
                  * {
                    direction: rtl;
                    text-align: right;
                  }
                  body {
                    direction: rtl;
                    text-align: right;
                  }
                  ul {
                    direction: rtl;
                    text-align: right;
                  }
                  li {
                    direction: rtl;
                    text-align: right;
                  }
                </style>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🎉 מזל טוב ${customerName}!</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; direction: rtl; text-align: right;">
                  <p style="font-size: 18px; margin-bottom: 20px; direction: rtl; text-align: right;">
                    עלית לרמה <strong style="color: ${tier.color || '#667eea'};">${tierName}</strong> במועדון הפרימיום שלנו!
                  </p>
                  
                  ${oldTier ? `<p style="color: #666; margin-bottom: 20px; direction: rtl; text-align: right;">עלית מרמה <strong>${oldTierName}</strong> לרמה <strong>${tierName}</strong></p>` : ''}
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid ${tier.color || '#667eea'}; direction: rtl; text-align: right;">
                    <h2 style="color: ${tier.color || '#667eea'}; margin-top: 0; direction: rtl; text-align: right;">הטבות הרמה החדשה שלך:</h2>
                    <ul style="list-style: none; padding: 0; direction: rtl; text-align: right;">
                      ${tier.benefits.freeShipping ? '<li style="padding: 8px 0; direction: rtl; text-align: right;">✅ משלוח חינם על כל ההזמנות</li>' : ''}
                      ${tier.benefits.earlyAccess ? '<li style="padding: 8px 0; direction: rtl; text-align: right;">✅ גישה מוקדמת למבצעים מיוחדים</li>' : ''}
                      ${tier.benefits.exclusiveProducts ? '<li style="padding: 8px 0; direction: rtl; text-align: right;">✅ גישה למוצרים בלעדיים</li>' : ''}
                      ${tier.benefits.birthdayGift ? '<li style="padding: 8px 0; direction: rtl; text-align: right;">✅ מתנת יום הולדת מיוחדת</li>' : ''}
                      ${tier.discount ? `<li style="padding: 8px 0; direction: rtl; text-align: right;">✅ הנחה ${tier.discount.type === 'PERCENTAGE' ? tier.discount.value + '%' : '₪' + tier.discount.value} על כל הרכישות</li>` : ''}
                      ${tier.benefits.pointsMultiplier ? `<li style="padding: 8px 0; direction: rtl; text-align: right;">✅ צבירת נקודות x${tier.benefits.pointsMultiplier}</li>` : ''}
                    </ul>
                  </div>
                  
                  <p style="margin-top: 30px; color: #666; direction: rtl; text-align: right;">
                    תודה על הנאמנות שלך! אנו שמחים להיות חלק מהמסע שלך.
                  </p>
                  
                  <p style="margin-top: 20px; color: #666; font-size: 14px; direction: rtl; text-align: right;">
                    ההטבות שלך כבר פעילות בחשבון שלך. תוכל לראות את הרמה החדשה שלך באזור האישי.
                  </p>
                </div>
              </body>
              </html>
            `
            
            await sendEmail({
              to: customer.email,
              subject: emailSubject,
              html: emailHtml,
              shopId: shopId,
            })
            
            console.log(`✅ Tier upgrade email sent to ${customer.email} for upgrade to ${tierName}`)
          } catch (emailError) {
            // לא נכשל את העדכון אם יש בעיה בשליחת האימייל
            console.error('Error sending tier upgrade email:', emailError)
          }
        }

        if (config.notifications?.tierUpgradeSMS) {
          // TODO: שליחת SMS (אם יש מערכת SMS)
          console.log(`SMS notification for tier upgrade to ${tier?.name || newTier} - SMS not implemented yet`)
        }
      }
    } catch (error) {
      console.error('Error updating premium club tier:', error)
    }
  },
}

/**
 * חישוב רמת הלקוח לפי סכום והזמנות
 */
function calculateTier(
  totalSpent: number,
  orderCount: number,
  tiers: PremiumClubTier[]
): string | null {
  if (!tiers || tiers.length === 0) return null

  // מיון לפי עדיפות (priority נמוך יותר = רמה גבוהה יותר)
  // נמיין לפי priority עולה ונחפש את הרמה הגבוהה ביותר שהלקוח עומד בדרישותיה
  const sortedTiers = [...tiers].sort((a, b) => a.priority - b.priority)

  let bestTier: PremiumClubTier | null = null

  for (const tier of sortedTiers) {
    // בדיקה אם הלקוח עומד בדרישות הרמה
    const meetsSpentRequirement = tier.minSpent != null ? totalSpent >= tier.minSpent : true
    const meetsOrderRequirement = tier.minOrders != null ? orderCount >= tier.minOrders : true

    if (meetsSpentRequirement && meetsOrderRequirement) {
      // אם זו רמה ללא דרישות, נשמור אותה כרמה בסיסית
      if (tier.minSpent == null && tier.minOrders == null) {
        if (!bestTier) bestTier = tier
      } else {
        // אם יש דרישות, זו רמה גבוהה יותר - נשמור אותה
        bestTier = tier
      }
    }
  }

  return bestTier?.slug || null
}

/**
 * חישוב הנחה לפי רמה
 */
export async function calculatePremiumClubDiscount(
  shopId: string,
  customerTier: string | null,
  basePrice: number
): Promise<number> {
  if (!customerTier) return 0

  try {
    // חיפוש התוסף - קודם ספציפי לחנות, אחר כך גלובלי
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { companyId: true },
    })

    const plugin = await prisma.plugin.findFirst({
      where: {
        slug: 'premium-club',
        isActive: true,
        isInstalled: true,
        OR: [
          { shopId },
          { companyId: shop?.companyId, shopId: null },
          { shopId: null, companyId: null },
        ],
      },
      select: { config: true },
    })

    if (!plugin?.config) return 0

    const config = plugin.config as PremiumClubConfig

    // בדיקה אם התוסף מופעל
    if (!config.enabled || !config.tiers || config.tiers.length === 0) return 0

    const tier = config.tiers.find((t) => t.slug === customerTier)

    if (!tier || !tier.discount) return 0

    if (tier.discount.type === 'PERCENTAGE') {
      return (basePrice * tier.discount.value) / 100
    } else {
      return tier.discount.value
    }
  } catch (error) {
    console.error('Error calculating premium club discount:', error)
    return 0
  }
}

// Types
export interface PremiumClubConfig {
  enabled: boolean
  tiers: PremiumClubTier[]
  benefits: PremiumClubBenefits
  notifications: {
    tierUpgradeEmail: boolean
    tierUpgradeSMS: boolean
  }
}

export interface PremiumClubTier {
  slug: string // זיהוי ייחודי (לדוגמה: 'silver', 'gold', 'platinum')
  name: string // שם הרמה (לדוגמה: 'כסף', 'זהב', 'פלטינה')
  color: string // צבע להצגה (לדוגמה: '#C0C0C0', '#FFD700', '#E5E4E2')
  priority: number // עדיפות - מספר נמוך יותר = רמה גבוהה יותר
  minSpent?: number | null // סכום מינימלי (אופציונלי)
  minOrders?: number | null // מספר הזמנות מינימלי (אופציונלי)
  discount?: {
    type: 'PERCENTAGE' | 'FIXED'
    value: number
  } | null // הנחה (אופציונלי)
  benefits: {
    freeShipping?: boolean
    earlyAccess?: boolean
    exclusiveProducts?: boolean
    birthdayGift?: boolean
    pointsMultiplier?: number | null // צבירת נקודות (אם יש מערכת נקודות)
  }
}

export interface PremiumClubBenefits {
  freeShippingThreshold?: number | null // סכום מינימלי למשלוח חינם
  birthdayDiscount?: {
    enabled: boolean
    value: number
    type: 'PERCENTAGE' | 'FIXED'
  } | null // הנחת יום הולדת
  earlyAccessToSales?: boolean // גישה מוקדמת למבצעים
  exclusiveProductsAccess?: boolean // גישה למוצרים בלעדיים
  vipSupport?: boolean // תמיכה VIP
  monthlyGift?: boolean // מתנה חודשית
}

