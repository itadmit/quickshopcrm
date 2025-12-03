// טעינת והרצת תוספים

import { prisma } from '@/lib/prisma'
import { builtInPlugins, getPluginBySlug } from './registry'
import { InstalledPlugin, PluginHook } from './types'

// טעינת תוספים פעילים לחנות/חברה
export async function loadActivePlugins(shopId?: string, companyId?: string): Promise<InstalledPlugin[]> {
  // אם יש shopId, נחפש גם את companyId של החנות
  let finalCompanyId = companyId
  
  if (shopId && !companyId) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { companyId: true },
    })
    if (shop?.companyId) {
      finalCompanyId = shop.companyId
    }
  }

  const where: any = {
    isActive: true,
    isInstalled: true,
    OR: [
      // תוספים ספציפיים לחנות
      ...(shopId ? [{ shopId }] : []),
      // תוספים ברמת החברה
      ...(finalCompanyId ? [{ companyId: finalCompanyId }] : []),
      // תוספים גלובליים
      { shopId: null, companyId: null },
    ],
  }
  
  const plugins = await prisma.plugin.findMany({
    where,
  })
  
  return plugins as InstalledPlugin[]
}

// טעינת תוסף Core לפי slug
export async function loadCorePlugin(slug: string): Promise<PluginHook | null> {
  // טעינת התוסף מהרישום
  const pluginDef = getPluginBySlug(slug)
  if (!pluginDef || pluginDef.type !== 'CORE') {
    return null
  }
  
  // טעינת התוסף מהדאטאבייס
  const installed = await prisma.plugin.findUnique({
    where: { slug },
  })
  
  if (!installed || !installed.isActive || !installed.isInstalled) {
    return null
  }
  
  // טעינת ה-hooks מהתוסף
  // כאן נטען את התוסף לפי slug
  try {
    switch (slug) {
      case 'bundle-products':
        const { BundleProductsPlugin } = await import('./core/bundle-products')
        return BundleProductsPlugin
      case 'cash-on-delivery':
        const { CashOnDeliveryPlugin } = await import('./core/cash-on-delivery')
        return CashOnDeliveryPlugin
      case 'saturday-shutdown':
        const { SaturdayShutdownPlugin } = await import('./core/saturday-shutdown')
        return SaturdayShutdownPlugin
      case 'shop-the-look':
        const { ShopTheLookPlugin } = await import('./core/shop-the-look')
        return ShopTheLookPlugin
      case 'reviews':
        const { ReviewsPlugin } = await import('./core/reviews')
        return ReviewsPlugin
      case 'premium-club':
        const { PremiumClubPlugin } = await import('./core/premium-club')
        return PremiumClubPlugin
      default:
        return null
    }
  } catch (error) {
    console.error(`Error loading plugin ${slug}:`, error)
    return null
  }
}

// הרצת hook של תוסף
export async function runPluginHook(
  hookName: keyof PluginHook,
  shopId: string,
  ...args: any[]
): Promise<any> {
  try {
    // טעינת כל התוספים הפעילים לחנות
    const activePlugins = await loadActivePlugins(shopId)
    
    // הרצת ה-hook על כל תוסף Core פעיל
    for (const plugin of activePlugins) {
      if (plugin.type === 'CORE') {
        try {
          const pluginHook = await loadCorePlugin(plugin.slug)
          if (pluginHook && pluginHook[hookName]) {
            const hook = pluginHook[hookName] as Function
            await hook(...args, shopId)
          }
        } catch (error) {
          console.error(`Error running hook ${hookName} for plugin ${plugin.slug}:`, error)
          // ממשיכים עם התוספים הבאים גם אם אחד נכשל
        }
      }
    }
  } catch (error) {
    console.error(`Error running plugin hook ${hookName}:`, error)
  }
  
  return null
}

// התקנת תוסף
export async function installPlugin(
  slug: string,
  shopId?: string,
  companyId?: string
): Promise<InstalledPlugin> {
  const pluginDef = getPluginBySlug(slug)
  if (!pluginDef) {
    throw new Error(`Plugin ${slug} not found`)
  }
  
  // בדיקה אם התוסף כבר מותקן - חיפוש לפי slug + shopId/companyId
  const existing = await prisma.plugin.findFirst({
    where: {
      slug,
      OR: [
        ...(shopId ? [{ shopId }] : []),
        ...(companyId ? [{ companyId, shopId: null }] : []),
        { shopId: null, companyId: null }, // גלובלי
      ],
    },
  })
  
  if (existing) {
    // עדכון התוסף הקיים
    return await prisma.plugin.update({
      where: { id: existing.id },
      data: {
        isInstalled: true,
        installedAt: new Date(),
        shopId: shopId || null,
        companyId: companyId || null,
        config: pluginDef.defaultConfig || {},
      },
    }) as InstalledPlugin
  }
  
  // יצירת תוסף חדש
  return await prisma.plugin.create({
    data: {
      slug: pluginDef.slug,
      name: pluginDef.name,
      description: pluginDef.description || null,
      icon: pluginDef.icon || null,
      version: pluginDef.version,
      author: pluginDef.author || null,
      type: pluginDef.type,
      category: pluginDef.category,
      isBuiltIn: pluginDef.isBuiltIn || false,
      isInstalled: true,
      isActive: pluginDef.isFree ? true : false, // תוספים חינמיים מופעלים מיד
      scriptUrl: pluginDef.scriptUrl || null,
      scriptContent: pluginDef.scriptContent || null,
      injectLocation: pluginDef.injectLocation || null,
      configSchema: pluginDef.configSchema || null,
      config: pluginDef.defaultConfig || {},
      metadata: (pluginDef.metadata || null) as any,
      requirements: (pluginDef.requirements || null) as any,
      isFree: pluginDef.isFree ?? true,
      price: pluginDef.price || null,
      currency: "ILS",
      shopId: shopId || null,
      companyId: companyId || null,
      installedAt: new Date(),
    },
  }) as InstalledPlugin
}

// הסרת תוסף
export async function uninstallPlugin(
  slug: string,
  shopId?: string,
  companyId?: string
): Promise<void> {
  // חיפוש התוסף - קודם ספציפי, אחר כך גלובלי
  const plugin = await prisma.plugin.findFirst({
    where: {
      slug,
      OR: [
        ...(shopId ? [{ shopId }] : []),
        ...(companyId ? [{ companyId, shopId: null }] : []),
        { shopId: null, companyId: null }, // גלובלי
      ],
    },
  })
  
  if (!plugin) {
    throw new Error(`Plugin ${slug} not found`)
  }
  
  // הסרת תוסף - גם מובנים (רק מסמן כלא מותקן ולא מוחק)
  await prisma.plugin.update({
    where: { id: plugin.id },
    data: {
      isInstalled: false,
      isActive: false,
    },
  })
}

// הפעלת תוסף
export async function activatePlugin(
  slug: string,
  shopId?: string,
  companyId?: string
): Promise<void> {
  // חיפוש התוסף - קודם ספציפי, אחר כך גלובלי
  const plugin = await prisma.plugin.findFirst({
    where: {
      slug,
      OR: [
        ...(shopId ? [{ shopId }] : []),
        ...(companyId ? [{ companyId, shopId: null }] : []),
        { shopId: null, companyId: null }, // גלובלי
      ],
    },
  })
  
  if (!plugin) {
    throw new Error(`Plugin ${slug} not found`)
  }
  
  if (!plugin.isInstalled) {
    throw new Error('Plugin must be installed before activation')
  }
  
  await prisma.plugin.update({
    where: { id: plugin.id },
    data: {
      isActive: true,
    },
  })
}

// כיבוי תוסף
export async function deactivatePlugin(
  slug: string,
  shopId?: string,
  companyId?: string
): Promise<void> {
  // חיפוש התוסף - קודם ספציפי, אחר כך גלובלי
  const plugin = await prisma.plugin.findFirst({
    where: {
      slug,
      OR: [
        ...(shopId ? [{ shopId }] : []),
        ...(companyId ? [{ companyId, shopId: null }] : []),
        { shopId: null, companyId: null }, // גלובלי
      ],
    },
  })
  
  if (!plugin) {
    throw new Error(`Plugin ${slug} not found`)
  }
  
  await prisma.plugin.update({
    where: { id: plugin.id },
    data: {
      isActive: false,
    },
  })
}

// עדכון הגדרות תוסף
export async function updatePluginConfig(
  slug: string,
  config: any,
  shopId?: string,
  companyId?: string
): Promise<InstalledPlugin> {
  // חיפוש התוסף - קודם ספציפי, אחר כך גלובלי
  const plugin = await prisma.plugin.findFirst({
    where: {
      slug,
      OR: [
        ...(shopId ? [{ shopId }] : []),
        ...(companyId ? [{ companyId, shopId: null }] : []),
        { shopId: null, companyId: null }, // גלובלי
      ],
    },
  })
  
  if (!plugin) {
    throw new Error(`Plugin ${slug} not found`)
  }
  
  return await prisma.plugin.update({
    where: { id: plugin.id },
    data: {
      config: config,
    },
  }) as InstalledPlugin
}

