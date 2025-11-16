// רישום כל ספקי המשלוחים

import { ShippingProvider } from './types'
import { FocusShippingProvider } from './providers/focus'
// import { DHLShippingProvider } from './providers/dhl'
// import { IsraelPostShippingProvider } from './providers/israel-post'

export const shippingProviders: Record<string, ShippingProvider> = {
  focus: new FocusShippingProvider(),
  // dhl: new DHLShippingProvider(),
  // 'israel-post': new IsraelPostShippingProvider(),
}

export function getShippingProvider(slug: string): ShippingProvider | null {
  return shippingProviders[slug] || null
}

export function getAllProviders(): ShippingProvider[] {
  return Object.values(shippingProviders)
}

