/**
 * PayPlus API Integration
 * Documentation: https://docs.payplus.co.il/reference/introduction
 */

const PAYPLUS_PRODUCTION_URL = "https://restapi.payplus.co.il/api/v1.0"
const PAYPLUS_SANDBOX_URL = "https://restapidev.payplus.co.il/api/v1.0"

interface PayPlusCredentials {
  apiKey: string
  secretKey: string
  terminalUid: string
  cashierUid?: string
  paymentPageUid?: string
  useProduction?: boolean
}

function getPayPlusBaseUrl(useProduction: boolean = false): string {
  return useProduction ? PAYPLUS_PRODUCTION_URL : PAYPLUS_SANDBOX_URL
}

interface PayPlusResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  results?: {
    status: string
    description: string
  }
}

/**
 * יצירת Token לכרטיס אשראי
 * https://docs.payplus.co.il/reference/post_token-add
 */
export async function createCardToken(
  credentials: PayPlusCredentials,
  params: {
    customerUid: string
    cardNumber: string
    cardDateMmyy: string // MM/YY format
    identificationNumber?: string
  }
): Promise<PayPlusResponse> {
  try {
    const baseUrl = getPayPlusBaseUrl(credentials.useProduction || false)
    const response = await fetch(`${baseUrl}/Token/Add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": credentials.apiKey,
        "secret-key": credentials.secretKey,
      },
      body: JSON.stringify({
        terminal_uid: credentials.terminalUid,
        customer_uid: params.customerUid,
        credit_card_number: params.cardNumber,
        card_date_mmyy: params.cardDateMmyy,
        identification_number: params.identificationNumber,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || "Failed to create token",
        results: data.results,
      }
    }

    return {
      success: true,
      data: data,
    }
  } catch (error: any) {
    console.error("PayPlus createCardToken error:", error)
    return {
      success: false,
      error: error.message || "Unknown error creating token",
    }
  }
}

/**
 * יצירת הוראת קבע (Recurring Payment)
 * https://docs.payplus.co.il/reference/post_recurringpayments-add
 */
export async function createRecurringPayment(
  credentials: PayPlusCredentials,
  params: {
    customerUid: string
    cardToken: string
    cashierUid: string
    currencyCode?: "ILS" | "USD" | "EUR" | "GPB"
    instantFirstPayment: boolean
    recurringType: 0 | 1 | 2 // 0-Daily, 1-Weekly, 2-Monthly
    recurringRange: number // תדירות (למשל כל 2 חודשים)
    numberOfCharges: number // 0 = ללא הגבלה
    startDate: string // תאריך תחילת חיובים
    items: Array<{
      productUid: string
      quantity: number
      price: number
      discountType?: "percentage" | "amount"
      discountValue?: number
    }>
    sendCustomerSuccessEmail?: boolean
    customerFailureEmail?: boolean
    extraInfo?: string
  }
): Promise<PayPlusResponse> {
  try {
    const baseUrl = getPayPlusBaseUrl(credentials.useProduction || false)
    const response = await fetch(`${baseUrl}/RecurringPayments/Add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": credentials.apiKey,
        "secret-key": credentials.secretKey,
      },
      body: JSON.stringify({
        terminal_uid: credentials.terminalUid,
        customer_uid: params.customerUid,
        card_token: params.cardToken,
        cashier_uid: params.cashierUid,
        currency_code: params.currencyCode || "ILS",
        instant_first_payment: params.instantFirstPayment,
        recurring_type: params.recurringType,
        recurring_range: params.recurringRange,
        number_of_charges: params.numberOfCharges,
        start_date: params.startDate,
        items: params.items.map((item: any) => ({
          product_uid: item.productUid,
          quantity: item.quantity,
          price: item.price,
          discount_type: item.discountType,
          discount_value: item.discountValue,
        })),
        send_customer_success_email: params.sendCustomerSuccessEmail || false,
        customer_failure_email: params.customerFailureEmail || false,
        extra_info: params.extraInfo,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || "Failed to create recurring payment",
        results: data.results,
      }
    }

    return {
      success: true,
      data: data,
    }
  } catch (error: any) {
    console.error("PayPlus createRecurringPayment error:", error)
    return {
      success: false,
      error: error.message || "Unknown error creating recurring payment",
    }
  }
}

/**
 * גבייה מהוראת קבע קיימת (Recurring Charge)
 * https://docs.payplus.co.il/reference/post_recurringpayments-addrecurringcharge-uid
 */
export async function chargeRecurringPayment(
  credentials: PayPlusCredentials,
  params: {
    recurringPaymentUid: string
    cardToken: string
    chargeDate: string // YYYY-MM-DD format
    items: Array<{
      productUid: string
      quantity: number
      price: number
      discountType?: "percentage" | "amount"
      discountValue?: number
    }>
    extraInfo?: string
  }
): Promise<PayPlusResponse> {
  try {
    const baseUrl = getPayPlusBaseUrl(credentials.useProduction || false)
    const response = await fetch(
      `${baseUrl}/RecurringPayments/AddRecurringCharge/${params.recurringPaymentUid}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": credentials.apiKey,
          "secret-key": credentials.secretKey,
        },
        body: JSON.stringify({
          terminal_uid: credentials.terminalUid,
          card_token: params.cardToken,
          charge_date: params.chargeDate,
          valid: true,
          items: params.items.map((item: any) => ({
            product_uid: item.productUid,
            quantity: item.quantity,
            price: item.price,
            discount_type: item.discountType,
            discount_value: item.discountValue,
          })),
          extra_info: params.extraInfo,
          uid: params.recurringPaymentUid,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || "Failed to charge recurring payment",
        results: data.results,
      }
    }

    return {
      success: true,
      data: data,
    }
  } catch (error: any) {
    console.error("PayPlus chargeRecurringPayment error:", error)
    return {
      success: false,
      error: error.message || "Unknown error charging recurring payment",
    }
  }
}

/**
 * אחזור פרטי עסקה לפי UID
 * https://docs.payplus.co.il/reference/get_transactions-uid
 */
export async function getTransaction(
  credentials: PayPlusCredentials,
  transactionUid: string
): Promise<PayPlusResponse> {
  try {
    const baseUrl = getPayPlusBaseUrl(credentials.useProduction)

    const response = await fetch(`${baseUrl}/Transactions/${transactionUid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "api-key": credentials.apiKey,
        "secret-key": credentials.secretKey,
      },
    })

    const data = await response.json()

    if (!response.ok || data.results?.status === "error") {
      return {
        success: false,
        error: data.results?.description || data.message || "Failed to get transaction",
        results: data.results,
      }
    }

    return {
      success: true,
      data: data.data || data,
    }
  } catch (error: any) {
    console.error("PayPlus getTransaction error:", error)
    return {
      success: false,
      error: error.message || "Unknown error getting transaction",
    }
  }
}

/**
 * חיוב באמצעות Token (Charge by Token)
 * https://docs.payplus.co.il/reference/post_transactions-charge
 */
export async function chargeByToken(
  credentials: PayPlusCredentials,
  params: {
    token: string
    customerUid: string
    cashierUid?: string
    amount: number
    currencyCode?: "ILS" | "USD" | "EUR" | "GPB"
    description?: string
    moreInfo?: string
  }
): Promise<PayPlusResponse> {
  try {
    const baseUrl = getPayPlusBaseUrl(credentials.useProduction)

    const requestBody = {
      terminal_uid: credentials.terminalUid,
      ...(params.cashierUid && { cashier_uid: params.cashierUid }), // רק אם יש cashier
      amount: parseFloat(params.amount.toFixed(2)), // עיגול ל-2 ספרות בדיוק
      currency_code: params.currencyCode || "ILS",
      credit_terms: 1, // תשלום רגיל
      use_token: true,
      token: params.token,
      customer_uid: params.customerUid,
      more_info: params.moreInfo || params.description || "",
      create_token: false, // לא צריך ליצור token חדש
    }

    console.log("PayPlus chargeByToken - Request:", {
      terminalUid: credentials.terminalUid,
      amount: params.amount,
      hasToken: !!params.token,
      customerUid: params.customerUid,
    })

    const response = await fetch(`${baseUrl}/Transactions/Charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": credentials.apiKey,
        "secret-key": credentials.secretKey,
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log("PayPlus chargeByToken - Raw response:", responseText)

    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("PayPlus response is not valid JSON:", responseText)
      return {
        success: false,
        error: `PayPlus returned invalid response: ${responseText.substring(0, 200)}`,
      }
    }

    // בדיקת תשובה - גם אם response.ok, PayPlus עשוי להחזיר שגיאה ב-results
    if (data.results?.status === "error" || !response.ok) {
      const errorMsg = data.results?.description || data.data || data.message || data.error || "Unknown error"
      console.error("PayPlus chargeByToken failed:", errorMsg, data)
      return {
        success: false,
        error: errorMsg,
        results: data.results,
      }
    }

    const transactionUid = data.data?.transaction?.uid || data.transaction?.uid
    console.log("PayPlus chargeByToken - Success:", transactionUid)

    return {
      success: true,
      data: data.data || data,
    }
  } catch (error: any) {
    console.error("PayPlus chargeByToken error:", error)
    return {
      success: false,
      error: error.message || "Unknown error charging token",
    }
  }
}

/**
 * יצירת קישור תשלום (Payment Link)
 * https://docs.payplus.co.il/reference/post_paymentpages-generatelink
 */
export async function generatePaymentLink(
  credentials: PayPlusCredentials,
  params: {
    amount: number
    currencyCode?: "ILS" | "USD" | "EUR" | "GPB"
    chargeMethod?: 0 | 1 | 2 | 3 | 4 | 5 // 1=Charge, 2=Approval, 3=Recurring
    refUrlSuccess?: string
    refUrlFailure?: string
    refUrlCallback?: string
    sendFailureCallback?: boolean
    customerName?: string
    customerEmail?: string
    customerPhone?: string
    items?: Array<{
      name: string
      quantity: number
      price: number
      vatType?: "0" | "1" | "2" // 0=included, 1=not included, 2=exempt
    }>
    moreInfo?: string
    createToken?: boolean
  }
): Promise<PayPlusResponse<{ payment_page_link: string }>> {
  try {
    console.log("PayPlus generatePaymentLink - Credentials check:", {
      hasApiKey: !!credentials.apiKey,
      apiKeyLength: credentials.apiKey?.length,
      hasSecretKey: !!credentials.secretKey,
      secretKeyLength: credentials.secretKey?.length,
      terminalUid: credentials.terminalUid,
      paymentPageUid: credentials.paymentPageUid,
    })

    const requestBody = {
      payment_page_uid: credentials.paymentPageUid,
      amount: params.amount,
      currency_code: params.currencyCode || "ILS",
      charge_method: params.chargeMethod || 1,
      refURL_success: params.refUrlSuccess,
      refURL_failure: params.refUrlFailure,
      refURL_callback: params.refUrlCallback,
      send_failure_callback: params.sendFailureCallback || false,
      customer: params.customerName || params.customerEmail
        ? {
            customer_name: params.customerName,
            email: params.customerEmail,
            phone: params.customerPhone,
          }
        : undefined,
      items: params.items,
      more_info: params.moreInfo,
      create_token: params.createToken || false,
    }

    console.log("PayPlus generatePaymentLink - Request body:", JSON.stringify(requestBody, null, 2))

    const baseUrl = getPayPlusBaseUrl(credentials.useProduction)
    console.log("PayPlus generatePaymentLink - Using URL:", baseUrl, "Production:", credentials.useProduction)

    const response = await fetch(`${baseUrl}/PaymentPages/generateLink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": credentials.apiKey,
        "secret-key": credentials.secretKey,
      },
      body: JSON.stringify(requestBody),
    })

    // קריאת התשובה כ-text קודם כדי לראות מה באמת חזר
    const responseText = await response.text()
    console.log("PayPlus generatePaymentLink - Raw response:", responseText)
    console.log("PayPlus generatePaymentLink - Response status:", response.status, response.statusText)

    // בדיקה אם התגובה היא שגיאת אימות
    if (response.status === 401 || responseText.toLowerCase().includes("not-authorize") || responseText.toLowerCase().includes("unauthorized")) {
      console.error("PayPlus authentication failed - check API credentials")
      return {
        success: false,
        error: "PayPlus authentication failed. Please check your API key, secret key, and payment page UID.",
      }
    }

    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("PayPlus response is not valid JSON:", responseText)
      // אם זה לא JSON, נחזיר את התגובה הטקסטואלית
      return {
        success: false,
        error: `PayPlus returned invalid response: ${responseText.substring(0, 200)}`,
      }
    }

    console.log("PayPlus generatePaymentLink - Response:", {
      status: response.status,
      ok: response.ok,
      data: JSON.stringify(data, null, 2),
    })

    if (!response.ok) {
      const errorMsg = data.message || data.error || data.results?.description || responseText || "Failed to generate payment link"
      console.error("PayPlus generatePaymentLink failed:", errorMsg, data)
      return {
        success: false,
        error: errorMsg,
        results: data.results,
      }
    }

    return {
      success: true,
      data: {
        payment_page_link: data.data?.payment_page_link || data.payment_page_link,
      },
    }
  } catch (error: any) {
    console.error("PayPlus generatePaymentLink error:", error)
    return {
      success: false,
      error: error.message || "Unknown error generating payment link",
    }
  }
}

/**
 * קבלת מידע מלא על תשלום דרך IPN FULL
 * https://docs.payplus.co.il/reference/post_paymentpages-ipn-full
 */
export async function getPayPlusIPNFull(
  credentials: PayPlusCredentials,
  params: {
    transactionUid?: string
    paymentRequestUid?: string
    relatedTransaction?: boolean
  }
): Promise<PayPlusResponse> {
  try {
    const baseUrl = getPayPlusBaseUrl(credentials.useProduction)

    const requestBody: any = {
      related_transaction: params.relatedTransaction || false,
    }

    if (params.transactionUid) {
      requestBody.transaction_uid = params.transactionUid
    } else if (params.paymentRequestUid) {
      requestBody.payment_request_uid = params.paymentRequestUid
    } else {
      return {
        success: false,
        error: "Either transactionUid or paymentRequestUid is required",
      }
    }

    console.log("PayPlus getIPNFull - Request:", {
      transactionUid: params.transactionUid,
      paymentRequestUid: params.paymentRequestUid,
    })

    const response = await fetch(`${baseUrl}/PaymentPages/ipn-full`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": credentials.apiKey,
        "secret-key": credentials.secretKey,
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    let data: any

    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("PayPlus IPN response is not valid JSON:", responseText)
      return {
        success: false,
        error: `Invalid response: ${responseText.substring(0, 200)}`,
      }
    }

    if (!response.ok) {
      const errorMsg = data.message || data.error || data.results?.description || "Failed to get IPN"
      console.error("PayPlus getIPNFull failed:", errorMsg)
      return {
        success: false,
        error: errorMsg,
        results: data.results,
      }
    }

    console.log("PayPlus getIPNFull - Success")

    return {
      success: true,
      data: data.data || data,
    }
  } catch (error: any) {
    console.error("PayPlus getIPNFull error:", error)
    return {
      success: false,
      error: error.message || "Unknown error getting IPN",
    }
  }
}

/**
 * Helper: קבלת פרטי אינטגרציה מה-DB
 * @param companyId - ID של החברה. אם null, מחזיר הגדרות גלובליות (למנויי SaaS)
 */
export async function getPayPlusCredentials(
  companyId?: string | null,
  forSaaS: boolean = false
): Promise<PayPlusCredentials | null> {
  const { prisma } = await import("@/lib/prisma")
  
  // אם זה למנויי SaaS, נחזיר את ההגדרות הגלובליות
  if (forSaaS || !companyId) {
    const globalSettings = await prisma.company.findUnique({
      where: { id: "PAYPLUS_GLOBAL_SETTINGS" },
      select: { settings: true },
    })

    if (!globalSettings || !globalSettings.settings) {
      return null
    }

    const payplus = (globalSettings.settings as any)?.payplus
    if (!payplus) {
      return null
    }

    return {
      apiKey: payplus.apiKey,
      secretKey: payplus.secretKey,
      terminalUid: payplus.terminalUid,
      cashierUid: payplus.cashierUid,
      paymentPageUid: payplus.paymentPageUid,
      useProduction: payplus.useProduction || false,
    }
  }

  // אחרת, נחזיר את האינטגרציה הספציפית של החברה (לחנות)
  const integration = await prisma.integration.findFirst({
    where: {
      companyId,
      type: "PAYPLUS",
      isActive: true,
    },
  })

  if (!integration || !integration.config) {
    return null
  }

  const creds = integration.config as any

  return {
    apiKey: creds.apiKey || integration.apiKey,
    secretKey: creds.secretKey || integration.apiSecret,
    terminalUid: creds.terminalUid || creds.terminal_uid,
    cashierUid: creds.cashierUid || creds.cashier_uid,
    paymentPageUid: creds.paymentPageUid || creds.payment_page_uid,
    useProduction: creds.useProduction || false,
  }
}

/**
 * יצירת Product ב-PayPlus
 * https://docs.payplus.co.il/reference/post_products-add
 */
export async function createPayPlusProduct(
  credentials: PayPlusCredentials,
  params: {
    name: string
    price: number // באגורות (מספר שלם)
    currencyCode?: "ILS" | "USD" | "EUR" | "GPB"
    vatType?: 0 | 1 | 2 // 0=included, 1=not included, 2=exempt
    description?: string
    barcode?: string
  }
): Promise<PayPlusResponse<{ uid: string }>> {
  try {
    const baseUrl = getPayPlusBaseUrl(credentials.useProduction)
    const response = await fetch(`${baseUrl}/Products/Add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": credentials.apiKey,
        "secret-key": credentials.secretKey,
      },
      body: JSON.stringify({
        name: params.name,
        price: Math.round(params.price), // PayPlus מצפה לאגורות
        currency_code: params.currencyCode || "ILS",
        vat_type: params.vatType ?? 0, // 0 = VAT included
        description: params.description,
        barcode: params.barcode,
        valid: true,
      }),
    })

    const data = await response.json()

    if (!response.ok || data.results?.status === "error") {
      return {
        success: false,
        error: data.results?.description || data.message || "Failed to create product",
        results: data.results,
      }
    }

    return {
      success: true,
      data: {
        uid: data.data?.uid || data.uid,
      },
    }
  } catch (error: any) {
    console.error("PayPlus createProduct error:", error)
    return {
      success: false,
      error: error.message || "Unknown error creating product",
    }
  }
}

/**
 * חיפוש Product ב-PayPlus לפי שם
 * https://docs.payplus.co.il/reference/get_products-view
 */
export async function searchPayPlusProduct(
  credentials: PayPlusCredentials,
  productName: string
): Promise<PayPlusResponse<{ uid: string; name: string; price: number } | null>> {
  try {
    const baseUrl = getPayPlusBaseUrl(credentials.useProduction)
    const response = await fetch(`${baseUrl}/Products/View?skip=0&take=500`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "api-key": credentials.apiKey,
        "secret-key": credentials.secretKey,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.results?.description || "Failed to search products",
      }
    }

    // חיפוש product לפי שם
    const products = data.data || []
    const found = products.find((p: any) => p.name === productName)

    if (found) {
      return {
        success: true,
        data: {
          uid: found.uid,
          name: found.name,
          price: found.price,
        },
      }
    }

    return {
      success: true,
      data: null,
    }
  } catch (error: any) {
    console.error("PayPlus searchProduct error:", error)
    return {
      success: false,
      error: error.message || "Unknown error searching product",
    }
  }
}

/**
 * עדכון הוראת קבע קיימת
 * https://docs.payplus.co.il/reference/post_recurringpayments-update-uid
 */
export async function updateRecurringPayment(
  credentials: PayPlusCredentials,
  params: {
    recurringPaymentUid: string
    customerUid: string
    cardToken: string
    cashierUid: string
    currencyCode?: "ILS" | "USD" | "EUR" | "GPB"
    instantFirstPayment: boolean
    recurringType: 0 | 1 | 2
    recurringRange: number
    numberOfCharges: number
    startDate: string
    items: Array<{
      productUid: string
      quantity: number
      price: number
      discountType?: "percentage" | "amount"
      discountValue?: number
    }>
    endDate?: string
    sendCustomerSuccessEmail?: boolean
    customerFailureEmail?: boolean
    extraInfo?: string
  }
): Promise<PayPlusResponse> {
  try {
    const baseUrl = getPayPlusBaseUrl(credentials.useProduction)
    const response = await fetch(
      `${baseUrl}/RecurringPayments/Update/${params.recurringPaymentUid}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": credentials.apiKey,
          "secret-key": credentials.secretKey,
        },
        body: JSON.stringify({
          terminal_uid: credentials.terminalUid,
          customer_uid: params.customerUid,
          card_token: params.cardToken,
          cashier_uid: params.cashierUid,
          currency_code: params.currencyCode || "ILS",
          instant_first_payment: params.instantFirstPayment,
          recurring_type: params.recurringType,
          recurring_range: params.recurringRange,
          number_of_charges: params.numberOfCharges,
          start_date: params.startDate,
          end_date: params.endDate,
          items: params.items.map((item: any) => ({
            product_uid: item.productUid,
            quantity: item.quantity,
            price: item.price,
            discount_type: item.discountType,
            discount_value: item.discountValue,
          })),
          send_customer_success_email: params.sendCustomerSuccessEmail || false,
          customer_failure_email: params.customerFailureEmail || false,
          extra_info: params.extraInfo,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || "Failed to update recurring payment",
        results: data.results,
      }
    }

    return {
      success: true,
      data: data,
    }
  } catch (error: any) {
    console.error("PayPlus updateRecurringPayment error:", error)
    return {
      success: false,
      error: error.message || "Unknown error updating recurring payment",
    }
  }
}

/**
 * מחיקת הוראת קבע
 * https://docs.payplus.co.il/reference/post_recurringpayments-deleterecurring-uid
 */
export async function deleteRecurringPayment(
  credentials: PayPlusCredentials,
  recurringPaymentUid: string
): Promise<PayPlusResponse> {
  try {
    const baseUrl = getPayPlusBaseUrl(credentials.useProduction)
    const response = await fetch(
      `${baseUrl}/RecurringPayments/DeleteRecurring/${recurringPaymentUid}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": credentials.apiKey,
          "secret-key": credentials.secretKey,
        },
        body: JSON.stringify({
          terminal_uid: credentials.terminalUid,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || "Failed to delete recurring payment",
        results: data.results,
      }
    }

    return {
      success: true,
      data: data,
    }
  } catch (error: any) {
    console.error("PayPlus deleteRecurringPayment error:", error)
    return {
      success: false,
      error: error.message || "Unknown error deleting recurring payment",
    }
  }
}

/**
 * הפעלה/כיבוי הוראת קבע (Valid/Invalid)
 * https://docs.payplus.co.il/reference/post_recurringpayments-uid-valid
 */
export async function setRecurringPaymentValid(
  credentials: PayPlusCredentials,
  recurringPaymentUid: string,
  valid: boolean
): Promise<PayPlusResponse> {
  try {
    const baseUrl = getPayPlusBaseUrl(credentials.useProduction)
    const response = await fetch(
      `${baseUrl}/RecurringPayments/${recurringPaymentUid}/Valid`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": credentials.apiKey,
          "secret-key": credentials.secretKey,
        },
        body: JSON.stringify({
          terminal_uid: credentials.terminalUid,
          valid: valid,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || "Failed to set recurring payment valid",
        results: data.results,
      }
    }

    return {
      success: true,
      data: data,
    }
  } catch (error: any) {
    console.error("PayPlus setRecurringPaymentValid error:", error)
    return {
      success: false,
      error: error.message || "Unknown error setting recurring payment valid",
    }
  }
}

/**
 * Helper: קבלת תאריך החודש הבא בפורמט YYYY-MM-DD
 */
export function getNextMonthDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Helper: קבלת תאריך סוף החודש הנוכחי בפורמט YYYY-MM-DD
 */
export function getEndOfCurrentMonth(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
}

/**
 * זיכוי לפי Transaction UID
 * https://docs.payplus.co.il/reference/post_transactions-refundbytransactionuid
 */
export async function refundByTransactionUID(
  credentials: PayPlusCredentials,
  params: {
    transactionUid: string
    amount: number
    moreInfo?: string
  }
): Promise<PayPlusResponse> {
  try {
    const baseUrl = getPayPlusBaseUrl(credentials.useProduction)

    const requestBody = {
      transaction_uid: params.transactionUid,
      amount: parseFloat(params.amount.toFixed(2)),
      ...(params.moreInfo && { more_info: params.moreInfo }),
    }

    console.log("PayPlus refundByTransactionUID - Request:", {
      transactionUid: params.transactionUid,
      amount: params.amount,
    })

    const response = await fetch(`${baseUrl}/Transactions/RefundByTransactionUID`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": credentials.apiKey,
        "secret-key": credentials.secretKey,
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log("PayPlus refundByTransactionUID - Raw response:", responseText)

    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("PayPlus response is not valid JSON:", responseText)
      return {
        success: false,
        error: `PayPlus returned invalid response: ${responseText.substring(0, 200)}`,
      }
    }

    if (!response.ok || data.results?.status === "error") {
      const errorMsg = data.results?.description || data.message || data.error || "Failed to process refund"
      console.error("PayPlus refundByTransactionUID failed:", errorMsg, data)
      return {
        success: false,
        error: errorMsg,
        results: data.results,
      }
    }

    console.log("PayPlus refundByTransactionUID - Success")
    return {
      success: true,
      data: data.data || data,
    }
  } catch (error: any) {
    console.error("PayPlus refundByTransactionUID error:", error)
    return {
      success: false,
      error: error.message || "Unknown error processing refund",
    }
  }
}

