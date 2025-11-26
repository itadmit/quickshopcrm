import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(d);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS'
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('he-IL').format(num);
}

/**
 * מחזיר את ה-URL הבסיסי של האפליקציה
 * בפיתוח: localhost:3000
 * בפרודקשן: my-quickshop.com
 */
export function getBaseUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return `https://${process.env.NEXT_PUBLIC_DOMAIN || 'my-quickshop.com'}`
  }
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

/**
 * מחזיר את ה-URL הבסיסי של החנות
 * אם יש custom domain, מחזיר אותו (עם https://)
 * אחרת מחזיר את ה-slug path
 */
export function getShopBaseUrl(shop: { slug: string; domain?: string | null }): string {
  if (shop.domain) {
    // אם יש custom domain, מחזיר אותו עם פרוטוקול
    const domain = shop.domain.startsWith('http') ? shop.domain : `https://${shop.domain}`;
    return domain;
  }
  // אחרת מחזיר את ה-slug path
  return `/shop/${shop.slug}`;
}

/**
 * מחזיר את ה-URL המלא של מוצר בחנות
 */
export function getShopProductUrl(
  shop: { slug: string; domain?: string | null },
  productIdOrSlug: string
): string {
  const baseUrl = getShopBaseUrl(shop);
  return `${baseUrl}/products/${productIdOrSlug}`;
}

/**
 * מחזיר את ה-URL המלא של קטגוריה בחנות
 */
export function getShopCategoryUrl(
  shop: { slug: string; domain?: string | null },
  categoryIdOrSlug: string
): string {
  const baseUrl = getShopBaseUrl(shop);
  return `${baseUrl}/categories/${categoryIdOrSlug}`;
}

/**
 * מחזיר את ה-URL המלא של אוסף בחנות
 */
export function getShopCollectionUrl(
  shop: { slug: string; domain?: string | null },
  collectionIdOrSlug: string
): string {
  const baseUrl = getShopBaseUrl(shop);
  return `${baseUrl}/categories/${collectionIdOrSlug}`;
}

/**
 * מחזיר את ה-URL המלא של דף בחנות
 */
export function getShopPageUrl(
  shop: { slug: string; domain?: string | null },
  pageIdOrSlug: string
): string {
  const baseUrl = getShopBaseUrl(shop);
  return `${baseUrl}/pages/${pageIdOrSlug}`;
}


