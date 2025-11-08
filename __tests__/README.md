# טסטים ל-API

מערכת טסטים מקיפה ל-API endpoints של Quick Shop.

## התקנה

```bash
npm install
```

## הרצת טסטים

```bash
# הרצת כל הטסטים
npm test

# הרצת טסטים במצב watch
npm run test:watch

# הרצת טסטים עם coverage
npm run test:coverage
```

## מבנה הטסטים

```
__tests__/
├── setup/
│   └── test-utils.ts      # פונקציות עזר לטסטים
├── api/
│   ├── auth.test.ts            # טסטים ל-Auth API
│   ├── products.test.ts         # טסטים ל-Products API
│   ├── shops.test.ts           # טסטים ל-Shops API
│   ├── customers.test.ts       # טסטים ל-Customers API
│   ├── orders.test.ts          # טסטים ל-Orders API
│   ├── cart-discounts.test.ts  # טסטים לעגלה, הנחות וקופונים
│   └── all-discount-types.test.ts # טסטים לכל סוגי הקופונים וההנחות
└── README.md
```

## טסטים קיימים

### Auth API (`/api/auth`)
- ✅ הרשמה - יצירת משתמש חדש
- ✅ הרשמה - דחיית אימייל קיים
- ✅ הרשמה - ולידציה של נתונים
- ✅ הרשמה - יצירת SUPER_ADMIN

### Products API (`/api/products`)
- ✅ GET - קבלת רשימת מוצרים
- ✅ GET - סינון לפי סטטוס
- ✅ GET - חיפוש מוצרים
- ✅ GET - דחיית גישה ללא אימות
- ✅ POST - יצירת מוצר חדש
- ✅ POST - ולידציה של נתונים
- ✅ POST - בדיקת בעלות על חנות

### Shops API (`/api/shops`)
- ✅ GET - קבלת רשימת חנויות
- ✅ GET - סינון לפי חברה
- ✅ POST - יצירת חנות חדשה
- ✅ POST - דחיית slug קיים
- ✅ POST - ולידציה של נתונים

### Customers API (`/api/customers`)
- ✅ GET - קבלת רשימת לקוחות
- ✅ GET - סינון לפי tier
- ✅ GET - חיפוש לקוחות
- ✅ POST - יצירת לקוח חדש
- ✅ POST - דחיית אימייל קיים
- ✅ POST - בדיקת הרשאות ADMIN

### Orders API (`/api/orders`)
- ✅ GET - קבלת רשימת הזמנות
- ✅ GET - סינון לפי סטטוס
- ✅ GET - חיפוש הזמנות
- ✅ GET - סינון לפי חברה

### Cart & Discounts API (`/api/storefront/[slug]/cart`)
- ✅ POST - הוספת מוצר לעגלה
- ✅ POST - הוספת מוצר עם variant לעגלה
- ✅ GET - חישוב עגלה ללא הנחות
- ✅ קופון PERCENTAGE - חישוב הנחה באחוזים
- ✅ קופון PERCENTAGE - כיבוד maxDiscount
- ✅ קופון FIXED - חישוב הנחה קבועה
- ✅ קופון FIXED - הגבלת הנחה לסכום העגלה
- ✅ הנחת לקוח רשום - tier discount
- ✅ הנחת לקוח רשום - baseDiscount
- ✅ חישוב מע"מ עם הנחות
- ✅ תהליך תשלום - סכומים נכונים בהזמנה
- ✅ ולידציה - דחיית קופון לא פעיל
- ✅ ולידציה - דחיית קופון שפג תוקף

### כל סוגי הקופונים וההנחות (`all-discount-types.test.ts`)
- ✅ קופון PERCENTAGE - אחוז הנחה
- ✅ קופון FIXED - סכום קבוע
- ✅ קופון BUY_X_GET_Y - קנה X קבל Y
- ✅ קופון NTH_ITEM_DISCOUNT - הנחה על מוצר N
- ✅ קופון VOLUME_DISCOUNT - הנחת כמות
- ✅ הנחה אוטומטית PERCENTAGE
- ✅ הנחה אוטומטית FIXED
- ✅ הנחה אוטומטית BUY_X_GET_Y
- ✅ הנחה אוטומטית NTH_ITEM_DISCOUNT
- ✅ הנחה אוטומטית VOLUME_DISCOUNT
- ✅ קופון עם minOrder
- ✅ קופון עם maxUses

## פונקציות עזר

הקובץ `test-utils.ts` מכיל פונקציות עזר שימושיות:

- `createTestUser()` - יצירת משתמש בדיקה
- `createTestShop()` - יצירת חנות בדיקה
- `createTestProduct()` - יצירת מוצר בדיקה
- `createTestCustomer()` - יצירת לקוח בדיקה
- `cleanupTestData()` - ניקוי נתוני בדיקה
- `createMockSession()` - יצירת session mock

## הערות חשובות

1. **מסד נתונים**: הטסטים משתמשים במסד נתונים נפרד (מוגדר ב-`DATABASE_URL`).
2. **ניקוי**: כל טסט מנקה את הנתונים לפני הרצה (`beforeEach`).
3. **Mocking**: משתמשים ב-mock של `next-auth` לטסטים.
4. **אירועים**: הטסטים בודקים ש-`ShopEvent` נוצרים כצפוי.

## הוספת טסטים חדשים

כדי להוסיף טסטים חדשים:

1. צור קובץ חדש ב-`__tests__/api/` בשם `[endpoint].test.ts`
2. השתמש בפונקציות העזר מ-`test-utils.ts`
3. ודא שאתה מנקה נתונים ב-`beforeEach` ו-`afterAll`
4. הוסף mock ל-`next-auth` אם צריך

דוגמה:

```typescript
import { GET as handler } from '@/app/api/[endpoint]/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { createTestUser, cleanupTestData } from '../setup/test-utils'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

describe('[Endpoint] API', () => {
  beforeEach(async () => {
    await cleanupTestData()
  })

  it('אמור לעבוד', async () => {
    // טסט כאן
  })
})
```

