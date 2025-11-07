# הוראות יישום פיקסלים וקודי מעקב

## מה נוצר עד כה:

✅ **מודל DB** - TrackingPixel ב-Prisma Schema  
✅ **API Routes** - `/api/tracking-pixels` ו-`/api/tracking-pixels/[id]`  
✅ **מסך ניהול** - `/tracking-pixels`  
✅ **מסך יצירה** - `/tracking-pixels/new`  
✅ **סיידבר** - נוסף קישור "פיקסלים וקודי מעקב"  
✅ **לוגיקה** - `lib/tracking-pixels.ts` עם פונקציות לשליחת אירועים  
✅ **Provider** - `components/storefront/TrackingPixelProvider.tsx`  
✅ **Layout** - `app/shop/[slug]/layout.tsx` עוטף את כל העמודים  
✅ **Helper Functions** - `lib/tracking-events.ts` עם פונקציות עזר  

## מה שצריך להוסיף:

### 1. הוספת אירועים לעמוד המוצר (`app/shop/[slug]/products/[id]/page.tsx`)

```typescript
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackViewContent, trackSelectVariant, trackAddToCart, trackAddToWishlist } from "@/lib/tracking-events"

// בתוך הקומפוננטה:
const { trackEvent } = useTracking()

// אחרי טעינת המוצר:
useEffect(() => {
  if (product) {
    trackViewContent(trackEvent, {
      id: product.id,
      name: product.name,
      price: product.price,
      sku: product.sku || null,
    })
  }
}, [product])

// בבחירת וריאציה:
const handleVariantSelect = (variant: any) => {
  if (product) {
    trackSelectVariant(trackEvent, product, variant)
  }
}

// בהוספה לעגלה:
const handleAddToCart = () => {
  if (product) {
    trackAddToCart(trackEvent, product, quantity, selectedVariant)
  }
}

// בהוספה לרשימת משאלות:
const handleAddToWishlist = () => {
  if (product) {
    trackAddToWishlist(trackEvent, product)
  }
}
```

### 2. הוספת אירועים לעמוד עגלה (`app/shop/[slug]/cart/page.tsx`)

```typescript
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackViewCart, trackRemoveFromCart, trackInitiateCheckout } from "@/lib/tracking-events"

const { trackEvent } = useTracking()

// בטעינת העגלה:
useEffect(() => {
  if (cartItems && cartItems.length > 0) {
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    trackViewCart(trackEvent, cartItems, total)
  }
}, [cartItems])

// בהסרת פריט:
const handleRemoveItem = (item: any) => {
  trackRemoveFromCart(trackEvent, item, item.quantity)
}

// בלחיצה על "המשך לתשלום":
const handleCheckout = () => {
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  trackInitiateCheckout(trackEvent, cartItems, total)
}
```

### 3. הוספת אירועים לעמוד Checkout (`app/shop/[slug]/checkout/page.tsx`)

```typescript
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackAddPaymentInfo, trackPurchase } from "@/lib/tracking-events"

const { trackEvent } = useTracking()

// בהוספת פרטי תשלום:
const handlePaymentInfo = (paymentMethod: string) => {
  trackAddPaymentInfo(trackEvent, paymentMethod, total)
}

// בסיום רכישה:
const handlePurchaseComplete = (order: any) => {
  trackPurchase(trackEvent, {
    id: order.id,
    orderNumber: order.orderNumber,
    total: order.total,
    tax: order.tax,
    shipping: order.shipping,
    items: order.items,
  })
}
```

### 4. הוספת אירועים לעמוד חיפוש (`app/shop/[slug]/search/page.tsx`)

```typescript
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackSearch, trackPageView } from "@/lib/tracking-events"

const { trackEvent } = useTracking()

// בטעינת העמוד:
useEffect(() => {
  trackPageView(trackEvent, `/shop/${slug}/search`, "חיפוש")
}, [])

// בביצוע חיפוש:
const handleSearch = (query: string) => {
  trackSearch(trackEvent, query, results.length)
}
```

### 5. הוספת אירועים לעמוד הרשמה/התחברות

```typescript
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackSignUp, trackLogin } from "@/lib/tracking-events"

const { trackEvent } = useTracking()

// בהרשמה מוצלחת:
const handleSignUpSuccess = () => {
  trackSignUp(trackEvent, "email")
}

// בהתחברות מוצלחת:
const handleLoginSuccess = () => {
  trackLogin(trackEvent, "email")
}
```

### 6. הוספת PageView לכל העמודים

בכל עמוד, הוסף:

```typescript
import { useTracking } from "@/components/storefront/TrackingPixelProvider"
import { trackPageView } from "@/lib/tracking-events"

const { trackEvent } = useTracking()

useEffect(() => {
  trackPageView(trackEvent, window.location.pathname, document.title)
}, [])
```

## רשימת כל האירועים שצריך להוסיף:

### עמודים:
- ✅ דף בית - PageView (נוסף)
- ⏳ עמוד מוצר - PageView, ViewContent, SelectVariant, AddToCart, AddToWishlist
- ⏳ עמוד קטגוריה - PageView
- ⏳ עמוד Collection - PageView
- ⏳ עמוד חיפוש - PageView, Search
- ⏳ עמוד עגלה - PageView, ViewCart, RemoveFromCart, InitiateCheckout
- ⏳ עמוד Checkout - PageView, AddPaymentInfo, Purchase
- ⏳ עמוד חשבון לקוח - PageView
- ⏳ עמוד Wishlist - PageView, RemoveFromWishlist

### פעולות:
- ⏳ בחירת וריאציה - SelectVariant
- ⏳ הוספה לעגלה - AddToCart
- ⏳ הסרה מהעגלה - RemoveFromCart
- ⏳ הוספה לרשימת משאלות - AddToWishlist
- ⏳ הסרה מרשימת משאלות - RemoveFromWishlist
- ⏳ התחלת תשלום - InitiateCheckout
- ⏳ הוספת פרטי תשלום - AddPaymentInfo
- ⏳ רכישה הושלמה - Purchase
- ⏳ הרשמה - SignUp
- ⏳ התחברות - Login
- ⏳ חיפוש - Search

## הערות חשובות:

1. **כל העמודים בפרונט** כבר עטופים ב-`TrackingPixelProvider` דרך ה-layout
2. **הפיקסלים נטענים אוטומטית** כשהעמוד נטען
3. **האירועים נשלחים לכל הפיקסלים הפעילים** אוטומטית
4. **במצב פיתוח** האירועים נכתבים ל-console לצורך דיבוג

## בדיקה:

1. הוסף פיקסל דרך המסך `/tracking-pixels/new`
2. פתח את העמוד בפרונט
3. בדוק ב-console (בפיתוח) או ב-Facebook Events Manager / Google Analytics שהאירועים מגיעים

