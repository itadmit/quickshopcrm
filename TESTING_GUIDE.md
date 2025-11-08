# מדריך טסטים - Quick Shop

## סקירה כללית

נוצרה מערכת טסטים מקיפה ל-API endpoints של Quick Shop. הטסטים בודקים:
- אימות והרשאות
- ולידציה של נתונים
- יצירה, קריאה, עדכון ומחיקה של נתונים
- סינון וחיפוש
- הפרדה בין חברות (multi-tenant)

## התקנה והגדרה

### 1. התקנת חבילות

```bash
npm install
```

החבילות הבאות הותקנו:
- `jest` - מסגרת הטסטים
- `jest-environment-jsdom` - סביבת טסטים לדפדפן
- `@testing-library/jest-dom` - כלי עזר לטסטים
- `@types/jest` - טיפוסים ל-Jest

### 2. הגדרת מסד נתונים לטסטים

**חשוב**: מומלץ להשתמש במסד נתונים נפרד לטסטים!

1. צור מסד נתונים חדש:
```sql
CREATE DATABASE quickshop_test;
```

2. עדכן את `.env` או צור `.env.test`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/quickshop_test?schema=public"
NEXTAUTH_SECRET="test-secret-key"
SUPER_ADMIN_EMAIL="admin@test.com"
```

3. הרץ migrations:
```bash
npx prisma migrate deploy
# או
npx prisma db push
```

## הרצת טסטים

### הרצת כל הטסטים

```bash
npm test
```

### הרצת טסטים במצב watch (עדכון אוטומטי)

```bash
npm run test:watch
```

### הרצת טסטים עם coverage

```bash
npm run test:coverage
```

### הרצת טסט ספציפי

```bash
npm test -- auth.test.ts
npm test -- products.test.ts
```

## מבנה הטסטים

```
__tests__/
├── setup/
│   └── test-utils.ts      # פונקציות עזר לטסטים
├── api/
│   ├── auth.test.ts        # טסטים ל-Auth API
│   ├── products.test.ts     # טסטים ל-Products API
│   ├── shops.test.ts       # טסטים ל-Shops API
│   ├── customers.test.ts   # טסטים ל-Customers API
│   └── orders.test.ts      # טסטים ל-Orders API
└── README.md               # תיעוד הטסטים
```

## טסטים קיימים

### ✅ Auth API (`/api/auth/register`)

- ✅ יצירת משתמש חדש בהצלחה
- ✅ דחיית הרשמה עם אימייל קיים
- ✅ ולידציה של נתונים (שם קצר מדי, אימייל לא תקין, סיסמה קצרה מדי)
- ✅ יצירת SUPER_ADMIN אם האימייל תואם

### ✅ Products API (`/api/products`)

**GET:**
- ✅ החזרת רשימת מוצרים
- ✅ סינון לפי סטטוס
- ✅ חיפוש מוצרים לפי שם
- ✅ דחיית גישה ללא אימות

**POST:**
- ✅ יצירת מוצר חדש
- ✅ ולידציה של נתונים
- ✅ בדיקת בעלות על חנות
- ✅ יצירת slug אוטומטית

### ✅ Shops API (`/api/shops`)

**GET:**
- ✅ החזרת רשימת חנויות
- ✅ סינון לפי חברה (רק חנויות של החברה הנוכחית)
- ✅ דחיית גישה ללא אימות

**POST:**
- ✅ יצירת חנות חדשה
- ✅ דחיית slug קיים
- ✅ ולידציה של נתונים
- ✅ יצירת אירוע `shop.created`

### ✅ Customers API (`/api/customers`)

**GET:**
- ✅ החזרת רשימת לקוחות
- ✅ סינון לפי tier (REGULAR, VIP, PREMIUM)
- ✅ חיפוש לקוחות לפי אימייל או שם
- ✅ דחיית גישה ללא אימות

**POST:**
- ✅ יצירת לקוח חדש
- ✅ דחיית אימייל קיים
- ✅ בדיקת הרשאות ADMIN
- ✅ בדיקת בעלות על חנות
- ✅ יצירת אירוע `customer.created`

### ✅ Orders API (`/api/orders`)

**GET:**
- ✅ החזרת רשימת הזמנות
- ✅ סינון לפי סטטוס
- ✅ חיפוש הזמנות לפי מספר הזמנה או שם לקוח
- ✅ סינון לפי חברה (רק הזמנות של החברה הנוכחית)
- ✅ דחיית גישה ללא אימות

## פונקציות עזר (`test-utils.ts`)

הקובץ `__tests__/setup/test-utils.ts` מכיל פונקציות עזר שימושיות:

### `createTestUser(data?)`
יוצר משתמש בדיקה עם חברה ומנוי נסיון.

```typescript
const { user, company, password } = await createTestUser({
  email: 'test@example.com',
  name: 'Test User',
  role: 'ADMIN'
})
```

### `createTestShop(companyId, data?)`
יוצר חנות בדיקה.

```typescript
const shop = await createTestShop(companyId, {
  name: 'Test Shop',
  slug: 'test-shop'
})
```

### `createTestProduct(shopId, data?)`
יוצר מוצר בדיקה.

```typescript
const product = await createTestProduct(shopId, {
  name: 'Test Product',
  price: 100,
  inventoryQty: 10
})
```

### `createTestCustomer(shopId, data?)`
יוצר לקוח בדיקה.

```typescript
const customer = await createTestCustomer(shopId, {
  email: 'customer@test.com',
  firstName: 'John',
  lastName: 'Doe'
})
```

### `cleanupTestData()`
מנקה את כל נתוני הבדיקה מהמסד נתונים.

```typescript
beforeEach(async () => {
  await cleanupTestData()
})
```

### `createMockSession(user)`
יוצר session mock לטסטים.

```typescript
const mockSession = createMockSession(user)
```

## דוגמה לטסט חדש

```typescript
import { GET as handler } from '@/app/api/[endpoint]/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { createTestUser, cleanupTestData } from '../setup/test-utils'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

describe('[Endpoint] API', () => {
  let testUser: any
  let mockSession: any

  beforeEach(async () => {
    await cleanupTestData()
    const result = await createTestUser()
    testUser = result.user

    mockSession = {
      user: {
        id: testUser.id,
        email: testUser.email,
        companyId: testUser.companyId,
        role: testUser.role,
      },
    }

    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  it('אמור לעבוד', async () => {
    const req = new NextRequest('http://localhost/api/[endpoint]')
    const response = await handler(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    // בדיקות נוספות...
  })
})
```

## פתרון בעיות

### שגיאת חיבור למסד נתונים

ודא ש:
1. המסד נתונים קיים ופועל
2. ה-`DATABASE_URL` נכון ב-`.env`
3. הרצת `npx prisma migrate deploy` או `npx prisma db push`

### שגיאת "Module not found"

ודא ש:
1. הרצת `npm install`
2. כל ה-imports נכונים
3. ה-`tsconfig.json` מכיל את ה-paths הנכונים

### טסטים נכשלים בגלל נתונים קיימים

ודא ש:
1. אתה משתמש במסד נתונים נפרד לטסטים
2. ה-`cleanupTestData()` נקרא ב-`beforeEach`
3. אין נתונים קיימים במסד הנתונים

## Best Practices

1. **ניקוי נתונים**: תמיד נקה נתונים ב-`beforeEach` ו-`afterAll`
2. **Mocking**: השתמש ב-mock של `next-auth` לטסטים
3. **בידוד**: כל טסט צריך להיות עצמאי ולא תלוי בטסטים אחרים
4. **ולידציה**: בדוק גם מקרי שגיאה ולא רק מקרי הצלחה
5. **תיאורים**: השתמש בשמות תיאוריים לטסטים (בעברית)

## Coverage

להרצת טסטים עם coverage:

```bash
npm run test:coverage
```

התוצאות יוצגו בקונסולה ובתיקייה `coverage/`.

## המשך פיתוח

כדי להוסיף טסטים נוספים:

1. צור קובץ חדש ב-`__tests__/api/`
2. השתמש בפונקציות העזר מ-`test-utils.ts`
3. ודא שאתה מנקה נתונים ב-`beforeEach`
4. הוסף mock ל-`next-auth` אם צריך
5. הרץ את הטסטים ובדוק שהכל עובד

## תמיכה

אם יש בעיות או שאלות, בדוק:
1. את הקובץ `__tests__/README.md` לתיעוד מפורט
2. את הקבצים הקיימים כדוגמאות
3. את התיעוד של Jest: https://jestjs.io/docs/getting-started

