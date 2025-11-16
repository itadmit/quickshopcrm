# ארכיטקטורת תמחור ובילינג לתוספים

## סקירה כללית

מערכת תמחור ובילינג מקצועית לתוספים, בדומה לשופיפיי:
- תוספים חינמיים - זמינים מיד
- תוספים בתשלום - דורשים מנוי חודשי
- ניהול מרכזי על ידי סופר אדמין
- הוראת קבע אוטומטית דרך PayPlus
- ניהול מנויים - הוספה/הסרה של תוספים

---

## מודל מסד הנתונים

### עדכון מודל Plugin

```prisma
model Plugin {
  // ... שדות קיימים ...
  
  // תמחור
  isFree          Boolean         @default(true)  // האם התוסף חינמי
  price           Float?         // מחיר חודשי (אם לא חינמי)
  currency        String         @default("ILS")
  
  // ניהול על ידי סופר אדמין
  isEditable      Boolean         @default(true)  // האם ניתן לערוך (סופר אדמין)
  isDeletable     Boolean         @default(false) // האם ניתן למחוק (רק תוספים לא מובנים)
  
  // Metadata לניהול
  adminNotes      String?         // הערות לסופר אדמין
  displayOrder    Int            @default(0)     // סדר תצוגה במרקטפלייס
  
  // קשרים
  subscriptions   PluginSubscription[]  // מנויים לתוסף זה
}
```

### מודל PluginSubscription (מנוי לתוסף)

```prisma
model PluginSubscription {
  id                    String             @id @default(cuid())
  companyId             String
  pluginId              String
  
  // סטטוס
  status                PluginSubscriptionStatus @default(PENDING)
  isActive              Boolean             @default(false)
  
  // תאריכים
  startDate             DateTime?
  endDate               DateTime?
  nextBillingDate       DateTime?
  
  // תשלום
  paymentMethod         String?             // PayPlus
  paymentDetails        Json?               // פרטי תשלום PayPlus
  recurringPaymentUid   String?            // UID של הוראת הקבע ב-PayPlus
  cardToken             String?             // Token לכרטיס אשראי
  
  // מחיר
  monthlyPrice          Float
  lastPaymentDate       DateTime?
  lastPaymentAmount     Float?
  
  // ביטול
  cancelledAt           DateTime?
  cancellationReason    String?
  
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  
  company               Company             @relation(fields: [companyId], references: [id], onDelete: Cascade)
  plugin                Plugin              @relation(fields: [pluginId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, pluginId])
  @@index([companyId])
  @@index([pluginId])
  @@index([status])
  @@index([nextBillingDate])
  @@map("plugin_subscriptions")
}

enum PluginSubscriptionStatus {
  PENDING       // ממתין לתשלום
  ACTIVE        // פעיל
  CANCELLED     // בוטל
  EXPIRED       // פג תוקף
  FAILED        // תשלום נכשל
}
```

---

## תהליך רכישת תוסף בתשלום

### 1. משתמש בוחר תוסף
- בדיקה אם התוסף חינמי או בתשלום
- אם חינמי → התקנה מידית
- אם בתשלום → מעבר לתהליך תשלום

### 2. יצירת PluginSubscription
- יצירת רשומה ב-`PluginSubscription` עם status `PENDING`
- שמירת פרטי התוסף והמחיר

### 3. תשלום ראשוני
- יצירת קישור תשלום ב-PayPlus
- אם יש token קיים → שימוש ב-`chargeByToken`
- אם אין token → יצירת payment page עם `createToken: true`

### 4. יצירת הוראת קבע
לאחר תשלום ראשוני מוצלח:
- יצירת הוראת קבע ב-PayPlus (`createRecurringPayment`)
- שמירת `recurringPaymentUid` ב-`PluginSubscription`
- עדכון status ל-`ACTIVE`

### 5. חידוש אוטומטי
- PayPlus גובה אוטומטית כל חודש
- Webhook מעדכן את `lastPaymentDate` ו-`lastPaymentAmount`
- אם תשלום נכשל → status `FAILED`, התוסף נכבה

---

## אינטגרציה עם PayPlus

### יצירת הוראת קבע לתוסף

```typescript
// lib/plugins/billing.ts
export async function createPluginRecurringPayment(
  companyId: string,
  pluginId: string,
  cardToken: string
) {
  const plugin = await prisma.plugin.findUnique({ where: { id: pluginId } })
  const subscription = await prisma.subscription.findUnique({ 
    where: { companyId } 
  })
  const payplusCredentials = await getPayPlusCredentials(companyId, true) // SaaS mode
  
  if (!plugin || !subscription || !payplusCredentials) {
    throw new Error("Missing required data")
  }
  
  // יצירת product ב-PayPlus (אם לא קיים)
  const productUid = await getOrCreatePayPlusProduct(
    payplusCredentials,
    plugin.name,
    plugin.price!
  )
  
  // יצירת הוראת קבע
  const recurringResult = await createRecurringPayment(payplusCredentials, {
    customerUid: subscription.paymentDetails.customerUid,
    cardToken: cardToken,
    cashierUid: subscription.paymentDetails.cashierUid,
    currencyCode: "ILS",
    instantFirstPayment: true, // גבייה מידית
    recurringType: 2, // Monthly
    recurringRange: 1, // כל חודש
    numberOfCharges: 0, // ללא הגבלה
    startDate: getNextMonthDate(), // מתחיל בחודש הבא
    items: [{
      productUid: productUid,
      quantity: 1,
      price: plugin.price!,
    }],
    sendCustomerSuccessEmail: true,
    customerFailureEmail: true,
    extraInfo: JSON.stringify({
      type: "plugin_subscription",
      pluginId: pluginId,
      companyId: companyId,
    }),
  })
  
  if (!recurringResult.success) {
    throw new Error(recurringResult.error)
  }
  
  // עדכון PluginSubscription
  await prisma.pluginSubscription.update({
    where: { companyId_pluginId: { companyId, pluginId } },
    data: {
      status: "ACTIVE",
      recurringPaymentUid: recurringResult.data.uid,
      cardToken: cardToken,
      startDate: new Date(),
      nextBillingDate: getNextMonthDate(),
      isActive: true,
    },
  })
}
```

### Webhook לטיפול בחיובים חוזרים

```typescript
// app/api/plugins/billing/webhook/route.ts
export async function POST(req: NextRequest) {
  // קבלת webhook מ-PayPlus על חיוב חוזר
  // עדכון lastPaymentDate ו-lastPaymentAmount
  // אם תשלום נכשל - עדכון status ל-FAILED וכיבוי התוסף
}
```

---

## ניהול תוספים על ידי סופר אדמין

### דף ניהול: `/admin/plugins`

**תכונות:**
1. רשימת כל התוספים
2. עריכה: שם, תיאור, מחיר, קטגוריה
3. הוספת תוסף חדש
4. מחיקת תוסף (רק אם לא מובנה ולא בשימוש)
5. הגדרת תמחור
6. תצוגה מקדימה

**API Routes:**
- `GET /api/admin/plugins` - רשימת כל התוספים
- `POST /api/admin/plugins` - יצירת תוסף חדש
- `PUT /api/admin/plugins/[id]` - עדכון תוסף
- `DELETE /api/admin/plugins/[id]` - מחיקת תוסף

---

## הצגת תוספים למשתמש

### דף מרקטפלייס: `/settings/plugins`

**תצוגה:**
- תוספים חינמיים - כפתור "התקן" מיד
- תוספים בתשלום - כפתור "התקן - ₪XX/חודש"
- תוספים מותקנים - כפתור "הגדרות" / "בטל מנוי"

**מידע:**
- מחיר חודשי
- תיאור
- תכונות
- תמונות/מסכים

---

## ניהול מנויים בתוך הגדרות המנוי

### עדכון דף `/settings?tab=subscription`

**הוספת סעיף "תוספים פעילים":**
- רשימת כל התוספים הפעילים
- מחיר כל תוסף
- סכום כולל
- כפתור "בטל מנוי" לכל תוסף

**חישוב מחיר כולל:**
```
מחיר בסיס מנוי + סכום כל התוספים הפעילים
```

---

## תהליך ביטול תוסף

### 1. משתמש מבטל
- עדכון `cancelledAt` ב-`PluginSubscription`
- status → `CANCELLED`
- התוסף נשאר פעיל עד סוף התקופה המשולמת

### 2. ביטול הוראת קבע ב-PayPlus
- קריאה ל-`DeleteRecurringPayment` ב-PayPlus
- התוסף יישאר פעיל עד `endDate`

### 3. כיבוי אוטומטי
- ב-`endDate` → התוסף נכבה אוטומטית
- status → `EXPIRED`

---

## עדכון הוראת קבע קיימת

כאשר מוסיפים/מסירים תוספים, יש שתי אפשרויות:

### אפשרות 1: עדכון הוראת קבע קיימת (מומלץ)
- PayPlus תומך ב-`UpdateRecurringPayment`
- עדכון `items` בהוראת הקבע
- עדכון `number_of_charges` אם צריך

### אפשרות 2: יצירת הוראת קבע חדשה
- ביטול הישנה
- יצירת חדשה עם כל התוספים

**המלצה:** אפשרות 1 - יותר נקי ופשוט

---

## Webhook לטיפול בחיובים

```typescript
// app/api/plugins/billing/webhook/route.ts
export async function POST(req: NextRequest) {
  const body = await req.json()
  
  // בדיקת hash (אבטחה)
  const isValid = validatePayPlusHash(req, body)
  if (!isValid) {
    return NextResponse.json({ error: "Invalid hash" }, { status: 401 })
  }
  
  const { 
    transaction_uid,
    payment_request_uid,
    amount,
    currency_code,
    status,
    more_info,
    token,
  } = body
  
  // פענוח more_info
  const info = JSON.parse(more_info || "{}")
  
  if (info.type === "plugin_subscription") {
    const { pluginId, companyId } = info
    
    if (status === "success") {
      // עדכון תאריך תשלום אחרון
      await prisma.pluginSubscription.update({
        where: {
          companyId_pluginId: { companyId, pluginId }
        },
        data: {
          lastPaymentDate: new Date(),
          lastPaymentAmount: parseFloat(amount),
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
  
  return NextResponse.json({ received: true })
}
```

---

## סיכום

**מה צריך להוסיף:**
1. ✅ מודל `PluginSubscription` למסד הנתונים
2. ✅ עדכון מודל `Plugin` - שדות תמחור
3. ✅ API routes לניהול תוספים (סופר אדמין)
4. ✅ API routes לרכישת תוספים
5. ✅ אינטגרציה עם PayPlus - הוראת קבע
6. ✅ Webhook לטיפול בחיובים
7. ✅ עדכון דף המנוי - הצגת תוספים
8. ✅ דף ניהול תוספים למשתמש

**איך זה עובד (כמו שופיפיי):**
- כל תוסף בתשלום = מנוי נפרד
- כל מנוי = הוראת קבע נפרדת ב-PayPlus
- המשתמש רואה את כל התוספים בהגדרות המנוי
- יכול לבטל כל תוסף בנפרד
- התשלום מתחדש אוטומטית כל חודש

