# תיעוד: פס מנהל (Admin Bar)

## סקירה כללית

פס המנהל (Admin Bar) הוא רכיב UI שמוצג בתחתית כל עמודי החנות הקדמיים (Storefront), והוא נראה **רק למנהלי החנות** שמחוברים למערכת.

התכונה מאפשרת למנהלים לנווט במהירות לדשבורד, לערוך עמודים/מוצרים, ולהתאים את מראה החנות ישירות מהחנות עצמה - בדיוק כמו ב-Shopify.

## מיקום הקובץ

```
components/storefront/AdminBar.tsx
```

## תכונות עיקריות

### 1. זיהוי אוטומטי של מנהלים
- הרכיב בודק אוטומטית אם המשתמש המחובר הוא מנהל החנות
- משתמש ב-API endpoint: `/api/storefront/[slug]/check-admin`
- אם המשתמש אינו מנהל, הרכיב לא מוצג כלל

### 2. תפריט פעולות מהירות
הפס כולל שלושה כפתורים עיקריים:

#### כפתור "דשבורד"
- קישור ישיר לדשבורד הראשי
- נפתח בטאב חדש
- תמיד זמין בכל סוגי העמודים

#### כפתור "התאם מראה"
- מוצג בעמודי בית, מוצרים, קולקציות ודפים סטטיים
- מנווט ישירות לעמוד Customize עם הפרמטרים המתאימים:
  - **דף בית**: `/customize?page=home`
  - **עמוד מוצר**: `/customize?page=product&id=[product-id]`
  - **קולקציה/קטגוריה**: `/customize?page=category&id=[category-id]`
  - **דף סטטי**: `/customize`
- נפתח בטאב חדש

#### כפתור "ערוך"
- מוצג רק בעמודי מוצרים, קולקציות ודפים סטטיים
- מנווט ישירות לעמוד העריכה בדשבורד:
  - **מוצר**: `/products/[product-slug]`
  - **קולקציה**: `/collections/[collection-id]`
  - **דף סטטי**: `/pages/[page-id]`
- נפתח בטאב חדש

### 3. עיצוב רספונסיבי
- **דסקטופ**: טקסט מלא בכפתורים
- **מובייל**: רק אייקונים (ללא טקסט)
- הפס נשאר קבוע בתחתית המסך (fixed position)
- רווח אוטומטי בתחתית העמוד כדי למנוע הסתרת תוכן

### 4. עיצוב ויזואלי
- רקע אפור כהה (`bg-gray-900`)
- טקסט לבן
- כפתור הדשבורד בצבע כחול להדגשה
- אייקונים מתאימים מ-Lucide React
- אנימציות hover עדינות

## שימוש

הרכיב מוטמע בכל עמודי החנות:

### דוגמה - דף בית
```tsx
import { AdminBar } from "@/components/storefront/AdminBar"

export default function ShopPage() {
  const slug = params.slug as string
  
  return (
    <div>
      {/* תוכן העמוד */}
      
      <AdminBar slug={slug} pageType="home" />
    </div>
  )
}
```

### דוגמה - עמוד מוצר
```tsx
<AdminBar 
  slug={slug} 
  pageType="product" 
  productSlug={productId} 
/>
```

### דוגמה - עמוד קולקציה
```tsx
<AdminBar 
  slug={slug} 
  pageType="collection" 
  collectionId={collectionId} 
/>
```

### דוגמה - דף סטטי
```tsx
<AdminBar 
  slug={slug} 
  pageType="page" 
  pageId={pageId} 
/>
```

## Props

```typescript
interface AdminBarProps {
  slug: string                    // slug של החנות (נדרש)
  pageType?: PageType            // סוג העמוד (ברירת מחדל: 'other')
  pageId?: string                // ID של דף סטטי (אופציונלי)
  collectionId?: string          // ID של קולקציה (אופציונלי)
  productSlug?: string           // slug של מוצר (אופציונלי)
}

type PageType = 'home' | 'product' | 'collection' | 'page' | 'checkout' | 'other'
```

## עמודים שבהם הרכיב מוטמע

1. ✅ דף הבית (`/shop/[slug]/page.tsx`)
2. ✅ עמוד מוצר (`/shop/[slug]/products/[id]/page.tsx`)
3. ✅ עמוד קולקציה (`/shop/[slug]/collections/[id]/page.tsx`)
4. ✅ עמוד קטגוריה (`/shop/[slug]/categories/[id]/page.tsx`)
5. ✅ דף סטטי (`/shop/[slug]/pages/[id]/page.tsx`)
6. ✅ עמוד חיפוש (`/shop/[slug]/search/page.tsx`)

## הגבלות אבטחה

- הרכיב בודק הרשאות דרך session authentication
- רק משתמשים עם תפקיד ADMIN, SUPER_ADMIN או MANAGER רואים את הפס
- רק חנויות ששייכות לחברה של המשתמש מוצגות
- כל הקישורים נפתחים בטאב חדש למניעת אובדן הקשר

## טכנולוגיות

- **React**: קומפוננטת client-side
- **Next.js**: ניווט וניהול routes
- **Tailwind CSS**: עיצוב רספונסיבי
- **Lucide React**: אייקונים
- **shadcn/ui**: רכיב Button

## ביצועים

- הרכיב נטען רק לאחר mount (client-side)
- בדיקת הרשאות מתבצעת פעם אחת בלבד
- אם המשתמש אינו מנהל, הרכיב לא מרנדר כלל (return null)
- שימוש ב-localStorage cache (אם רלוונטי למימושים עתידיים)

## תחזוקה ושיפורים עתידיים

רעיונות לשיפורים:
1. הוספת כפתור "תצוגה מקדימה" לעמודים שטרם פורסמו
2. אפשרות לשנות מצב תצוגה (צפייה כלקוח / כמנהל)
3. הצגת מידע נוסף כמו מספר הזמנות ממתינות
4. אינטגרציה עם מערכת ההתראות

## בעיות ידועות

- אין כרגע - הרכיב עובד כמצופה

## תאריך יצירה

נובמבר 2025

