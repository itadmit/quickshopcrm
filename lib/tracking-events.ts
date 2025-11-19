/**
 * Helper functions for tracking events
 * כל הפונקציות האלה משתמשות ב-useTracking hook
 */

/**
 * Track PageView event
 */
export function trackPageView(
  trackEvent: (event: string, data?: any) => void,
  pagePath: string,
  pageTitle: string
) {
  trackEvent("PageView", {
    page_path: pagePath,
    page_title: pageTitle,
  })
}

/**
 * Track ViewContent event (product view)
 */
export function trackViewContent(
  trackEvent: (event: string, data?: any) => void,
  product: {
    id: string
    name: string
    price: number
    sku?: string | null
    category?: string
  }
) {
  trackEvent("ViewContent", {
    content_name: product.name,
    content_ids: [product.id],
    content_type: "product",
    value: product.price,
    currency: "ILS",
    contents: [
      {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      },
    ],
  })
}

/**
 * Track SelectVariant event
 */
export function trackSelectVariant(
  trackEvent: (event: string, data?: any) => void,
  product: {
    id: string
    name: string
  },
  variant: {
    id: string
    name: string
    price: number
    sku?: string | null
  }
) {
  trackEvent("SelectVariant", {
    content_name: product.name,
    content_ids: [product.id],
    variant_id: variant.id,
    variant_name: variant.name,
    value: variant.price,
    currency: "ILS",
  })
}

/**
 * Track AddToCart event
 */
export function trackAddToCart(
  trackEvent: (event: string, data?: any) => void,
  product: {
    id: string
    name: string
    price: number
    sku?: string | null
  },
  quantity: number = 1,
  variantId?: string,
  addonsTotal?: number,
  variantName?: string
) {
  // המחיר כולל את התוספות אם יש
  const finalPrice = product.price + (addonsTotal || 0)
  
  // אם יש variant, נשלח את ה-variant ID ושם
  const contentId = variantId || product.id
  const contentName = variantName ? `${product.name} - ${variantName}` : product.name
  
  trackEvent("AddToCart", {
    content_name: contentName,
    content_ids: [contentId],
    content_type: "product",
    value: finalPrice * quantity,
    currency: "ILS",
    ...(variantId && { variant_id: variantId }),
    ...(variantName && { variant_name: variantName }),
    contents: [
      {
        id: contentId,
        name: contentName,
        price: finalPrice,
        quantity: quantity,
      },
    ],
  })
}

/**
 * Track RemoveFromCart event
 */
export function trackRemoveFromCart(
  trackEvent: (event: string, data?: any) => void,
  product: {
    id: string
    name: string
  },
  quantity: number = 1
) {
  trackEvent("RemoveFromCart", {
    content_name: product.name,
    content_ids: [product.id],
    content_type: "product",
    quantity: quantity,
  })
}

/**
 * Track ViewCart event
 */
export function trackViewCart(
  trackEvent: (event: string, data?: any) => void,
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>,
  total: number
) {
  trackEvent("ViewCart", {
    value: total,
    currency: "ILS",
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
    contents: items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  })
}

/**
 * Track InitiateCheckout event
 */
export function trackInitiateCheckout(
  trackEvent: (event: string, data?: any) => void,
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>,
  total: number
) {
  trackEvent("InitiateCheckout", {
    value: total,
    currency: "ILS",
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
    contents: items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  })
}

/**
 * Track AddPaymentInfo event
 */
export function trackAddPaymentInfo(
  trackEvent: (event: string, data?: any) => void,
  paymentMethod: string,
  total: number
) {
  trackEvent("AddPaymentInfo", {
    value: total,
    currency: "ILS",
    payment_method: paymentMethod,
  })
}

/**
 * Track Purchase event
 */
export function trackPurchase(
  trackEvent: (event: string, data?: any) => void,
  order: {
    id: string
    orderNumber: string
    total: number
    tax: number
    shipping: number
    items: Array<{
      id: string
      name: string
      price: number
      quantity: number
    }>
  }
) {
  trackEvent("Purchase", {
    transaction_id: order.orderNumber,
    value: order.total,
    currency: "ILS",
    tax: order.tax,
    shipping: order.shipping,
    contents: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  })
}

/**
 * Track AddToWishlist event
 */
export function trackAddToWishlist(
  trackEvent: (event: string, data?: any) => void,
  product: {
    id: string
    name: string
    price: number
  },
  variantId?: string,
  variantName?: string
) {
  // אם יש variant, נשלח את ה-variant ID ושם
  const contentId = variantId || product.id
  const contentName = variantName ? `${product.name} - ${variantName}` : product.name
  
  trackEvent("AddToWishlist", {
    content_name: contentName,
    content_ids: [contentId],
    content_type: "product",
    value: product.price,
    currency: "ILS",
    ...(variantId && { variant_id: variantId }),
    ...(variantName && { variant_name: variantName }),
  })
}

/**
 * Track RemoveFromWishlist event
 */
export function trackRemoveFromWishlist(
  trackEvent: (event: string, data?: any) => void,
  product: {
    id: string
    name: string
  },
  variantId?: string,
  variantName?: string
) {
  // אם יש variant, נשלח את ה-variant ID ושם
  const contentId = variantId || product.id
  const contentName = variantName ? `${product.name} - ${variantName}` : product.name
  
  trackEvent("RemoveFromWishlist", {
    content_name: contentName,
    content_ids: [contentId],
    content_type: "product",
    ...(variantId && { variant_id: variantId }),
    ...(variantName && { variant_name: variantName }),
  })
}

/**
 * Track Search event
 */
export function trackSearch(
  trackEvent: (event: string, data?: any) => void,
  searchTerm: string,
  resultsCount: number
) {
  trackEvent("Search", {
    search_term: searchTerm,
    results_count: resultsCount,
  })
}

/**
 * Track SignUp event
 */
export function trackSignUp(
  trackEvent: (event: string, data?: any) => void,
  method?: string
) {
  trackEvent("SignUp", {
    method: method || "email",
  })
}

/**
 * Track Login event
 */
export function trackLogin(
  trackEvent: (event: string, data?: any) => void,
  method?: string
) {
  trackEvent("Login", {
    method: method || "email",
  })
}

