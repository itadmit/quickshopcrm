# מערכת עגלת קניות - תיעוד מלא

## ✅ סטטוס: מערכת אחידה ומרכזית

המערכת עברה רפקטורינג מלא והיא עכשיו **אחידה ומרכזית** בדיוק כמו בשופיפיי.

---

## 📁 ארכיטקטורה

### קבצי Core (ליבה)

#### 1. **`lib/cart-server.ts`** - הלב של המערכת 🎯
הקובץ המרכזי שכל הקוד משתמש בו.

**פונקציות:**
- `findCart(shopId, sessionId, customerId)` - **פונקציה מרכזית** למציאת עגלה
  - סדר עדיפויות:
    1. אם יש `customerId` - מחפש customer cart
    2. אם יש `sessionId` - מחפש session cart
    3. Fallback - מחפש כל עגלה פעילה של החנות
  - **מיזוג אוטומטי**: ממזג session cart ל-customer cart כשמשתמש מתחבר
  
- `isCartEmpty(cart)` - בודק אם העגלה ריקה
- `hasValidCart(cart)` - Type guard לבדיקת תקינות

#### 2. **`lib/cart-calculations.ts`** - חישובי מחירים
- חישוב subtotal, tax, shipping, discounts
- תמיכה בהנחות: customer, coupon, automatic
- Server-side validation (לא סומכים על הלקוח!)

#### 3. **`hooks/useCart.ts`** - Client-side hook
- React Query integration
- פונקציות: `addItem`, `updateItem`, `removeItem`, `applyCoupon`, `removeCoupon`
- **חשוב**: כל הבקשות עם `credentials: 'include'` לשליחת cookies

#### 4. **`hooks/useAddToCart.ts`** - 🎯 המערכת המרכזית היחידה להוספה לעגלה
- **המערכת היחידה** שצריך להשתמש בה בכל מקום!
- בודקת מלאי אוטומטית (אם יש `productData`)
- מטפלת בשגיאות
- מעדכנת UI
- פשוטה וקלה לשימוש

**שימוש:**
```tsx
const { addToCart, isAddingToCart } = useAddToCart({ slug, customerId })

await addToCart({
  productId: 'xxx',
  variantId: 'yyy', // אופציונלי
  quantity: 1,
  productName: 'שם המוצר',
  productData: { // אופציונלי - לבדיקת מלאי
    availability: 'IN_STOCK',
    inventoryQty: 10,
    variants: [{ id: 'yyy', inventoryQty: 5 }]
  }
})
```

---

## 🔐 מנגנון Authentication & Session

### Cookies
1. **`cart_session`** - מזהה סשן עגלה
   - נוצר אוטומטית בהוספה ראשונה לעגלה
   - תוקף: 30 יום
   - httpOnly: true, sameSite: "lax"

2. **`storefront_customer_{slug}`** - נתוני לקוח מחובר
   - נשמר אחרי login/register
   - מכיל: id, email, firstName, lastName, phone

### חשיבות ה-credentials: 'include'
**חובה** להוסיף בכל בקשת fetch:
```javascript
fetch('/api/storefront/[slug]/cart', {
  credentials: 'include', // שולח cookies!
  headers: { ... }
})
```

---

## 🛣️ API Routes

### מערכת אחידה - כולם משתמשים ב-`findCart()`

#### 1. **`/api/storefront/[slug]/cart`**
- **GET** - קבלת עגלה
- **POST** - הוספת מוצר
- **PUT** - עדכון כמות או קופון
- **DELETE** - הסרת מוצר

#### 2. **`/api/storefront/[slug]/cart/count`**
- **GET** - מספר פריטים בעגלה (לתצוגה בHeader)

#### 3. **`/api/storefront/[slug]/checkout`**
- **POST** - יצירת הזמנה
- ✅ משתמש ב-`findCart()` - אחיד!

---

## 📄 Pages & Components

### Pages שמשתמשים בעגלה:

#### ✅ `/app/shop/[slug]/cart/page.tsx` - עמוד עגלה
- משתמש ב-fetch ישיר (לא useCart)
- ✅ כל הבקשות עם `credentials: 'include'`
- תמיכה בקופונים

#### ✅ `/app/shop/[slug]/checkout/page.tsx` - עמוד checkout (Server)
- ✅ משתמש ב-`findCart()` מ-cart-server.ts
- אחראי על טעינת עגלה בצד השרת

#### ✅ `/app/shop/[slug]/checkout/CheckoutForm.tsx` - טופס checkout (Client)
- ✅ בקשת checkout עם `credentials: 'include'`
- תמיכה בקופונים
- login/register modals

### Components:

#### ✅ `components/storefront/SlideOutCart.tsx` - עגלה צדדית
- משתמש ב-`useCart` hook
- תמיכה מלאה בקופונים: applyCoupon, removeCoupon
- UI להצגת קופון פעיל

#### ✅ `components/storefront/AddToCartButton.tsx`
- משתמש ב-`useAddToCart`

#### ✅ `components/storefront/CheckoutHeader.tsx`
- Header פשוט לדף checkout
- לוגו במרכז, "חזרה לחנות" בצד

---

## 🎫 מערכת קופונים

### אחידה בכל המערכת!

#### Client-side (useCart):
```javascript
const { applyCoupon, removeCoupon } = useCart(slug, customerId)
await applyCoupon('WELCOME10')
await removeCoupon()
```

#### Server-side:
- `/api/storefront/[slug]/cart` - PUT עם `{ couponCode: 'WELCOME10' }`
- `/api/storefront/[slug]/checkout` - POST עם `{ couponCode: 'WELCOME10' }`
- הכל עובר דרך `cart-calculations.ts` שמאמת ומחשב הנחה

#### UI:
- **SlideOutCart**: קופון מוצג בתור badge ירוק עם אפשרות להסרה
- **CheckoutForm**: קופון מוצג בתור badge ירוק עם אפשרות להסרה
- **CartPage**: input לקוד קופון + badge להצגה

---

## 🔄 Flow דוגמה - הוספת מוצר לעגלה

```
1. לקוח לוחץ "הוסף לעגלה"
   ↓
2. useAddToCart.addToCart() - המערכת המרכזית! 🎯
   - בודקת מלאי (אם יש productData)
   - מטפלת בשגיאות
   ↓
3. useCart.addItem() - React Query mutation
   ↓
4. POST /api/storefront/[slug]/cart
   - credentials: 'include' ✅
   - שולח: productId, variantId (או undefined), quantity
   ↓
5. Server:
   - קורא cookies → cart_session
   - findCart(shopId, sessionId, customerId) ✅
   - אם אין עגלה → יוצר חדשה
   - אם יש → מוסיף/מעדכן כמות
   - שומר cookie חדש אם צריך
   ↓
6. calculateCart() - חישוב מחדש של כל המחירים
   ↓
7. החזרת עגלה מעודכנת
   ↓
8. React Query מעדכן את ה-cache אוטומטית
   ↓
9. useAddToCart מעדכן UI (toast/עגלה)
   ↓
10. הכל עובד! ✅
```

---

## 🔄 Flow דוגמה - Checkout

```
1. לקוח ב-/cart לוחץ "המשך לתשלום"
   ↓
2. redirect → /checkout
   ↓
3. Server-side (page.tsx):
   - findCart(shopId, sessionId, customerId) ✅
   - calculateCart() - וולידציה מלאה
   - אם אין עגלה → redirect לחנות
   ↓
4. CheckoutForm (client):
   - מציג עגלה + טופס
   - לקוח ממלא פרטים
   - login/register modals (לא יוצא מהעמוד!)
   ↓
5. לקוח לוחץ "מעבר לתשלום"
   ↓
6. POST /api/storefront/[slug]/checkout
   - credentials: 'include' ✅
   - שולח כל פרטי הזמנה (עם null/undefined טיפול)
   ↓
7. Server:
   - findCart() ✅ - מוצא עגלה
   - בודק קיום variants בדאטאבייס לפני יצירת orderItems
   - calculateCart() - וולידציה מחדש!
   - עיגול כל הסכומים ל-2 ספרות אחרי נקודה
   - יוצר הזמנה עם customFields (JSON)
   - מעדכן מלאי
   - יוצר payment link (PayPlus/PayPal) עם סכום מעוגל
   - שולח מייל
   ↓
8. redirect לעמוד אישור / payment gateway
```

### תיקונים ב-Checkout:

#### ✅ טיפול ב-Variants
- בודק קיום variant בדאטאבייס לפני יצירת orderItems
- לא שולח variantId אם הוא לא קיים (מונע foreign key errors)

#### ✅ עיגול סכומים
- כל הסכומים מעוגלים ל-2 ספרות אחרי נקודה
- PayPlus/PayPal מקבלים סכומים תקינים

#### ✅ טיפול ב-Null Values
- כל השדות האופציונליים מטפלים ב-null/undefined
- Schema תומך ב-`.nullable().optional()`

#### ✅ Login/Register Modals
- לא יוצאים מהעמוד checkout
- התחברות אוטומטית אחרי הרשמה

---

## ⚠️ חוקים חשובים

### 1. אל תיצור עגלות ישירות!
❌ **לא לעשות:**
```javascript
const cart = await prisma.cart.findFirst({ where: { sessionId } })
```

✅ **תמיד להשתמש:**
```javascript
import { findCart } from '@/lib/cart-server'
const cart = await findCart(shopId, sessionId, customerId)
```

### 2. תמיד credentials: 'include'
❌ **לא לעשות:**
```javascript
fetch('/api/storefront/[slug]/cart')
```

✅ **תמיד:**
```javascript
fetch('/api/storefront/[slug]/cart', {
  credentials: 'include'
})
```

### 3. Server-side validation
❌ **לא לעשות:**
```javascript
// שימוש במחירים שהלקוח שלח
const total = req.body.total
```

✅ **תמיד:**
```javascript
// חישוב מחדש בשרת!
const calculation = await calculateCart(...)
const total = calculation.total
```

### 4. קופונים - דרך המערכת המרכזית
❌ **לא לעשות:**
```javascript
await prisma.cart.update({
  where: { id },
  data: { couponCode: 'WELCOME10' }
})
```

✅ **תמיד:**
```javascript
// דרך ה-API שמאמת ומחשב
await fetch('/api/storefront/[slug]/cart', {
  method: 'PUT',
  credentials: 'include',
  body: JSON.stringify({ couponCode: 'WELCOME10' })
})
```

### 5. הוספה לעגלה - תמיד דרך useAddToCart!
❌ **לא לעשות:**
```javascript
// קוד כפול מקומי
const handleAddToCart = async () => {
  // בדיקת מלאי...
  // fetch ישיר...
  // טיפול בשגיאות...
}
```

✅ **תמיד:**
```javascript
// המערכת המרכזית היחידה!
const { addToCart } = useAddToCart({ slug, customerId })
await addToCart({ productId, variantId, quantity, productName })
```

### 6. Variants - רק אם קיימים בדאטאבייס
❌ **לא לעשות:**
```javascript
// שולח variantId גם אם הוא לא קיים
variantId: item.variantId || null
```

✅ **תמיד:**
```javascript
// בודק אם variant קיים לפני שליחה
if (item.variantId && existingVariants.has(item.variantId)) {
  orderItem.variantId = item.variantId
}
```

### 7. עיגול סכומים ל-PayPlus/PayPal
❌ **לא לעשות:**
```javascript
amount: order.total // יכול להיות 190.9476 ❌
```

✅ **תמיד:**
```javascript
amount: Math.round(order.total * 100) / 100 // 190.95 ✅
```

---

## 📊 סיכום קבצים

### ✅ משתמשים ב-findCart() (אחיד!):
- ✅ `lib/cart-server.ts` - המקור
- ✅ `app/api/storefront/[slug]/cart/route.ts`
- ✅ `app/api/storefront/[slug]/cart/count/route.ts`
- ✅ `app/api/storefront/[slug]/checkout/route.ts`
- ✅ `app/shop/[slug]/checkout/page.tsx`

### ✅ משתמשים ב-useCart() (Client):
- ✅ `hooks/useCart.ts` - המקור (React Query)
- ✅ `hooks/useAddToCart.ts` - 🎯 המערכת המרכזית היחידה!
- ✅ `components/storefront/SlideOutCart.tsx`
- ✅ `components/storefront/AddToCartButton.tsx`
- ✅ `components/storefront/StorefrontHeader.tsx`
- ✅ `app/shop/[slug]/products/[id]/page.tsx` - עבר ל-useAddToCart!

### ✅ משתמשים ב-useAddToCart() (המערכת המרכזית):
- ✅ `hooks/useAddToCart.ts` - המקור
- ✅ `app/shop/[slug]/products/[id]/page.tsx` - עמוד מוצר
- ✅ `app/shop/[slug]/pages/[id]/page.tsx` - דפים
- ✅ כל מקום שצריך להוסיף לעגלה!

### ✅ משתמשים ב-fetch ישיר עם credentials:
- ✅ `app/shop/[slug]/cart/page.tsx`
- ✅ `app/shop/[slug]/checkout/CheckoutForm.tsx`

### 📦 קבצים נוספים (לא צריכים שינוי):
- `lib/abandoned-carts.ts` - שימוש ישיר ב-prisma (תנאים מיוחדים)
- `lib/cart-calculations.ts` - חישובים בלבד
- `components/skeletons/CartSkeleton.tsx` - UI בלבד
- `components/skeletons/CheckoutSkeleton.tsx` - UI בלבד
- `components/storefront/CheckoutHeader.tsx` - Header בלבד

---

## 🎯 מטרות שהושגו

✅ **אחידות מלאה** - קוד אחד לכל המערכת  
✅ **בדיוק כמו שופיפיי** - חוויה חלקה ואמינה  
✅ **אין כפילות קוד** - פונקציה אחת `findCart()` + `useAddToCart()`  
✅ **מיזוג אוטומטי** - session cart ↔ customer cart  
✅ **Fallback חכם** - למקרה בעיות cookies  
✅ **Server-side validation** - אבטחה מקסימלית  
✅ **קופונים אחידים** - עובדים בכל מקום  
✅ **מערכת מרכזית אחת** - `useAddToCart` עושה הכל!  
✅ **תמיכה ב-variants** - בודקת קיום variant לפני שליחה  
✅ **עיגול סכומים** - PayPlus/PayPal מקבלים 2 ספרות אחרי נקודה  
✅ **טיפול ב-null** - כל השדות האופציונליים מטפלים ב-null/undefined  

---

## 🚀 מה הלאה?

המערכת מוכנה לשימוש! אם צריך להוסיף פיצ'רים נוספים:

1. **תמיד** להשתמש ב-`useAddToCart()` להוספה לעגלה
2. **תמיד** להשתמש ב-`findCart()` מ-`lib/cart-server.ts` בשרת
3. **תמיד** להוסיף `credentials: 'include'` בבקשות
4. **תמיד** לעשות server-side validation עם `calculateCart()`
5. **תמיד** לעגל סכומים ל-2 ספרות אחרי נקודה ל-PayPlus/PayPal
6. **תמיד** לבדוק קיום variant לפני שליחה ל-order
7. **תמיד** לעדכן את הדוקומנטציה הזו

---

## 📝 שינויים אחרונים

### גרסה 3.0 (נובמבר 2025) - Unified AddToCart System
- ✅ שיפור `useAddToCart` להיות המערכת המרכזית היחידה
- ✅ החלפת כל הקוד הכפול בעמוד המוצר
- ✅ הוספת בדיקת מלאי אוטומטית ב-`useAddToCart`
- ✅ תיקון בעיות variants - בודק קיום variant לפני שליחה
- ✅ תיקון foreign key constraints - לא שולח variantId אם לא קיים
- ✅ עיגול סכומים ל-PayPlus/PayPal (2 ספרות אחרי נקודה)
- ✅ טיפול ב-null values ב-checkout schema
- ✅ הוספת `customFields` ל-Order schema (לשדות מותאמים אישית)

### גרסה 2.0 (נובמבר 2025) - Unified Cart System
- ✅ יצירת `lib/cart-server.ts` עם `findCart()` מרכזי
- ✅ אחידות בכל ה-API routes
- ✅ מיזוג אוטומטי של עגלות
- ✅ Fallback חכם למקרה בעיות cookies

---

**תאריך עדכון אחרון:** נובמבר 2025  
**גרסה:** 3.0 (Unified AddToCart System)

