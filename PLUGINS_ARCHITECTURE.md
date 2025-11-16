# ארכיטקטורת מרקטפלייס תוספים (Plugins Marketplace)

## סקירה כללית

מערכת מרקטפלייס מקצועית לתוספים, בדומה לשופיפיי, עם תמיכה בשני סוגי תוספים:
1. **Core Plugins** - תוספים ברמת ליבה (משולבים בקוד)
2. **Script Plugins** - תוספים קלילים (הזרקת סקריפט בלבד)

## סוגי תוספים

### 1. Core Plugins (תוספי ליבה)
תוספים שדורשים שילוב עמוק במערכת:
- **Bundle Products** - מוצר באנדל (מוריד מהמלאי של כל מוצר)
- **POS** - מערכת נקודת מכירה
- **Cash on Delivery** - תשלום במזומן בצ'ק אאוט
- **Saturday Shutdown** - האתר מכובה בשבת

### 2. Script Plugins (תוספי סקריפט)
תוספים קלילים שדורשים רק הזרקת סקריפט:
- **Google Analytics** - מעקב אנליטיקס
- **Shop the Look** - סימון פריטים על תמונה
- **WhatsApp Floating Button** - אייקון וואטסאפ צף

---

## מבנה מסד הנתונים

### מודל Plugin

```prisma
model Plugin {
  id              String          @id @default(cuid())
  shopId          String?         // null = גלובלי, לא null = ספציפי לחנות
  companyId       String?         // null = גלובלי, לא null = ספציפי לחברה
  
  // מידע בסיסי
  name            String
  slug            String           @unique
  description     String?
  icon            String?          // URL לאייקון
  version         String          @default("1.0.0")
  author          String?
  
  // סוג התוסף
  type            PluginType       // CORE או SCRIPT
  category        PluginCategory  // ANALYTICS, MARKETING, PAYMENT, etc.
  
  // הגדרות הפעלה
  isActive        Boolean         @default(false)
  isInstalled     Boolean         @default(false)
  isBuiltIn       Boolean         @default(false)  // תוספים מובנים (לא ניתן להסיר)
  
  // הגדרות תוסף סקריפט
  scriptUrl       String?         // URL לסקריפט (רק ל-SCRIPT plugins)
  scriptContent   String?         // תוכן סקריפט ישיר (רק ל-SCRIPT plugins)
  injectLocation  ScriptLocation? // HEAD, BODY_START, BODY_END
  
  // הגדרות תוסף ליבה
  configSchema    Json?           // Schema להגדרות התוסף (Zod schema)
  config          Json?           // הגדרות התוסף הספציפיות
  
  // Metadata
  metadata        Json?           // מידע נוסף (תמונות, מסכים, וכו')
  requirements    Json?           // דרישות (מינימום גרסה, תוספים אחרים, וכו')
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  installedAt     DateTime?
  
  shop            Shop?           @relation(fields: [shopId], references: [id], onDelete: Cascade)
  company         Company?        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@index([shopId])
  @@index([companyId])
  @@index([type])
  @@index([isActive])
  @@index([slug])
  @@map("plugins")
}

enum PluginType {
  CORE      // תוסף ליבה - משולב בקוד
  SCRIPT    // תוסף סקריפט - הזרקה בלבד
}

enum PluginCategory {
  ANALYTICS     // אנליטיקס (Google Analytics)
  MARKETING     // שיווק (Shop the Look)
  PAYMENT       // תשלום (Cash on Delivery)
  INVENTORY     // מלאי (Bundle Products)
  COMMUNICATION // תקשורת (WhatsApp)
  OPERATIONS    // פעולות (POS, Saturday Shutdown)
  CUSTOMIZATION // התאמה אישית
}

enum ScriptLocation {
  HEAD          // <head>
  BODY_START    // תחילת <body>
  BODY_END      // סוף <body>
}
```

---

## ארכיטקטורת Core Plugins

### מבנה תיקיות

```
lib/
  plugins/
    core/
      bundle-products/        # תוסף Bundle Products
        index.ts              # נקודת כניסה
        hooks.ts              # React hooks
        server.ts             # Server-side logic
        types.ts              # TypeScript types
        config.ts             # הגדרות ברירת מחדל
      
      pos/                    # תוסף POS
        index.ts
        hooks.ts
        server.ts
        types.ts
        config.ts
      
      cash-on-delivery/       # תשלום במזומן
        index.ts
        hooks.ts
        server.ts
        types.ts
        config.ts
      
      saturday-shutdown/       # האתר מכובה בשבת
        index.ts
        hooks.ts
        server.ts
        types.ts
        config.ts
    
    registry.ts               # רישום כל התוספים
    loader.ts                 # טעינת תוספים
    hooks.ts                  # Hooks גלובליים
```

### מערכת Hooks/Events

כל תוסף יכול להירשם לאירועים במערכת:

```typescript
// lib/plugins/core/types.ts
export interface PluginHook {
  // אירועי עגלה
  onCartAdd?: (item: CartItem) => Promise<void>
  onCartUpdate?: (cart: Cart) => Promise<void>
  onCartRemove?: (itemId: string) => Promise<void>
  
  // אירועי הזמנה
  onOrderCreate?: (order: Order) => Promise<void>
  onOrderUpdate?: (order: Order) => Promise<void>
  onOrderComplete?: (order: Order) => Promise<void>
  
  // אירועי מוצר
  onProductView?: (product: Product) => Promise<void>
  onProductPurchase?: (product: Product, order: Order) => Promise<void>
  
  // אירועי תשלום
  onPaymentMethodAdd?: (method: PaymentMethod) => Promise<void>
  onPaymentProcess?: (order: Order, method: string) => Promise<PaymentResult>
  
  // אירועי storefront
  onStorefrontRender?: (shop: Shop) => Promise<ReactNode | null>
  onCheckoutRender?: (checkout: Checkout) => Promise<ReactNode | null>
  
  // אירועי לוח זמנים
  onScheduleCheck?: (date: Date) => Promise<boolean>  // האם להפעיל/לכבות משהו
}
```

### דוגמה: תוסף Bundle Products

```typescript
// lib/plugins/core/bundle-products/index.ts
import { PluginHook } from '../types'
import { prisma } from '@/lib/prisma'

export const BundleProductsPlugin: PluginHook = {
  // כשמוסיפים באנדל לעגלה, מוסיפים את כל המוצרים
  onCartAdd: async (item) => {
    if (item.type === 'bundle') {
      const bundle = await prisma.bundle.findUnique({
        where: { id: item.productId },
        include: { products: true }
      })
      
      if (bundle) {
        // מוסיפים את כל המוצרים מהבאנדל לעגלה
        // ומעדכנים את המלאי
        for (const bundleProduct of bundle.products) {
          await prisma.product.update({
            where: { id: bundleProduct.productId },
            data: {
              inventoryQty: {
                decrement: bundleProduct.quantity * item.quantity
              }
            }
          })
        }
      }
    }
  },
  
  // כשמשלימים הזמנה, מורידים מהמלאי
  onOrderComplete: async (order) => {
    for (const item of order.items) {
      if (item.type === 'bundle') {
        // המלאי כבר ירד ב-onCartAdd, אבל אפשר לעשות validation כאן
      }
    }
  }
}
```

---

## ארכיטקטורת Script Plugins

### הזרקת סקריפטים אוטומטית

```typescript
// components/plugins/ScriptInjector.tsx
"use client"

import { useEffect } from 'react'
import { useShop } from '@/components/providers/ShopProvider'

export function ScriptInjector() {
  const { selectedShop } = useShop()
  
  useEffect(() => {
    if (!selectedShop) return
    
    // טוענים את כל התוספים הפעילים
    fetch(`/api/plugins/active?shopId=${selectedShop.id}`)
      .then(res => res.json())
      .then(plugins => {
        plugins
          .filter(p => p.type === 'SCRIPT' && p.isActive)
          .forEach(plugin => {
            injectScript(plugin)
          })
      })
  }, [selectedShop])
  
  return null
}

function injectScript(plugin: Plugin) {
  if (plugin.scriptUrl) {
    // טוען סקריפט חיצוני
    const script = document.createElement('script')
    script.src = plugin.scriptUrl
    script.async = true
    script.setAttribute('data-plugin-id', plugin.id)
    
    // הוספה למיקום הנכון
    const location = plugin.injectLocation || 'BODY_END'
    if (location === 'HEAD') {
      document.head.appendChild(script)
    } else if (location === 'BODY_START') {
      document.body.insertBefore(script, document.body.firstChild)
    } else {
      document.body.appendChild(script)
    }
  } else if (plugin.scriptContent) {
    // הרצת סקריפט ישיר
    eval(plugin.scriptContent) // ⚠️ רק לתוספים מהימנים!
  }
}
```

---

## API Routes

### `/api/plugins`
- `GET` - רשימת כל התוספים הזמינים
- `POST` - התקנת תוסף חדש

### `/api/plugins/[id]`
- `GET` - פרטי תוסף
- `PUT` - עדכון הגדרות תוסף
- `DELETE` - הסרת תוסף

### `/api/plugins/[id]/activate`
- `POST` - הפעלת תוסף
- `DELETE` - כיבוי תוסף

### `/api/plugins/active`
- `GET` - רשימת תוספים פעילים לחנות/חברה

---

## דף ניהול תוספים

### `/settings/plugins`

דף ניהול מרקטפלייס עם:
- רשימת כל התוספים הזמינים
- חיפוש וסינון לפי קטגוריה
- מצב התקנה/הפעלה
- הגדרות לכל תוסף
- תצוגה מקדימה

---

## יישום התוספים הספציפיים

### 1. Google Analytics (Script Plugin)

```typescript
// יצירת תוסף
const googleAnalyticsPlugin = {
  name: "Google Analytics",
  slug: "google-analytics",
  type: "SCRIPT",
  category: "ANALYTICS",
  scriptContent: `
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
    
    ga('create', '{{TRACKING_ID}}', 'auto');
    ga('send', 'pageview');
  `,
  injectLocation: "HEAD",
  configSchema: {
    trackingId: { type: "string", required: true }
  }
}
```

### 2. Shop the Look (Script Plugin)

```typescript
// תוסף שדורש גם קומפוננטה React
const shopTheLookPlugin = {
  name: "Shop the Look",
  slug: "shop-the-look",
  type: "CORE", // דורש קומפוננטה React
  category: "MARKETING",
  // קומפוננטה: components/plugins/shop-the-look/ProductHotspots.tsx
}
```

### 3. Bundle Products (Core Plugin)

```typescript
// lib/plugins/core/bundle-products/index.ts
// (ראה דוגמה למעלה)
```

### 4. Cash on Delivery (Core Plugin)

```typescript
// lib/plugins/core/cash-on-delivery/index.ts
export const CashOnDeliveryPlugin: PluginHook = {
  onPaymentMethodAdd: async (methods) => {
    return [
      ...methods,
      {
        id: 'cash_on_delivery',
        name: 'תשלום במזומן',
        icon: '💵',
        enabled: true
      }
    ]
  },
  
  onPaymentProcess: async (order, method) => {
    if (method === 'cash_on_delivery') {
      // לא עושים כלום - התשלום יגיע במזומן
      return { success: true, paymentId: null }
    }
  }
}
```

### 5. Saturday Shutdown (Core Plugin)

```typescript
// lib/plugins/core/saturday-shutdown/index.ts
export const SaturdayShutdownPlugin: PluginHook = {
  onScheduleCheck: async (date) => {
    const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
    const isSaturday = dayOfWeek === 6
    
    // בדיקה אם זה שבת עברית (דורש חישוב תאריך עברי)
    // כאן נשתמש בספרייה כמו hebcal או נחשב ידנית
    
    return !isSaturday // מחזיר false אם זה שבת = האתר מכובה
  },
  
  onStorefrontRender: async (shop) => {
    const now = new Date()
    const isSaturday = now.getDay() === 6
    
    if (isSaturday) {
      return (
        <div className="saturday-shutdown">
          <h1>האתר סגור בשבת</h1>
          <p>נשמח לראותכם מחר!</p>
        </div>
      )
    }
    
    return null
  }
}
```

### 6. WhatsApp Floating Button (Script Plugin)

```typescript
const whatsappPlugin = {
  name: "WhatsApp Floating Button",
  slug: "whatsapp-floating",
  type: "SCRIPT",
  category: "COMMUNICATION",
  scriptContent: `
    (function() {
      const phone = '{{PHONE_NUMBER}}';
      const message = '{{DEFAULT_MESSAGE}}';
      const position = '{{POSITION}}'; // bottom-right, bottom-left
      
      const button = document.createElement('a');
      button.href = \`https://wa.me/\${phone}?text=\${encodeURIComponent(message)}\`;
      button.target = '_blank';
      button.className = 'whatsapp-float';
      button.innerHTML = '💬';
      button.style.cssText = \`
        position: fixed;
        \${position.includes('right') ? 'right' : 'left'}: 20px;
        bottom: 20px;
        width: 60px;
        height: 60px;
        background: #25D366;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        text-decoration: none;
      \`;
      
      document.body.appendChild(button);
    })();
  `,
  injectLocation: "BODY_END",
  configSchema: {
    phoneNumber: { type: "string", required: true },
    defaultMessage: { type: "string", default: "שלום, אני מעוניין במוצר" },
    position: { type: "enum", values: ["bottom-right", "bottom-left"], default: "bottom-right" }
  }
}
```

### 7. POS (Core Plugin)

```typescript
// lib/plugins/core/pos/index.ts
// תוסף מורכב שדורש:
// - דף POS נפרד
// - סריקת ברקודים
// - חיבור למדפסת
// - ניהול קופות
```

---

## שלבי יישום

### שלב 1: תשתית בסיסית
1. ✅ יצירת מודל Plugin ב-Prisma
2. ✅ Migration למסד הנתונים
3. ✅ API routes בסיסיים
4. ✅ דף ניהול תוספים

### שלב 2: Core Plugins
1. ✅ מערכת hooks/events
2. ✅ Registry ו-loader
3. ✅ יישום Bundle Products
4. ✅ יישום Cash on Delivery
5. ✅ יישום Saturday Shutdown
6. ✅ יישום POS (בשלב מאוחר יותר)

### שלב 3: Script Plugins
1. ✅ ScriptInjector component
2. ✅ יישום Google Analytics
3. ✅ יישום WhatsApp Button
4. ✅ יישום Shop the Look (אם צריך Core)

### שלב 4: שיפורים
1. ✅ תצוגה מקדימה לתוספים
2. ✅ בדיקת תאימות
3. ✅ עדכונים אוטומטיים
4. ✅ Analytics על שימוש בתוספים

---

## הערות חשובות

1. **אבטחה**: Script plugins יכולים להריץ קוד שרירותי - רק לתוספים מהימנים!
2. **ביצועים**: Script plugins נטענים בכל דף - לשמור על קוד קליל
3. **תאימות**: Core plugins צריכים להיות backward compatible
4. **תיעוד**: כל תוסף צריך תיעוד מפורט

---

## דוגמת שימוש

```typescript
// בדף storefront
import { PluginLoader } from '@/lib/plugins/loader'

// טעינת תוספים פעילים
const plugins = await PluginLoader.loadActive(shopId)

// הרצת hooks
for (const plugin of plugins) {
  if (plugin.hooks.onStorefrontRender) {
    const component = await plugin.hooks.onStorefrontRender(shop)
    if (component) {
      // הצגת קומפוננטה
    }
  }
}
```

---

## סיכום

ארכיטקטורה מקצועית וגמישה שמאפשרת:
- ✅ תוספים ברמת ליבה (Core)
- ✅ תוספים קלילים (Script)
- ✅ ניהול מרכזי
- ✅ הרחבה קלה
- ✅ תאימות לעתיד

