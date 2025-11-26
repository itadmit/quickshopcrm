# יישום הטבות מועדון פרימיום

## סטטוס נוכחי

✅ **נשמר במסד הנתונים** - ההגדרות נשמרות ב-`config.benefits`  
⚠️ **לא מיושם במערכת** - צריך להוסיף את הלוגיקה

---

## הטבות שצריך ליישם

### 1. גישה מוקדמת למבצעים (Early Access to Sales)

**מה זה אמור לעשות:**
- לקוחות ברמות מסוימות יכולים לראות מבצעים לפני כולם
- מבצעים עם תאריך התחלה עתידי יוצגו ללקוחות עם early access

**איפה צריך להוסיף:**
- `app/api/storefront/[slug]/products/[id]/discounts/route.ts` - לבדוק אם יש early access
- `lib/cart-calculations.ts` - לבדוק early access ב-discounts
- דף המוצרים - להציג מבצעים עתידיים ללקוחות עם early access

**קוד לדוגמה:**
```typescript
// בדיקת early access
const hasEarlyAccess = customer?.premiumClubTier && 
  config.benefits?.earlyAccessToSales &&
  tier?.benefits?.earlyAccess

if (hasEarlyAccess) {
  // להציג מבצעים גם אם startDate בעתיד
  // או להציג מבצעים לפני כולם
}
```

---

### 2. מוצרים בלעדיים (Exclusive Products)

**מה זה אמור לעשות:**
- מוצרים שזמינים רק לרמות מסוימות
- לקוחות ללא רמה מתאימה לא יראו את המוצר

**איפה צריך להוסיף:**
- מודל Product - להוסיף שדה `exclusiveToTier: String[]` (או JSON)
- `app/api/storefront/[slug]/products/route.ts` - לסנן מוצרים לפי רמה
- `app/shop/[slug]/products/[id]/page.tsx` - לבדוק גישה למוצר
- דף המוצרים - להסתיר מוצרים בלעדיים

**קוד לדוגמה:**
```typescript
// בדיקת גישה למוצר בלעדי
if (product.exclusiveToTier && product.exclusiveToTier.length > 0) {
  if (!customer?.premiumClubTier || 
      !product.exclusiveToTier.includes(customer.premiumClubTier)) {
    // להחזיר 403 או להסתיר את המוצר
    return NextResponse.json({ error: "מוצר בלעדי" }, { status: 403 })
  }
}
```

---

### 3. תמיכה VIP (VIP Support)

**מה זה אמורה לעשות:**
- שירות לקוחות מועדף לרמות גבוהות
- זמן תגובה מהיר יותר
- ערוץ תמיכה ייעודי

**איפה צריך להוסיף:**
- דף התמיכה (`/support` או `/help`) - להציג ערוץ VIP
- API של תמיכה - לסמן תמיכות VIP
- אימיילים/התראות - לטפל בתמיכות VIP בעדיפות

**קוד לדוגמה:**
```typescript
// בדיקת תמיכה VIP
const isVip = customer?.premiumClubTier && 
  config.benefits?.vipSupport &&
  tier?.benefits?.vipSupport

if (isVip) {
  // לסמן את התמיכה כ-VIP
  // לשלוח התראה מיידית
  // להציג בדף התמיכה
}
```

---

### 4. מתנה חודשית (Monthly Gift)

**מה זה אמור לעשות:**
- מתנה חודשית לרמות גבוהות
- אוטומטית או ידנית

**איפה צריך להוסיף:**
- Cron job או scheduled task - לבדוק כל חודש
- API endpoint - לשלוח מתנות
- דף הלקוח - להציג מתנות זמינות

**קוד לדוגמה:**
```typescript
// בדיקת מתנה חודשית
const eligibleForMonthlyGift = customer?.premiumClubTier && 
  config.benefits?.monthlyGift &&
  tier?.benefits?.monthlyGift

if (eligibleForMonthlyGift) {
  // לבדוק אם כבר קיבל מתנה החודש
  // לשלוח מתנה (אימייל עם קוד הנחה או מוצר חינם)
}
```

---

## סיכום - מה מיושם ומה לא

### ✅ מיושם:
- ✅ שמירת הגדרות במסד הנתונים
- ✅ הנחות לפי רמות (ב-checkout וב-cart)
- ✅ עדכון רמה אוטומטי אחרי הזמנה
- ✅ משלוח חינם לפי רמה (אם מוגדר ב-tier)

### ⚠️ לא מיושם (צריך להוסיף):
- ⚠️ גישה מוקדמת למבצעים
- ⚠️ מוצרים בלעדיים
- ⚠️ תמיכה VIP
- ⚠️ מתנה חודשית
- ⚠️ הנחת יום הולדת (אם מוגדר)
- ⚠️ צבירת נקודות (אם יש מערכת נקודות)

---

## המלצות ליישום

### עדיפות גבוהה:
1. **מוצרים בלעדיים** - הכי חשוב, משפיע ישירות על המכירות
2. **גישה מוקדמת למבצעים** - יכול להגדיל המכירות

### עדיפות בינונית:
3. **הנחת יום הולדת** - יכול להגדיל נאמנות
4. **תמיכה VIP** - שירות לקוחות טוב יותר

### עדיפות נמוכה:
5. **מתנה חודשית** - דורש תחזוקה שוטפת
6. **צבירת נקודות** - רק אם יש מערכת נקודות

---

## הערות טכניות

- כל ההטבות נשמרות ב-`config.benefits` של התוסף
- צריך לבדוק גם את `tier.benefits` לכל רמה
- ההטבות הכלליות (`config.benefits`) פועלות על כל הרמות
- ההטבות הספציפיות (`tier.benefits`) פועלות רק על רמה מסוימת

