# חלוקת משימות לפיתוח במקביל

## 📋 סטטוס כללי
- ✅ Prisma Schema - הושלם
- ✅ API Routes בסיסיים - הושלם
- ✅ אשף יצירת חנות - הושלם

---

## 🎯 קבוצות משימות לעבודה במקביל

### קבוצה A: Admin Frontend - ניהול מוצרים
**משימות:**
1. ✅ מסך רשימת מוצרים (`/products`) - **בתהליך**
2. ⏳ מסך יצירת/עריכת מוצר (`/products/new`, `/products/[id]/edit`)
3. ⏳ API Routes - ProductOptions ו-ProductVariants

**קבצים:**
- `app/products/page.tsx`
- `app/products/new/page.tsx`
- `app/products/[id]/edit/page.tsx`
- `app/api/products/[id]/variants/route.ts`
- `app/api/products/[id]/options/route.ts`

---

### קבוצה B: Admin Frontend - ניהול הזמנות
**משימות:**
1. ⏳ מסך רשימת הזמנות (`/orders`)
2. ⏳ מסך פרטי הזמנה (`/orders/[id]`)

**קבצים:**
- `app/orders/page.tsx`
- `app/orders/[id]/page.tsx`

---

### קבוצה C: Admin Frontend - ניהול לקוחות
**משימות:**
1. ⏳ מסך רשימת לקוחות (`/customers`)
2. ⏳ מסך פרטי לקוח (`/customers/[id]`)

**קבצים:**
- `app/customers/page.tsx`
- `app/customers/[id]/page.tsx`

---

### קבוצה D: API Routes - תכונות נוספות
**משימות:**
1. ⏳ Collections API (`/api/collections`)
2. ⏳ Gift Cards API (`/api/gift-cards`)
3. ⏳ Coupons API (שיפורים)
4. ⏳ Webhooks API (`/api/webhooks`)
5. ⏳ Pages API (`/api/pages`)
6. ⏳ Navigation API (`/api/navigation`)
7. ⏳ Blog API (`/api/blogs`)
8. ⏳ Reviews API (`/api/reviews`)
9. ⏳ Returns API (`/api/returns`)

**קבצים:**
- `app/api/collections/route.ts`
- `app/api/gift-cards/route.ts`
- `app/api/webhooks/route.ts`
- וכו'...

---

### קבוצה E: Storefront API Routes
**משימות:**
1. ⏳ Storefront Info API (`/api/storefront/[slug]/info`)
2. ⏳ Storefront Products API (`/api/storefront/[slug]/products`)
3. ⏳ Storefront Cart API (`/api/storefront/[slug]/cart`)
4. ⏳ Storefront Customer Auth API (`/api/storefront/[slug]/auth/...`)
5. ⏳ Storefront Checkout API (`/api/storefront/[slug]/checkout`)

**קבצים:**
- `app/api/storefront/[slug]/info/route.ts`
- `app/api/storefront/[slug]/products/route.ts`
- `app/api/storefront/[slug]/cart/route.ts`
- וכו'...

---

### קבוצה F: Storefront Frontend
**משימות:**
1. ⏳ דף בית (`/shop/[slug]`)
2. ⏳ עמוד מוצר (`/shop/[slug]/products/[id]`)
3. ⏳ עגלת קניות (`/shop/[slug]/cart`)
4. ⏳ תהליך תשלום (`/shop/[slug]/checkout`)
5. ⏳ הרשמה והתחברות (`/shop/[slug]/register`, `/login`)
6. ⏳ חשבון לקוח (`/shop/[slug]/account`)

**קבצים:**
- `app/shop/[slug]/page.tsx`
- `app/shop/[slug]/products/[id]/page.tsx`
- `app/shop/[slug]/cart/page.tsx`image.png
- וכו'...

---

### קבוצה G: תכונות מתקדמות
**משימות:**
1. ⏳ מערכת הנחות ללקוחות רשומים - לוגיקה
2. ⏳ מערכת עגלות נטושות - זיהוי וניהול
3. ⏳ מערכת אירועים - יצירת אירועים בכל פעולה
4. ⏳ מערכת Webhooks - שליחה אוטומטית

**קבצים:**
- `lib/discounts.ts` - לוגיקת הנחות
- `lib/abandoned-carts.ts` - זיהוי עגלות נטושות
- `lib/events.ts` - יצירת אירועים
- `lib/webhooks.ts` - שליחת webhooks

---

## 🚀 סדר עדיפות מומלץ

### שלב 1 (עכשיו):
1. ✅ קבוצה A - מסך רשימת מוצרים
2. ⏳ קבוצה A - מסך יצירת/עריכת מוצר

### שלב 2 (במקביל):
1. קבוצה B - מסכי הזמנות
2. קבוצה C - מסכי לקוחות
3. קבוצה D - API Routes נוספים

### שלב 3 (במקביל):
1. קבוצה E - Storefront API Routes
2. קבוצה F - Storefront Frontend

### שלב 4:
1. קבוצה G - תכונות מתקדמות

---

## 📝 הערות
- כל קבוצה יכולה להיעשות במקביל על ידי מפתחים שונים
- API Routes צריכים להיות מוכנים לפני ה-Frontend
- Storefront API Routes צריכים להיות מוכנים לפני Storefront Frontend

