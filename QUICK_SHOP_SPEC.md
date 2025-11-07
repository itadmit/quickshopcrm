# אפיון מערכת Quick Shop
## מערכת ליצירה וניהול חנויות אונליין

---

## 📋 תוכן עניינים
1. [סקירה כללית](#סקירה-כללית)
2. [זרימת משתמשים](#זרימת-משתמשים)
3. [מערכת מנויים ותקופת נסיון](#מערכת-מנויים-ותקופת-נסיון)
4. [תכונות עיקריות](#תכונות-עיקריות)
5. [פרונט החנות (Storefront)](#פרונט-החנות-storefront)
6. [מערכת לקוחות והרשמה](#מערכת-לקוחות-והרשמה)
7. [מערכת אירועים ואוטומציות](#מערכת-אירועים-ואוטומציות)
8. [מבנה דאטאבייס](#מבנה-דאטאבייס)
9. [עיצוב ונראות](#עיצוב-ונראות)
10. [תהליכים מרכזיים](#תהליכים-מרכזיים)
11. [מסכים מפורטים](#מסכים-מפורטים)

---

## 🎯 סקירה כללית

### מטרת המערכת
Quick Shop היא פלטפורמה ליצירה וניהול חנויות אונליין, המתחרה בשופיפיי. המערכת מאפשרת למשתמשים ליצור חנות מקצועית תוך דקות, לנהל מוצרים, הזמנות, לקוחות ותשלומים.

### עקרונות עיצוב
- **פשטות**: תהליך יצירת חנות מהיר ואינטואיטיבי
- **מקצועיות**: עיצוב מודרני ונקי
- **גמישות**: אפשרות להתאמה אישית מלאה
- **יעילות**: ניהול קל ונוח
- **השראת שופיפיי**: UI/UX דומה ככל האפשר

### קהל יעד
- בעלי עסקים קטנים ובינוניים
- יזמים שרוצים למכור אונליין
- בעלי חנויות פיזיות שרוצים להרחיב לאונליין

---

## 👤 זרימת משתמשים

### 1. הרשמה והתחברות
- **הרשמה**: שם, אימייל, סיסמה, שם החברה
- **התחברות**: אימייל וסיסמה
- **אימות**: NextAuth עם JWT

### 2. אשף יצירת חנות (Onboarding Wizard)
**לאחר הרשמה ראשונה, המשתמש מועבר אוטומטית לאשף יצירת חנות:**

#### שלב 1: פרטי החנות הבסיסיים
- שם החנות (Store Name) - **חובה**
- תיאור קצר (Description) - **חובה**
- קטגוריה ראשית (Category) - **חובה**
- לוגו החנות (אופציונלי - ניתן לדלג)

#### שלב 2: פרטי יצירת קשר
- כתובת אימייל עסקית - **חובה**
- מספר טלפון - **חובה**
- כתובת פיזית (אופציונלי)
- שעות פעילות (אופציונלי)

#### שלב 3: הגדרות תשלום
- בחירת שיטת תשלום:
  - אשראי (Stripe/PayPlus)
  - העברה בנקאית
  - מזומן בהזמנה
- הגדרת מטבע (ILS, USD, EUR) - **ברירת מחדל: ILS**
- הגדרת מע"מ (כן/לא + אחוז) - **ברירת מחדל: כן, 18%**

#### שלב 4: הגדרות משלוח
- האם החנות מוכרת משלוחים? (כן/לא)
- אם כן:
  - עלויות משלוח (קבוע/לפי משקל/חינם מעל סכום)
  - אזורי משלוח
  - זמן משלוח משוער

#### שלב 5: עיצוב ראשוני
- בחירת תבנית עיצוב (Theme)
- בחירת צבעים ראשיים
- תצוגה מקדימה

#### שלב 6: סיום
- "החנות שלך מוכנה!"
- כפתור "פתח את החנות" (פותח בטאב חדש)
- כפתור "עבור לדשבורד"

**הערות:**
- ניתן לדלג על שלבים (למעט שלב 1 - פרטי בסיס)
- ניתן לחזור לשלבים קודמים
- ניתן לסגור ולחזור מאוחר יותר (החנות תישמר כטיוטה)
- **אירוע נוצר**: `shop.created` עם פרטי החנות

### 3. דשבורד ראשי
לאחר יצירת החנות, המשתמש מגיע לדשבורד עם:
- סטטיסטיקות מהירות (הזמנות, הכנסות, מוצרים)
- פעולות מהירות
- התראות

---

## 💳 מערכת מנויים ותקופת נסיון

### סקירה כללית
כל משתמש שנרשם למערכת מקבל **7 ימי נסיון חינם**. לאחר תקופת הנסיון, המשתמש צריך לבחור מסלול מנוי ולהזין פרטי אשראי (PayPal) כדי להמשיך להשתמש במערכת.

### תקופת נסיון (7 ימים)

#### מה קורה בהרשמה?
1. משתמש נרשם למערכת (יצירת Company)
2. **אוטומטית נוצר Subscription** עם:
   - `plan = TRIAL`
   - `status = TRIAL`
   - `trialStartDate = now()`
   - `trialEndDate = now() + 7 days`
3. המשתמש מקבל גישה מלאה לכל התכונות במהלך תקופת הנסיון

#### התראות במהלך תקופת הנסיון
- **3 ימים לפני סיום**: התראה בדשבורד + אימייל
- **יום לפני סיום**: התראה נוספת
- **ביום הסיום**: התראה בולטת + חסימת גישה (או הגבלה) עד תשלום

#### מה קורה בסיום תקופת הנסיון?
1. המערכת בודקת אם יש מנוי פעיל
2. אם אין מנוי פעיל:
   - `status` משתנה ל-`EXPIRED`
   - המשתמש מועבר למסך בחירת מסלול
   - גישה מוגבלת (או חסומה) עד תשלום

### מסלולי מנוי

#### מסלול 1: תדמית (BRANDING)
**מחיר: 299₪ לחודש (כולל מעמ)**

**תכונות:**
- ✅ בניית אתר תדמיתי
- ✅ דפים סטטיים (אודות, צור קשר, וכו')
- ✅ בלוג
- ✅ תפריט ניווט
- ✅ עיצוב מותאם אישית
- ❌ **ללא** חנות אונליין
- ❌ **ללא** עגלת קניות
- ❌ **ללא** צ'ק אאוט
- ❌ **ללא** קבלת תשלומים
- ❌ **ללא** ניהול מוצרים
- ❌ **ללא** ניהול הזמנות

**הגבלות:**
- רק חנות אחת
- ללא תכונות מסחר

#### מסלול 2: קוויק שופ (QUICK_SHOP)
**מחיר: 399₪ לחודש + מעמ 18% + 0.5% מכל עסקה**

**תכונות:**
- ✅ כל התכונות של מסלול תדמית
- ✅ חנות אונליין מלאה
- ✅ עגלת קניות
- ✅ צ'ק אאוט
- ✅ קבלת תשלומים (PayPlus)
- ✅ ניהול מוצרים
- ✅ ניהול הזמנות
- ✅ ניהול לקוחות
- ✅ ניהול מלאי
- ✅ קופונים והנחות
- ✅ כרטיסי מתנה
- ✅ עגלות נטושות
- ✅ אנליטיקה
- ✅ Webhooks
- ✅ כל התכונות הזמינות במערכת

**תשלומים:**
- תשלום חודשי: 399₪ + מעמ 18% = **470.82₪ לחודש**
- עמלת עסקה: 0.5% מכל הזמנה (נגבה אוטומטית)

### תהליך רכישת מנוי

#### שלב 1: בחירת מסלול
- המשתמש בוחר מסלול (תדמית / קוויק שופ)
- רואה סיכום מחיר
- לוחץ "המשך לתשלום"

#### שלב 2: הזנת פרטי תשלום
- מעבר ל-PayPlus
- הזנת פרטי אשראי
- אישור תשלום

#### שלב 3: הפעלת מנוי
- PayPlus מחזיר `transaction_id` או `subscription_id`
- המערכת מעדכנת:
  - `plan` = BRANDING או QUICK_SHOP
  - `status` = ACTIVE
  - `subscriptionStartDate` = now()
  - `subscriptionEndDate` = now() + 1 month
  - `nextBillingDate` = now() + 1 month
  - `paymentMethod` = "PayPlus"
  - `paymentDetails` = { transactionId, subscriptionId, ... }
  - `monthlyPrice` = 299 או 399
  - `transactionFee` = 0.5 (רק ל-QUICK_SHOP)
  - `taxRate` = 18

### חידוש מנוי אוטומטי
- PayPlus מחדש את המנוי אוטומטית כל חודש (או תשלום חוזר)
- המערכת מקבלת webhook מ-PayPlus
- מעדכנת:
  - `lastPaymentDate` = now()
  - `lastPaymentAmount` = 299 או 470.82
  - `subscriptionEndDate` = now() + 1 month
  - `nextBillingDate` = now() + 1 month

### ביטול מנוי
- המשתמש יכול לבטל מנוי בכל עת
- המערכת מעדכנת:
  - `status` = CANCELLED
  - `cancelledAt` = now()
  - `cancellationReason` = (אם מוזן)
- המנוי נשאר פעיל עד סיום התקופה ששולמה
- לאחר מכן הגישה נחסמת

### הגבלות לפי מסלול

#### במסלול תדמית:
- לא ניתן ליצור הזמנות
- לא ניתן להוסיף מוצרים (או מוגבל)
- לא ניתן להגדיר תשלומים
- לא ניתן להגדיר משלוחים
- לא ניתן לגשת לדפי ניהול הזמנות/מוצרים

#### במסלול קוויק שופ:
- גישה מלאה לכל התכונות
- עמלת עסקה של 0.5% נגבת אוטומטית מכל הזמנה

### מסך ניהול מנוי
**מיקום**: `/settings?tab=subscription` או `/settings/subscription`

**תוכן המסך:**
- סטטוס מנוי נוכחי (TRIAL / ACTIVE / EXPIRED)
- מסלול נוכחי
- תאריך סיום תקופת נסיון (אם בטריאל)
- תאריך חידוש מנוי (אם פעיל)
- כפתור "שדרג מנוי" (אם בתדמית)
- כפתור "בטל מנוי" (אם פעיל)
- היסטוריית תשלומים
- פרטי תשלום (PayPal)

### אירועים הקשורים למנוי
- `subscription.trial_started` - תקופת נסיון התחילה
- `subscription.trial_expiring` - תקופת נסיון מסתיימת בקרוב (3 ימים)
- `subscription.trial_expired` - תקופת נסיון הסתיימה
- `subscription.activated` - מנוי הופעל
- `subscription.renewed` - מנוי חודש
- `subscription.cancelled` - מנוי בוטל
- `subscription.payment_failed` - תשלום נכשל

---

## 🛍️ תכונות עיקריות

### 1. ניהול חנות (Store Management)

#### הגדרות חנות
- פרטי חנות בסיסיים (שם, תיאור, לוגו)
- פרטי יצירת קשר
- הגדרות SEO (meta tags, keywords)
- דומיין מותאם אישית (אופציונלי)
- הגדרות שפה (עברית/אנגלית/ערבית)
- הגדרות מטבע ומע"מ

#### עיצוב חנות (Theme Customization)
- בחירת תבנית עיצוב
- התאמת צבעים:
  - צבע ראשי (Primary)
  - צבע משני (Secondary)
  - צבע רקע
  - צבע טקסט
- התאמת פונטים (ראה [פונטים](#פונטים))
- תצוגה מקדימה בזמן אמת

#### הגדרות תשלום
- שיטות תשלום:
  - כרטיסי אשראי (Stripe/PayPlus)
  - העברה בנקאית
  - מזומן בהזמנה
  - תשלומים בתשלומים (אופציונלי)
- הגדרות מע"מ
- הגדרות הנחות וקופונים

#### הגדרות משלוח
- עלויות משלוח:
  - חינם
  - קבוע
  - לפי משקל
  - לפי מחיר
  - חינם מעל סכום מסוים
- אזורי משלוח
- זמן משלוח משוער
- שירותי משלוח (דואר ישראל, שליח, וכו')

### 2. ניהול מוצרים (Products)

#### מסך רשימת מוצרים (`/products`)
**מבנה המסך:**
- **כותרת עליונה:**
  - כותרת "מוצרים"
  - כפתור "+ מוצר חדש" (גרדיאנט סגול)
  - כפתור "ייבוא" (outline)
  - כפתור "ייצוא" (outline)

- **סרגל חיפוש וסינון:**
  - שדה חיפוש (חיפוש לפי שם, SKU)
  - סינון לפי סטטוס (כל המוצרים / פורסם / טיוטה / ארכיון)
  - סינון לפי קטגוריה
  - סינון לפי תגיות
  - מיון (שם, תאריך, מחיר, מלאי)

- **טבלת מוצרים:**
  - עמודות:
    - תמונה (thumbnail קטן)
    - שם מוצר (קישור לעריכה)
    - SKU
    - קטגוריה
    - מחיר
    - מלאי
    - סטטוס (badge צבעוני)
    - תאריך עדכון
    - תפריט פעולות (3 נקודות) - עריכה, שכפול, מחיקה, ארכיון

- **תצוגה:**
  - אפשרות לעבור בין תצוגת טבלה לתצוגת כרטיסים (grid)
  - pagination בתחתית

#### מסך יצירת/עריכת מוצר (`/products/new` או `/products/[id]/edit`)
**מבנה המסך - בהשראת שופיפיי:**

**מבנה כללי:**
- עמודה שמאלית (70%): טופס עריכה
- עמודה ימנית (30%): תצוגה מקדימה + פעולות

**עמודה שמאלית - טופס:**

**1. פרטי בסיס (תמיד גלוי)**
- שם מוצר - **חובה** (input גדול)
- תיאור (Rich Text Editor עם toolbar):
  - Bold, Italic, Underline
  - רשימות (numbered, bulleted)
  - קישורים
  - תמונות
  - וידאו (אופציונלי)

**2. תמונות (תמיד גלוי)**
- אזור גרירה ושחרור (Drag & Drop)
- או כפתור "הוסף תמונות"
- תמונה ראשית (תמיד הראשונה ברשימה)
- אפשרות לסדר מחדש (drag & drop)
- אפשרות להסיר תמונה
- תצוגה: grid של thumbnails
- **הגבלה**: עד 10 תמונות

**3. מחיר (תמיד גלוי)**
- מחיר - **חובה** (input עם סימן ₪)
- מחיר מוזל (compare at price) - אופציונלי
  - אם מוזן, יוצג מחיר מוזל עם קו חוצה
- עלות (cost per item) - אופציונלי (לשימוש פנימי)

**4. מלאי (תמיד גלוי)**
- Toggle: "נהל מלאי עבור מוצר זה"
- אם מופעל:
  - כמות במלאי (input)
  - SKU (input) - אופציונלי
  - Barcode (input) - אופציונלי
  - התראה על מלאי נמוך (toggle + input לכמות)
- אם לא מופעל:
  - אפשרות הזמנה ללא מלאי (checkbox)

**5. וריאציות (Variants) - סקשן מתקפל**
- Toggle: "מוצר זה יש לו אפשרויות, כמו גודל או צבע"
- אם מופעל:
  - **אפשרויות (Options):**
    - אפשרות 1: שם (למשל "גודל")
      - ערכים: S, M, L, XL (ניתן להוסיף/למחוק)
    - אפשרות 2: שם (למשל "צבע")
      - ערכים: אדום, כחול, ירוק (ניתן להוסיף/למחוק)
    - אפשרות 3: שם (אופציונלי)
      - ערכים (ניתן להוסיף/למחוק)
  
  - **טבלת וריאציות (נוצרת אוטומטית):**
    - כל שילוב של אפשרויות יוצר וריאציה
    - עמודות:
      - שם וריאציה (אוטומטי, ניתן לערוך)
      - מחיר (אם שונה מהמוצר)
      - מחיר מוזל
      - עלות
      - SKU
      - Barcode
      - משקל (למשלוח)
      - מלאי
      - תמונה (אופציונלי - לכל וריאציה)
    - אפשרות למחוק וריאציה
    - אפשרות לשכפל וריאציה

**6. משלוח (Shipping) - סקשן מתקפל**
- משקל (לחישוב משלוח)
- האם דורש משלוח? (checkbox)
- אם לא, checkbox: "זהו מוצר דיגיטלי או שירות"

**7. SEO - סקשן מתקפל**
- Page title (אופציונלי - אם לא מוזן, משתמש בשם המוצר)
- Meta description (אופציונלי)
- URL handle (אופציונלי - אם לא מוזן, נוצר אוטומטית מ-slug)

**8. קטגוריות ותגיות - סקשן מתקפל**
- קטגוריות:
  - בחירה מרשימה (multi-select עם search)
  - אפשרות ליצור קטגוריה חדשה
- תגיות:
  - input עם autocomplete
  - תגיות קיימות מוצגות כ-chips
  - אפשרות להסיר תגית

**עמודה ימנית - תצוגה מקדימה + פעולות:**

**1. תצוגה מקדימה:**
- כרטיס מוצר כפי שיופיע בחנות
- תמונה ראשית
- שם מוצר
- מחיר (עם מחיר מוזל אם קיים)
- כפתור "הוסף לעגלה"
- עדכון בזמן אמת בעת עריכה

**2. סטטוס:**
- Dropdown: טיוטה / פורסם / ארכיון
- תאריך פרסום (אם פורסם)

**3. פעולות:**
- כפתור "שמור" (גרדיאנט סגול)
- כפתור "שמור וצפה בחנות" (outline)
- כפתור "מחק מוצר" (טקסט אדום)

**4. מידע נוסף:**
- תאריך יצירה
- תאריך עדכון אחרון
- מספר הזמנות (אם יש)

**התנהגויות:**
- שמירה אוטומטית כל 30 שניות (auto-save)
- התראה לפני יציאה אם יש שינויים לא שמורים
- וולידציה לפני שמירה (שם מוצר חובה, מחיר חובה)
- **אירוע נוצר**: `product.created` או `product.updated`

#### ניהול מוצרים - פעולות נוספות
- שכפול מוצר (duplicate)
- מחיקת מוצר (soft delete - מעבר לארכיון)
- ייבוא מוצרים (CSV)
- ייצוא מוצרים (CSV)
- מחיקה קבועה (hard delete)

### 3. ניהול הזמנות (Orders)

#### מסך רשימת הזמנות (`/orders`)
**מבנה המסך:**
- **כותרת עליונה:**
  - כותרת "הזמנות"
  - סינון מהיר (כל ההזמנות / ממתינות / בתהליך / נשלחו / הושלמו)

- **סרגל חיפוש וסינון:**
  - חיפוש לפי מספר הזמנה / שם לקוח / אימייל
  - סינון לפי:
    - סטטוס הזמנה
    - סטטוס תשלום
    - סטטוס משלוח
    - תאריך (טווח תאריכים)
    - סכום (מינימום/מקסימום)
  - מיון (תאריך, סכום, סטטוס)

- **טבלת הזמנות:**
  - עמודות:
    - מספר הזמנה (קישור לפרטי הזמנה)
    - תאריך
    - לקוח (שם + אימייל)
    - סטטוס הזמנה (badge)
    - סטטוס תשלום (badge)
    - סכום
    - תפריט פעולות (3 נקודות)

#### מסך פרטי הזמנה (`/orders/[id]`)
**מבנה המסך:**

**1. כותרת:**
- מספר הזמנה
- סטטוס הזמנה (badge גדול)
- תאריך ושעה
- פעולות מהירות:
  - עדכון סטטוס
  - שליחת אימייל
  - הדפסת הזמנה
  - ביטול הזמנה

**2. פרטי לקוח:**
- שם, אימייל, טלפון
- כתובת משלוח
- כתובת חיוב (אם שונה)

**3. רשימת מוצרים:**
- טבלה עם:
  - תמונה
  - שם מוצר + וריאציה
  - SKU
  - כמות
  - מחיר יחידה
  - סה"כ

**4. סיכום:**
- סכום ביניים
- משלוח
- מע"מ
- הנחה (אם יש קופון)
- **סה"כ**

**5. תשלום:**
- שיטת תשלום
- סטטוס תשלום
- מספר עסקה (אם שולם)
- תאריך תשלום

**6. משלוח:**
- שיטת משלוח
- סטטוס משלוח
- מספר מעקב (אם נשלח)
- תאריך משלוח

**7. הערות:**
- הערות פנימיות (רק לבעל החנות)
- הערות ללקוח (יוצגו באימייל)

**8. היסטוריה:**
- ציר זמן של כל השינויים בהזמנה
- **אירועים נוצרים**: `order.created`, `order.updated`, `order.status_changed`, `order.paid`, `order.shipped`, `order.cancelled`

### 4. ניהול לקוחות (Customers)

#### מסך רשימת לקוחות (`/customers`)
- טבלה עם כל הלקוחות
- חיפוש וסינון
- פרטי לקוח:
  - שם
  - אימייל
  - טלפון
  - מספר הזמנות
  - סכום כולל הוצא
  - תאריך הזמנה אחרונה

#### מסך פרטי לקוח (`/customers/[id]`)
- פרטים אישיים
- היסטוריית הזמנות (רשימה)
- כתובות משלוח
- הערות
- תגיות לקוח

### 5. ניהול מלאי (Inventory)

#### מסך מלאי (`/inventory`)
- רשימת כל המוצרים עם כמות במלאי
- התראות על מלאי נמוך (highlighted)
- עדכון מלאי ידני
- היסטוריית תנועות מלאי (כניסה/יציאה)
- **אירועים**: `inventory.low_stock`, `inventory.updated`

### 6. דוחות ואנליטיקה (Analytics)

#### מסך אנליטיקה (`/analytics`)
- **מכירות:**
  - מכירות היום/השבוע/החודש/השנה
  - גרף מכירות לאורך זמן (line chart)
  - מכירות לפי מוצר (bar chart)
  - מכירות לפי קטגוריה (pie chart)

- **הזמנות:**
  - מספר הזמנות
  - הזמנות חדשות
  - הזמנות ממתינות
  - שיעור המרה

- **לקוחות:**
  - לקוחות חדשים
  - לקוחות חוזרים
  - ערך לקוח ממוצע (AOV)

- **מוצרים:**
  - מוצרים פופולריים (top 10)
  - מוצרים עם מלאי נמוך
  - מוצרים שלא נמכרים

### 7. קופונים והנחות (Coupons & Discounts)

#### מסך יצירת קופון (`/coupons/new`)
- קוד קופון (אופציונלי - אם לא מוזן, נוצר אוטומטית)
- סוג הנחה (אחוז/סכום קבוע)
- סכום/אחוז הנחה
- מינימום הזמנה
- מקסימום הנחה (אם אחוז)
- תאריך התחלה וסיום
- מספר שימושים מקסימלי
- שימושים לכל לקוח (למשל: 1 שימוש לכל לקוח)
- מוצרים/קטגוריות ספציפיים
- לקוחות ספציפיים (אופציונלי)
- שילוב עם הנחות אחרות (כן/לא)

#### מסך ניהול קופונים (`/coupons`)
- רשימת כל הקופונים
- סטטוס (פעיל/לא פעיל/פג תוקף)
- שימושים
- שימושים לפי לקוח
- היסטוריית שימושים
- **אירועים**: `coupon.created`, `coupon.used`

### 8. אוספי מוצרים (Collections)

#### מה זה Collection?
Collection הוא אוסף של מוצרים המאורגנים יחד. דומה לקטגוריה אבל יותר גמיש.

#### סוגי Collections:
1. **Manual Collection** - אוסף ידני
   - בעל החנות בוחר בדיוק אילו מוצרים להוסיף
   - ניתן לסדר מחדש (drag & drop)
   
2. **Automatic Collection** - אוסף אוטומטי
   - מוצרים מתווספים אוטומטית לפי תנאים:
     - מחיר (מינימום/מקסימום)
     - תגיות
     - קטגוריות
     - מלאי
     - תאריך יצירה
     - וכו'

#### מסך ניהול Collections (`/collections`)
- רשימת כל ה-Collections
- סוג (ידני/אוטומטי)
- מספר מוצרים
- תמונה (אופציונלי)
- תיאור
- SEO settings

#### מסך יצירת/עריכת Collection (`/collections/new` או `/collections/[id]/edit`)
- שם Collection
- תיאור
- תמונה
- סוג (ידני/אוטומטי)
- אם אוטומטי: תנאים (rules)
- אם ידני: רשימת מוצרים (עם חיפוש)
- SEO settings
- **אירועים**: `collection.created`, `collection.updated`

### 9. Gift Cards (כרטיסי מתנה)

#### מה זה Gift Card?
כרטיס מתנה הוא קוד שניתן ללקוח לשימוש בחנות.

#### מסך יצירת Gift Card (`/gift-cards/new`)
- קוד (אופציונלי - אם לא מוזן, נוצר אוטומטית)
- סכום - **חובה**
- תאריך תפוגה (אופציונלי)
- הודעה אישית (אופציונלי)
- נמען (אימייל) - **חובה**
- שולח (שם) - **חובה**

#### מסך ניהול Gift Cards (`/gift-cards`)
- רשימת כל ה-Gift Cards
- סטטוס (פעיל/שומש/פג תוקף)
- יתרה נוכחית
- היסטוריית שימושים
- **אירועים**: `gift_card.created`, `gift_card.used`, `gift_card.expired`

### 10. עגלות נטושות (Abandoned Carts)

#### מה זה Abandoned Cart?
עגלת קניות שהלקוח התחיל למלא אבל לא סיים את הרכישה.

#### מסך עגלות נטושות (`/abandoned-carts`)
- רשימת כל העגלות הנטושות
- פרטי לקוח (אם רשום)
- תאריך נטישה
- סכום עגלה
- מספר פריטים
- פעולות:
  - שליחת אימייל תזכורת
  - יצירת קופון מיוחד
  - מחיקת עגלה

#### אוטומציה (עתיד):
- שליחת אימייל אוטומטי לאחר 1 שעה
- שליחת אימייל עם קופון לאחר 24 שעות
- **אירועים**: `cart.abandoned`, `cart.recovered`

### 11. דפים סטטיים (Pages)

#### מסך ניהול דפים (`/pages`)
- רשימת כל הדפים
- דפים נפוצים:
  - אודות (About)
  - צור קשר (Contact)
  - מדיניות החזרות (Returns)
  - מדיניות משלוח (Shipping)
  - תנאי שימוש (Terms)
  - מדיניות פרטיות (Privacy)
  - FAQ

#### מסך יצירת/עריכת דף (`/pages/new` או `/pages/[id]/edit`)
- כותרת
- תוכן (Rich Text Editor)
- SEO settings
- תצוגה בתפריט (כן/לא)
- מיקום בתפריט

### 12. תפריט ניווט (Navigation)

#### מסך ניהול תפריט (`/navigation`)
- יצירת תפריטים (Header, Footer, Sidebar)
- הוספת פריטים:
  - קישור לדף
  - קישור לקטגוריה
  - קישור ל-Collection
  - קישור חיצוני
  - Dropdown menu (תפריט נפתח)
- סידור מחדש (drag & drop)
- **אירועים**: `navigation.updated`

### 13. ביקורות ודירוגים (Reviews & Ratings)

#### מסך ביקורות (`/reviews`)
- רשימת כל הביקורות
- סינון לפי:
  - מוצר
  - דירוג (1-5 כוכבים)
  - סטטוס (מאושר/ממתין/נדחה)
- פעולות:
  - אישור ביקורת
  - דחיית ביקורת
  - תגובה לביקורת
  - מחיקת ביקורת

#### תצוגה בפרונט:
- ביקורות מוצגות בעמוד המוצר
- דירוג ממוצע
- אפשרות ללקוח להוסיף ביקורת
- אפשרות ללקוח לדרג (1-5 כוכבים)
- אפשרות להעלות תמונות לביקורת
- **אירועים**: `review.created`, `review.approved`, `review.rejected`

### 14. רשימת משאלות (Wishlist)

#### תכונה בפרונט:
- לקוח יכול להוסיף מוצרים לרשימת משאלות
- צפייה ברשימת משאלות (`/shop/[slug]/wishlist`)
- שיתוף רשימת משאלות
- **אירועים**: `wishlist.item_added`, `wishlist.item_removed`

### 15. מוצרים קשורים והמלצות

#### מוצרים קשורים (Related Products):
- מוצרים מאותה קטגוריה
- מוצרים עם תגיות דומות
- מוצרים שנרכשו יחד

#### מוצרים מומלצים (Recommended Products):
- מוצרים פופולריים
- מוצרים חדשים
- מוצרים שנצפו לאחרונה
- מוצרים דומים

#### Upsell/Cross-sell:
- הצעה למוצרים נוספים בעת הוספה לעגלה
- הצעה בעת תהליך התשלום
- "לקוחות שקראו את זה קנו גם..."

### 16. חיפוש מתקדם (Advanced Search)

#### תכונות חיפוש:
- חיפוש לפי שם מוצר
- חיפוש לפי SKU
- חיפוש לפי תגיות
- חיפוש לפי קטגוריה
- חיפוש לפי תיאור
- Autocomplete
- תוצאות חיפוש עם:
  - תמונה
  - מחיר
  - זמינות
  - דירוג

#### סינון מתקדם:
- מחיר (טווח)
- זמינות
- דירוג (מינימום)
- קטגוריה
- תגיות
- מותג (אם יש)
- תכונות (אם יש)

### 17. ניהול מלאי מתקדם

#### תכונות נוספות:
- **העברות מלאי (Inventory Transfers):**
  - העברת מלאי בין מיקומים (אם יש)
  - מעקב אחר העברות
  
- **התאמות מלאי (Inventory Adjustments):**
  - עדכון ידני של מלאי
  - סיבה להתאמה
  - הערות
  
- **ספירת מלאי (Stocktaking):**
  - ספירה פיזית
  - השוואה למלאי במערכת
  - עדכון אוטומטי
  
- **היסטוריית מלאי:**
  - כל תנועות המלאי
  - כניסה/יציאה
  - העברות
  - התאמות

### 18. משלוח מתקדם

#### Shipping Zones:
- הגדרת אזורי משלוח
- כל אזור עם:
  - מדינות/ערים
  - שיטות משלוח
  - עלויות משלוח
  - זמן משלוח

#### Shipping Rates:
- Flat rate (מחיר קבוע)
- Weight-based (לפי משקל)
- Price-based (לפי מחיר)
- Free shipping (חינם)
- Free shipping over X (חינם מעל סכום)

#### Shipping Methods:
- Standard (רגיל)
- Express (מהיר)
- Overnight (לילה)
- Local delivery (משלוח מקומי)
- Local pickup (איסוף עצמי)

### 19. מע"מ ומיסים מתקדמים

#### הגדרות מע"מ:
- מע"מ לפי אזור
- מע"מ לפי קטגוריית מוצר
- פטור ממע"מ (למוצרים מסוימים)
- תעודת פטור (B2B)

#### הגדרות מיסים:
- מיסים לפי מדינה
- מיסים לפי עיר
- מיסים לפי מחוז
- חישוב אוטומטי

### 20. החזרים והחלפות (Returns & Exchanges)

#### מסך ניהול החזרים (`/returns`)
- רשימת בקשות החזר
- סטטוס (ממתין/מאושר/נדחה/הושלם)
- סיבת החזר
- סכום החזר
- שיטת החזר (אותו אמצעי תשלום/אשראי בחנות)

#### תהליך החזר:
1. לקוח מבקש החזר
2. בעל החנות מאשר/דוחה
3. אם מאושר: יצירת החזר כספי
4. עדכון מלאי (אם המוצר חזר)
5. **אירועים**: `return.requested`, `return.approved`, `return.completed`

### 21. Store Credit (אשראי בחנות)

#### מה זה Store Credit?
אשראי שניתן ללקוח לשימוש בחנות (למשל: החזר כספי, בונוס, וכו').

#### ניהול Store Credit:
- יצירת אשראי ללקוח
- יתרה נוכחית
- היסטוריית שימושים
- תאריך תפוגה (אופציונלי)
- **אירועים**: `store_credit.created`, `store_credit.used`

### 22. מחירי סיטונאות (Wholesale Pricing)

#### תכונה:
- מחירים שונים ללקוחות סיטונאיים
- תנאים:
  - כמות מינימלית
  - סכום מינימלי
  - רמת לקוח (VIP, Premium)
- מחירים לפי כמות (tier pricing)

### 23. כמות מינימלית/מקסימלית

#### תכונות:
- כמות מינימלית להזמנה (per product)
- כמות מקסימלית להזמנה (per product)
- כמות מינימלית לכל הזמנה (cart minimum)
- כמות מקסימלית לכל הזמנה (cart maximum)

### 24. Pre-order / Backorder

#### Pre-order:
- הזמנה מראש למוצר שעדיין לא זמין
- תאריך זמינות צפוי
- עדכון אוטומטי ללקוח

#### Backorder:
- אפשרות להזמין מוצר שאין במלאי
- תאריך חידוש מלאי צפוי
- עדכון אוטומטי ללקוח

### 25. Product Bundles / Kits

#### מה זה Bundle?
חבילת מוצרים הנמכרת יחד במחיר מיוחד.

#### יצירת Bundle:
- שם Bundle
- רשימת מוצרים (2+)
- מחיר Bundle (נמוך מסכום המוצרים בנפרד)
- תמונה
- תיאור

### 26. Custom Fields (שדות מותאמים אישית)

#### Product Custom Fields:
- שדות נוספים למוצר (JSON)
- דוגמאות:
  - מותג
  - חומר
  - גיל מומלץ
  - מידות
  - וכו'

#### Customer Custom Fields:
- שדות נוספים ללקוח
- דוגמאות:
  - תאריך לידה
  - העדפות
  - וכו'

#### Order Custom Fields:
- שדות נוספים להזמנה
- דוגמאות:
  - הערות מיוחדות
  - הוראות משלוח
  - וכו'

### 27. Product Videos

#### תכונה:
- הוספת וידאו למוצר
- תמיכה ב-YouTube, Vimeo, או העלאה ישירה
- תצוגה בעמוד המוצר
- **אירועים**: `product.video_added`

### 28. 360° Product View

#### תכונה (עתיד):
- תצוגה 360 מעלות של מוצר
- תמונות מרובות בזוויות שונות
- אינטראקטיבי

### 29. Social Login

#### תכונה:
- התחברות דרך:
  - Google
  - Facebook
  - Apple
- יצירת חשבון אוטומטי
- **אירועים**: `customer.social_login`

### 30. Two-Factor Authentication (2FA)

#### תכונה:
- אימות דו-שלבי לבעל החנות
- SMS או Authenticator App
- חובה/אופציונלי

### 31. API & Webhooks

#### API Access:
- REST API
- GraphQL API (עתיד)
- API Keys
- Rate limiting
- Documentation

#### Webhooks:
- רשימת Webhooks:
  - `order.created`
  - `order.updated`
  - `product.created`
  - `customer.created`
  - וכו'
- URL endpoint
- Secret key
- Retry logic
- **אירועים**: `webhook.triggered`, `webhook.failed`, `webhook.succeeded`

### 32. Email Marketing

#### תכונות:
- רשימות תפוצה
- קמפיינים
- אוטומציות:
  - Welcome email
  - Abandoned cart
  - Order confirmation
  - Shipping notification
  - וכו'
- תבניות אימייל
- A/B testing
- Analytics

### 33. SMS Notifications

#### תכונות:
- התראות SMS:
  - אישור הזמנה
  - עדכון משלוח
  - תזכורת עגלה נטושה
  - וכו'
- תבניות SMS
- אינטגרציה עם ספק SMS

### 34. אינטגרציות

#### אינטגרציות עתידיות:
- WhatsApp Business
- Facebook Messenger
- Instagram Shopping
- Google Shopping
- Facebook Shop
- Printful (Print on Demand)
- Dropshipping suppliers
- וכו'

### 35. PWA Support

#### תכונה:
- Progressive Web App
- התקנה על מובייל
- עבודה offline (חלקית)
- Push notifications

### 36. Barcode & QR Codes

#### Barcode:
- סריקת ברקוד לעדכון מלאי
- חיפוש לפי ברקוד

#### QR Codes:
- יצירת QR code למוצר
- יצירת QR code להזמנה
- יצירת QR code לקופון

---

## 🏪 פרונט החנות (Storefront)

### מה זה הפרונט?
הפרונט הוא **אתר החנות הציבורי** - האתר שהלקוחות רואים וקונים ממנו. זה נפרד מהפאנל הניהול (Admin Panel).

### איך זה מחובר?

**ארכיטקטורה:**
- **פאנל ניהול**: `/dashboard`, `/products`, `/orders` וכו' - דורש התחברות
- **פרונט החנות**: `/shop/[slug]` או subdomain - ציבורי, לא דורש התחברות לניהול

**דוגמה:**
- בעל החנות: `https://quickshop.com/dashboard` (פאנל ניהול)
- לקוחות: `https://myshop.quickshop.com` או `https://quickshop.com/shop/myshop` (פרונט)

**חיבור ל-API:**
- הפרונט משתמש ב-**API Routes** של Next.js
- כל בקשה לפרונט נשלחת ל-`/api/storefront/[shop-slug]/...`
- הפרונט קורא ל-API כדי לקבל:
  - פרטי חנות
  - רשימת מוצרים
  - פרטי מוצר
  - יצירת הזמנה
  - וכו'

**דוגמה ל-API Routes:**
```
/api/storefront/[slug]/info          - פרטי חנות
/api/storefront/[slug]/products      - רשימת מוצרים
/api/storefront/[slug]/products/[id] - פרטי מוצר
/api/storefront/[slug]/cart          - עגלת קניות
/api/storefront/[slug]/checkout      - תהליך תשלום
/api/storefront/[slug]/auth/register - הרשמת לקוח
/api/storefront/[slug]/auth/login     - התחברות לקוח
/api/storefront/[slug]/auth/logout    - התנתקות
/api/storefront/[slug]/account        - פרטי חשבון לקוח
```

**מבנה customerDiscountSettings ב-JSON:**
```json
{
  "enabled": true,
  "baseDiscount": {
    "type": "PERCENTAGE", // or "FIXED"
    "value": 10, // 10% or 10 ILS
    "applicableTo": "ALL_PRODUCTS" // or "CATEGORIES", "PRODUCTS"
  },
  "tiers": [
    {
      "name": "VIP",
      "minSpent": 1000,
      "minOrders": 5,
      "discount": {
        "type": "PERCENTAGE",
        "value": 15
      }
    },
    {
      "name": "PREMIUM",
      "minSpent": 5000,
      "minOrders": 20,
      "discount": {
        "type": "PERCENTAGE",
        "value": 20
      }
    }
  ],
  "autoCoupons": {
    "newCustomer": "WELCOME10",
    "birthday": "BIRTHDAY15",
    "inactive": "COMEBACK20"
  }
}
```

### עריכת הפרונט

**בעל החנות יכול לערוך את הפרונט דרך הפאנל:**

1. **עיצוב (Theme):**
   - בחירת תבנית
   - שינוי צבעים
   - שינוי פונטים
   - תצוגה מקדימה בזמן אמת
   - כל שינוי נשמר אוטומטית

2. **תוכן:**
   - עריכת מוצרים (משפיע על הפרונט)
   - עריכת קטגוריות
   - עריכת דפים (אודות, צור קשר, וכו')

3. **הגדרות:**
   - שם החנות
   - לוגו
   - פרטי יצירת קשר
   - וכו'

**הערה חשובה:**
- בעל החנות **לא יכול לערוך קוד** של הפרונט
- הוא יכול לערוך רק דרך ממשק הניהול (UI)
- כל העריכות נשמרות ב-database ומשפיעות על הפרונט

### מבנה הפרונט

**דפים בפרונט:**
- `/shop/[slug]` - דף בית החנות
- `/shop/[slug]/products` - רשימת מוצרים
- `/shop/[slug]/products/[id]` - עמוד מוצר
- `/shop/[slug]/categories/[id]` - עמוד קטגוריה
- `/shop/[slug]/cart` - עגלת קניות
- `/shop/[slug]/checkout` - תהליך תשלום
- `/shop/[slug]/account` - חשבון לקוח (אם מחובר)
- `/shop/[slug]/orders/[id]` - מעקב הזמנה

**תכונות הפרונט:**
- רספונסיבי מלא (מובייל, טאבלט, דסקטופ)
- תמיכה ב-RTL (עברית)
- חיפוש מוצרים
- סינון מוצרים
- עגלת קניות
- תהליך תשלום מאובטח
- תצוגת מוצרים עם תמונות
- גלריית תמונות
- המלצות מוצרים
- וכו'

---

## 👥 מערכת לקוחות והרשמה

### האם לקוחות יכולים להירשם ולהתחבר?

**כן!** הלקוחות יכולים להירשם ולהתחבר לחשבון בחנות.

### הרשמה והתחברות לקוחות

#### הרשמה (`/shop/[slug]/register`)
**טופס הרשמה:**
- שם פרטי - **חובה**
- שם משפחה - **חובה**
- אימייל - **חובה** (משמש גם כמזהה)
- סיסמה - **חובה** (מינימום 8 תווים)
- טלפון (אופציונלי)
- הסכמה לתנאי שימוש
- הסכמה לניוזלטר (אופציונלי)

**תהליך:**
1. הלקוח ממלא את הטופס
2. אימות אימייל (שליחת קוד או לינק אימות)
3. יצירת חשבון Customer במערכת
4. התחברות אוטומטית
5. **אירוע נוצר**: `customer.created`

#### התחברות (`/shop/[slug]/login`)
**טופס התחברות:**
- אימייל
- סיסמה
- "שכחתי סיסמה" (אופציונלי)

**תהליך:**
1. הלקוח מזין אימייל וסיסמה
2. אימות מול database
3. יצירת session
4. הפניה לעמוד שבו היה או לדף הבית

#### שחזור סיסמה (`/shop/[slug]/forgot-password`)
- הזנת אימייל
- שליחת לינק לאיפוס סיסמה
- איפוס סיסמה דרך לינק

### חשבון לקוח (`/shop/[slug]/account`)

**לאחר התחברות, הלקוח יכול:**
- **פרטים אישיים:**
  - עריכת שם
  - עריכת אימייל
  - עריכת טלפון
  - שינוי סיסמה

- **כתובות:**
  - הוספת כתובת משלוח
  - עריכת כתובת
  - מחיקת כתובת
  - הגדרת כתובת ברירת מחדל

- **הזמנות:**
  - צפייה בכל ההזמנות
  - צפייה בפרטי הזמנה
  - הורדת חשבונית
  - מעקב משלוח

- **העדפות:**
  - הרשמה/ביטול הרשמה לניוזלטר
  - העדפות תקשורת

### הנחות ללקוחות רשומים

**מערכת הנחות אוטומטית:**

1. **הנחת לקוח רשום:**
   - בעל החנות יכול להגדיר הנחה אחידה לכל הלקוחות הרשומים
   - למשל: 10% הנחה על כל הזמנה ללקוחות רשומים
   - ההנחה מוחלת אוטומטית בעת התשלום

2. **רמות לקוחות (Customer Tiers):**
   - **לקוח רגיל**: ללא הנחה או הנחה בסיסית
   - **לקוח VIP**: הנחה גבוהה יותר (למשל 15%)
   - **לקוח Premium**: הנחה גבוהה ביותר (למשל 20%)
   
   **כיצד נקבעת הרמה:**
   - לפי סכום כולל הוצא (Total Spent)
   - לפי מספר הזמנות
   - ידנית על ידי בעל החנות

3. **קופונים אישיים:**
   - בעל החנות יכול ליצור קופון ספציפי ללקוח מסוים
   - שליחת קופון באימייל
   - קופון ייחודי לכל לקוח

4. **הנחות לפי קטגוריות:**
   - בעל החנות יכול להגדיר הנחה ללקוחות רשומים על קטגוריות מסוימות
   - למשל: 15% הנחה על בגדים ללקוחות רשומים

### הגדרות הנחות בפאנל הניהול

**במסך הגדרות חנות (`/settings/store`):**

**טאב "הנחות לקוחות":**
- Toggle: "הפעל הנחות ללקוחות רשומים"
- אם מופעל:
  - **הנחה בסיסית:**
    - אחוז הנחה (למשל 10%)
    - או סכום קבוע
    - תחול על: כל המוצרים / קטגוריות מסוימות
  
  - **רמות לקוחות:**
    - הגדרת רמות (רגיל, VIP, Premium)
    - תנאים לכל רמה:
      - סכום מינימלי הוצא
      - או מספר הזמנות מינימלי
    - אחוז הנחה לכל רמה

  - **קופונים אוטומטיים:**
    - קופון ברירת מחדל ללקוחות חדשים
    - קופון ליום הולדת (אם יש תאריך לידה)
    - קופון ללקוחות שלא קנו זמן רב

### התנהגות בפרונט

**כאשר לקוח מחובר:**
- שם הלקוח מוצג בכותרת (אם רשום)
- מחירים מוצגים עם הנחה (אם יש)
- עגלת קניות נשמרת בין ביקורים
- כתובות משלוח נשמרות
- היסטוריית הזמנות נגישה

**כאשר לקוח לא מחובר:**
- מחירים רגילים
- עגלת קניות נשמרת ב-session (עד 30 יום)
- יכול להזמין כאורח (Guest Checkout)
- יקבל הצעה להירשם לאחר הזמנה

### אירועים הקשורים ללקוחות

- `customer.created` - לקוח נרשם
- `customer.logged_in` - לקוח התחבר
- `customer.updated` - פרטי לקוח עודכנו
- `customer.subscribed` - לקוח נרשם לניוזלטר
- `customer.unsubscribed` - לקוח ביטל הרשמה
- `customer.tier_upgraded` - לקוח עלה רמה (VIP, Premium)
- `cart.abandoned` - עגלה ננטשה (אם הלקוח רשום, נשלח אימייל תזכורת)

---

## 🎯 מערכת אירועים ואוטומציות

### מטרת המערכת
מערכת אירועים מאפשרת למעקב אחר פעולות במערכת ולבניית אוטומציות (בעתיד). כל פעולה חשובה במערכת יוצרת אירוע שניתן להשתמש בו לאוטומציות.

### מודל Event
```prisma
model Event {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  type        String   // Event type (see below)
  entityType  String?  // e.g., "product", "order", "customer"
  entityId    String?  // ID of the related entity
  payload     Json     // Event data
  userId      String?  // User who triggered the event
  createdAt   DateTime @default(now())

  @@index([shopId])
  @@index([type])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

### רשימת אירועים

#### אירועי חנות (Shop Events)
- `shop.created` - חנות נוצרה
  - Payload: `{ shopId, name, slug }`
- `shop.updated` - חנות עודכנה
  - Payload: `{ shopId, changes }`
- `shop.published` - חנות פורסמה
  - Payload: `{ shopId }`
- `shop.unpublished` - חנות הוסרה מפרסום
  - Payload: `{ shopId }`

#### אירועי מוצר (Product Events)
- `product.created` - מוצר נוצר
  - Payload: `{ productId, name, price, shopId }`
- `product.updated` - מוצר עודכן
  - Payload: `{ productId, changes }`
- `product.published` - מוצר פורסם
  - Payload: `{ productId }`
- `product.unpublished` - מוצר הוסר מפרסום
  - Payload: `{ productId }`
- `product.deleted` - מוצר נמחק
  - Payload: `{ productId }`
- `product.variant.created` - וריאציה נוצרה
  - Payload: `{ productId, variantId, name }`
- `product.variant.updated` - וריאציה עודכנה
  - Payload: `{ productId, variantId, changes }`

#### אירועי הזמנה (Order Events)
- `order.created` - הזמנה נוצרה
  - Payload: `{ orderId, orderNumber, total, customerEmail, shopId }`
- `order.updated` - הזמנה עודכנה
  - Payload: `{ orderId, changes }`
- `order.status_changed` - סטטוס הזמנה השתנה
  - Payload: `{ orderId, oldStatus, newStatus }`
- `order.paid` - הזמנה שולמה
  - Payload: `{ orderId, amount, paymentMethod }`
- `order.shipped` - הזמנה נשלחה
  - Payload: `{ orderId, trackingNumber }`
- `order.delivered` - הזמנה נמסרה
  - Payload: `{ orderId }`
- `order.cancelled` - הזמנה בוטלה
  - Payload: `{ orderId, reason }`
- `order.refunded` - החזר כספי בוצע
  - Payload: `{ orderId, amount }`

#### אירועי לקוח (Customer Events)
- `customer.created` - לקוח נוצר
  - Payload: `{ customerId, email, shopId }`
- `customer.updated` - לקוח עודכן
  - Payload: `{ customerId, changes }`
- `customer.subscribed` - לקוח נרשם לניוזלטר
  - Payload: `{ customerId, email }`

#### אירועי עגלת קניות (Cart Events)
- `cart.created` - עגלת קניות נוצרה
  - Payload: `{ cartId, shopId }`
- `cart.item_added` - מוצר נוסף לעגלה
  - Payload: `{ cartId, productId, variantId, quantity }`
- `cart.item_updated` - מוצר בעגלה עודכן
  - Payload: `{ cartId, productId, variantId, quantity }`
- `cart.item_removed` - מוצר הוסר מהעגלה
  - Payload: `{ cartId, productId, variantId }`
- `cart.abandoned` - עגלה ננטשה (לאחר 24 שעות ללא פעילות)
  - Payload: `{ cartId, items }`

#### אירועי תשלום (Payment Events)
- `payment.initiated` - תשלום התחיל
  - Payload: `{ orderId, amount, method }`
- `payment.completed` - תשלום הושלם
  - Payload: `{ orderId, amount, transactionId }`
- `payment.failed` - תשלום נכשל
  - Payload: `{ orderId, amount, reason }`
- `payment.refunded` - החזר כספי
  - Payload: `{ orderId, amount, transactionId }`

#### אירועי מלאי (Inventory Events)
- `inventory.updated` - מלאי עודכן
  - Payload: `{ productId, variantId, oldQty, newQty }`
- `inventory.low_stock` - מלאי נמוך
  - Payload: `{ productId, variantId, currentQty, threshold }`
- `inventory.out_of_stock` - מלאי אזל
  - Payload: `{ productId, variantId }`
- `inventory.restocked` - מלאי חודש
  - Payload: `{ productId, variantId, quantity }`

#### אירועי קופון (Coupon Events)
- `coupon.created` - קופון נוצר
  - Payload: `{ couponId, code, shopId }`
- `coupon.used` - קופון שומש
  - Payload: `{ couponId, orderId, discount }`
- `coupon.expired` - קופון פג תוקף
  - Payload: `{ couponId }`

#### אירועי משלוח (Shipping Events)
- `shipping.label_created` - תווית משלוח נוצרה
  - Payload: `{ orderId, trackingNumber }`
- `shipping.tracking_updated` - עדכון מעקב משלוח
  - Payload: `{ orderId, trackingNumber, status }`

#### אירועי Webhook (Webhook Events)
- `webhook.triggered` - Webhook נשלח
  - Payload: `{ webhookId, eventType, status }`
- `webhook.succeeded` - Webhook הצליח
  - Payload: `{ webhookId, responseCode }`
- `webhook.failed` - Webhook נכשל
  - Payload: `{ webhookId, error, retryCount }`

#### אירועי Review (Review Events)
- `review.created` - ביקורת נוצרה
  - Payload: `{ reviewId, productId, rating, customerId }`
- `review.approved` - ביקורת אושרה
  - Payload: `{ reviewId, productId }`
- `review.rejected` - ביקורת נדחתה
  - Payload: `{ reviewId, productId, reason }`

#### אירועי Gift Card (Gift Card Events)
- `gift_card.created` - Gift Card נוצר
  - Payload: `{ giftCardId, amount, recipientEmail }`
- `gift_card.used` - Gift Card שומש
  - Payload: `{ giftCardId, orderId, amount }`
- `gift_card.expired` - Gift Card פג תוקף
  - Payload: `{ giftCardId }`

#### אירועי Store Credit (Store Credit Events)
- `store_credit.created` - Store Credit נוצר
  - Payload: `{ customerId, amount }`
- `store_credit.used` - Store Credit שומש
  - Payload: `{ customerId, orderId, amount }`

#### אירועי Return (Return Events)
- `return.requested` - בקשה להחזר
  - Payload: `{ returnId, orderId, reason }`
- `return.approved` - החזר אושר
  - Payload: `{ returnId, amount }`
- `return.completed` - החזר הושלם
  - Payload: `{ returnId, amount }`

### שימוש באירועים
1. **לוגים**: כל האירועים נשמרים ללוגים
2. **התראות**: ניתן להגדיר התראות על אירועים מסוימים
3. **אוטומציות (עתיד)**: ניתן לבנות flows המבוססים על אירועים
4. **אנליטיקה**: ניתוח התנהגות משתמשים ועסקים

---

## 🗄️ מבנה דאטאבייס

### מודלים עיקריים:

#### Subscription (מנוי)
```prisma
model Subscription {
  id                  String             @id @default(cuid())
  companyId           String             @unique
  company             Company            @relation(fields: [companyId], references: [id], onDelete: Cascade)
  plan                SubscriptionPlan   @default(TRIAL)
  status              SubscriptionStatus @default(TRIAL)
  
  // Trial period (7 days)
  trialStartDate      DateTime           @default(now())
  trialEndDate        DateTime           // trialStartDate + 7 days
  
  // Subscription period
  subscriptionStartDate DateTime?
  subscriptionEndDate   DateTime?
  nextBillingDate      DateTime?
  
  // Payment
  paymentMethod       String?            // PayPal
  paymentDetails      Json?             // PayPal subscription ID, etc.
  lastPaymentDate     DateTime?
  lastPaymentAmount   Float?
  
  // Pricing
  monthlyPrice        Float?             // 299 for BRANDING, 399 for QUICK_SHOP
  transactionFee      Float?             @default(0.5) // 0.5% for QUICK_SHOP
  taxRate             Float?             @default(18) // VAT 18%
  
  // Cancellation
  cancelledAt         DateTime?
  cancellationReason  String?
  
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  @@index([companyId])
  @@index([status])
  @@index([trialEndDate])
  @@index([subscriptionEndDate])
}

enum SubscriptionPlan {
  TRIAL
  BRANDING
  QUICK_SHOP
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  EXPIRED
  CANCELLED
}
```

#### Shop (חנות)
```prisma
model Shop {
  id              String   @id @default(cuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])
  name            String
  slug            String   @unique // URL-friendly name
  description     String?
  logo            String?  // URL to logo image
  category        String?
  email           String?
  phone           String?
  address         String?
  workingHours    Json?    // {days: {open, close}}
  currency        String   @default("ILS")
  taxEnabled      Boolean  @default(true)
  taxRate         Float    @default(18)
  theme           String   @default("default")
  themeSettings   Json?    // Colors, fonts, etc.
  domain          String?  // Custom domain
  isPublished     Boolean  @default(false)
  settings        Json?    // General settings
  customerDiscountSettings Json? // Customer discount settings (see below)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  products        Product[]
  orders          Order[]
  customers       Customer[]
  coupons         Coupon[]
  categories      Category[]
  collections     Collection[]
  events          Event[]
  pages           Page[]
  blogs           Blog[]
  webhooks        Webhook[]
}
```

#### Product (מוצר)
```prisma
model Product {
  id              String   @id @default(cuid())
  shopId          String
  shop            Shop     @relation(fields: [shopId], references: [id])
  name            String
  slug            String
  description     String?  // Rich text
  sku             String?
  price           Float
  comparePrice    Float?   // Original price for sale
  cost            Float?   // Cost price
  taxEnabled      Boolean  @default(true)
  inventoryEnabled Boolean @default(true)
  inventoryQty    Int      @default(0)
  lowStockAlert   Int?     // Alert when stock below this
  weight          Float?
  dimensions      Json?    // {length, width, height}
  status          ProductStatus @default(DRAFT)
  images          String[] // Array of image URLs
  video           String?  // Video URL (YouTube, Vimeo, or direct)
  minQuantity     Int?     // Minimum order quantity
  maxQuantity     Int?     // Maximum order quantity
  availability    ProductAvailability @default(IN_STOCK)
  availableDate   DateTime? // For pre-order/backorder
  seoTitle        String?
  seoDescription  String?
  customFields    Json?    // Custom fields (brand, material, etc.)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  categories      ProductCategory[]
  tags           ProductTag[]
  variants       ProductVariant[]
  orderItems     OrderItem[]
  reviews        Review[]
  collections    ProductCollection[]
  bundles        BundleProduct[] // Products in bundles
}

enum ProductAvailability {
  IN_STOCK
  OUT_OF_STOCK
  PRE_ORDER
  BACKORDER
  DISCONTINUED
}

enum ProductStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

#### ProductVariant (וריאציות מוצר)
```prisma
model ProductVariant {
  id            String   @id @default(cuid())
  productId     String
  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  name          String   // e.g., "Small / Red"
  sku           String?
  barcode       String?
  price         Float?   // If different from product price
  comparePrice  Float?
  cost          Float?
  inventoryQty  Int      @default(0)
  weight        Float?
  image         String?  // Variant-specific image
  option1       String?  // e.g., "Size"
  option1Value  String?  // e.g., "Small"
  option2       String?  // e.g., "Color"
  option2Value  String?  // e.g., "Red"
  option3       String?
  option3Value  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  orderItems    OrderItem[]
}
```

#### ProductOption (אפשרויות מוצר)
```prisma
model ProductOption {
  id            String   @id @default(cuid())
  productId     String
  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  name          String   // e.g., "Size", "Color"
  values        String[] // e.g., ["S", "M", "L", "XL"]
  position      Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### Order (הזמנה)
```prisma
model Order {
  id              String   @id @default(cuid())
  shopId          String
  shop            Shop     @relation(fields: [shopId], references: [id])
  orderNumber     String   @unique
  customerId      String?
  customer        Customer? @relation(fields: [customerId], references: [id])
  status          OrderStatus @default(PENDING)
  paymentStatus   PaymentStatus @default(PENDING)
  fulfillmentStatus FulfillmentStatus @default(UNFULFILLED)
  
  // Customer info (snapshot at time of order)
  customerName    String
  customerEmail   String
  customerPhone   String?
  shippingAddress Json     // Full address object
  billingAddress  Json?
  
  // Pricing
  subtotal        Float
  shipping        Float
  tax             Float
  discount        Float   @default(0)
  total           Float
  
  // Payment
  paymentMethod   String?
  transactionId   String?
  paidAt          DateTime?
  
  // Shipping
  shippingMethod  String?
  trackingNumber String?
  shippedAt       DateTime?
  deliveredAt     DateTime?
  
  // Other
  notes           String?
  couponCode      String?
  
  items           OrderItem[]
  returns         Return[]
  giftCardTransactions GiftCardTransaction[]
  storeCreditTransactions StoreCreditTransaction[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum FulfillmentStatus {
  UNFULFILLED
  PARTIAL
  FULFILLED
}
```

#### OrderItem (פריט בהזמנה)
```prisma
model OrderItem {
  id            String   @id @default(cuid())
  orderId       String
  order         Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId     String?
  product       Product? @relation(fields: [productId], references: [id])
  variantId     String?
  variant       ProductVariant? @relation(fields: [variantId], references: [id])
  name          String   // Product name at time of order
  sku           String?
  quantity      Int
  price         Float
  total         Float
  createdAt     DateTime @default(now())
}
```

#### Customer (לקוח)
```prisma
model Customer {
  id            String   @id @default(cuid())
  shopId        String
  shop          Shop     @relation(fields: [shopId], references: [id])
  email         String
  password      String?  // Hashed password (null for guest customers)
  firstName     String?
  lastName      String?
  phone         String?
  addresses     Json?    // Array of addresses
  totalSpent    Float    @default(0)
  orderCount    Int      @default(0)
  tier          CustomerTier @default(REGULAR) // REGULAR, VIP, PREMIUM
  tags          String[] // Customer tags
  notes         String?
  isSubscribed  Boolean  @default(false) // Newsletter subscription
  emailVerified Boolean  @default(false)
  lastLoginAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  orders        Order[]
  carts         Cart[]
  reviews       Review[]
  storeCredits  StoreCredit[]
  blogComments  BlogComment[]
}

enum CustomerTier {
  REGULAR
  VIP
  PREMIUM
}
```

#### Coupon (קופון)
```prisma
model Coupon {
  id            String   @id @default(cuid())
  shopId        String
  shop          Shop     @relation(fields: [shopId], references: [id])
  code          String   @unique
  type          DiscountType // PERCENTAGE, FIXED
  value         Float
  minOrder      Float?
  maxUses       Int?
  usedCount     Int      @default(0)
  startDate     DateTime?
  endDate       DateTime?
  isActive      Boolean  @default(true)
  applicableProducts String[] // Product IDs
  applicableCategories String[] // Category IDs
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum DiscountType {
  PERCENTAGE
  FIXED
}
```

#### Category (קטגוריה)
```prisma
model Category {
  id            String   @id @default(cuid())
  shopId        String
  shop          Shop     @relation(fields: [shopId], references: [id])
  name          String
  slug          String
  description   String?
  parentId      String?
  parent        Category? @relation("CategoryParent", fields: [parentId], references: [id])
  children      Category[] @relation("CategoryParent")
  image         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  products      ProductCategory[]
}

#### Collection (אוסף מוצרים)
```prisma
model Collection {
  id            String   @id @default(cuid())
  shopId        String
  shop          Shop     @relation(fields: [shopId], references: [id])
  name          String
  slug          String
  description   String?
  image         String?
  type          CollectionType @default(MANUAL)
  rules         Json?    // For automatic collections
  seoTitle      String?
  seoDescription String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  products      ProductCollection[]
}

enum CollectionType {
  MANUAL
  AUTOMATIC
}

model ProductCollection {
  id          String   @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  collectionId String
  collection Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  position  Int      @default(0) // For manual sorting

  @@unique([productId, collectionId])
}

model ProductCategory {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([productId, categoryId])
}

model ProductTag {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  name        String

  @@unique([productId, name])
}
```

#### Event (אירוע)
```prisma
model Event {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  type        String   // Event type
  entityType  String?  // e.g., "product", "order", "customer"
  entityId    String?  // ID of the related entity
  payload     Json     // Event data
  userId      String?  // User who triggered the event
  createdAt   DateTime @default(now())

  @@index([shopId])
  @@index([type])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

#### Cart (עגלת קניות)
```prisma
model Cart {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  sessionId   String?  // For guest carts
  customerId  String?
  customer    Customer? @relation(fields: [customerId], references: [id])
  items       Json     // Array of cart items: [{productId, variantId, quantity, price}]
  couponCode  String?
  expiresAt   DateTime
  abandonedAt DateTime? // When cart was marked as abandoned
  recoveredAt DateTime? // When cart was recovered
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([shopId])
  @@index([sessionId])
  @@index([customerId])
  @@index([expiresAt])
  @@index([abandonedAt])
}
```

#### GiftCard (כרטיס מתנה)
```prisma
model GiftCard {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  code        String   @unique
  amount      Float
  balance     Float    @default(0) // Remaining balance
  recipientEmail String
  recipientName  String?
  senderName    String?
  message       String?
  expiresAt     DateTime?
  isActive      Boolean @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  transactions GiftCardTransaction[]
}

model GiftCardTransaction {
  id          String   @id @default(cuid())
  giftCardId  String
  giftCard    GiftCard @relation(fields: [giftCardId], references: [id])
  orderId     String?
  order       Order?   @relation(fields: [orderId], references: [id])
  amount      Float
  type        TransactionType // CHARGE, REFUND
  createdAt   DateTime @default(now())
}

enum TransactionType {
  CHARGE
  REFUND
}
```

#### StoreCredit (אשראי בחנות)
```prisma
model StoreCredit {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  amount      Float
  balance     Float    @default(0) // Remaining balance
  reason      String?  // Why credit was given
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  transactions StoreCreditTransaction[]
}

model StoreCreditTransaction {
  id          String   @id @default(cuid())
  storeCreditId String
  storeCredit StoreCredit @relation(fields: [storeCreditId], references: [id])
  orderId     String?
  order       Order?   @relation(fields: [orderId], references: [id])
  amount      Float
  type        TransactionType // CHARGE, REFUND
  createdAt   DateTime @default(now())
}
```

#### Review (ביקורת)
```prisma
model Review {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  customerId  String?
  customer    Customer? @relation(fields: [customerId], references: [id])
  rating      Int      // 1-5 stars
  title       String?
  comment     String?
  images      String[] // Review images
  isApproved  Boolean  @default(false)
  isVerified  Boolean  @default(false) // Verified purchase
  helpfulCount Int     @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([shopId])
  @@index([productId])
  @@index([isApproved])
}
```

#### Return (החזר)
```prisma
model Return {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id])
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  status      ReturnStatus @default(PENDING)
  reason      String
  items       Json     // Items to return: [{orderItemId, quantity, reason}]
  refundAmount Float?
  refundMethod String? // Original payment method / Store credit
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum ReturnStatus {
  PENDING
  APPROVED
  REJECTED
  PROCESSING
  COMPLETED
  CANCELLED
}
```

#### Bundle (חבילת מוצרים)
```prisma
model Bundle {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  name        String
  description String?
  price       Float
  comparePrice Float?  // If sold separately
  image       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  products    BundleProduct[]
}

model BundleProduct {
  id          String   @id @default(cuid())
  bundleId    String
  bundle      Bundle   @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  quantity    Int      @default(1)
  position    Int      @default(0)

  @@unique([bundleId, productId])
}
```

#### Page (דף סטטי)
```prisma
model Page {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  title       String
  slug        String
  content     String?  // Rich text
  seoTitle    String?
  seoDescription String?
  isPublished Boolean  @default(false)
  showInMenu  Boolean  @default(false)
  menuPosition Int?    // Position in menu
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([shopId, slug])
}
```

#### Navigation (תפריט ניווט)
```prisma
model Navigation {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  name        String   // e.g., "Main Menu", "Footer Menu"
  location    String   // HEADER, FOOTER, SIDEBAR
  items       Json     // Navigation items tree
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([shopId, location])
}
```

#### Webhook
```prisma
model Webhook {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  url         String
  events      String[] // Array of event types
  secret      String
  isActive    Boolean  @default(true)
  lastTriggeredAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  logs        WebhookLog[]
}

model WebhookLog {
  id          String   @id @default(cuid())
  webhookId   String
  webhook     Webhook  @relation(fields: [webhookId], references: [id])
  eventType   String
  payload     Json
  responseCode Int?
  responseBody Json?
  error       String?
  durationMs  Int?
  createdAt   DateTime @default(now())

  @@index([webhookId])
  @@index([createdAt])
}
```

#### Blog (בלוג)
```prisma
model Blog {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id])
  title       String
  slug        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  posts       BlogPost[]

  @@unique([shopId, slug])
}

model BlogPost {
  id          String   @id @default(cuid())
  blogId      String
  blog        Blog     @relation(fields: [blogId], references: [id], onDelete: Cascade)
  title       String
  slug        String
  content     String?  // Rich text
  excerpt     String?  // Short summary
  featuredImage String?
  authorId    String?
  author      User?    @relation(fields: [authorId], references: [id])
  isPublished Boolean  @default(false)
  publishedAt DateTime?
  seoTitle    String?
  seoDescription String?
  allowComments Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  categories  BlogPostCategory[]
  tags        BlogPostTag[]
  comments    BlogComment[]

  @@unique([blogId, slug])
  @@index([isPublished])
  @@index([publishedAt])
}

model BlogPostCategory {
  id          String   @id @default(cuid())
  blogId      String
  blog        Blog     @relation(fields: [blogId], references: [id], onDelete: Cascade)
  name        String
  slug        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  posts       BlogPostCategoryRelation[]

  @@unique([blogId, slug])
}

model BlogPostCategoryRelation {
  id          String   @id @default(cuid())
  postId       String
  post         BlogPost  @relation(fields: [postId], references: [id], onDelete: Cascade)
  categoryId   String
  category     BlogPostCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([postId, categoryId])
}

model BlogPostTag {
  id          String   @id @default(cuid())
  postId      String
  post        BlogPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  name        String

  @@unique([postId, name])
}

model BlogComment {
  id          String   @id @default(cuid())
  postId      String
  post        BlogPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  customerId  String?
  customer    Customer? @relation(fields: [customerId], references: [id])
  authorName  String
  authorEmail String
  content     String
  isApproved  Boolean  @default(false)
  parentId    String?  // For nested comments
  parent      BlogComment? @relation("CommentParent", fields: [parentId], references: [id])
  children    BlogComment[] @relation("CommentParent")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([postId])
  @@index([isApproved])
}
```

---

## 🎨 עיצוב ונראות

### פונטים
המערכת תתמוך בפונטים הבאים (עדיפות לפי סדר):
1. **Noto Sans Hebrew** - ברירת מחדל לעברית
2. **Assistant** - גופן עברי נוסף
3. **Heebo** - גופן עברי נוסף
4. **Open Sans Hebrew** - גופן עברי נוסף

**הגדרות:**
- גופן ראשי: Noto Sans Hebrew
- גופנים חלופיים: Assistant, Heebo, Open Sans Hebrew
- גופן לוגו: Pacifico (כמו ב-CRM)

### תבניות עיצוב (Themes)
- **Default**: תבנית נקייה ומינימליסטית
- **Modern**: תבנית מודרנית עם אנימציות
- **Classic**: תבנית קלאסית ומסורתית
- **Bold**: תבנית בולטת וצבעונית

### רספונסיביות
- תמיכה מלאה במובייל
- Tablet optimization
- Desktop optimization

### תמיכה ב-RTL
- תמיכה מלאה בעברית (RTL)
- תמיכה באנגלית (LTR)
- תמיכה בערבית (RTL)

### צבעים
- גרדיאנט ראשי: `#6f65e2` → `#b965e2` (סגול)
- גרדיאנט אופקי: `#93f0e1` → `#6374c5` (טורקיז-כחול)
- רקע: `#f7f9fe` (כחול בהיר)

---

## 🔄 תהליכים מרכזיים

### תהליך רכישה (Checkout Flow)

1. **עגלת קניות:**
   - הוספת מוצרים לעגלה
   - עדכון כמות
   - הסרת מוצרים
   - יישום קופון
   - **אירועים**: `cart.created`, `cart.item_added`, `cart.item_updated`, `cart.item_removed`

2. **תהליך תשלום:**
   - פרטי משלוח
   - פרטי חיוב (אם שונה)
   - בחירת שיטת משלוח
   - בחירת שיטת תשלום
   - סקירה סופית
   - אישור הזמנה
   - **אירועים**: `order.created`, `payment.initiated`

3. **אחרי הזמנה:**
   - אישור הזמנה באימייל
   - עדכונים על סטטוס הזמנה
   - לינק למעקב הזמנה
   - **אירועים**: `order.paid`, `order.shipped`, `order.delivered`

### תהליך ניהול הזמנה

1. **הזמנה חדשה מתקבלת:**
   - התראה בדשבורד
   - אימייל לבעל החנות
   - הוספה אוטומטית לרשימת הזמנות
   - **אירוע**: `order.created`

2. **עיבוד הזמנה:**
   - אישור הזמנה
   - עדכון מלאי
   - יצירת תווית משלוח
   - עדכון לקוח
   - **אירועים**: `order.status_changed`, `inventory.updated`, `shipping.label_created`

3. **משלוח:**
   - עדכון סטטוס למשלוח
   - הוספת מספר מעקב
   - עדכון לקוח
   - **אירוע**: `order.shipped`

4. **השלמה:**
   - עדכון סטטוס להשלמה
   - בקשה לביקורת לקוח
   - **אירוע**: `order.delivered`

---

## 📱 מסכים מפורטים

### מסך דשבורד (`/dashboard`)
**ראה אפיון קודם - נשאר זהה**

### מסך רשימת מוצרים (`/products`)
**ראה אפיון קודם - נשאר זהה**

### מסך יצירת/עריכת מוצר (`/products/new` או `/products/[id]/edit`)
**ראה אפיון מפורט לעיל**

### מסך רשימת הזמנות (`/orders`)
**ראה אפיון קודם - נשאר זהה**

### מסך פרטי הזמנה (`/orders/[id]`)
**ראה אפיון מפורט לעיל**

### מסך רשימת לקוחות (`/customers`)
**ראה אפיון קודם - נשאר זהה**

### מסך פרטי לקוח (`/customers/[id]`)
**ראה אפיון קודם - נשאר זהה**

### מסך הגדרות חנות (`/settings/store`)
**מבנה המסך:**
- טאבים:
  - כללי
  - עיצוב
  - תשלום
  - משלוח
  - SEO
  - דומיין

**טאב כללי:**
- שם חנות
- תיאור
- לוגו
- קטגוריה
- פרטי יצירת קשר
- שעות פעילות

**טאב עיצוב:**
- בחירת תבנית
- צבעים
- פונטים
- תצוגה מקדימה

**טאב תשלום:**
- שיטות תשלום
- הגדרות מע"מ
- מטבע

**טאב משלוח:**
- הגדרות משלוח
- עלויות
- אזורים

**טאב SEO:**
- Meta tags
- Keywords
- Social sharing

**טאב דומיין:**
- דומיין מותאם אישית
- הגדרות DNS

---

## 🎯 פיקסלים וקודי מעקב (Tracking Pixels & Conversion Tracking)

### סקירה כללית
מערכת מעקב מתקדמת לאינטגרציה עם פלטפורמות שיווק דיגיטלי. המערכת מאפשרת לבעל החנות להזין את קודי המעקב שלו ולקבל מעקב אוטומטי אחר כל האירועים בחנות.

### פלטפורמות נתמכות
1. **פייסבוק פיקסל (Facebook Pixel)**
   - קוד פיקסל (Pixel ID)
   - מעקב אחר כל האירועים

2. **גוגל טאג מנג'ר (Google Tag Manager)**
   - Container ID
   - מעקב דרך GTM

3. **גוגל אנליטיקס (Google Analytics)**
   - Measurement ID (GA4)
   - מעקב אירועים מלא

4. **טיקטוק פיקסל (TikTok Pixel)**
   - Pixel ID
   - מעקב אחר כל האירועים

### אירועים נתמכים
המערכת שולחת אוטומטית את כל האירועים הבאים לכל הפלטפורמות הפעילות:

#### אירועי ניווט
- **PageView** - צפייה בעמוד
  - דף בית
  - עמוד מוצר
  - עמוד קטגוריה
  - עמוד Collection
  - עמוד חיפוש
  - עמוד עגלה
  - עמוד Checkout
  - עמוד חשבון לקוח

#### אירועי מוצר
- **ViewContent** - צפייה במוצר
  - פרטי מוצר: שם, מחיר, קטגוריה, SKU
- **SelectVariant** - בחירת וריאציה
  - פרטי וריאציה: שם, מחיר, SKU
- **AddToWishlist** - הוספה לרשימת משאלות
- **RemoveFromWishlist** - הסרה מרשימת משאלות

#### אירועי עגלה
- **AddToCart** - הוספה לעגלה
  - פרטי מוצר: שם, מחיר, כמות, SKU
- **RemoveFromCart** - הסרה מהעגלה
- **ViewCart** - צפייה בעגלה
  - סה"כ פריטים, סה"כ מחיר

#### אירועי רכישה
- **InitiateCheckout** - התחלת תהליך תשלום
  - סה"כ מחיר, מספר פריטים
- **AddPaymentInfo** - הוספת פרטי תשלום
- **Purchase** - רכישה הושלמה
  - פרטי הזמנה: מספר הזמנה, סכום, מוצרים, מע"מ, משלוח

#### אירועי לקוח
- **SignUp** - הרשמה
- **Login** - התחברות
- **Search** - חיפוש
  - מילת חיפוש, מספר תוצאות

### מסך ניהול פיקסלים (`/tracking-pixels`)

#### מבנה המסך:
- **כותרת:**
  - כותרת "פיקסלים וקודי מעקב"
  - כפתור "+ פיקסל חדש"

- **רשימת פיקסלים:**
  - כרטיס לכל פלטפורמה
  - סטטוס (פעיל/לא פעיל)
  - תאריך יצירה
  - פעולות: עריכה, מחיקה, הפעלה/כיבוי

#### טופס יצירת/עריכת פיקסל:
- **פלטפורמה:**
  - Dropdown: פייסבוק פיקסל / גוגל טאג מנג'ר / גוגל אנליטיקס / טיקטוק

- **פרטי פיקסל:**
  - **פייסבוק פיקסל:**
    - Pixel ID (מספר פיקסל)
    - Access Token (אופציונלי - לשליחת אירועים דרך API)
  
  - **גוגל טאג מנג'ר:**
    - Container ID
  
  - **גוגל אנליטיקס:**
    - Measurement ID (GA4)
    - API Secret (אופציונלי - לשליחת אירועים דרך API)
  
  - **טיקטוק פיקסל:**
    - Pixel ID
    - Access Token (אופציונלי)

- **הגדרות:**
  - Toggle: פעיל/לא פעיל
  - בחירת אירועים למעקב (ברירת מחדל: כל האירועים)

- **תצוגה מקדימה:**
  - רשימת כל האירועים שיישלחו
  - דוגמה לנתונים שיישלחו

### יישום טכני

#### מודל DB:
```prisma
model TrackingPixel {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  platform    String   // FACEBOOK, GOOGLE_TAG_MANAGER, GOOGLE_ANALYTICS, TIKTOK
  pixelId     String   // Pixel ID / Container ID / Measurement ID
  accessToken String?  // Access Token / API Secret (אופציונלי)
  isActive    Boolean  @default(true)
  events      String[] @default([]) // רשימת אירועים למעקב (אם ריק = כל האירועים)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([shopId])
  @@index([platform])
  @@map("tracking_pixels")
}
```

#### לוגיקה לשליחת אירועים:
- קומפוננטה `TrackingPixelProvider` בפרונט
- פונקציה `trackEvent(eventName, data)` ששולחת לכל הפיקסלים הפעילים
- כל פלטפורמה עם לוגיקה משלה לשליחת אירועים

#### קוד בפרונט:
- הוספת `<TrackingPixelProvider>` ב-layout של הפרונט
- קריאה ל-`trackEvent()` בכל אירוע:
  - PageView - בכל מעבר עמוד
  - ViewContent - בעמוד מוצר
  - SelectVariant - בבחירת וריאציה
  - AddToCart - בהוספה לעגלה
  - InitiateCheckout - בתחילת תשלום
  - Purchase - בסיום רכישה
  - וכו'

### דוגמאות לנתונים שנשלחים

#### PageView:
```javascript
{
  event: 'PageView',
  page_path: '/shop/myshop/products/123',
  page_title: 'מוצר מדהים',
  shop_slug: 'myshop'
}
```

#### ViewContent:
```javascript
{
  event: 'ViewContent',
  content_name: 'מוצר מדהים',
  content_ids: ['product-123'],
  content_type: 'product',
  value: 99.90,
  currency: 'ILS',
  contents: [{
    id: 'product-123',
    name: 'מוצר מדהים',
    price: 99.90,
    quantity: 1
  }]
}
```

#### AddToCart:
```javascript
{
  event: 'AddToCart',
  content_name: 'מוצר מדהים',
  content_ids: ['product-123'],
  content_type: 'product',
  value: 99.90,
  currency: 'ILS',
  contents: [{
    id: 'product-123',
    name: 'מוצר מדהים',
    price: 99.90,
    quantity: 1
  }]
}
```

#### Purchase:
```javascript
{
  event: 'Purchase',
  transaction_id: 'ORDER-12345',
  value: 199.80,
  currency: 'ILS',
  tax: 35.96,
  shipping: 30.00,
  contents: [{
    id: 'product-123',
    name: 'מוצר מדהים',
    price: 99.90,
    quantity: 2
  }]
}
```

### יתרונות
- ✅ מעקב אוטומטי אחר כל האירועים
- ✅ תמיכה בכל הפלטפורמות העיקריות
- ✅ הגדרה פשוטה - רק להזין את קוד הפיקסל
- ✅ רישום שמות האירועים בכל עמוד (לצורך בדיקה)
- ✅ תמיכה מלאה בכל האירועים: PageView, ViewContent, SelectVariant, AddToCart, InitiateCheckout, Purchase, וכו'

---

## 📱 תכונות עתידיות (Phase 2)

- מערכת אוטומציות (Automations) - מבוססת על אירועים
- אפליקציית מובייל לבעל החנות
- מערכת ביקורות ודירוגים
- מערכת המלצות מוצרים
- אינטגרציה עם רשתות חברתיות
- מערכת שיווק מתקדמת
- Multi-language support
- Multi-currency support
- Subscription plans
- API למפתחים

---

## ✅ סיכום

המערכת תהיה פשוטה לשימוש, מקצועית במראה, וגמישה בהתאמה. התמקדות בחוויית משתמש מעולה ובתהליכים מהירים ויעילים.

**עקרונות מרכזיים:**
- פשטות מעל הכל
- תהליך יצירת חנות מהיר (אשף)
- ניהול קל ואינטואיטיבי
- עיצוב מקצועי ומודרני
- תמיכה מלאה בעברית ו-RTL
- מערכת אירועים לאוטומציות עתידיות
- UI/UX בהשראת שופיפיי

---

**תאריך יצירה:** 6 בנובמבר 2025  
**תאריך עדכון:** 6 בנובמבר 2025  
**גרסה:** 2.0

---

## 📝 הערות נוספות

### תכונות שהוספו בגרסה 2.0:
1. **Collections** - אוספי מוצרים (ידניים ואוטומטיים)
2. **Gift Cards** - כרטיסי מתנה
3. **Abandoned Carts** - עגלות נטושות עם אוטומציה
4. **Pages** - דפים סטטיים (אודות, צור קשר, וכו')
5. **Navigation** - בניית תפריטים
6. **Reviews & Ratings** - ביקורות ודירוגים
7. **Wishlist** - רשימת משאלות
8. **Product Recommendations** - המלצות מוצרים
9. **Advanced Search** - חיפוש מתקדם
10. **Inventory Management** - ניהול מלאי מתקדם
11. **Shipping Zones** - אזורי משלוח
12. **Tax Settings** - הגדרות מיסים מתקדמות
13. **Returns & Exchanges** - החזרים והחלפות
14. **Store Credit** - אשראי בחנות
15. **Wholesale Pricing** - מחירי סיטונאות
16. **Product Bundles** - חבילות מוצרים
17. **Custom Fields** - שדות מותאמים אישית
18. **Product Videos** - וידאו למוצרים
19. **Social Login** - התחברות חברתית
20. **2FA** - אימות דו-שלבי
21. **API & Webhooks** - API מלא ו-Webhooks
22. **Email Marketing** - שיווק באימייל
23. **SMS Notifications** - התראות SMS
24. **PWA Support** - Progressive Web App
25. **Barcode & QR Codes** - ברקודים ו-QR codes
26. **Blog System** - מערכת בלוג מלאה
27. **Tracking Pixels & Conversion Tracking** - פיקסלים וקודי מעקב (פייסבוק, גוגל טאג מנג'ר, גוגל אנליטיקס, טיקטוק)

### תכונות עתידיות (Phase 2):
- מערכת אוטומציות מתקדמת (Automations)
- אפליקציית מובייל לבעל החנות
- אינטגרציות נוספות (WhatsApp, Instagram Shopping, וכו')
- Multi-language support
- Multi-currency support
- Subscription plans
- App Marketplace
- Dropshipping support
- Print on Demand
- 360° Product View
- AR Product View
