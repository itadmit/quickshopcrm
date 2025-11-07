import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST - שליחת אירוע מרכזי לכל הפלטפורמות
 * זה endpoint מרכזי שמקבל אירוע אחד ושולח אותו לכל הפלטפורמות הפעילות
 * במקום מספר קריאות נפרדות, יש קריאה אחת לשרת
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const shop = await prisma.shop.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    })

    if (!shop) {
      return NextResponse.json({ error: "חנות לא נמצאה" }, { status: 404 })
    }

    const body = await request.json()
    const { event, data } = body

    if (!event) {
      return NextResponse.json(
        { error: "שם אירוע נדרש" },
        { status: 400 }
      )
    }

    // קבלת כל הפיקסלים הפעילים של החנות
    const pixels = await prisma.trackingPixel.findMany({
      where: {
        shopId: shop.id,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        pixelId: true,
        accessToken: true,
        events: true,
      },
    })

    // סינון פיקסלים לפי אירועים (אם מוגדר)
    const relevantPixels = pixels.filter((pixel) => {
      // אם אין רשימת אירועים ספציפית, שולח לכל האירועים
      if (!pixel.events || pixel.events.length === 0) {
        return true
      }
      // אחרת, בדוק אם האירוע ברשימה
      return pixel.events.includes(event)
    })

    if (relevantPixels.length === 0) {
      return NextResponse.json({
        success: true,
        message: "אין פיקסלים פעילים לאירוע זה",
        sentTo: [],
      })
    }

    // סינון רק פיקסלים עם access token (server-side tracking)
    const serverSidePixels = relevantPixels.filter((pixel) => {
      // GTM לא דורש access token אבל גם לא תומך ב-server-side tracking
      if (pixel.platform === "GOOGLE_TAG_MANAGER") {
        return false
      }
      // פלטפורמות אחרות דורשות access token
      return !!pixel.accessToken
    })

    // אם אין פיקסלים עם access token, נחזיר תשובה שהאירוע צריך להישלח client-side
    if (serverSidePixels.length === 0) {
      return NextResponse.json({
        success: true,
        message: "אין פיקסלים עם access token - האירוע יישלח client-side",
        sentTo: [],
        shouldSendClientSide: true,
      })
    }

    // שליחה לכל הפלטפורמות בצורה מקבילה
    const sendPromises = serverSidePixels.map(async (pixel) => {
      try {
        const eventData = {
          event,
          shop_slug: params.slug,
          shop_id: shop.id,
          ...data,
        }

        // שליחה לפי סוג פלטפורמה
        switch (pixel.platform) {
          case "FACEBOOK":
            await sendToFacebook(pixel.pixelId, eventData, pixel.accessToken)
            break
          case "GOOGLE_ANALYTICS":
            await sendToGA(pixel.pixelId, eventData, pixel.accessToken)
            break
          case "TIKTOK":
            await sendToTikTok(pixel.pixelId, eventData, pixel.accessToken)
            break
        }

        return { pixelId: pixel.id, platform: pixel.platform, success: true }
      } catch (error) {
        console.error(
          `Error sending event to ${pixel.platform}:`,
          error
        )
        return {
          pixelId: pixel.id,
          platform: pixel.platform,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    })

    const results = await Promise.allSettled(sendPromises)

    const sentTo = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value
      }
      return {
        pixelId: relevantPixels[index].id,
        platform: relevantPixels[index].platform,
        success: false,
        error: result.reason?.message || "Unknown error",
      }
    })

    return NextResponse.json({
      success: true,
      event,
      sentTo,
      totalPixels: serverSidePixels.length,
      shouldSendClientSide: relevantPixels.length > serverSidePixels.length,
    })
  } catch (error) {
    console.error("Error processing tracking event:", error)
    return NextResponse.json(
      { error: "שגיאה בשליחת אירוע" },
      { status: 500 }
    )
  }
}

/**
 * שליחה לפייסבוק דרך Conversions API
 */
async function sendToFacebook(
  pixelId: string,
  eventData: any,
  accessToken?: string | null
) {
  if (!accessToken) {
    // אם אין access token, נחזיר שגיאה כי Conversions API דורש token
    throw new Error("Facebook access token required for server-side tracking")
  }

  const fbEventName = convertToFacebookEvent(eventData.event)

  const payload = {
    data: [
      {
        event_name: fbEventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        ...formatFacebookData(eventData),
      },
    ],
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Facebook API error: ${error}`)
  }
}

/**
 * שליחה לגוגל טאג מנג'ר דרך Measurement Protocol
 * הערה: GTM לא תומך ב-server-side tracking דרך API
 * כל האירועים של GTM נשלחים ישירות מהדפדפן דרך dataLayer
 */
async function sendToGTM(containerId: string, eventData: any) {
  // GTM לא תומך ב-server-side tracking
  // הפונקציה הזו לא אמורה להיקרא כי אנחנו מסננים את GTM לפני
  throw new Error(
    "GTM does not support server-side tracking - events are sent client-side via dataLayer"
  )
}

/**
 * שליחה לגוגל אנליטיקס דרך Measurement Protocol
 */
async function sendToGA(
  measurementId: string,
  eventData: any,
  apiSecret?: string | null
) {
  if (!apiSecret) {
    throw new Error("Google Analytics API secret required for server-side tracking")
  }

  const payload = {
    client_id: eventData.client_id || `client_${Date.now()}`,
    events: [
      {
        name: eventData.event,
        params: formatGAData(eventData),
      },
    ],
  }

  const response = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google Analytics API error: ${error}`)
  }
}

/**
 * שליחה לטיקטוק דרך Events API
 */
async function sendToTikTok(
  pixelId: string,
  eventData: any,
  accessToken?: string | null
) {
  if (!accessToken) {
    throw new Error("TikTok access token required for server-side tracking")
  }

  const ttEventName = convertToTikTokEvent(eventData.event)

  const payload = {
    pixel_code: pixelId,
    event: ttEventName,
    timestamp: new Date().toISOString(),
    properties: formatTikTokData(eventData),
  }

  const response = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/event/track/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": accessToken,
      },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`TikTok API error: ${error}`)
  }
}

/**
 * המרת שם אירוע לפורמט של פייסבוק
 */
function convertToFacebookEvent(eventName: string): string {
  const mapping: Record<string, string> = {
    PageView: "PageView",
    ViewContent: "ViewContent",
    AddToCart: "AddToCart",
    RemoveFromCart: "RemoveFromCart",
    InitiateCheckout: "InitiateCheckout",
    AddPaymentInfo: "AddPaymentInfo",
    Purchase: "Purchase",
    Search: "Search",
    SignUp: "CompleteRegistration",
    Login: "Login",
    AddToWishlist: "AddToWishlist",
    RemoveFromWishlist: "RemoveFromWishlist",
    ViewCart: "ViewCart",
    SelectVariant: "SelectContent",
  }
  return mapping[eventName] || eventName
}

/**
 * המרת שם אירוע לפורמט של טיקטוק
 */
function convertToTikTokEvent(eventName: string): string {
  const mapping: Record<string, string> = {
    PageView: "ViewContent",
    ViewContent: "ViewContent",
    AddToCart: "AddToCart",
    RemoveFromCart: "RemoveFromCart",
    InitiateCheckout: "InitiateCheckout",
    AddPaymentInfo: "AddPaymentInfo",
    Purchase: "CompletePayment",
    Search: "Search",
    SignUp: "CompleteRegistration",
    Login: "Login",
    AddToWishlist: "AddToWishlist",
    RemoveFromWishlist: "RemoveFromWishlist",
    ViewCart: "ViewContent",
    SelectVariant: "ViewContent",
  }
  return mapping[eventName] || eventName
}

/**
 * פורמט נתונים לפייסבוק
 */
function formatFacebookData(data: any) {
  const formatted: any = {}

  if (data.content_name) formatted.content_name = data.content_name
  if (data.content_ids) formatted.content_ids = data.content_ids
  if (data.content_type) formatted.content_type = data.content_type
  if (data.value) formatted.value = data.value
  if (data.currency) formatted.currency = data.currency
  if (data.num_items) formatted.num_items = data.num_items
  if (data.contents) formatted.contents = data.contents
  if (data.transaction_id) formatted.order_id = data.transaction_id
  if (data.tax) formatted.tax = data.tax
  if (data.shipping) formatted.shipping = data.shipping

  return formatted
}

/**
 * פורמט נתונים לגוגל אנליטיקס
 */
function formatGAData(data: any) {
  const formatted: any = {}

  if (data.page_path) formatted.page_path = data.page_path
  if (data.page_title) formatted.page_title = data.page_title
  if (data.value) formatted.value = data.value
  if (data.currency) formatted.currency = data.currency
  if (data.content_name) formatted.content_name = data.content_name
  if (data.content_ids) formatted.content_ids = data.content_ids
  if (data.transaction_id) formatted.transaction_id = data.transaction_id
  if (data.items) formatted.items = data.items

  return formatted
}

/**
 * פורמט נתונים לטיקטוק
 */
function formatTikTokData(data: any) {
  const formatted: any = {}

  if (data.value) formatted.value = data.value
  if (data.currency) formatted.currency = data.currency
  if (data.content_name) formatted.content_name = data.content_name
  if (data.content_ids) formatted.content_ids = data.content_ids
  if (data.contents) formatted.contents = data.contents
  if (data.transaction_id) formatted.transaction_id = data.transaction_id

  return formatted
}

