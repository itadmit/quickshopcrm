/**
 * PayPal API Integration
 * Documentation: https://developer.paypal.com/docs/api/overview/
 */

const PAYPAL_PRODUCTION_URL = "https://api.paypal.com"
const PAYPAL_SANDBOX_URL = "https://api.sandbox.paypal.com"

interface PayPalCredentials {
  clientId: string
  clientSecret: string
  useProduction?: boolean
}

interface PayPalResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * קבלת Access Token מ-PayPal
 */
async function getPayPalAccessToken(credentials: PayPalCredentials): Promise<string | null> {
  try {
    const baseUrl = credentials.useProduction ? PAYPAL_PRODUCTION_URL : PAYPAL_SANDBOX_URL
    const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")

    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: "grant_type=client_credentials",
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("PayPal access token error:", data)
      return null
    }

    return data.access_token
  } catch (error: any) {
    console.error("PayPal getAccessToken error:", error)
    return null
  }
}

/**
 * יצירת הזמנה ב-PayPal (Order)
 * https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */
export async function createPayPalOrder(
  credentials: PayPalCredentials,
  params: {
    amount: number
    currencyCode?: string
    orderId?: string
    customerName?: string
    customerEmail?: string
    returnUrl?: string
    cancelUrl?: string
    items?: Array<{
      name: string
      quantity: number
      price: number
    }>
  }
): Promise<PayPalResponse<{ orderId: string; approvalUrl: string }>> {
  try {
    const accessToken = await getPayPalAccessToken(credentials)
    if (!accessToken) {
      return {
        success: false,
        error: "Failed to get PayPal access token",
      }
    }

    const baseUrl = credentials.useProduction ? PAYPAL_PRODUCTION_URL : PAYPAL_SANDBOX_URL
    const currency = params.currencyCode || "ILS"

    // בניית פריטים
    const items = params.items || []
    const itemTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const total = params.amount

    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.orderId || `order_${Date.now()}`,
          description: `Order ${params.orderId || ""}`,
          amount: {
            currency_code: currency,
            value: total.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: currency,
                value: itemTotal.toFixed(2),
              },
            },
          },
          items: items.map((item) => ({
            name: item.name,
            quantity: item.quantity.toString(),
            unit_amount: {
              currency_code: currency,
              value: item.price.toFixed(2),
            },
          })),
        },
      ],
      application_context: {
        brand_name: "Quick Shop",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: params.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success`,
        cancel_url: params.cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/failure`,
      },
    }

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data.message || data.error || "Failed to create PayPal order"
      console.error("PayPal createOrder failed:", errorMsg, data)
      return {
        success: false,
        error: errorMsg,
      }
    }

    // מציאת קישור האישור
    const approvalLink = data.links?.find((link: any) => link.rel === "approve")
    const approvalUrl = approvalLink?.href

    if (!approvalUrl) {
      return {
        success: false,
        error: "No approval URL found in PayPal response",
      }
    }

    return {
      success: true,
      data: {
        orderId: data.id,
        approvalUrl,
      },
    }
  } catch (error: any) {
    console.error("PayPal createOrder error:", error)
    return {
      success: false,
      error: error.message || "Unknown error creating PayPal order",
    }
  }
}

/**
 * אישור ותפיסת תשלום ב-PayPal (Capture)
 * https://developer.paypal.com/docs/api/orders/v2/#orders_capture
 */
export async function capturePayPalOrder(
  credentials: PayPalCredentials,
  orderId: string
): Promise<PayPalResponse> {
  try {
    const accessToken = await getPayPalAccessToken(credentials)
    if (!accessToken) {
      return {
        success: false,
        error: "Failed to get PayPal access token",
      }
    }

    const baseUrl = credentials.useProduction ? PAYPAL_PRODUCTION_URL : PAYPAL_SANDBOX_URL

    const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data.message || data.error || "Failed to capture PayPal order"
      console.error("PayPal captureOrder failed:", errorMsg, data)
      return {
        success: false,
        error: errorMsg,
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    console.error("PayPal captureOrder error:", error)
    return {
      success: false,
      error: error.message || "Unknown error capturing PayPal order",
    }
  }
}

/**
 * קבלת פרטי הזמנה מ-PayPal
 * https://developer.paypal.com/docs/api/orders/v2/#orders_get
 */
export async function getPayPalOrder(
  credentials: PayPalCredentials,
  orderId: string
): Promise<PayPalResponse> {
  try {
    const accessToken = await getPayPalAccessToken(credentials)
    if (!accessToken) {
      return {
        success: false,
        error: "Failed to get PayPal access token",
      }
    }

    const baseUrl = credentials.useProduction ? PAYPAL_PRODUCTION_URL : PAYPAL_SANDBOX_URL

    const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data.message || data.error || "Failed to get PayPal order"
      console.error("PayPal getOrder failed:", errorMsg, data)
      return {
        success: false,
        error: errorMsg,
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    console.error("PayPal getOrder error:", error)
    return {
      success: false,
      error: error.message || "Unknown error getting PayPal order",
    }
  }
}

/**
 * בדיקת חיבור ל-PayPal
 */
export async function testPayPalConnection(
  credentials: PayPalCredentials
): Promise<PayPalResponse> {
  try {
    const accessToken = await getPayPalAccessToken(credentials)
    if (!accessToken) {
      return {
        success: false,
        error: "Failed to authenticate with PayPal. Please check your credentials.",
      }
    }

    return {
      success: true,
      data: { message: "PayPal connection successful" },
    }
  } catch (error: any) {
    console.error("PayPal testConnection error:", error)
    return {
      success: false,
      error: error.message || "Unknown error testing PayPal connection",
    }
  }
}

/**
 * Helper: קבלת פרטי אינטגרציה מה-DB
 */
export async function getPayPalCredentials(
  companyId?: string | null
): Promise<PayPalCredentials | null> {
  const { prisma } = await import("@/lib/prisma")

  const integration = await prisma.integration.findFirst({
    where: {
      companyId,
      type: "PAYPAL",
      isActive: true,
    },
  })

  if (!integration || !integration.apiKey || !integration.apiSecret) {
    return null
  }

  const config = integration.config as any

  return {
    clientId: integration.apiKey,
    clientSecret: integration.apiSecret,
    useProduction: config.useProduction || false,
  }
}

