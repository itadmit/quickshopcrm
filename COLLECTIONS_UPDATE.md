# עדכון מערכת הקולקציות

## שינויים שבוצעו

### 1. שינוי מבנה הנתיבים
- **לפני:** `/collections/[id]/edit`
- **אחרי:** `/collections/[slug]`
- הנתיב החדש עובד עם slug במקום ID, בדומה למוצרים ועמודים

### 2. עדכון API
- כל ה-API endpoints של קולקציות תומכים כעת בשניהם - slug ו-ID
- שיפור ב-queries כדי לתמוך ב-`OR` בין ID ל-slug
- הוספת תמיכה ב-`_count` לספירת מוצרים בקולקציה

#### API Endpoints:
- `GET /api/collections` - קבלת כל הקולקציות
- `POST /api/collections` - יצירת קולקציה חדשה
- `GET /api/collections/[slug]` - קבלת קולקציה לפי slug או ID
- `PUT /api/collections/[slug]` - עדכון קולקציה
- `DELETE /api/collections/[slug]` - מחיקת קולקציה

### 3. תכונות חדשות בממשק העריכה

#### א. בחירת מוצרים ידנית
- חיפוש מוצרים לפי שם או SKU
- תוצאות חיפוש חיות עם debounce
- הוספה/הסרה של מוצרים
- סידור מוצרים לפי עדיפות (drag & reorder)
- תצוגה של תמונה, מחיר ו-SKU לכל מוצר

#### ב. קולקציות אוטומטיות
- הגדרת תנאים לבחירת מוצרים אוטומטית
- סוגי תנאים נתמכים:
  - **שדה (Field):** כותרת, מחיר, תג, ספק, סוג
  - **תנאי (Condition):** 
    - שווה ל / לא שווה ל
    - מכיל / לא מכיל
    - גדול מ / קטן מ
    - מתחיל ב / מסתיים ב
- בחירת לוגיקה: כל התנאים (AND) או אחד מהתנאים (OR)
- ניתן להוסיף מספר בלתי מוגבל של תנאים

#### ג. שדות SEO
- כותרת SEO
- תיאור SEO
- שמירה במסד הנתונים תחת `seoTitle` ו-`seoDescription`

### 4. עדכון Storefront API
- `/api/storefront/[slug]/collections` - רשימת קולקציות
- `/api/storefront/[slug]/collections/[id]` - קולקציה ספציפית (תומך ב-slug וב-ID)
- החזרת מוצרים בקולקציה עם כל הפרטים הרלוונטיים

### 5. שיפורים נוספים
- ווידציה של slug כדי למנוע כפילויות
- טיפול בשינוי slug - ניווט אוטומטי לכתובת החדשה
- שדות rules נשמרים כ-JSON במסד הנתונים
- תמיכה בהעלאת תמונות לקולקציות

## מבנה ה-Rules (תנאים אוטומטיים)

```json
{
  "conditions": [
    {
      "field": "title",
      "condition": "contains",
      "value": "חולצה"
    },
    {
      "field": "price",
      "condition": "less_than",
      "value": "100"
    }
  ],
  "matchType": "all" // או "any"
}
```

## דוגמאות שימוש

### יצירת קולקציה ידנית עם מוצרים
```typescript
const payload = {
  shopId: "shop_id",
  name: "קולקציית קיץ",
  slug: "summer-collection",
  type: "MANUAL",
  productIds: ["product_1", "product_2", "product_3"]
}
```

### יצירת קולקציה אוטומטית
```typescript
const payload = {
  shopId: "shop_id",
  name: "חולצות מתחת ל-100 ש\"ח",
  slug: "cheap-shirts",
  type: "AUTOMATIC",
  rules: {
    conditions: [
      { field: "title", condition: "contains", value: "חולצה" },
      { field: "price", condition: "less_than", value: "100" }
    ],
    matchType: "all"
  }
}
```

## תאימות לאחור
- ה-API תומך גם ב-ID וגם ב-slug, כך שקישורים ישנים ימשיכו לעבוד
- קולקציות קיימות אינן דורשות migration

