# אינטגרציה עם PayPlus - תוספים בתשלום

## סקירה

על פי הדוקומנטציה של PayPlus, יש לנו מספר אפשרויות ליישם תשלום חוזר לתוספים:

## אפשרויות תשלום

### 1. **הוראת קבע נפרדת לכל תוסף** (מומלץ - כמו שופיפיי)
- כל תוסף בתשלום = הוראת קבע נפרדת ב-PayPlus
- יתרונות:
  - פשוט לניהול
  - ביטול נפרד לכל תוסף
  - גמישות מלאה
- חסרונות:
  - מספר הוראות קבע רב

### 2. **הוראת קבע אחת עם כל התוספים**
- הוראת קבע אחת שמכילה את כל התוספים
- יתרונות:
  - תשלום אחד
  - פשוט יותר ללקוח
- חסרונות:
  - צריך לעדכן את הוראת הקבע כל פעם שמוסיפים/מסירים תוסף
  - מורכב יותר לניהול

**המלצה: אפשרות 1 - הוראת קבע נפרדת לכל תוסף**

---

## תהליך רכישת תוסף בתשלום

### שלב 1: משתמש בוחר תוסף
```typescript
// משתמש לוחץ "התקן" על תוסף בתשלום
POST /api/plugins/[slug]/subscribe
```

### שלב 2: בדיקת Token קיים
```typescript
// בדיקה אם יש token במנוי הבסיסי
const subscription = await prisma.subscription.findUnique({
  where: { companyId }
})

const hasToken = subscription?.paymentDetails?.recurringToken
```

### שלב 3א: אם יש Token - יצירת הוראת קבע ישירה
```typescript
// יצירת הוראת קבע ישירה עם Token הקיים
const recurringResult = await createRecurringPayment(credentials, {
  terminal_uid: credentials.terminalUid,
  customer_uid: subscription.paymentDetails.customerUid,
  card_token: subscription.paymentDetails.recurringToken,
  cashier_uid: subscription.paymentDetails.cashierUid,
  currency_code: "ILS",
  instant_first_payment: true, // גבייה מידית
  recurring_type: 2, // Monthly
  recurring_range: 1, // כל חודש
  number_of_charges: 0, // ללא הגבלה
  start_date: getNextMonthDate(), // תאריך החודש הבא (YYYY-MM-DD)
  items: [{
    product_uid: pluginProductUid, // צריך ליצור product ב-PayPlus
    quantity: 1,
    price: plugin.price,
  }],
  send_customer_success_email: true,
  customer_failure_email: true,
  extra_info: JSON.stringify({
    type: "plugin_subscription",
    pluginId: plugin.id,
    companyId: companyId,
  }),
})
```

### שלב 3ב: אם אין Token - יצירת Payment Page
```typescript
// יצירת payment page עם createToken: true
const paymentLink = await generatePaymentLink(credentials, {
  amount: plugin.price,
  currencyCode: "ILS",
  chargeMethod: 1, // Charge (תשלום רגיל)
  createToken: true, // חשוב! יוצר token
  customerName: user.name,
  customerEmail: user.email,
  items: [{
    name: plugin.name,
    quantity: 1,
    price: plugin.price,
    vatType: "0", // VAT included
  }],
  moreInfo: JSON.stringify({
    type: "plugin_subscription",
    pluginId: plugin.id,
    companyId: companyId,
  }),
  refUrlSuccess: `${baseUrl}/api/plugins/billing/callback?status=success&pluginId=${plugin.id}`,
  refUrlFailure: `${baseUrl}/api/plugins/billing/callback?status=failure&pluginId=${plugin.id}`,
  refUrlCallback: `${baseUrl}/api/plugins/billing/webhook`,
})
```

### שלב 4: Webhook - יצירת הוראת קבע
```typescript
// ב-webhook, לאחר תשלום מוצלח:
// 1. שמירת token
// 2. יצירת הוראת קבע עם ה-token
// 3. עדכון PluginSubscription
```

---

## יצירת Product ב-PayPlus

לפני יצירת הוראת קבע, צריך ליצור Product ב-PayPlus:

```typescript
// lib/plugins/payplus-products.ts
export async function getOrCreatePayPlusProduct(
  credentials: PayPlusCredentials,
  pluginName: string,
  price: number
): Promise<string> {
  // 1. חיפוש product קיים לפי שם
  const existing = await searchPayPlusProduct(credentials, pluginName)
  if (existing) {
    return existing.uid
  }
  
  // 2. יצירת product חדש
  const product = await createPayPlusProduct(credentials, {
    name: pluginName,
    price: Math.round(price * 100), // PayPlus מצפה לאגורות
    currency_code: "ILS",
    vat_type: 0, // VAT included
  })
  
  return product.uid
}
```

---

## עדכון הוראת קבע קיימת

כאשר מוסיפים/מסירים תוספים, יש שתי אפשרויות:

### אפשרות 1: עדכון הוראת קבע (מומלץ)
```typescript
// PayPlus תומך ב-UpdateRecurringPayment
POST /api/v1.0/RecurringPayments/Update/{uid}

// עדכון items בהוראת הקבע
{
  terminal_uid: "...",
  customer_uid: "...",
  card_token: "...",
  cashier_uid: "...",
  currency_code: "ILS",
  instant_first_payment: false,
  recurring_type: 2,
  recurring_range: 1,
  number_of_charges: 0,
  start_date: "...",
  items: [
    // כל התוספים הפעילים
    { product_uid: "...", quantity: 1, price: 100 },
    { product_uid: "...", quantity: 1, price: 50 },
  ]
}
```

### אפשרות 2: הוראת קבע נפרדת לכל תוסף (מומלץ יותר)
- כל תוסף = הוראת קבע נפרדת
- פשוט יותר לניהול
- ביטול נפרד

**המלצה: אפשרות 2 - הוראת קבע נפרדת**

---

## ביטול תוסף

### 1. ביטול הוראת קבע ב-PayPlus
```typescript
// PayPlus API
POST /api/v1.0/RecurringPayments/DeleteRecurring/{uid}

// או כיבוי (Valid: false)
POST /api/v1.0/RecurringPayments/{uid}/Valid
{
  terminal_uid: "...",
  valid: false
}
```

### 2. עדכון PluginSubscription
```typescript
await prisma.pluginSubscription.update({
  where: { companyId_pluginId: { companyId, pluginId } },
  data: {
    status: "CANCELLED",
    cancelledAt: new Date(),
    endDate: getEndOfCurrentMonth(), // נשאר פעיל עד סוף החודש
  },
})
```

---

## Webhook לטיפול בחיובים חוזרים

```typescript
// app/api/plugins/billing/webhook/route.ts
export async function POST(req: NextRequest) {
  // 1. בדיקת hash (אבטחה)
  const isValid = validatePayPlusHash(req, body)
  
  // 2. פענוח more_info
  const info = JSON.parse(body.more_info || "{}")
  
  if (info.type === "plugin_subscription") {
    const { pluginId, companyId } = info
    
    if (body.status === "success") {
      // עדכון תאריך תשלום אחרון
      await prisma.pluginSubscription.update({
        where: {
          companyId_pluginId: { companyId, pluginId }
        },
        data: {
          lastPaymentDate: new Date(),
          lastPaymentAmount: parseFloat(body.amount),
          nextBillingDate: getNextMonthDate(),
          status: "ACTIVE",
        },
      })
    } else {
      // תשלום נכשל
      await prisma.pluginSubscription.update({
        where: {
          companyId_pluginId: { companyId, pluginId }
        },
        data: {
          status: "FAILED",
        },
      })
      
      // כיבוי התוסף
      await prisma.plugin.update({
        where: { id: pluginId },
        data: { isActive: false },
      })
    }
  }
}
```

---

## עדכון lib/payplus.ts

צריך להוסיף פונקציות:

```typescript
// 1. יצירת Product
export async function createPayPlusProduct(...)

// 2. חיפוש Product
export async function searchPayPlusProduct(...)

// 3. עדכון הוראת קבע
export async function updateRecurringPayment(...)

// 4. ביטול הוראת קבע
export async function deleteRecurringPayment(...)

// 5. כיבוי/הפעלת הוראת קבע
export async function setRecurringPaymentValid(...)
```

---

## סיכום - תהליך מלא

### רכישת תוסף חדש:
1. משתמש בוחר תוסף בתשלום
2. בדיקה אם יש token במנוי הבסיסי
3. אם יש token:
   - יצירת product ב-PayPlus (אם לא קיים)
   - יצירת הוראת קבע עם `instant_first_payment: true`
   - עדכון PluginSubscription
4. אם אין token:
   - יצירת payment page עם `createToken: true`
   - ב-webhook: שמירת token + יצירת הוראת קבע

### חידוש אוטומטי:
- PayPlus גובה אוטומטית כל חודש
- Webhook מעדכן את `lastPaymentDate`
- אם תשלום נכשל → התוסף נכבה

### ביטול:
- ביטול הוראת קבע ב-PayPlus
- עדכון status ל-CANCELLED
- התוסף נשאר פעיל עד סוף החודש

---

## הערות חשובות מהדוקומנטציה

1. **start_date**: לא יכול להיות היום. אם `instant_first_payment: true`, צריך להיות החודש הבא
2. **card_token**: חובה ל-Recurring Payment
3. **customer_uid**: חובה אם `use_token: true`
4. **cashier_uid**: חובה ל-Recurring Payment
5. **product_uid**: צריך ליצור product ב-PayPlus לפני יצירת הוראת קבע
6. **price**: PayPlus מצפה לאגורות (מספר שלם)

